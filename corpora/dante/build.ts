// Builds the Dante Reader into generated/dante/. Run `READER=dante bun run fetch` first.
// The Italian is UD_Italian-Old's text and annotation of the whole Commedia, laid out in cantos and lines (lines.ts).
// Each canto is a work and each tercet a row, beside the same lines of Longfellow's translation, which keeps the
// Italian's line count in every canto. Lemmas are looked up in Wiktionary; names also in Toynbee's dictionary.
import { join } from "node:path";
import type { Article, DictHit } from "../../src/lib/dict";
import { formatMorph, parseMorph } from "../../src/lib/morph";
import { pack as ita } from "../../packs/ita";
import { parseCommedia, type TreebankWord } from "../../packs/ita/build/conllu";
import { parseToynbee, toynbeeGloss, type ToynbeeEntry } from "../../packs/ita/build/toynbee";
import { Wiktionary } from "../../packs/ita/build/wiktionary";
import { AnalysisTable } from "../../scripts/core/analyses";
import { Concordance, Outputs, statsLine } from "../../scripts/core/outputs";
import type { Analysis, Piece, Row, SourceUnit, TextUnit, Work } from "../../scripts/core/types";
import { LEMMA_FIXES, MARKS, PLACEMENTS, VERSE_FIXES } from "./alignment";
import { CACHE } from "./fetch";
import { CANTICHE, CANTOS, parseItalian, parseLongfellow } from "./lib/gutenberg";
import { layCantica, spaced, type Item } from "./lines";
import { namesFor, NO_TOYNBEE } from "./names";
import { site, SUBJECTS } from "./site";
import { DERIVED } from "./sources";

/** Share of the words that are not names or foreign whose lemma must have a Wiktionary entry. */
const MIN_COVERAGE = 0.99;

const read = (rel: string) => Bun.file(join(CACHE, rel)).text();
const esc = (text: string): string => text.replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;");

const sentences = parseCommedia(await read(DERIVED.treebank));
const italian = parseItalian(await read("gutenberg-italian.txt"));
const longfellow = parseLongfellow(await read("longfellow.txt"));
const wiktionary = new Wiktionary(await read(DERIVED.wiktionary));
const toynbee = parseToynbee(await read("toynbee.txt"));

// Longfellow's contents, as site.ts gives them.
for (const cantica of CANTICHE) {
  longfellow.contents[cantica].forEach((line, i) => {
    const [english, rest] = SUBJECTS[cantica][i]!;
    if (`${english}.${rest ? ` ${rest}` : ""}` !== line) throw new Error(`site.ts SUBJECTS ${cantica} ${i + 1} differ from Longfellow's contents: ${line}`);
  });
}

// ---- Analyses ---------------------------------------------------------------------------------------------------
const used = new Set<string>();
const labelled = new Set<string>();
const counts = { words: 0, multiword: 0, names: 0, foreign: 0, common: 0, commonWithEntry: 0, punctuationWords: 0 };
/** Lemma → word classes used with it, for the dictionary records. */
const lemmaClasses = new Map<string, Set<string>>();
/** fold(lemma) → tokens whose lemma has no Wiktionary entry, for the report. */
const missing = new Map<string, number>();

const lemmaOf = (word: TreebankWord): string => {
  const fixed = LEMMA_FIXES[word.lemma];
  if (fixed) used.add(`LEMMA_FIXES ${word.lemma}`);
  return fixed ?? word.lemma;
};

function morphOf(word: TreebankWord): string {
  const feats: Record<string, string[]> = {};
  for (const pair of word.feats ? word.feats.split("|") : []) {
    const [name, values] = pair.split("=") as [string, string];
    feats[name] = values.split(",");
  }
  if (word.misc.Lang === "fro") feats.Lang = ["oc"];
  else if (word.misc.Lang !== undefined) throw new Error(`Unexpected MISC Lang=${word.misc.Lang} on ${word.form}`);
  const morph = formatMorph({ upos: word.upos, feats });
  if (!labelled.has(morph)) {
    ita.describeMorph(morph); // Throws on any word class, feature or value without an English label.
    labelled.add(morph);
  }
  return morph;
}

function analysis(word: TreebankWord, segment?: string): Analysis {
  const lemma = lemmaOf(word);
  const morph = morphOf(word);
  const classes = lemmaClasses.get(lemma) ?? new Set<string>();
  classes.add(word.upos);
  lemmaClasses.set(lemma, classes);
  if (word.upos === "PROPN") counts.names++;
  else if (word.upos === "X" || word.misc.Lang) counts.foreign++;
  else {
    counts.common++;
    if (wiktionary.lookup(lemma, word.upos)) counts.commonWithEntry++;
    else missing.set(lemma, (missing.get(lemma) ?? 0) + 1);
  }
  return segment === undefined ? [lemma, morph, "e"] : [lemma, morph, "e", segment];
}

/** A line's pieces: words with their analyses, and the punctuation and spaces between them as text. */
function pieces(items: readonly Item[], table: AnalysisTable): Piece[] {
  const out: Piece[] = [];
  const text = (s: string) => {
    if (typeof out.at(-1) === "string") out[out.length - 1] += s;
    else out.push(s);
  };
  items.forEach((item, i) => {
    if (i && spaced(items[i - 1]!, item)) text(" ");
    const words = item.surface.words.filter((word) => word.upos !== "PUNCT");
    if (item.kind !== "word" || !words.length) {
      if (item.kind === "word") counts.punctuationWords++;
      text(item.text);
      return;
    }
    if (words.length !== item.surface.words.length) throw new Error(`${item.sentence}: ${item.surface.form} joins punctuation and words`);
    counts.words++;
    if (words.length > 1) counts.multiword++;
    out.push([item.text, words.map((word) => table.add(analysis(word, words.length > 1 ? word.form.replace(/'/gu, "’") : undefined)))]);
  });
  return out;
}

// ---- Works: one per canto, a row per tercet ---------------------------------------------------------------------
const works: Work[] = [];
for (const cantica of CANTICHE) {
  const layout = layCantica(cantica, sentences.filter((s) => s.cantica === cantica), italian[cantica], used);
  const s = layout.stats;
  console.log(`${cantica}: ${s.words} words; lines from the treebank ${s.treebank} (${s.fixed} corrected), from Gutenberg ${s.gutenberg}, ` +
    `from neighbours ${s.neighbours}, from the table ${s.table}`);
  for (let c = 1; c <= CANTOS[cantica]; c++) {
    const slug = `${cantica}-${c}`;
    const table = new AnalysisTable();
    const lines = layout.cantos[c - 1]!.map((line) => pieces(line, table));
    const english = longfellow.cantos[cantica][c - 1]!;
    if (english.lines.length !== lines.length || english.blocks.join() !== italian[cantica][c - 1]!.blocks.join()) {
      throw new Error(`${slug}: Longfellow's tercets differ from the Italian's`);
    }
    const notes: Record<string, string> = {};
    const rows: Row[] = [];
    let first = 1;
    for (const size of english.blocks) {
      const last = first + size - 1;
      const noteKeys = [...english.notes].filter(([line]) => line + 1 >= first && line + 1 <= last).map(([line, note]) => {
        const key = `longfellow-${line + 1}`;
        notes[key] = `<p>${note.map(esc).join("<br>")}</p>`;
        return key;
      });
      const source: SourceUnit[] = [{ key: `it-${first}`, kind: "stanza", firstLine: first, lines: lines.slice(first - 1, last) }];
      const target: TextUnit[] = [{
        key: `lf-${first}`, kind: "stanza", stichic: true, lines: english.lines.slice(first - 1, last),
        ...(noteKeys.length ? { notes: noteKeys } : {}),
      }];
      rows.push({ id: `${c}.${first}`, sides: { it: source, en: target } });
      first = last + 1;
    }
    works.push({ slug, rows, analyses: table.list, notes });
  }
}
if (works.map((w) => w.slug).join() !== site.works.map((w) => w.slug).join()) throw new Error("The site lists other works than the cantos built");

// ---- Dictionary records -----------------------------------------------------------------------------------------
const slugOf = (cantica: string, canto: number) => `${cantica}-${canto}`;
const toynbeeArticle = (entry: ToynbeeEntry): Article => ({
  head: entry.n ? `${entry.head} ${entry.n}` : entry.head,
  sections: [{ senses: [{ gloss: entry.html }] }],
  works: [...new Set(entry.cites.map(([cantica, canto]) => slugOf(cantica, canto)))],
});

const records = new Map<string, DictHit>();
const glosses = new Map<string, string>();
const nameCoverage = { types: 0, typesWith: 0 };
const toynbeeUsed = new Set<ToynbeeEntry>();
for (const [lemma, classes] of lemmaClasses) {
  const key = ita.fold(lemma);
  const hit: DictHit = records.get(key) ?? { entries: {} };
  for (const upos of classes) {
    const found = wiktionary.lookup(lemma, upos);
    if (found) {
      const have = new Set((hit.entries.wikt ?? []).map((a) => a.head));
      hit.entries.wikt = [...hit.entries.wikt ?? [], ...found.articles.filter((a) => !have.has(a.head))];
      if (found.via && !hit.via) hit.via = found.via;
      if (found.gloss && !glosses.has(`${lemma} ${upos === "PROPN"}`)) glosses.set(`${lemma} ${upos === "PROPN"}`, found.gloss);
    }
    if (upos === "PROPN") {
      nameCoverage.types++;
      const entries = namesFor(lemma, toynbee);
      if (entries.length) {
        nameCoverage.typesWith++;
        for (const entry of entries) toynbeeUsed.add(entry);
        const have = new Set((hit.entries.toynbee ?? []).map((a) => a.head));
        hit.entries.toynbee = [...hit.entries.toynbee ?? [], ...entries.map(toynbeeArticle).filter((a) => !have.has(a.head))];
        glosses.set(`${lemma} true`, toynbeeGloss(entries[0]!));
      } else if (!(lemma in NO_TOYNBEE)) throw new Error(`No Toynbee entry for the name ${lemma}; add it to names.ts`);
    }
  }
  if (Object.keys(hit.entries).length) records.set(key, hit);
}
const staleNames = Object.keys(NO_TOYNBEE).filter((lemma) => !lemmaClasses.get(lemma)?.has("PROPN") || namesFor(lemma, toynbee).length);
if (staleNames.length) throw new Error(`NO_TOYNBEE lemmas that are not names in the text, or have an entry: ${staleNames.join(", ")}`);

const glossFor = (lemma: string, morph: string): string => {
  const name = parseMorph(morph).upos === "PROPN";
  return glosses.get(`${lemma} ${name}`) ?? glosses.get(`${lemma} ${!name}`) ?? "";
};

const tables = { LEMMA_FIXES, VERSE_FIXES, PLACEMENTS, MARKS };
const unused = Object.entries(tables).flatMap(([name, table]) => Object.keys(table).map((key) => `${name} ${key}`)).filter((key) => !used.has(key));
if (unused.length) throw new Error(`Exception tables that nothing used: ${unused.join(", ")}`);

const coverage = counts.commonWithEntry / counts.common;
if (coverage < MIN_COVERAGE) {
  const top = [...missing].sort((a, b) => b[1] - a[1]).slice(0, 40).map(([l, n]) => `${l} (${n})`).join(", ");
  throw new Error(`Only ${(100 * coverage).toFixed(2)}% of common words have a Wiktionary entry; most frequent without: ${top}`);
}

// ---- Outputs ----------------------------------------------------------------------------------------------------
const outputs = new Outputs(site.id);
await outputs.reset();
const concordance = new Concordance(site.sides, { markPosition: true });
for (const work of works) {
  await outputs.writeWork(work);
  const stats = concordance.addWork(work.slug, work.rows, work.analyses);
  if (work.slug.endsWith("-1")) console.log(statsLine(work.slug, work.rows.length, stats));
}
await outputs.writeShards("lex", records);
await concordance.write(outputs, glossFor);

const percent = (n: number, of: number) => `${((100 * n) / of).toFixed(2)}%`;
console.log(`words: ${counts.words} (${counts.multiword} written as one with another), names ${counts.names}, foreign ${counts.foreign}, ` +
  `marks the treebank files as words ${counts.punctuationWords}`);
console.log(`common words with a Wiktionary entry: ${counts.commonWithEntry} of ${counts.common} (${percent(counts.commonWithEntry, counts.common)}); ` +
  `lemmas without: ${missing.size}, most frequent: ${[...missing].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([l, n]) => `${l} ${n}`).join(", ")}`);
console.log(`names: ${nameCoverage.typesWith} of ${nameCoverage.types} with a Toynbee entry; Toynbee entries used ${toynbeeUsed.size} of ${toynbee.length}`);
console.log(`labelled morphologies: ${labelled.size}; dictionary records: ${records.size}; concordance lemmas: ${concordance.size}`);
