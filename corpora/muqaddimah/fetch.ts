// Downloads the pinned sources (sources.ts), checks every download's SHA-256 and leaves what the build reads in
// .cache/sources/muqaddimah: the OpenITI file and Lane's Lexicon unpacked. The CoNLL-U, units.json and the Wiktionary
// extract are checked into data/ and are not fetched; this script only checks them against their pins.
//
//   bun corpora/muqaddimah/fetch.ts              OpenITI and Lane (what a build needs)
//   bun corpora/muqaddimah/fetch.ts --force      fetch again what is cached
//   bun corpora/muqaddimah/fetch.ts --kaikki     also the 868 MB kaikki.org dump, and re-derive data/wiktionary.json from it
//
// kaikki.org has deprecated its Arabic file (no complete archived copy exists), so --kaikki can fail once the file is gone; a
// build never needs it. If the dump is already in the cache (or MUQ_KAIKKI names a copy), --kaikki checks that
// copy against the pin instead of downloading it.
import { createHash } from "node:crypto";
import { copyFile, exists, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { ROOT } from "../../scripts/core/outputs";
import { CONLLU_SHA, DERIVED, KAIKKI, LANE, OPENITI, UNITS, UNITS_SHA, WIKTIONARY_SHA } from "./sources";
import { deriveWiktionary } from "./tools/extract";

export const CACHE = join(ROOT, ".cache", "sources", "muqaddimah");
export const DATA = join(ROOT, "corpora", "muqaddimah", "data");

/** A file fetch.ts left in the cache. */
export const readCached = (rel: string): Promise<string> => Bun.file(join(CACHE, rel)).text();

const HEADERS = { "User-Agent": "MuqaddimahReader/1.0 (static parallel-text reader; build-time fetch)" };

const sha256 = (data: Uint8Array): string => createHash("sha256").update(data).digest("hex");

async function download(url: string, sha: string): Promise<Uint8Array> {
  const response = await fetch(url, { headers: HEADERS, redirect: "follow" });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const actual = sha256(bytes);
  if (actual !== sha) throw new Error(`${url}: SHA-256 ${actual}, expected ${sha}; the source changed upstream`);
  return bytes;
}

async function cached(rel: string): Promise<boolean> {
  const hit = await exists(join(CACHE, rel));
  if (hit) console.log(`cached  muqaddimah/${rel}`);
  return hit;
}

async function fetchOpenITI(): Promise<void> {
  const bytes = await download(OPENITI.url, OPENITI.sha256);
  if (bytes.length !== OPENITI.bytes) throw new Error(`${OPENITI.url}: ${bytes.length} bytes, expected ${OPENITI.bytes}`);
  await Bun.write(join(CACHE, DERIVED.openiti), bytes);
  console.log(`fetched muqaddimah/${DERIVED.openiti} (${bytes.length.toLocaleString()} bytes)`);
}

/** The tarball, checked against its pin, unpacked without its top directory. */
async function fetchLane(): Promise<void> {
  const bytes = await download(LANE.url, LANE.sha256);
  const tarball = join(CACHE, "lane.tar.gz");
  await Bun.write(tarball, bytes);
  const dir = join(CACHE, DERIVED.lane);
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  const untar = Bun.spawn(["tar", "-xzf", tarball, "--strip-components=1", "-C", dir], { stdio: ["ignore", "inherit", "inherit"] });
  if ((await untar.exited) !== 0) throw new Error(`tar could not unpack ${tarball}`);
  await rm(tarball);
  console.log(`fetched muqaddimah/${DERIVED.lane}/ (Lane's Lexicon, ${LANE.credit})`);
}

/** Streams a large file to disk through the hash; keeps it only if it matches the pin. */
async function streamTo(url: string, sha: string, path: string): Promise<void> {
  const response = await fetch(url, { headers: HEADERS, redirect: "follow" });
  if (!response.ok || !response.body) throw new Error(`${url}: HTTP ${response.status}`);
  const hash = createHash("sha256");
  const out = Bun.file(path).writer();
  for await (const chunk of response.body) {
    hash.update(chunk);
    out.write(chunk);
  }
  await out.end();
  const actual = hash.digest("hex");
  if (actual !== sha) {
    await rm(path);
    throw new Error(`${url}: SHA-256 ${actual}, expected ${sha}`);
  }
}

async function fileSha(path: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of Bun.file(path).stream()) hash.update(chunk);
  return hash.digest("hex");
}

/** The vendored files against their pins. */
export async function checkVendored(): Promise<void> {
  const files: [string, string][] = [
    [join(DATA, "units.json"), UNITS_SHA],
    [join(DATA, "wiktionary.json"), WIKTIONARY_SHA],
    ...UNITS.map((unit): [string, string] => [join(DATA, "conllu", `${unit}.conllu`), CONLLU_SHA[unit]!]),
  ];
  for (const [path, sha] of files) {
    const actual = await fileSha(path);
    if (actual !== sha) throw new Error(`${path.slice(ROOT.length + 1)}: SHA-256 ${actual}, pin ${sha}; copy the reviewed file in and run tools/pins.ts`);
  }
  console.log(`checked ${files.length} vendored files against sources.ts`);
}

async function fetchKaikki(force: boolean): Promise<void> {
  const target = join(CACHE, DERIVED.kaikki);
  const given = process.env.MUQ_KAIKKI;
  if (given) await copyFile(given, target);
  if (!force && !given && await exists(target)) console.log(`cached  muqaddimah/${DERIVED.kaikki}`);
  else if (!given) await streamTo(KAIKKI.url, KAIKKI.sha256, target);
  const actual = await fileSha(target);
  if (actual !== KAIKKI.sha256) throw new Error(`${target}: SHA-256 ${actual}, expected ${KAIKKI.sha256}`);
  const derived = sha256(new TextEncoder().encode(await deriveWiktionary(target)));
  if (derived !== WIKTIONARY_SHA) throw new Error(`the extract derived from the kaikki.org dump has SHA-256 ${derived}, data/wiktionary.json is pinned as ${WIKTIONARY_SHA}`);
  console.log("data/wiktionary.json is what the kaikki.org dump gives");
}

if (import.meta.main) {
  const force = process.argv.includes("--force");
  await mkdir(CACHE, { recursive: true });
  if (force || !await cached(DERIVED.openiti)) await fetchOpenITI();
  if (force || !await cached(DERIVED.lane)) await fetchLane();
  await checkVendored();
  if (process.argv.includes("--kaikki")) await fetchKaikki(force);
}
