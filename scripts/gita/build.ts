// Builds all eighteen pinned DCS and Besant chapters into generated/gita/. Run fetch:gita first.
// Chapters 1–2 use Besant's sandhied Sanskrit; the remaining chapters retain DCS surface tokens and lines.
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
import type { DcsToken } from "./lib/conllu";
import { dictionaryArticle, parseDictionary, type DictionaryRow } from "./lib/dictionary";
import { dcsMorph } from "./lib/morph";
import { parseBesantSanskrit } from "./lib/besant-sanskrit";
import { alignBesantSanskrit } from "./surface-alignment";

const dictionary = parseDictionary(await Bun.file(join(CACHE, "dictionary.csv")).text());
const lemmaRows = new Map<string, Map<string, DictionaryRow>>();
const labelledMorphs = new Set<string>();
let grammaticalWords = 0;
let multiwordTokens = 0;
let unanalysedTokens = 0;

function piecesFor(tokens: readonly DcsToken[], context: string, table: AnalysisTable): Piece[] {
  const pieces: Piece[] = [];
  for (const token of tokens) {
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
      // The word as DCS segments it, when sandhi changes the written form or the token joins several words.
      const unsandhied = (word.misc.Unsandhied || word.form).normalize("NFC");
      return table.add(multiword || unsandhied !== token.form.normalize("NFC")
        ? [word.lemma, morph, "e", unsandhied]
        : [word.lemma, morph, "e"]);
    });
    if (!ids.length) {
      if (!token.unanalysed) throw new Error(`Unanalysed Sanskrit surface token in ${context}: ${token.form}`);
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
const tables = new Map<string, AnalysisTable>();
for (const source of CHAPTERS) {
  const chapter = source.chapter;
  const definition = gita.works.find((work) => work.slug === `bhagavad-gita-${chapter}`);
  if (!definition) throw new Error(`Missing Gītā chapter ${chapter} site definition`);
  const supplementFile = `chapter-${chapter}-parsed.conllu`;
  const supplement = Object.hasOwn(SOURCES, supplementFile)
    ? await Bun.file(join(CACHE, supplementFile)).text()
    : undefined;
  const dcs = readDcsChapter(chapter, await Bun.file(join(CACHE, `chapter-${chapter}.conllu`)).text(), supplement);
  const pageWiki = await Promise.all(source.pages.map(([page]) => Bun.file(join(CACHE, "besant", `${page}.wiki`)).text()));
  const besant = parseBesant(
    await Bun.file(join(CACHE, `discourse-${chapter}.wiki`)).text(),
    pageWiki,
    chapter,
  );
  if (besant.title !== definition.english) {
    throw new Error(`Besant chapter ${chapter} colophon differs from the site: ${besant.title}`);
  }
  const sanskritDisplay = chapter <= 2 ? parseBesantSanskrit(chapter, pageWiki) : undefined;
  const table = new AnalysisTable(new FormIndex());
  tables.set(definition.slug, table);
  const on = new Map<number, OnUnit[]>();
  for (const [verse, sourceVerse] of dcs) {
    if (sanskritDisplay) {
      const display = sanskritDisplay.get(verse);
      if (!display) throw new Error(`Missing Besant Sanskrit verse ${chapter}.${verse}`);
      const aligned = alignBesantSanskrit(chapter, verse, sourceVerse, display);
      const stanzaLines = aligned.filter((unit) => unit.kind === "stanza").reduce((count, unit) => count + unit.lines.length, 0);
      let lineNumber = 0;
      let labelled = false;
      on.set(verse, aligned.map((unit, index): OnUnit => {
        const lines = unit.lines.map((tokens) => {
          const pieces = piecesFor(tokens, `${chapter}.${verse}`, table);
          if (unit.kind === "head") pieces.push(" |");
          else {
            lineNumber++;
            pieces.push(lineNumber < stanzaLines ? " |" : " ||");
          }
          return pieces;
        });
        const label = unit.kind === "stanza" && !labelled ? String(verse) : undefined;
        if (label) labelled = true;
        return { key: `besant-sa-${verse}-${index + 1}`, kind: unit.kind, ...(label ? { label } : {}), lines };
      }));
      continue;
    }
    const units: OnUnit[] = sourceVerse.heads.map((head) => ({
      key: `dcs-${head.id}`, kind: "head", lines: [piecesFor(head.tokens, head.id, table)],
    }));
    const lines = sourceVerse.lines.map((line, index) => [
      ...piecesFor(line.tokens, line.id, table), index === sourceVerse.lines.length - 1 ? " ||" : " |",
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

// Words with no analysis of their own (Besant's extra speaker captions in chapter 1, the second half of the verb he
// splits at 2.67, the four unannotated chapter 13 words) get candidate analyses ("a"): those DCS gives the same
// written form as a single word elsewhere in the Gītā, most frequent first. Speaker captions look first among other
// captions, where a name is nominative rather than the vocative of the verses.
type Tally = Map<string, { lemma: string; morph: string; count: number }>;
const attested = { head: new Map<string, Tally>(), any: new Map<string, Tally>() };
function eachWord(work: Work, visit: (piece: [string, number[]], head: boolean) => void): void {
  for (const row of work.rows) for (const unit of row.on) for (const line of unit.lines) {
    for (const piece of line) if (typeof piece !== "string") visit(piece as [string, number[]], unit.kind === "head");
  }
}
for (const work of works) {
  eachWord(work, ([form, ids], head) => {
    const analysis = ids.length === 1 ? work.analyses[ids[0]!]! : undefined;
    if (!analysis || analysis[2] !== "e") return;
    const key = sanskrit.fold(form);
    for (const index of head ? [attested.head, attested.any] : [attested.any]) {
      const tally = index.get(key) ?? new Map();
      const entry = tally.get(`${analysis[0]}\t${analysis[1]}`) ?? { lemma: analysis[0], morph: analysis[1], count: 0 };
      entry.count++;
      tally.set(`${analysis[0]}\t${analysis[1]}`, entry);
      index.set(key, tally);
    }
  });
}
let candidateTokens = 0;
for (const work of works) {
  const table = tables.get(work.slug)!;
  eachWord(work, (piece, head) => {
    if (piece[1].length) return;
    const key = sanskrit.fold(piece[0]);
    const tally = (head ? attested.head.get(key) : undefined) ?? attested.any.get(key);
    if (!tally) return;
    piece[1] = [...tally.values()].sort((a, b) => b.count - a.count).map((c) => table.add([c.lemma, c.morph, "a"]));
    candidateTokens++;
    unanalysedTokens--;
  });
}

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
console.log(`source forms without analyses: ${candidateTokens} with candidates attested elsewhere, ${unanalysedTokens} without`);
console.log(`lemmas in corpus: ${lemmaRows.size}, with a dictionary entry: ${records.size}; concordance lemmas: ${concordance.size}`);
