// Builds the Muqaddimah Reader into generated/muqaddimah/. Run `READER=muqaddimah bun run fetch` first.
//
// Nine works (the author's preface, the Introduction, the Book One preface and the six prefatory discussions), one row
// per row of lib/openiti.ts: a paragraph of the edition (a long one cut at sentence ends into rows of at most about 250
// words), a verse passage (a stanza, one line per verse line) or a heading. A row cut from the paragraph before it is
// marked `continues`, which the page shows by opening only the other rows with ¶ (site.paragraphMarks). The Arabic is
// derived from the pinned OpenITI download (lib/openiti.ts) and must equal, character for character, the text the
// CoNLL-U tags (paragraph by paragraph, verse line by verse line); the CoNLL-U, units.json and the Wiktionary extract
// are vendored and pinned by hash, so a reviewed replacement is a copy into data/ and an update of the pins.
//
// The words. A written word is one piece with one analysis per syntactic word of its clitic cluster, as the Genesis
// Reader gives a Hebrew word one analysis per morpheme; every analysis shows the word's own vocalized form (the edition
// has no vowels) as its segmented form. A lemma's root shows beside it in the word panel (DictHit.reading). Every
// lemma is looked up in Lane's Lexicon (by root) and Wiktionary (packs/ara/build/lexicon.ts); the build fails if too few
// words have an entry, and if an exception table of the Arabic pack went unused.
//
// The English is data/en/<unit>.tsv, one line per row of the unit, which the build requires: a missing, extra, repeated
// or misplaced row stops it. A verse row's English separates its lines with " / " and must have as many as the Arabic.
// A verse row's Arabic is marked `hemistichs`: each line holds two hemistichs, which the page sets apart. Translator's
// notes are the optional data/notes.tsv (lib/units.ts readNotes): each line is a note on a row's English, shown as an
// `n` marker; a row it names must exist.
import { join } from "node:path";
import { LANE_ROOT_NOTE, loadAraLexicon } from "../../packs/ara/build/lexicon";
import { fold } from "../../packs/ara/spelling";
import { AnalysisTable } from "../../scripts/core/analyses";
import { Concordance, Outputs, statsLine } from "../../scripts/core/outputs";
import type { Row, SourceUnit, TextUnit, Work } from "../../scripts/core/types";
import type { Article, DictHit } from "../../src/lib/dict";
import { parseMorph } from "../../src/lib/morph";
import { CACHE } from "./fetch";
import { Annotator, type Occurrence } from "./lib/annotate";
import { parseUnit } from "./lib/conllu";
import { countWords, parseOpenITI, type OitiRow } from "./lib/openiti";
import { readPinned } from "./lib/pins";
import { dropRedundantSegments } from "./lib/search";
import { DATA, loadUnits, noteHtml, readEnglish, readNotes, type UnitInfo } from "./lib/units";
import { site } from "./site";
import { CONLLU_SHA, DERIVED, OPENITI, WIKTIONARY_SHA } from "./sources";

/**
 * Share of each work's words, names, foreign words and numerals in digits apart, whose lemma must have an entry in Lane
 * or Wiktionary. A floor under the figure the pack's author measured on CAMeL's unpatched lemmas for the whole text (97.4%
 * of tokens): it fails a build whose Wiktionary extract or Lane directory was made for other lemmas (a stale cache or a
 * replaced CoNLL-U), and the figures printed below show where the real value stands.
 */
const MIN_COVERAGE = 0.9;

const units = await loadUnits();
const rowNotes = await readNotes(new Set(units.units.flatMap((unit) => unit.pids)));
const openiti = parseOpenITI(await readPinned(join(CACHE, DERIVED.openiti), OPENITI.sha256, "the OpenITI download"));

if (openiti.map((work) => work.slug).join() !== units.works.map((work) => work.slug).join()) {
  throw new Error("units.json lists other works than lib/openiti.ts finds in the download");
}
if (site.works.map((work) => work.slug).join() !== units.works.map((work) => work.slug).join()) {
  throw new Error("The site lists other works than units.json");
}
for (const [index, work] of units.works.entries()) {
  if (site.works[index]!.english.replaceAll("’", "'") !== work.title_en) {
    throw new Error(`${work.slug}: the site's English title "${site.works[index]!.english}" is not units.json's "${work.title_en}"`);
  }
}

const wiktionary = join(DATA, "wiktionary.json");
await readPinned(wiktionary, WIKTIONARY_SHA, "data/wiktionary.json");
const lexicon = await loadAraLexicon({ laneDir: join(CACHE, DERIVED.lane), wiktionary });
const an = new Annotator(lexicon);

const rowsOf = new Map<string, OitiRow>(openiti.flatMap((work) => work.rows.map((row) => [row.pid, row] as const)));

/** The English of a row as units: one line, or a verse row's lines. */
function englishLines(row: OitiRow, text: string): string[] {
  const lines = text.split(" / ");
  if (row.kind !== "verse") {
    if (lines.length > 1) throw new Error(`${row.pid}: the English has " / " verse separators, but the row is ${row.kind === "head" ? "a heading" : "prose"}`);
    return lines;
  }
  if (lines.length !== row.lines!.length) throw new Error(`${row.pid}: ${row.lines!.length} Arabic verse lines, ${lines.length} in the English`);
  return lines;
}

/**
 * One unit's rows: the Arabic with its analyses, beside the English. Checks the CoNLL-U against the download. The
 * translator's notes of its rows are added to `workNotes`, keyed "<pid>-n<k>" for the row's k-th note.
 */
async function buildUnit(unit: UnitInfo, table: AnalysisTable, workNotes: Record<string, string>): Promise<Row[]> {
  const paragraphs = parseUnit(
    await readPinned(join(DATA, "conllu", `${unit.id}.conllu`), CONLLU_SHA[unit.id], `data/conllu/${unit.id}.conllu`),
    unit.id,
  );
  let at = 0;
  while (at < Math.max(paragraphs.length, unit.pids.length) && paragraphs[at]?.pid === unit.pids[at]) at++;
  if (at < Math.max(paragraphs.length, unit.pids.length)) {
    throw new Error(`${unit.id}: the CoNLL-U has ${paragraphs.length} paragraphs and units.json ${unit.pids.length}; they differ at ` +
      `${paragraphs[at]?.pid ?? "its end"} (CoNLL-U) and ${unit.pids[at] ?? "its end"} (units.json)`);
  }
  const english = await readEnglish(unit);
  const continues = new Set(unit.continues);
  let words = 0;
  const rows = paragraphs.map((paragraph): Row => {
    const row = rowsOf.get(paragraph.pid);
    if (!row) throw new Error(`${paragraph.pid}: the download has no such row`);
    if (paragraph.text !== row.text) {
      throw new Error(`${paragraph.pid}: the CoNLL-U text ${JSON.stringify(paragraph.text.slice(0, 80))} is not the download's ${JSON.stringify(row.text.slice(0, 80))}`);
    }
    if ((unit.headings[row.pid] !== undefined) !== (row.kind === "head") || (row.kind === "head" && unit.headings[row.pid] !== row.level)) {
      throw new Error(`${row.pid}: units.json and the download disagree on whether the row is a heading, and its level`);
    }
    if (continues.has(row.pid) !== (row.continues === true)) {
      throw new Error(`${row.pid}: units.json and the download disagree on whether the row carries on the paragraph before it`);
    }
    words += countWords(row.text);
    const key = String(row.n);
    const text = english.get(row.pid)!;
    const noteKeys = (rowNotes.get(row.pid) ?? []).map((note, index) => {
      const noteKey = `${row.pid}-n${index + 1}`;
      workNotes[noteKey] = `<p>${noteHtml(note)}</p>`;
      return noteKey;
    });
    const noted = noteKeys.length ? { notes: noteKeys } : {};
    if (row.kind === "verse") {
      if (paragraph.sentences.length !== row.lines!.length) throw new Error(`${row.pid}: ${paragraph.sentences.length} sentences for ${row.lines!.length} verse lines`);
      paragraph.sentences.forEach((sentence, i) => {
        if (sentence.text !== row.lines![i]) throw new Error(`${sentence.id}: the CoNLL-U verse line is not the download's`);
      });
      const arabic: SourceUnit = {
        key: `ar-${key}`, kind: "stanza", hemistichs: true, lines: paragraph.sentences.map((sentence) => an.pieces([sentence], table)),
      };
      const translation: TextUnit = { key: `en-${key}`, kind: "stanza", stichic: true, lines: englishLines(row, text), ...noted };
      return { id: key, sides: { ar: [arabic], en: [translation] } };
    }
    const kind = row.kind === "head" ? "head" : "prose";
    const arabic: SourceUnit = { key: `ar-${key}`, kind, lines: [an.pieces(paragraph.sentences, table)] };
    const translation: TextUnit = { key: `en-${key}`, kind, lines: englishLines(row, text), ...noted };
    return { id: key, ...(row.continues ? { continues: true as const } : {}), sides: { ar: [arabic], en: [translation] } };
  });
  if (words !== unit.words) throw new Error(`${unit.id}: ${words} words in the rows, units.json says ${unit.words}`);
  return rows;
}

const works: Work[] = [];
for (const info of units.works) {
  const source = openiti.find((work) => work.slug === info.slug)!;
  an.begin(info.slug);
  const table = new AnalysisTable();
  const rows: Row[] = [];
  const workNotes: Record<string, string> = {};
  for (const id of info.units) rows.push(...await buildUnit(units.units.find((unit) => unit.id === id)!, table, workNotes));
  if (rows.map((row) => row.id).join() !== source.rows.map((row) => String(row.n)).join()) {
    throw new Error(`${info.slug}: the units' rows are not the download's rows of the work`);
  }
  works.push({ slug: info.slug, rows, analyses: table.list, notes: workNotes });
}

// ---------------------------------------------------------------- dictionary records and glosses
// One record per folded lemma: Lane's and Wiktionary's entries for each (root, class) the lemma occurs with, the most
// frequent first, and the lemma's root as its reading.
const byLemma = new Map<string, Occurrence[]>();
for (const occurrence of an.occurrences.values()) {
  const list = byLemma.get(occurrence.lemma);
  if (list) list.push(occurrence);
  else byLemma.set(occurrence.lemma, [occurrence]);
}
// Lane's articles for a word it has no article of (laneMatch "root") are its root's first articles. They are shown, with a
// note saying so (DictHit.notes), only in a record where no word has articles of its own: else they are left out.
const ownLane = new Set<string>();
for (const { lemma, lookup } of an.occurrences.values()) {
  if (lookup?.laneMatch && lookup.laneMatch !== "root") ownLane.add(fold(lemma));
}
const records = new Map<string, DictHit>();
const glosses = new Map<string, string>();
const lemmaGlosses = new Map<string, string>();
let withRoot = 0;
for (const [lemma, occurrences] of byLemma) {
  occurrences.sort((a, b) => b.count - a.count);
  const key = fold(lemma);
  const hit: DictHit = records.get(key) ?? { entries: {} };
  for (const { upos, lookup } of occurrences) {
    if (!lookup) continue;
    for (const [id, articles] of Object.entries(lookup.entries) as [string, Article[] | undefined][]) {
      if (!articles) continue;
      if (id === "lane" && lookup.laneMatch === "root" && ownLane.has(key)) continue;
      const have = new Set((hit.entries[id] ?? []).map((article) => article.head));
      hit.entries[id] = [...hit.entries[id] ?? [], ...articles.filter((article) => !have.has(article.head))];
    }
    if (lookup.via && !hit.via) hit.via = lookup.via;
    if (lookup.laneMatch === "root" && !ownLane.has(key)) hit.notes = { lane: LANE_ROOT_NOTE };
    if (lookup.gloss) {
      if (!glosses.has(`${lemma}\t${upos}`)) glosses.set(`${lemma}\t${upos}`, lookup.gloss);
      if (!lemmaGlosses.has(lemma)) lemmaGlosses.set(lemma, lookup.gloss);
    }
  }
  const root = occurrences.map((occurrence) => lexicon.root(lemma, occurrence.root, occurrence.upos)).find(Boolean);
  if (root && !hit.reading) {
    hit.reading = `root ${root}`;
    withRoot++;
  }
  if (Object.keys(hit.entries).length || hit.reading) records.set(key, hit);
}
const glossFor = (lemma: string, morph: string): string => glosses.get(`${lemma}\t${parseMorph(morph).upos}`) ?? lemmaGlosses.get(lemma) ?? "";

const unusedLexicon = lexicon.unused();
if (unusedLexicon.length) throw new Error(`Exception-table entries of the Arabic pack that nothing used: ${unusedLexicon.join(", ")}`);

const topMissing = (missing: ReadonlyMap<string, number>, count: number): [string, number][] => [...missing].sort((a, b) => b[1] - a[1]).slice(0, count);
for (const [slug, tally] of an.tallies) {
  const coverage = tally.common ? tally.commonWithEntry / tally.common : 1;
  if (coverage < MIN_COVERAGE) {
    const top = topMissing(tally.missing, 40).map(([lemma, n]) => `${lemma} (${n})`).join(", ");
    throw new Error(`${slug}: only ${(100 * coverage).toFixed(2)}% of common words have a Lane or Wiktionary entry; most frequent without: ${top}`);
  }
}

// ---------------------------------------------------------------- outputs
const outputs = new Outputs(site.id);
await outputs.reset();
// A row is a whole paragraph (up to 2,300 words), so a concordance entry shows only 120 characters each side of its word.
const concordance = new Concordance(site.sides, { context: 120 });
for (const work of works) {
  await outputs.writeWork(work);
  console.log(statsLine(work.slug, work.rows.length, concordance.addWork(work.slug, work.rows, work.analyses)));
}
await outputs.writeShards("lex", records);
await concordance.write(outputs, glossFor);
const segments = await dropRedundantSegments(join(outputs.public, "search.json"));

for (const [slug, tally] of an.tallies) {
  const missing = topMissing(tally.missing, 15).map(([lemma, n]) => `${lemma} ${n}`).join(", ");
  console.log(`${slug}: written words ${tally.written} (${tally.multiword} with clitics), syntactic words ${tally.words}, names ${tally.names}, foreign ${tally.foreign}`);
  console.log(`${slug}: common words with an entry: ${tally.commonWithEntry} of ${tally.common} (${tally.common ? ((100 * tally.commonWithEntry) / tally.common).toFixed(2) : "–"}%); ` +
    `lemmas ${tally.covered.size} of ${tally.lemmas.size}; lemmas without an entry: ${tally.missing.size}, most frequent: ${missing}`);
}
console.log(`search segments kept (clitic clusters): ${segments.kept}, dropped (vocalization only): ${segments.dropped}`);
const allRows = works.flatMap((work) => work.rows);
console.log(`rows: ${allRows.length} (${allRows.filter((row) => row.continues).length} carrying on the paragraph before); ` +
  `translator's notes: ${[...rowNotes.values()].reduce((sum, list) => sum + list.length, 0)}; lemmas ${byLemma.size} (${withRoot} with a root); ` +
  `dictionary records: ${records.size} (${[...records.values()].filter((hit) => hit.notes).length} with Lane's root articles only); concordance lemmas: ${concordance.size}`);
