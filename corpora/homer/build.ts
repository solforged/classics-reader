// Builds Iliad 1 and Odyssey 1 into generated/homer/. Run `READER=homer bun run fetch` first.
// Perseus's Greek is the text; each printed word takes the Ancient Greek Dependency Treebank's annotation of the same
// word (alignment.ts). Rows are the Loeb pages of Murray's English (Perseus's "cards"), which name the Greek line
// they open at and begin at sentence starts; within a row the Greek runs in Allen's paragraphs.
import { join } from "node:path";
import type { Article, DictHit } from "../../src/lib/dict";
import { pack as greek } from "../../packs/grc";
import { agdtMorph, readAgdt, type AgdtWord } from "../../packs/grc/build/agdt";
import { HeadwordIndex, type Found } from "../../packs/grc/build/headwords";
import { abridge, headwordForm, parseAutenrieth, parseLiddell, parseLsj, type LexiconEntry } from "../../packs/grc/build/lexica";
import { looseKey, unaccent } from "../../packs/grc/spelling";
import { AnalysisTable } from "../../scripts/core/analyses";
import { Concordance, Outputs, statsLine } from "../../scripts/core/outputs";
import type { Analysis, Piece, Row, SourceUnit, TextUnit, Work } from "../../scripts/core/types";
import { alignLines, segments, wordsOf, type AlignedWord } from "./alignment";
import { LEMMA_FIXES, NO_ENTRY, TAG_PATCHES, untagged } from "./annotation";
import { CACHE } from "./fetch";
import { parseEnglish, parseGreek, type EnglishCard } from "./lib/perseus";
import { site } from "./site";
import { lsjFile, LSJ_PARTS } from "./sources";

const BOOK = 1;
const LSJ_ENTRIES = 116_497;
/** Longest LSJ article kept, in characters of senses (the LSJ's entry for ἐπί alone is 100 KB). */
const LSJ_LIMIT = 14_000;
/** Share of tokens whose lemma must have a dictionary entry. */
const MIN_COVERAGE = 0.995;

interface BookSource {
  slug: string;
  /** The abbreviation the exception tables use for the poem. */
  poem: string;
  agdt: string;
  greek: string;
  english: string;
  /** Murray's Iliad file breaks paragraphs with a new line; the Odyssey file wraps its lines. */
  newlines: "paragraphs" | "spaces";
}
const BOOKS: readonly BookSource[] = [
  { slug: "iliad-1", poem: "Il.", agdt: "agdt-iliad.xml", greek: "iliad-greek.xml", english: "iliad-murray.xml", newlines: "paragraphs" },
  { slug: "odyssey-1", poem: "Od.", agdt: "agdt-odyssey.xml", greek: "odyssey-greek.xml", english: "odyssey-murray.xml", newlines: "spaces" },
];
const read = (rel: string) => Bun.file(join(CACHE, rel)).text();

/** Marks that stray into AGDT lemmas: a breathing or reversed comma opening the word, a homograph number closing it. */
const cleanLemma = (lemma: string): string => lemma.replace(/^[\u0313\u0314\u02bd\u02bc\u1fbf\u1ffe\u2018\u2019']+/u, "").replace(/\d+$/u, "").trim();

// ---------------------------------------------------------------------------------------------------------------
// 1. The printed words of each book with their tokens, repaired where AGDT is incomplete.

interface Line {
  n: number;
  text: string;
  words: AlignedWord[];
}
interface BookData {
  source: BookSource;
  lines: Line[];
  cards: number[];
  paragraphs: Set<number>;
  english: EnglishCard[];
}

const usedPatches = new Set<string>();
const usedFixes = new Set<string>();
const counts = { tokens: 0, words: 0, divided: 0, patched: 0 };
const lemmaTokens = new Map<string, number>();

const books: BookData[] = [];
for (const source of BOOKS) {
  const tokens = readAgdt(await read(source.agdt), BOOK);
  const text = parseGreek(await read(source.greek), BOOK);
  const english = parseEnglish(await read(source.english), BOOK, source.newlines);
  if (english.map((card) => card.start).join() !== text.cards.join()) {
    throw new Error(`${source.slug}: Murray's pages (${english.map((c) => c.start).join()}) differ from the Greek's (${text.cards.join()})`);
  }
  const aligned = alignLines(text.lines, tokens, source.slug);
  const lines = text.lines.map((line, i): Line => ({
    n: line.n,
    text: line.text,
    words: aligned[i]!.map((word) => {
      const key = `${source.poem} ${BOOK}.${line.n} ${word.surface}`;
      const patches = TAG_PATCHES[key];
      if (patches) {
        if (patches.length !== word.tokens.length) throw new Error(`${key}: ${patches.length} patches for ${word.tokens.length} tokens`);
        usedPatches.add(key);
      }
      counts.words++;
      if (word.tokens.length > 1) counts.divided++;
      return {
        surface: word.surface,
        tokens: word.tokens.map((token, k): AgdtWord => {
          const patch = patches?.[k];
          if (patch) counts.patched++;
          const patched = { ...token, ...patch };
          if (untagged(patched)) throw new Error(`${key}: ${token.form} (AGDT ${token.at}) has no lemma or tag and no patch`);
          const lemma = cleanLemma(patched.lemma);
          if (lemma in LEMMA_FIXES) usedFixes.add(lemma);
          counts.tokens++;
          lemmaTokens.set(LEMMA_FIXES[lemma] ?? lemma, (lemmaTokens.get(LEMMA_FIXES[lemma] ?? lemma) ?? 0) + 1);
          return { ...patched, lemma: LEMMA_FIXES[lemma] ?? lemma };
        }),
      };
    }),
  }));
  books.push({
    source, lines, cards: text.cards, english,
    paragraphs: new Set(text.lines.filter((line) => line.paragraph).map((line) => line.n)),
  });
}
const unusedPatches = Object.keys(TAG_PATCHES).filter((key) => !usedPatches.has(key));
if (unusedPatches.length) throw new Error(`TAG_PATCHES not found in the text: ${unusedPatches.join(", ")}`);
const unusedFixes = Object.keys(LEMMA_FIXES).filter((lemma) => !usedFixes.has(lemma));
if (unusedFixes.length) throw new Error(`LEMMA_FIXES not found in the annotation: ${unusedFixes.join(", ")}`);

// ---------------------------------------------------------------------------------------------------------------
// 2. Dictionaries: the entries of every lemma the books use.

const lemmas = [...lemmaTokens.keys()];
const wantedKeys = new Set(lemmas.map(looseKey));
const wanted = (key: string) => wantedKeys.has(unaccent(key));
const lsj: LexiconEntry[] = [];
let lsjTotal = 0;
for (let part = 1; part <= LSJ_PARTS; part++) {
  const { entries, total } = parseLsj(await read(lsjFile(part)), wanted);
  lsj.push(...entries);
  lsjTotal += total;
}
if (lsjTotal !== LSJ_ENTRIES) throw new Error(`The LSJ has ${lsjTotal} entries, expected ${LSJ_ENTRIES}`);
const dictionaries = [
  { id: "autenrieth", index: new HeadwordIndex(parseAutenrieth(await read("autenrieth.xml"), wanted)) },
  { id: "middle-liddell", index: new HeadwordIndex(parseLiddell(await read("middle-liddell.xml"), wanted)) },
  { id: "lsj", index: new HeadwordIndex(lsj) },
];

interface Lookup {
  found: { id: string; found: Found }[];
  /** The headword the dictionaries list the lemma under, when it differs in accent (τε is listed as τέ). */
  via?: string;
}
const lookups = new Map<string, Lookup>();
const accentOnly = new Set<string>();
const noEntry: string[] = [];
for (const lemma of lemmas) {
  const found = dictionaries.flatMap(({ id, index }) => {
    const hit = index.find(lemma);
    return hit ? [{ id, found: hit }] : [];
  });
  const first = found[0];
  const head = first?.found.how === "accent" ? headwordForm(first.found.entries[0]!.article).normalize("NFC") : undefined;
  lookups.set(lemma, { found, ...(head && head !== lemma ? { via: head } : {}) });
  if (found.some(({ found: hit }) => hit.how === "accent")) accentOnly.add(lemma);
  if (!found.length) noEntry.push(lemma);
}
const unexplained = noEntry.filter((lemma) => !(lemma in NO_ENTRY));
if (unexplained.length) throw new Error(`No dictionary entry for ${unexplained.map((l) => `${l} (${lemmaTokens.get(l)})`).join(", ")}`);
const stale = Object.keys(NO_ENTRY).filter((lemma) => !noEntry.includes(lemma));
if (stale.length) throw new Error(`NO_ENTRY lemmas that have an entry (or are not in the text): ${stale.join(", ")}`);
const unlisted = noEntry.reduce((n, lemma) => n + lemmaTokens.get(lemma)!, 0);
const coverage = 1 - unlisted / counts.tokens;
if (coverage < MIN_COVERAGE) throw new Error(`Only ${(100 * coverage).toFixed(2)}% of tokens have a dictionary entry`);

const plain = (html: string): string =>
  html.replace(/<[^>]+>/gu, "").replace(/&lt;/gu, "<").replace(/&gt;/gu, ">").replace(/&amp;/gu, "&").replace(/\s+/gu, " ").trim();
/** A gloss that only sends the reader elsewhere ("see μάλα", "= ἕλωρ, Il. 1.4"): what it says and the word it names. */
const REFERENCE = /^((?:see|=|v\.|Sup\. of|Comp\. of|poet\. form of)\s+([\p{Script=Greek}\u0345]+))/u;

/**
 * The lexicon's gloss for a lemma: the first italic (the translation) in the first article that has one; else the
 * opening of the first sense, which for a name is its description; a bare cross-reference gives its target's gloss.
 */
function glossOf(lemma: string, hops = 2): string {
  const senses = (lookups.get(lemma)?.found ?? []).flatMap(({ found }) => found.entries)
    .flatMap((entry) => entry.article.sections.flatMap((section) => section.senses ?? []));
  for (const sense of senses) {
    const italic = /<i>([^<]+)<\/i>/u.exec(sense.gloss)?.[1];
    if (italic) return plain(italic).replace(/[,;:.\s—]+$/u, "");
  }
  const opening = plain(senses[0]?.gloss ?? "");
  const [, reference, target] = REFERENCE.exec(opening) ?? [];
  const followed = target && hops > 0 && lookups.has(target) ? glossOf(target, hops - 1) : "";
  return followed || (reference ?? opening).replace(/[,;:.\s—]+$/u, "");
}

// Dictionary records keyed like the shards: the fold of the lemma.
const records = new Map<string, DictHit>();
const glosses = new Map<string, string>();
for (const [lemma, { found, via }] of lookups) {
  if (!found.length) continue;
  const key = greek.fold(lemma);
  if (records.has(key)) throw new Error(`The lemmas ${lemma} and another have the same key ${key}`);
  const entries: Record<string, Article[]> = {};
  for (const { id, found: hit } of found) {
    entries[id] = hit.entries.map((entry) => id === "lsj" ? abridge(entry.article, LSJ_LIMIT, "the whole entry is in the LSJ at Perseus") : entry.article);
  }
  records.set(key, { entries, ...(via ? { via } : {}) });
  glosses.set(lemma, glossOf(lemma));
}

// ---------------------------------------------------------------------------------------------------------------
// 3. Analyses, pieces and rows.

const labelled = new Set<string>();
function analysis(token: AgdtWord, segment?: string): Analysis {
  const morph = agdtMorph(token);
  if (!labelled.has(morph)) {
    greek.describeMorph(morph); // Throws on any word class, feature or value without an English label.
    labelled.add(morph);
  }
  return segment === undefined ? [token.lemma, morph, "e"] : [token.lemma, morph, "e", segment];
}

/**
 * A printed word's analyses: one for each token. A word that AGDT divides (οὐδέ as οὐ + δέ) has one analysis for each
 * of its parts, named by the part's letters.
 */
function wordIds(word: AlignedWord, table: AnalysisTable): number[] {
  const { surface, tokens } = word;
  if (tokens.length === 1) return [table.add(analysis(tokens[0]!))];
  const parts = segments(surface, tokens);
  return tokens.map((token, i) => table.add(analysis(token, parts[i])));
}

const works: Work[] = [];
// A line repeats words (καὶ … καὶ), so each concordance word is marked at its own place.
const concordance = new Concordance(site.sides, { markPosition: true });
const outputs = new Outputs(site.id);
await outputs.reset();
const summaries: string[] = [];
for (const { source, lines, cards, paragraphs, english } of books) {
  const table = new AnalysisTable();
  const pieces = lines.map((line): Piece[] => {
    let next = 0;
    return line.text.split(/([\p{L}\p{M}]+)/u).filter(Boolean)
      .map((part) => (/^[\p{L}\p{M}]/u.test(part) ? [part, wordIds(line.words[next++]!, table)] : part));
  });
  const rows: Row[] = cards.map((start, i) => {
    const end = (cards[i + 1] ?? lines.length + 1) - 1;
    const units: SourceUnit[] = [];
    for (let n = start; n <= end; n++) {
      if (!units.length || paragraphs.has(n)) units.push({ key: `hg-${n}`, kind: "stanza", firstLine: n, lines: [] });
      units.at(-1)!.lines.push(pieces[n - 1]!);
    }
    const page = english[i]!;
    const translation: TextUnit[] = page.paragraphs.map((text, p) => ({ key: `mu-${start}-${p}`, kind: "prose", lines: [text] }));
    return { id: `${BOOK}.${start}`, sides: { grc: units, en: translation } };
  });
  const work: Work = { slug: source.slug, rows, analyses: table.list, notes: {} };
  works.push(work);
  await outputs.writeWork(work);
  const stats = concordance.addWork(work.slug, work.rows, work.analyses);
  summaries.push(statsLine(work.slug, work.rows.length, stats));
  summaries.push(`  ${lines.length} lines in ${rows.length} pages and ${units(rows)} Greek paragraphs; Murray ${english.reduce((n, c) => n + c.paragraphs.length, 0)} paragraphs`);
}
function units(rows: readonly Row[]): number {
  return rows.reduce((n, row) => n + (row.sides.grc?.length ?? 0), 0);
}
if (site.works.map((w) => w.slug).join() !== works.map((w) => w.slug).join()) throw new Error("The site lists other works than the books built");

await outputs.writeShards("lex", records);
await concordance.write(outputs, (lemma) => glosses.get(lemma) ?? "");
for (const line of summaries) console.log(line);
console.log(`tokens: ${counts.tokens} in ${counts.words} printed words (${counts.divided} divided by AGDT: one analysis per part), ${counts.patched} patched`);
console.log(`labelled morphologies: ${labelled.size}; lemmas: ${lemmas.length}; with a dictionary entry: ${lemmas.length - noEntry.length} ` +
  `(${(100 * coverage).toFixed(2)}% of tokens), ${accentOnly.size} of them found by ignoring an accent; without: ${noEntry.join(" ") || "none"}; ` +
  `concordance lemmas: ${concordance.size}`);
const per = Object.fromEntries(dictionaries.map(({ id }) => [id, [...lookups.values()].filter((l) => l.found.some((f) => f.id === id)).length]));
console.log(`lemmas with an entry in: ${Object.entries(per).map(([id, n]) => `${id} ${n}`).join(", ")}; lexicon glosses: ${[...glosses.values()].filter(Boolean).length} of ${glosses.size}`);
