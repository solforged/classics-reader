// Builds all eighteen pinned DCS and Besant chapters into generated/gita/. Run fetch:gita first.
// Source sentences supply line boundaries; alignment.ts documents revised blocks and companion-source repairs.
import { join } from "node:path";
import type { DictHit } from "../../src/lib/dict";
import { sanskrit } from "../../src/lang/san";
import { gita } from "../../src/sites/gita";
import { Concordance, Outputs, statsLine } from "../core/outputs";
import { AnalysisTable, FormIndex } from "../lib/analyses";
import type { OnUnit, Piece, Work } from "../lib/types";
import { readDcsChapter } from "./alignment";
import { alignEnglish } from "./english-alignment";
import { CACHE, CHAPTERS, SOURCES } from "./fetch";
import { parseBesant } from "./lib/besant";
import type { DcsSentence } from "./lib/conllu";
import { dictionaryArticle, parseDictionary, type DictionaryRow } from "./lib/dictionary";
import { dcsMorph } from "./lib/morph";

const dictionary = parseDictionary(await Bun.file(join(CACHE, "dictionary.csv")).text());
const lemmaRows = new Map<string, Map<string, DictionaryRow>>();
const labelledMorphs = new Set<string>();
let grammaticalWords = 0;
let multiwordTokens = 0;
let unanalysedTokens = 0;

function lineFor(sentence: DcsSentence, table: AnalysisTable): Piece[] {
  const pieces: Piece[] = [];
  for (const token of sentence.tokens) {
    if (pieces.length) pieces.push(" ");
    const multiword = token.words.length > 1;
    if (multiword) multiwordTokens++;
    const ids = token.words.map((word) => {
      grammaticalWords++;
      const key = sanskrit.fold(word.lemma);
      const matches = word.misc.LemmaId
        ? [dictionary.byId.get(word.misc.LemmaId)]
        : dictionary.byWord.get(key) ?? [];
      if (word.misc.LemmaId && !matches[0]) throw new Error(`Unknown DCS LemmaId ${word.misc.LemmaId}`);
      const records = lemmaRows.get(key) ?? new Map<string, DictionaryRow>();
      for (const match of matches) if (match) records.set(match.id, match);
      lemmaRows.set(key, records);
      const morph = dcsMorph(word.upos, word.features);
      if (!labelledMorphs.has(morph)) {
        sanskrit.describeMorph(morph); // Throws on any word class, feature or value without an English label.
        labelledMorphs.add(morph);
      }
      return table.add(multiword
        ? [word.lemma, morph, "e", word.misc.Unsandhied || word.form]
        : [word.lemma, morph, "e"]);
    });
    if (!ids.length) {
      if (!token.unanalysed) throw new Error(`Unanalysed DCS surface token in ${sentence.id}: ${token.form}`);
      unanalysedTokens++;
    }
    pieces.push([token.form, ids]);
  }
  return pieces;
}

const works: Work[] = [];
const chapterCounts: string[] = [];
let sanskritVerses = 0;
let englishVerses = 0;
for (const source of CHAPTERS) {
  const chapter = source.chapter;
  const definition = gita.works.find((work) => work.slug === `bhagavad-gita-${chapter}`);
  if (!definition) throw new Error(`Missing Gītā chapter ${chapter} site definition`);
  const supplementFile = `chapter-${chapter}-parsed.conllu`;
  const supplement = Object.hasOwn(SOURCES, supplementFile)
    ? await Bun.file(join(CACHE, supplementFile)).text()
    : undefined;
  const dcs = readDcsChapter(chapter, await Bun.file(join(CACHE, `chapter-${chapter}.conllu`)).text(), supplement);
  const besant = parseBesant(
    await Bun.file(join(CACHE, `discourse-${chapter}.wiki`)).text(),
    await Promise.all(source.pages.map(([page]) => Bun.file(join(CACHE, "besant", `${page}.wiki`)).text())),
    chapter,
  );
  if (besant.title !== definition.english) {
    throw new Error(`Besant chapter ${chapter} colophon differs from the site: ${besant.title}`);
  }
  const table = new AnalysisTable(new FormIndex());
  const on = new Map<number, OnUnit[]>();
  for (const [verse, sourceVerse] of dcs) {
    const units: OnUnit[] = sourceVerse.heads.map((head) => ({
      key: `dcs-${head.id}`, kind: "head", lines: [lineFor(head, table)],
    }));
    const lines = sourceVerse.lines.map((line, index) => [
      ...lineFor(line, table), index === sourceVerse.lines.length - 1 ? " ||" : " |",
    ]);
    if (!lines.length) throw new Error(`DCS verse ${chapter}.${verse} has no Sanskrit lines`);
    units.push({
      key: `dcs-${sourceVerse.lines.map((line) => line.id).join("-")}`,
      kind: "stanza", label: String(verse), lines,
    });
    on.set(verse, units);
  }
  const rows = alignEnglish(chapter, on, besant.verses);
  works.push({ slug: definition.slug, rows, analyses: table.list, notes: {} });
  sanskritVerses += dcs.size;
  englishVerses += besant.verses.size;
  chapterCounts.push(`chapter ${String(chapter).padStart(2)}: DCS ${dcs.size}, Besant ${besant.verses.size}, rows ${rows.length}`);
}
if (works.length !== 18 || gita.works.length !== 18) throw new Error("The Gītā requires eighteen chapter works");

const records = new Map<string, DictHit>();
const glosses = new Map<string, string>();
for (const [key, matches] of lemmaRows) {
  const articles = [...matches.values()].flatMap((row) => {
    const article = dictionaryArticle(row);
    if (!article) return [];
    if (!glosses.has(key)) {
      const gloss = row.meanings.join("; ");
      glosses.set(key, gloss.length <= 70 ? gloss : `${gloss.slice(0, 70).trimEnd()}…`);
    }
    return [article];
  });
  if (articles.length) records.set(key, { entries: { dcs: articles } });
}

const outputs = new Outputs("gita");
await outputs.reset();
const concordance = new Concordance();
const stats: string[] = [];
for (const work of works) {
  await outputs.writeWork(work);
  const counts = concordance.addWork(work.slug, work.rows, work.analyses);
  stats.push(statsLine(work.slug, work.rows.length, counts));
}
await outputs.writeShards("lex", records);
await concordance.write(outputs, (lemma) => glosses.get(sanskrit.fold(lemma)) ?? "");
console.log(chapterCounts.join("\n"));
console.log(stats.join("\n"));
console.log(`verses: DCS ${sanskritVerses}, Besant ${englishVerses}; works: ${works.length}`);
console.log(`DCS: ${grammaticalWords} grammatical words, ${multiwordTokens} multiword tokens; labelled morphologies: ${labelledMorphs.size}`);
console.log(`documented source forms without usable analyses: ${unanalysedTokens}`);
console.log(`lemmas in corpus: ${lemmaRows.size}, with a dictionary entry: ${records.size}; concordance lemmas: ${concordance.size}`);
