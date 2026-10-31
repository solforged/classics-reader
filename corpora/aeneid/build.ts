// Builds Aeneid book 1 into generated/aeneid/. Run `READER=aeneid bun run fetch` first.
// Greenough's Latin (Perseus) is the text; each printed word takes LASLA's annotation of the same word (alignment.ts).
// Rows are Greenough's paragraphs, which Williams's English follows card by card.
import { join } from "node:path";
import type { DictHit } from "../../src/lib/dict";
import { parseMorph } from "../../src/lib/morph";
import { pack as latin } from "../../packs/lat";
import { friezeArticles, friezeGloss, parseFrieze, type FriezeEntry } from "../../packs/lat/build/frieze";
import { laslaWords, readLasla, type LaslaToken, type LaslaWord } from "../../packs/lat/build/lasla";
import { laslaMorph } from "../../packs/lat/build/morph";
import { AnalysisTable } from "../../scripts/core/analyses";
import { Concordance, Outputs, statsLine } from "../../scripts/core/outputs";
import type { Analysis, Piece, Row, Work } from "../../scripts/core/types";
import { alignLine, READINGS, type AlignedWord } from "./alignment";
import { CACHE } from "./fetch";
import { parseEnglish, parseLatin } from "./lib/perseus";
import { site } from "./site";
import { laslaFile } from "./sources";

const BOOK = 1;
const BOOKS = 12;
const read = (rel: string) => Bun.file(join(CACHE, rel)).text();

// LASLA across the whole Aeneid: each homograph's count and word classes (to find its Frieze entry), and the readings
// of every written form (for Greenough's words that LASLA's edition does not have).
interface Homograph { lemma: string; variant: string; upos: string; count: number; classes: Set<string> }
const homographs = new Map<string, Homograph>();
const attested = new Map<string, Map<string, { word: LaslaWord; count: number }>>();
const homographKey = (word: LaslaWord) => `${word.lemma}\t${word.variant}`;
for (let book = 1; book <= BOOKS; book++) {
  for (const word of laslaWords(await read(laslaFile(book)))) {
    const key = homographKey(word);
    let h = homographs.get(key);
    if (!h) homographs.set(key, h = { lemma: word.lemma, variant: word.variant, upos: word.upos, count: 0, classes: new Set() });
    h.count++;
    h.classes.add(word.upos);
    const readings = attested.get(latin.fold(word.form)) ?? new Map();
    const reading = `${key}\t${word.upos}\t${word.feats}`;
    readings.set(reading, { word, count: (readings.get(reading)?.count ?? 0) + 1 });
    attested.set(latin.fold(word.form), readings);
  }
}

// Frieze's entries per LASLA lemma. A lemma with several entries (ut: result, manner, question) matches each LASLA
// homograph to the entry with its Aeneid count; DCC counted the entries from LASLA, so 5,543 of 5,598 lemmas agree
// exactly. The rest take the entry with the nearest count.
const frieze = new Map<string, FriezeEntry[]>();
for (const entry of parseFrieze(await read("frieze.xml"))) frieze.set(entry.lemma, [...(frieze.get(entry.lemma) ?? []), entry]);
const entryOf = new Map<Homograph, FriezeEntry>();
/** Word classes of the LASLA readings each entry describes. */
const entryClasses = new Map<FriezeEntry, Set<string>>();
for (const h of homographs.values()) {
  const entries = frieze.get(h.lemma);
  if (!entries) continue;
  const exact = entries.filter((entry) => entry.count === h.count);
  const nearest = [...entries].sort((a, b) => Math.abs(a.count - h.count) - Math.abs(b.count - h.count))[0]!;
  const entry = entries.length === 1 ? entries[0]! : exact.length === 1 ? exact[0]! : nearest;
  entryOf.set(h, entry);
  entryClasses.set(entry, new Set([...(entryClasses.get(entry) ?? []), ...h.classes]));
}

/**
 * The lemma as shown: the form of the Frieze headword that is LASLA's lemma, with Frieze's macrons and v (cano →
 * canō, uir → vir, ab in "ā, ab, abs", que → -que). Otherwise LASLA's own lemma, capitalized for names.
 */
const displayLemmas = new Map<Homograph, string>();
let unmarkedLemmas = 0;
function displayLemma(h: Homograph): string {
  let lemma = displayLemmas.get(h);
  if (lemma) return lemma;
  const forms = entryOf.get(h)?.headword.split(/,|\s+(?:or|and)\s+|[()]/u).map((part) => part.trim()) ?? [];
  lemma = forms.find((form) => form && latin.fold(form).replace(/^-/u, "") === h.lemma);
  if (!lemma) {
    unmarkedLemmas++;
    lemma = h.variant === "N" || h.variant === "A" || h.upos === "PROPN" ? h.lemma[0]!.toUpperCase() + h.lemma.slice(1) : h.lemma;
  }
  displayLemmas.set(h, lemma);
  return lemma;
}

const labelled = new Set<string>();
function analysis(word: LaslaWord, source: "e" | "a", segment?: string): Analysis {
  const morph = laslaMorph(word.lemma, word.upos, word.feats);
  if (!labelled.has(morph)) {
    latin.describeMorph(morph); // Throws on any word class, feature or value without an English label.
    labelled.add(morph);
  }
  const lemma = displayLemma(homographs.get(homographKey(word))!);
  return segment === undefined ? [lemma, morph, source] : [lemma, morph, source, segment];
}

/** A written token's words as printed: Greenough's letters when the spellings agree (virumque: virum + que). */
function segments(surface: string, token: LaslaToken): string[] {
  const lengths = token.words.map((word) => word.form.length);
  if (latin.fold(surface) !== latin.fold(token.form) || lengths.reduce((a, b) => a + b, 0) !== surface.length) {
    return token.words.map((word) => word.form);
  }
  let start = 0;
  return lengths.map((length) => surface.slice(start, start += length));
}

/** LASLA's readings of a written form elsewhere in the Aeneid, most frequent first. */
function candidates(form: string): LaslaWord[] {
  return [...(attested.get(latin.fold(form))?.values() ?? [])].sort((a, b) => b.count - a.count).map((r) => r.word);
}

const counts = { same: 0, spelling: 0, reading: 0, candidates: 0, unanalysed: 0, words: 0 };
function wordIds(aligned: AlignedWord, table: AnalysisTable): number[] {
  const { surface, token, match } = aligned;
  counts[match]++;
  counts.words += token.words.length;
  if (match !== "reading") {
    const parts = token.words.length > 1 ? segments(surface, token) : [];
    return token.words.map((word, i) => table.add(analysis(word, "e", parts[i])));
  }
  // A different word: its readings elsewhere, or those of its stem plus the enclitic (arvaque = arva + que).
  let ids = candidates(surface).map((word) => table.add(analysis(word, "a")));
  const enclitic = /^(.+?)(que|ne|ve)$/iu.exec(surface);
  if (!ids.length && enclitic) {
    const [stem] = candidates(enclitic[1]!);
    const [clitic] = candidates(enclitic[2]!);
    if (stem && clitic) ids = [table.add(analysis(stem, "a", enclitic[1]!)), table.add(analysis(clitic, "a", enclitic[2]!))];
  }
  if (ids.length) counts.candidates++;
  else counts.unanalysed++;
  return ids;
}

const latinBook = parseLatin(await read("greenough.xml"), BOOK);
const english = parseEnglish(await read("williams.xml"), BOOK);
if (english.map((card) => card.start).join() !== latinBook.cards.join()) {
  throw new Error(`Williams's paragraphs (${english.map((c) => c.start).join()}) differ from Greenough's (${latinBook.cards.join()})`);
}
// LASLA prefixes book 1 with the four spurious lines "Ille ego qui quondam…" (cited 1*–4*), which Greenough omits.
const laslaLines = readLasla(await read(laslaFile(BOOK)));
const spurious = laslaLines.filter((line) => line.line.endsWith("*")).map((line) => line.line);
if (spurious.join() !== "1*,2*,3*,4*") throw new Error(`Unexpected unnumbered LASLA lines: ${spurious.join()}`);
const numbered = laslaLines.filter((line) => !line.line.endsWith("*"));
if (numbered.length !== latinBook.lines.length || numbered.some((line, i) => line.line !== String(i + 1))) {
  throw new Error(`LASLA numbers ${numbered.length} lines, Greenough ${latinBook.lines.length}`);
}

const table = new AnalysisTable();
const used = new Set<string>();
const linePieces = latinBook.lines.map((line): Piece[] => {
  const aligned = alignLine(line.n, line.text, numbered[line.n - 1]!.tokens, used);
  let next = 0;
  const pieces: Piece[] = line.text.split(/(\p{L}+)/u).filter(Boolean)
    .map((part) => (/^\p{L}/u.test(part) ? [part, wordIds(aligned[next++]!, table)] : part));
  // Greenough brackets the lines he judges spurious.
  return line.bracketed ? ["[", ...pieces, "]"] : pieces;
});
const unused = Object.keys(READINGS).filter((key) => !used.has(key));
if (unused.length) throw new Error(`READINGS not found in the text: ${unused.join(", ")}`);

const rows: Row[] = latinBook.cards.map((start, i) => {
  const end = (latinBook.cards[i + 1] ?? latinBook.lines.length + 1) - 1;
  return {
    id: `${BOOK}.${start}`,
    sides: {
      la: [{ key: `gr-${start}-${end}`, kind: "stanza", firstLine: start, lines: linePieces.slice(start - 1, end) }],
      en: [{ key: `wi-${start}`, kind: "stanza", stichic: true, lines: english[i]!.lines }],
    },
  };
});
const work: Work = { slug: "aeneid-1", rows, analyses: table.list, notes: {} };
if (site.works.length !== 1 || site.works[0]!.slug !== work.slug) throw new Error("The site lists other works than Aeneid 1");

// Dictionary records for every lemma the book uses, keyed like the shards: the fold of the lemma as shown (canō →
// cano, -que → -que), which is LASLA's lemma except for the hyphen of an enclitic.
const laslaLemma = new Map<string, string>();
for (const [h, lemma] of displayLemmas) laslaLemma.set(latin.fold(lemma), h.lemma);
const records = new Map<string, DictHit>();
const glossEntries = new Map<string, FriezeEntry[]>();
for (const key of new Set(work.analyses.map((a) => latin.fold(a[0])))) {
  const lemma = laslaLemma.get(key)!;
  const entries = frieze.get(lemma);
  if (!entries) continue;
  glossEntries.set(key, entries);
  // Classes open the fitting section only when every homograph found its entry by count.
  const exact = [...homographs.values()].filter((h) => h.lemma === lemma)
    .every((h) => entries.length === 1 || entryOf.get(h)?.count === h.count);
  records.set(key, {
    entries: { frieze: friezeArticles(entries.map((entry) => ({ entry, classes: exact ? [...entryClasses.get(entry) ?? []] : [] }))) },
  });
}
/** The gloss of the entry for the reading's word class, else of the most frequent entry. */
function glossFor(lemma: string, morph: string): string {
  const byCount = [...glossEntries.get(latin.fold(lemma)) ?? []].sort((a, b) => b.count - a.count);
  const upos = parseMorph(morph).upos;
  const best = byCount.find((entry) => entryClasses.get(entry)?.has(upos)) ?? byCount[0];
  return best ? friezeGloss(best) : "";
}

const outputs = new Outputs(site.id);
await outputs.reset();
const concordance = new Concordance(site.sides);
await outputs.writeWork(work);
const stats = concordance.addWork(work.slug, work.rows, work.analyses);
await outputs.writeShards("lex", records);
await concordance.write(outputs, glossFor);
console.log(statsLine(work.slug, work.rows.length, stats));
console.log(`lines: ${latinBook.lines.length} in ${rows.length} paragraphs; Williams ${english.reduce((n, c) => n + c.lines.length, 0)} lines`);
console.log(`printed words: ${counts.same} as LASLA, ${counts.spelling} spelled differently, ${counts.reading} other readings ` +
  `(${counts.candidates} with candidates, ${counts.unanalysed} without); LASLA words: ${counts.words}`);
console.log(`labelled morphologies: ${labelled.size}; lemmas: ${displayLemmas.size}, ${unmarkedLemmas} without a Frieze headword form; ` +
  `with a dictionary entry: ${records.size}; concordance lemmas: ${concordance.size}`);
