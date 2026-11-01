// Downloads the pinned Dante sources (sources.ts), checks every download's SHA-256 and leaves what the build reads in
// .cache/sources/dante: the treebank's sentences in reading order, the two Gutenberg texts, Toynbee's OCR text and
// the Wiktionary entries the treebank's lemmas need.
import { exists, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { ROOT } from "../../scripts/core/outputs";
import { looseKey } from "../../packs/ita/spelling";
import { redirects, type WiktEntry } from "../../packs/ita/build/wiktionary";
import { DERIVED, FILES, KAIKKI, MIRRORS, UD_FILES, udUrl } from "./sources";

export const CACHE = join(ROOT, ".cache", "sources", "dante");

const HEADERS = { "User-Agent": "DanteReader/1.0 (static parallel-text reader; build-time fetch)" };
const sha256 = (bytes: Uint8Array): string => new Bun.CryptoHasher("sha256").update(bytes).digest("hex");

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
  console.log(`fetched dante/${rel} (${(typeof content === "string" ? Buffer.byteLength(content) : content.length).toLocaleString()} bytes)`);
}

const cached = async (rel: string): Promise<boolean> => {
  const hit = await exists(join(CACHE, rel));
  if (hit) console.log(`cached  dante/${rel}`);
  return hit;
};

const CANTICHE = ["Inferno", "Purgatorio", "Paradiso"];
const SENT_ID = /^# sent_id = OldItalian_Dante_(Inferno|Purgatorio|Paradiso)-(\d+)$/mu;

/** The sentences of the three treebank files in reading order, which their ids give. */
async function fetchTreebank(): Promise<void> {
  const sentences: { cantica: number; n: number; text: string }[] = [];
  for (const [file, sha] of Object.entries(UD_FILES)) {
    const bytes = await download(udUrl(file), sha);
    if (file === "LICENSE.txt") continue;
    for (const block of new TextDecoder().decode(bytes).split(/\n{2,}/u)) {
      if (!block.trim()) continue;
      const id = SENT_ID.exec(block);
      if (!id) throw new Error(`${file}: sentence without a Commedia sent_id: ${block.slice(0, 80)}`);
      sentences.push({ cantica: CANTICHE.indexOf(id[1]!), n: Number(id[2]), text: block.trim() });
    }
  }
  sentences.sort((a, b) => a.cantica - b.cantica || a.n - b.n);
  for (let i = 1; i < sentences.length; i++) {
    const [a, b] = [sentences[i - 1]!, sentences[i]!];
    if (a.cantica === b.cantica && a.n === b.n) throw new Error(`Sentence ${CANTICHE[a.cantica]}-${a.n} occurs twice`);
  }
  await save(DERIVED.treebank, sentences.map((s) => s.text).join("\n\n") + "\n");
}

/** Every lemma of the treebank, as looseKey() gives it, and a verb's pronominal infinitive (accorgere: accorgersi). */
async function lemmaKeys(): Promise<Set<string>> {
  const keys = new Set<string>();
  for (const line of (await Bun.file(join(CACHE, DERIVED.treebank)).text()).split("\n")) {
    if (!line || line.startsWith("#")) continue;
    const lemma = line.split("\t")[2] ?? "_";
    if (lemma === "_") continue;
    keys.add(looseKey(lemma));
    if (/[aei]re$/u.test(lemma)) keys.add(looseKey(`${lemma.slice(0, -1)}si`));
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
      ...(sense.alt_of?.length ? { alt_of: sense.alt_of.map((a) => a.word) } : {}),
      ...(sense.form_of?.length ? { form_of: sense.form_of.map((a) => a.word) } : {}),
    })),
  };
}

/**
 * Streams the dump through the hash. Keeps the entries whose headword has a treebank lemma's loose key, and the
 * entries those name as their standard or base form (two steps: lagrima → lacrima), which the build follows.
 */
async function fetchWiktionary(): Promise<void> {
  const [url, sha] = KAIKKI;
  const wanted = await lemmaKeys();
  const response = await fetch(url, { headers: HEADERS });
  if (!response.ok || !response.body) throw new Error(`${url}: HTTP ${response.status}`);
  const hasher = new Bun.CryptoHasher("sha256");
  const decoder = new TextDecoder();
  const kept = new Map<string, WiktEntry[]>();
  /** Every entry by headword, reduced, for the redirect targets. */
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
}

if (import.meta.main) {
  const force = process.argv.includes("--force");
  if (force || !await cached(DERIVED.treebank)) await fetchTreebank();
  for (const [rel, [url, sha]] of Object.entries(FILES)) {
    if (!force && await cached(rel)) continue;
    let bytes: Uint8Array | undefined;
    for (const address of [url, ...MIRRORS[rel] ?? []]) {
      try {
        bytes = await download(address, sha);
        break;
      } catch (error) {
        console.log(`${error instanceof Error ? error.message : error}; trying the next address`);
      }
    }
    if (!bytes) throw new Error(`${rel}: no address served the pinned file`);
    await save(rel, bytes);
  }
  if (force || !await cached(DERIVED.wiktionary)) await fetchWiktionary();
}
