// Builds the pinned DCS and Besant sources into generated/gita/. Run fetch:gita first.
// A DCS sentence is one half-verse here. Speakers have their own sentence before verses 1 and 2.
import { join } from "node:path";
import type { DictHit } from "../../src/lib/dict";
import { sanskrit } from "../../src/lang/san";
import { gita } from "../../src/sites/gita";
import { Concordance, Outputs, statsLine } from "../core/outputs";
import { AnalysisTable, FormIndex } from "../lib/analyses";
import type { OnUnit, Piece, Row, Work } from "../lib/types";
import { BESANT_PAGES, CACHE } from "./fetch";
import { parseBesant } from "./lib/besant";
import { parseConllu, type DcsSentence } from "./lib/conllu";
import { dictionaryArticle, parseDictionary, type DictionaryRow } from "./lib/dictionary";
import { dcsMorph } from "./lib/morph";

const definition = gita.works[0]!;
const sentences = parseConllu(await Bun.file(join(CACHE, "chapter-12.conllu")).text());
const besant = parseBesant(
  await Bun.file(join(CACHE, "discourse-12.wiki")).text(),
  await Promise.all(BESANT_PAGES.map(([page]) => Bun.file(join(CACHE, "besant", `${page}.wiki`)).text())),
);
if (besant.title !== definition.english) throw new Error(`Besant colophon title differs from the site: ${besant.title}`);
const dictionary = parseDictionary(await Bun.file(join(CACHE, "dictionary.csv")).text());
const verses = new Map<number, DcsSentence[]>();
for (const sentence of sentences) {
  const group = verses.get(sentence.verse) ?? [];
  if (group.some((part) => part.part === sentence.part)) {
    throw new Error(`Duplicate DCS verse ${sentence.verse}, part ${sentence.part}`);
  }
  group.push(sentence);
  verses.set(sentence.verse, group);
}
for (const [side, verseMap] of [["DCS", verses], ["Besant", besant.verses]] as const) {
  for (let verse = 1; verse <= 20; verse++) {
    if (!verseMap.has(verse)) throw new Error(`Missing ${side} verse ${verse}`);
  }
  if (verseMap.size !== 20) throw new Error(`Expected verses 1–20 in ${side}, got ${[...verseMap.keys()].join(", ")}`);
}

const table = new AnalysisTable(new FormIndex());
const lemmaRows = new Map<string, Map<string, DictionaryRow>>();
let grammaticalWords = 0;
let multiwordTokens = 0;

function lineFor(sentence: DcsSentence): Piece[] {
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
      return table.add(multiword
        ? [word.lemma, morph, "e", word.misc.Unsandhied || word.form]
        : [word.lemma, morph, "e"]);
    });
    if (!ids.length) throw new Error(`Unanalysed DCS surface token in ${sentence.id}: ${token.form}`);
    pieces.push([token.form, ids]);
  }
  return pieces;
}

const rows: Row[] = [];
for (let verse = 1; verse <= 20; verse++) {
  const parts = verses.get(verse)!.sort((a, b) => a.part - b.part);
  const on: OnUnit[] = [];
  const first = parts[0]!;
  const lastWord = first.tokens.at(-1)?.words.at(-1);
  const hasSpeaker = lastWord?.lemma === "vac" && lastWord.misc.Unsandhied === "uvāca";
  const expectedParts = hasSpeaker ? 3 : 2;
  if (parts.length !== expectedParts || parts.some((part, index) => part.part !== index + 1)) {
    throw new Error(`DCS verse ${verse} does not have two consecutive half-verses and an optional speaker`);
  }
  if (hasSpeaker) on.push({ key: `dcs-${first.id}`, kind: "head", lines: [lineFor(first)] });
  const halves = hasSpeaker ? parts.slice(1) : parts;
  const lines = halves.map((half, index) => [...lineFor(half), index === 0 ? " |" : " ||"]);
  on.push({ key: `dcs-${halves.map((half) => half.id).join("-")}`, kind: "stanza", label: String(verse), lines });
  rows.push({ id: String(verse), on, en: besant.verses.get(verse)! });
}

const work: Work = { slug: definition.slug, rows, analyses: table.list, notes: {} };
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
await outputs.writeWork(work);
await outputs.writeShards("lex", records);
const concordance = new Concordance();
const counts = concordance.addWork(work.slug, work.rows, work.analyses);
await concordance.write(outputs, (lemma) => glosses.get(sanskrit.fold(lemma)) ?? "");
console.log(statsLine(work.slug, rows.length, counts));
console.log(`DCS: ${grammaticalWords} grammatical words, ${multiwordTokens} multiword tokens, ${table.list.length} distinct analyses`);
console.log(`lemmas in corpus: ${lemmaRows.size}, with a dictionary entry: ${records.size}; concordance lemmas: ${concordance.size}`);
