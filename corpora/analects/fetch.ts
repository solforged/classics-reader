// Downloads the pinned Analects sources (sources.ts), checks every download's SHA-256 and leaves what the build reads
// in .cache/sources/analects: the Analects' documents from the treebank, Legge's Gutenberg text, two Unihan files and
// the Wiktionary entries for the treebank's headwords.
import { exists, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { ROOT } from "../../scripts/core/outputs";
import { unzipMember } from "./lib/zip";
import { ANALECTS_DOC, CACHE as FILES, KAIKKI, KYOTO_FILES, kyotoUrl, LEGGE, UNIHAN } from "./sources";

export const CACHE = join(ROOT, ".cache", "sources", "analects");

const HEADERS = { "User-Agent": "AnalectsReader/1.0 (static parallel-text reader; build-time fetch)" };
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
  console.log(`fetched analects/${rel} (${(typeof content === "string" ? Buffer.byteLength(content) : content.length).toLocaleString()} bytes)`);
}

const cached = async (rel: string): Promise<boolean> => {
  const hit = await exists(join(CACHE, rel));
  if (hit) console.log(`cached  analects/${rel}`);
  return hit;
};

/** The Analects' documents (KR1h0004_001 … _020) of the three treebank files, sorted by document id. */
async function fetchKyoto(): Promise<void> {
  const docs = new Map<string, string[]>();
  for (const [file, sha] of Object.entries(KYOTO_FILES)) {
    const bytes = await download(kyotoUrl(file), sha);
    if (file === "LICENSE.txt") continue;
    let current: string[] | undefined;
    for (const line of new TextDecoder().decode(bytes).split("\n")) {
      const id = /^# newdoc id = (\S+)$/u.exec(line)?.[1];
      if (id !== undefined) {
        current = ANALECTS_DOC.test(id) ? [] : undefined;
        if (current) {
          if (docs.has(id)) throw new Error(`Treebank document ${id} occurs twice`);
          docs.set(id, current);
        }
      }
      current?.push(line);
    }
  }
  if (docs.size !== 20) throw new Error(`Found ${docs.size} Analects documents in the treebank, expected 20`);
  const ordered = [...docs].sort(([a], [b]) => (a < b ? -1 : 1));
  await save(FILES.kyoto, ordered.map(([, lines]) => lines.join("\n").replace(/\n+$/u, "")).join("\n\n") + "\n");
}

async function fetchLegge(): Promise<void> {
  await save(FILES.legge, await download(...LEGGE));
}

async function fetchUnihan(): Promise<void> {
  const zip = await download(UNIHAN.url, UNIHAN.sha);
  const names = { "Unihan_Readings.txt": FILES.readings, "Unihan_Variants.txt": FILES.variants } as const;
  for (const [member, sha] of Object.entries(UNIHAN.members)) {
    const bytes = unzipMember(zip, member);
    const actual = sha256(bytes);
    if (actual !== sha) throw new Error(`${UNIHAN.url}: ${member} has SHA-256 ${actual}, expected ${sha}`);
    await save(names[member as keyof typeof names], bytes);
  }
}

/** Every string the treebank uses as a form or lemma, and every character in them. */
async function headwords(): Promise<Set<string>> {
  const words = new Set<string>();
  for (const line of (await Bun.file(join(CACHE, FILES.kyoto)).text()).split("\n")) {
    if (!line || line.startsWith("#")) continue;
    const [, form = "", lemma = ""] = line.split("\t");
    for (const word of [form, lemma]) {
      words.add(word);
      for (const char of word) words.add(char);
    }
  }
  return words;
}

interface RawSense { glosses?: string[]; tags?: string[]; raw_tags?: string[]; alt_of?: { word: string }[]; form_of?: { word: string }[] }
interface RawSound { zh_pron?: string; tags?: string[] }
interface RawEntry { word: string; pos: string; senses?: RawSense[]; sounds?: RawSound[] }

const PRONUNCIATIONS = new Set(["Pinyin", "Jyutping", "Middle-Chinese", "Old-Chinese"]);

/** The fields packs/lzh/build/wiktionary.ts reads: glosses with their tags, and pinyin, Jyutping, Middle and Old Chinese. */
function reduce(entry: RawEntry): string {
  return JSON.stringify({
    word: entry.word,
    pos: entry.pos,
    senses: (entry.senses ?? []).map((sense) => ({
      ...(sense.glosses?.length ? { glosses: sense.glosses } : {}),
      ...(sense.tags?.length ? { tags: sense.tags } : {}),
      ...(sense.raw_tags?.length ? { raw_tags: sense.raw_tags } : {}),
      ...(sense.alt_of?.length ? { alt_of: sense.alt_of.map((a) => a.word) } : {}),
      ...(sense.form_of?.length ? { form_of: sense.form_of.map((a) => a.word) } : {}),
    })),
    sounds: (entry.sounds ?? []).filter((sound) => sound.zh_pron && sound.tags?.some((tag) => PRONUNCIATIONS.has(tag)))
      .map((sound) => ({ zh_pron: sound.zh_pron, tags: sound.tags })),
  });
}

/** Streams the 1.2 GB dump through the hash, keeping the entries of the treebank's headwords. */
async function fetchWiktionary(): Promise<void> {
  const [url, sha] = KAIKKI;
  const wanted = await headwords();
  const response = await fetch(url, { headers: HEADERS });
  if (!response.ok || !response.body) throw new Error(`${url}: HTTP ${response.status}`);
  const hasher = new Bun.CryptoHasher("sha256");
  const decoder = new TextDecoder();
  const kept: string[] = [];
  let lines = 0;
  let rest = "";
  const take = (line: string) => {
    if (!line) return;
    lines++;
    const entry = JSON.parse(line) as RawEntry;
    if (wanted.has(entry.word)) kept.push(reduce(entry));
  };
  for await (const chunk of response.body) {
    hasher.update(chunk);
    const parts = (rest + decoder.decode(chunk, { stream: true })).split("\n");
    rest = parts.pop()!;
    for (const line of parts) take(line);
  }
  take(rest + decoder.decode());
  const actual = hasher.digest("hex");
  if (actual !== sha) throw new Error(`${url}: SHA-256 ${actual}, expected ${sha}; kaikki.org publishes a new dump about weekly`);
  console.log(`Wiktionary dump: ${lines.toLocaleString()} entries, ${kept.length.toLocaleString()} for the treebank's headwords`);
  await save(FILES.wiktionary, kept.join("\n") + "\n");
}

if (import.meta.main) {
  const force = process.argv.includes("--force");
  if (force || !await cached(FILES.kyoto)) await fetchKyoto();
  if (force || !await cached(FILES.legge)) await fetchLegge();
  if (force || !(await cached(FILES.readings) && await cached(FILES.variants))) await fetchUnihan();
  if (force || !await cached(FILES.wiktionary)) await fetchWiktionary();
}
