// Builds the twenty books of the Analects into generated/analects/. Run `READER=analects bun run fetch` first.
// The Chinese is the Kyoto treebank's own text, every token with its lemma, UPOS, features and gloss; Legge's Chinese
// gives the chapters and the punctuation (alignment.ts), his English the translation. One work per book, one row per
// chapter of Legge's, preceded by a row for the book's title.
import { join } from "node:path";
import type { DictHit } from "../../src/lib/dict";
import { parseMorph } from "../../src/lib/morph";
import { pack as chinese } from "../../packs/lzh";
import { parseKyoto, type KyotoToken } from "../../packs/lzh/build/conllu";
import { dictionaryRecord, firstPinyin, type LemmaUse } from "../../packs/lzh/build/dictionary";
import { kyotoMorph } from "../../packs/lzh/build/morph";
import { parseUnihanReadings, parseUnihanVariants, variantField } from "../../packs/lzh/build/unihan";
import { parseWiktionary } from "../../packs/lzh/build/wiktionary";
import { glossText } from "../../packs/lzh/morph";
import { fold, VARIANTS } from "../../packs/lzh/spelling";
import { AnalysisTable } from "../../scripts/core/analyses";
import { Concordance, Outputs, statsLine, type WorkCounts } from "../../scripts/core/outputs";
import type { Piece, Row, SourceUnit, Work } from "../../scripts/core/types";
import { alignBook, DIFFERENCES, MISSING_MARKERS, REPEATED, SUBSTITUTES, Used, type AlignedChapter } from "./alignment";
import { CACHE as DIR } from "./fetch";
import { parseLegge } from "./lib/legge";
import { BOOKS, site } from "./site";
import { CACHE as FILES } from "./sources";

const read = (rel: string) => Bun.file(join(DIR, rel)).text();

/** Variant pairs of spelling.ts that Unihan does not relate (the build checks that it still does not). */
const NOT_IN_UNIHAN = ["尙", "顚", "喩"];

const books = parseKyoto(await read(FILES.kyoto));
const legge = parseLegge(await read(FILES.legge));
const unihanVariants = parseUnihanVariants(await read(FILES.variants));
for (const [from, to] of Object.entries(VARIANTS)) {
  const related = variantField(unihanVariants, from, to) !== undefined;
  if (NOT_IN_UNIHAN.includes(from) === related) {
    throw new Error(`${from} → ${to}: ${related ? "Unihan now relates these variants; remove it from NOT_IN_UNIHAN" : "Unihan does not relate these variants"}`);
  }
}

// The treebank lemmatizes to Kanripo's forms (為 → 爲); the reader shows the form the text prints, which is the folded one.
const labelled = new Set<string>();
const uses = new Map<string, LemmaUse>();
const bump = (map: Map<string, Map<string, number>>, upos: string, key: string) => {
  const counts = map.get(upos) ?? new Map<string, number>();
  counts.set(key, (counts.get(key) ?? 0) + 1);
  map.set(upos, counts);
};

function analysis(token: KyotoToken, table: AnalysisTable): number {
  if (fold(token.form) !== token.form) throw new Error(`The text prints ${token.form}, a form the pack folds away`);
  const lemma = fold(token.lemma);
  if (token.lemma !== token.form && lemma !== token.form) throw new Error(`Lemma ${token.lemma} of ${token.form} is not a listed variant`);
  const morph = kyotoMorph(token);
  if (!labelled.has(morph)) {
    chinese.describeMorph(morph); // Throws on any word class, feature, value, class or gloss code without an English label.
    labelled.add(morph);
  }
  let use = uses.get(lemma);
  if (!use) uses.set(lemma, use = { lemma, morphs: new Map(), glosses: new Map() });
  bump(use.morphs, token.upos, morph);
  bump(use.glosses, token.upos, token.gloss);
  return table.add([lemma, morph, "e"]);
}

/** Legge's English heading in title case, for comparison with BOOKS and display. */
const titleCase = (heading: string): string => heading.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_, before: string, letter: string) => before + letter.toUpperCase());

/** One chapter's pieces: Kyoto's words with Legge's punctuation, a line to each sentence ending in 。. */
function chapterLines(chapter: AlignedChapter, table: AnalysisTable): Piece[][] {
  const lines: Piece[][] = [[]];
  let offset = 0;
  for (const sentence of chapter.sentences) {
    for (const token of sentence.tokens) {
      lines.at(-1)!.push([token.form, [analysis(token, table)]]);
      offset += token.form.length;
      const mark = chapter.marks.get(offset - 1);
      if (mark) {
        lines.at(-1)!.push(mark);
        if (mark.includes("。")) lines.push([]);
      }
    }
  }
  if (!lines.at(-1)!.length) lines.pop();
  return lines;
}

const used = new Used();
const works: Work[] = [];
const alignment = { chapters: 0, same: 0, substituted: 0, differences: 0, marks: 0 };
legge.forEach((leggeBook, index) => {
  const kyoto = books[index]!;
  const info = BOOKS[index]!;
  const work = site.works[index]!;
  if (kyoto.book !== leggeBook.book || work.slug !== `analects-${kyoto.book}`) throw new Error(`Book ${index + 1} out of order`);
  if (!kyoto.title.text.startsWith(`${info.zh}篇第`)) throw new Error(`Book ${kyoto.book} is titled ${kyoto.title.text}, not ${info.zh}`);
  if (titleCase(leggeBook.heading) !== info.legge) throw new Error(`Legge heads book ${kyoto.book} "${titleCase(leggeBook.heading)}", not "${info.legge}"`);
  const { chapters, stats } = alignBook(kyoto, leggeBook, used);
  for (const key of Object.keys(alignment) as (keyof typeof alignment)[]) alignment[key] += stats[key];

  const table = new AnalysisTable();
  const rows: Row[] = [];
  for (const chapter of chapters) {
    rows.push({
      id: String(chapter.number),
      sides: {
        // A stanza, not prose: the reader joins the lines of a prose unit with spaces, and only a stanza shows its label
        // (the chapter number) in the margin. Each line is one sentence ending in 。.
        lzh: [{ key: `kyoto-${kyoto.book}.${chapter.number}`, kind: "stanza", label: String(chapter.number), lines: chapterLines(chapter, table) }],
        en: [{ key: `legge-${kyoto.book}.${chapter.number}`, kind: "prose", lines: [leggeBook.english[chapter.number - 1]!] }],
      },
    });
  }
  works.push({ slug: work.slug, rows, analyses: table.list, notes: {} });
  for (const row of rows) {
    for (const unit of row.sides.lzh as SourceUnit[]) {
      for (const line of unit.lines) {
        const space = line.map((piece) => (typeof piece === "string" ? piece : piece[0])).join("").match(/\s/u);
        if (space) throw new Error(`${work.slug} ${row.id}: Chinese text contains whitespace`);
      }
    }
  }
});
if (works.length !== site.works.length) throw new Error("The site lists other works than the twenty books");

const unused = [
  ...Object.keys(SUBSTITUTES).filter((key) => !used.substitutes.has(key)).map((key) => `SUBSTITUTES ${key}`),
  ...Object.keys(MISSING_MARKERS).filter((key) => !used.markers.has(key)).map((key) => `MISSING_MARKERS ${key}`),
  ...DIFFERENCES.flatMap((entry, i) => (used.differences.has(i) ? [] : [`DIFFERENCES ${entry.book} ${entry.before}`])),
  ...REPEATED.flatMap((entry, i) => (used.repeated.has(i) ? [] : [`REPEATED ${entry.text}`])),
];
if (unused.length) throw new Error(`Alignment exceptions no longer needed: ${unused.join("; ")}`);

// Dictionary records for every lemma, keyed like the shards: the pack's fold of the lemma as shown.
const chars = new Set([...uses.keys()].flatMap((lemma) => [...lemma]));
const lookups = {
  wiktionary: parseWiktionary(await read(FILES.wiktionary)),
  unihan: parseUnihanReadings(await read(FILES.readings), chars),
};
const records = new Map<string, DictHit>();
const coverage = { wiktionary: 0, unihan: 0, reading: 0 };
for (const use of uses.values()) {
  const record = dictionaryRecord(use, lookups);
  records.set(chinese.fold(use.lemma), record);
  if (record.entries.wiktionary) coverage.wiktionary++;
  if (record.entries.unihan) coverage.unihan++;
  if (record.reading) coverage.reading++;
}

/** The lexicon's short gloss: the lemma's pinyin and the treebank's most frequent gloss for the word class. */
function glossFor(lemma: string, morph: string): string {
  const use = uses.get(lemma);
  const glosses = use?.glosses.get(parseMorph(morph).upos);
  if (!use || !glosses) return "";
  const [gloss] = [...glosses].sort((a, b) => b[1] - a[1])[0]!;
  const reading = records.get(chinese.fold(lemma))?.reading;
  return `${reading ? `${firstPinyin(reading)} · ` : ""}${glossText(gloss).text}`;
}

const outputs = new Outputs(site.id);
await outputs.reset();
// Chinese has no spaces, so a concordance line marks the word at its own place, not the first occurrence of its text.
const concordance = new Concordance(site.sides, { markPosition: true });
const total: WorkCounts = { words: 0, parsed: 0, annotated: 0 };
let rowCount = 0;
for (const work of works) {
  await outputs.writeWork(work);
  const counts = concordance.addWork(work.slug, work.rows, work.analyses);
  console.log(statsLine(work.slug, work.rows.length, counts));
  rowCount += work.rows.length;
  for (const key of Object.keys(total) as (keyof WorkCounts)[]) total[key] += counts[key];
}
await outputs.writeShards("lex", records);
// A lemma has one lexicon entry for each word class it is used as: 子 the noun and 子 the pronoun are different words.
await concordance.write(outputs, glossFor, (_lemma, morph) => parseMorph(morph).upos.toLowerCase());
console.log(statsLine("TOTAL", rowCount, total));
console.log(`chapters: ${alignment.chapters} aligned to Legge (${alignment.same.toLocaleString()} characters shared, ` +
  `${alignment.substituted} one-for-one substitutions, ${alignment.differences} listed differences); ${alignment.marks.toLocaleString()} marks of punctuation carried over`);
console.log(`labelled morphologies: ${labelled.size}; lemmas: ${uses.size}, with Wiktionary ${coverage.wiktionary}, Unihan ${coverage.unihan}, a reading ${coverage.reading}; ` +
  `lexicon entries: ${concordance.size} lemmas`);
