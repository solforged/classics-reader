// Downloads the pinned sources (sources.ts), checks every download's SHA-256 and leaves what the build reads in
// .cache/sources/machiavelli: Ricci's translation of the Prince, Liber Liber's text of the Arte della guerra decoded to
// UTF-8, and the Wiktionary entries the annotation's lemmas need. The CoNLL-U and Farneworth's English are checked into
// data/ and are not fetched.
import { exists, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { looseKey } from "../../packs/ita/spelling";
import { redirects, type WiktEntry } from "../../packs/ita/build/wiktionary";
import { ROOT } from "../../scripts/core/outputs";
import { ARTE_UNITS, DERIVED, GUTENBERG, KAIKKI, LIBERLIBER, PRINCE_UNITS } from "./sources";
import { ARTE_DATA, DATA } from "./lib/align";
import { sha256 } from "./lib/pins";
import { zipMember } from "./lib/zip";

export const CACHE = join(ROOT, ".cache", "sources", "machiavelli");

/** A file fetch.ts left in the cache. */
export const readCached = (rel: string): Promise<string> => Bun.file(join(CACHE, rel)).text();

const HEADERS = { "User-Agent": "MachiavelliReader/1.0 (static parallel-text reader; build-time fetch)" };

async function download(url: string, sha: string): Promise<Uint8Array> {
  const response = await fetch(url, { headers: HEADERS });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const actual = sha256(bytes);
  if (actual !== sha) throw new Error(`${url}: SHA-256 ${actual}, expected ${sha}; the source changed upstream`);
  return bytes;
}

async function save(rel: string, content: Uint8Array | string): Promise<void> {
  await mkdir(CACHE, { recursive: true });
  await Bun.write(join(CACHE, rel), content);
  console.log(`fetched machiavelli/${rel} (${(typeof content === "string" ? Buffer.byteLength(content) : content.length).toLocaleString()} bytes)`);
}

const cached = async (rel: string): Promise<boolean> => {
  const hit = await exists(join(CACHE, rel));
  if (hit) console.log(`cached  machiavelli/${rel}`);
  return hit;
};

/** Every lemma of the annotation, as looseKey() gives it, and a verb's pronominal infinitive (accorgere: accorgersi). */
async function lemmaKeys(): Promise<Set<string>> {
  const keys = new Set<string>();
  const files = [
    ...PRINCE_UNITS.map((unit) => join(DATA, `${unit}.conllu`)),
    ...ARTE_UNITS.map((unit) => join(ARTE_DATA, "conllu", `${unit}.conllu`)),
  ];
  for (const file of files) {
    for (const line of (await Bun.file(file).text()).split("\n")) {
      if (!line || line.startsWith("#")) continue;
      const lemma = line.split("\t")[2] ?? "_";
      if (lemma === "_") continue;
      keys.add(looseKey(lemma));
      if (/[aei]re$/u.test(lemma)) keys.add(looseKey(`${lemma.slice(0, -1)}si`));
    }
  }
  return keys;
}

interface RawSense { glosses?: string[]; tags?: string[]; alt_of?: { word: string }[]; form_of?: { word: string }[] }
interface RawEntry { word: string; pos: string; head_templates?: { expansion?: string }[]; senses?: RawSense[] }

/** The fields packs/ita/build/wiktionary.ts reads: the head line and each sense's glosses, tags and redirect. */
function reduce(entry: RawEntry): WiktEntry {
  return {
    word: entry.word,
    pos: entry.pos,
    head: entry.head_templates?.[0]?.expansion ?? "",
    senses: (entry.senses ?? []).map((sense) => ({
      ...(sense.glosses?.length ? { glosses: sense.glosses } : {}),
      ...(sense.tags?.length ? { tags: sense.tags } : {}),
      ...(sense.alt_of?.length ? { alt_of: sense.alt_of.map((alt) => alt.word) } : {}),
      ...(sense.form_of?.length ? { form_of: sense.form_of.map((form) => form.word) } : {}),
    })),
  };
}

/**
 * Streams the dump through the hash. Keeps the entries whose headword has one of the `wanted` loose keys, and the
 * entries those name as their standard or base form (two steps), which the build follows. The keys are saved beside
 * the entries, so that a later fetch can tell whether they still cover the annotation.
 */
async function fetchWiktionary(wanted: ReadonlySet<string>): Promise<void> {
  const [url, sha] = KAIKKI;
  const response = await fetch(url, { headers: HEADERS });
  if (!response.ok || !response.body) throw new Error(`${url}: HTTP ${response.status}`);
  const hasher = new Bun.CryptoHasher("sha256");
  const decoder = new TextDecoder();
  const kept = new Map<string, WiktEntry[]>();
  const all = new Map<string, WiktEntry[]>();
  let lines = 0;
  let rest = "";
  const take = (line: string) => {
    if (!line) return;
    lines++;
    const entry = JSON.parse(line) as RawEntry;
    const reduced = reduce(entry);
    (all.get(entry.word) ?? all.set(entry.word, []).get(entry.word)!).push(reduced);
    if (wanted.has(looseKey(entry.word))) (kept.get(entry.word) ?? kept.set(entry.word, []).get(entry.word)!).push(reduced);
  };
  for await (const chunk of response.body) {
    hasher.update(chunk);
    const parts = (rest + decoder.decode(chunk, { stream: true })).split("\n");
    rest = parts.pop()!;
    for (const line of parts) take(line);
  }
  take(rest + decoder.decode());
  const actual = hasher.digest("hex");
  if (actual !== sha) throw new Error(`${url}: SHA-256 ${actual}, expected ${sha}`);
  let added = 0;
  for (let step = 0; step < 2; step++) {
    const next = new Set<string>();
    for (const entries of kept.values()) {
      for (const entry of entries) for (const word of redirects(entry)) if (!kept.has(word)) next.add(word);
    }
    for (const word of next) {
      const entries = all.get(word);
      if (!entries) continue;
      kept.set(word, entries);
      added++;
    }
  }
  const out = [...kept.values()].flat();
  console.log(`Wiktionary dump: ${lines.toLocaleString()} entries, ${out.length.toLocaleString()} kept (${added} headwords as redirect targets)`);
  await save(DERIVED.wiktionary, out.map((entry) => JSON.stringify(entry)).join("\n") + "\n");
  await save(DERIVED.wiktionaryKeys, [...wanted].sort().join("\n") + "\n");
}

/**
 * Whether the saved Wiktionary entries were extracted for every lemma the annotation has now. A new reviewed
 * annotation that only drops or respells lemmas keeps them; one that adds a lemma fetches again, for the old keys and the new.
 */
async function wiktionaryKeys(wanted: ReadonlySet<string>): Promise<{ fresh: boolean; keys: Set<string> }> {
  const saved = await exists(join(CACHE, DERIVED.wiktionaryKeys)) && await exists(join(CACHE, DERIVED.wiktionary))
    ? new Set((await readCached(DERIVED.wiktionaryKeys)).split("\n").filter(Boolean))
    : new Set<string>();
  return { fresh: saved.size > 0 && [...wanted].every((key) => saved.has(key)), keys: saved };
}

/** Liber Liber's ZIP, checked against its pin; the text file inside, decoded to UTF-8 and checked again. */
async function fetchLiberLiber(): Promise<string> {
  const zip = await download(LIBERLIBER.url, LIBERLIBER.zipSha);
  const text = new TextDecoder(LIBERLIBER.encoding).decode(zipMember(zip, LIBERLIBER.member));
  const actual = sha256(text);
  if (actual !== LIBERLIBER.textSha) throw new Error(`${LIBERLIBER.url}: ${LIBERLIBER.member} decodes to SHA-256 ${actual}, expected ${LIBERLIBER.textSha}`);
  return text;
}

if (import.meta.main) {
  const force = process.argv.includes("--force");
  const [url, sha] = GUTENBERG;
  if (force || !await cached("ricci.txt")) await save("ricci.txt", await download(url, sha));
  if (force || !await cached(DERIVED.arteText)) await save(DERIVED.arteText, await fetchLiberLiber());
  const wanted = await lemmaKeys();
  const { fresh, keys } = await wiktionaryKeys(wanted);
  if (!force && fresh) console.log(`cached  machiavelli/${DERIVED.wiktionary}`);
  else await fetchWiktionary(force ? wanted : new Set([...wanted, ...keys]));
}
