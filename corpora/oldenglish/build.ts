// Builds the Old English Reader into generated/oldenglish/. Run `READER=oldenglish bun run fetch` first.
// The Old English is ISWOC's text and annotation: Apollonius of Tyre by chapter (translated by Thorpe, cut at the
// chapters: alignment.ts) and the Gospel of Mark by verse (the King James Version). Every token's lemma is matched to
// a Bosworth–Toller entry, or to Wiktionary's for words it lacks (packs/ang/build/lexicon.ts).
import { join } from "node:path";
import type { Article, DictHit } from "../../src/lib/dict";
import { parseMorph } from "../../src/lib/morph";
import { pack as ang } from "../../packs/ang";
import { BtDictionary, readBtCsv } from "../../packs/ang/build/bt";
import { parseIswoc, type IswocDivision, type IswocToken } from "../../packs/ang/build/iswoc";
import { Lexicon } from "../../packs/ang/build/lexicon";
import { iswocMorph } from "../../packs/ang/build/morph";
import { Wiktionary } from "../../packs/ang/build/wiktionary";
import { AnalysisTable } from "../../scripts/core/analyses";
import { Concordance, Outputs, statsLine } from "../../scripts/core/outputs";
import type { Analysis, Piece, Row, SourceUnit, TextUnit, Work } from "../../scripts/core/types";
import { MISSING_VERSES, splitThorpe, type Paragraph } from "./alignment";
import { CACHE } from "./fetch";
import { parseKjvMark } from "./lib/kjv";
import { parseThorpe } from "./lib/thorpe";
import { NAMES } from "./names";
import { site } from "./site";

const read = (rel: string) => Bun.file(join(CACHE, rel)).text();
const esc = (text: string): string => text.replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;");

const lexicon = new Lexicon(new BtDictionary(readBtCsv(await read("bosworth-toller.csv"))), new Wiktionary(await read("wiktionary.jsonl")));
const apt = parseIswoc(await read("iswoc/apt.xml"));
const wscp = parseIswoc(await read("iswoc/wscp.xml"));
const thorpe = parseThorpe(await read("thorpe.json"));
const kjv = parseKjvMark(await read("kjv.txt"));

// ---- Analyses and pieces ----------------------------------------------------------------------------------------
const labelled = new Set<string>();
/** Tokens by where their lemma's entry comes from; the build checks that words that are not names nearly all have Bosworth–Toller's. */
const coverage = { bt: 0, wikt: 0, none: 0, names: 0, foreign: 0, joined: 0 };
/** Each name as shown (keyed by its fold) and the works that use it, for the names dictionary. */
const names = new Map<string, { lemma: string; works: Set<string> }>();
let slug = "";

function analysis(token: IswocToken, segment?: string): Analysis {
  const morph = iswocMorph(token);
  const upos = parseMorph(morph).upos;
  if (!labelled.has(morph)) {
    ang.describeMorph(morph); // Throws on any word class, feature or value without an English label.
    labelled.add(morph);
  }
  const resolved = lexicon.resolve(token.lemma, token.pos, upos);
  if (upos === "PROPN") {
    coverage.names++;
    const key = ang.fold(resolved.lemma);
    const name = names.get(key) ?? { lemma: resolved.lemma, works: new Set() };
    name.works.add(slug);
    names.set(key, name);
  } else if (token.pos === "F-") coverage.foreign++;
  else coverage[resolved.source]++;
  return segment === undefined ? [resolved.lemma, morph, "e"] : [resolved.lemma, morph, "e", segment];
}

/**
 * A line's pieces: each token's form as a word, then what ISWOC prints after it. A token with nothing after it
 * (ne + wæs written næs) is one written word with the next, which carries both analyses and their separate words.
 */
function pieces(tokens: readonly IswocToken[], analyses: AnalysisTable): Piece[] {
  const out: Piece[] = [];
  let i = 0;
  while (i < tokens.length) {
    const group = [tokens[i++]!];
    while (group.at(-1)!.after === null) {
      const next = tokens[i++];
      if (!next) throw new Error(`ISWOC token ${group.at(-1)!.id} is written together with nothing`);
      group.push(next);
    }
    if (group.length > 1) coverage.joined++;
    out.push([
      group.map((token) => token.form).join(""),
      group.map((token) => analyses.add(analysis(token, group.length > 1 ? token.form : undefined))),
    ]);
    const after = group.at(-1)!.after!;
    if (after) out.push(after);
  }
  // A line ends without the space that separates it from the next.
  const last = out.at(-1);
  if (typeof last === "string") {
    if (last.trimEnd()) out[out.length - 1] = last.trimEnd();
    else out.pop();
  }
  return out;
}

// ---- Apollonius of Tyre -----------------------------------------------------------------------------------------
const CHAPTERS = 22;

/** Thorpe's paragraphs as units; each footnote gets a key in `notes`. */
function translation(key: string, paragraphs: readonly Paragraph[], notes: Record<string, string>, kind: TextUnit["kind"]): TextUnit[] {
  return paragraphs.map((paragraph, i): TextUnit => {
    const keys = paragraph.notes.map((note) => {
      const noteKey = `thorpe-note-${Object.keys(notes).length + 1}`;
      notes[noteKey] = `<p>${esc(note.text)}</p>`;
      return noteKey;
    });
    return { key: `${key}-${i + 1}`, kind, lines: [paragraph.text], ...(keys.length ? { notes: keys } : {}) };
  });
}

function buildApollonius(): Work {
  slug = "apollonius-of-tyre";
  const analyses = new AnalysisTable();
  const [title, ...chapters] = apt.divisions as [IswocDivision, ...IswocDivision[]];
  if (chapters.length !== CHAPTERS || title.sentences.length !== 1) {
    throw new Error(`Apollonius has ${apt.divisions.length} divisions; expected a title and ${CHAPTERS} chapters`);
  }
  const english = splitThorpe(thorpe);
  const notes: Record<string, string> = {};
  const lines = (division: IswocDivision, n: number): Piece[][] => {
    if (division.title !== `Chapter ${n}`) throw new Error(`Division ${n} is "${division.title}"`);
    for (const token of division.sentences.flatMap((sentence) => sentence.tokens)) {
      if (token.citation !== String(n)) throw new Error(`ISWOC token ${token.id} cites ${token.citation} in chapter ${n}`);
    }
    return division.sentences.map((sentence) => pieces(sentence.tokens, analyses));
  };

  const rows = chapters.map((division, i): Row => {
    const n = i + 1;
    const source: SourceUnit[] = [];
    const target: TextUnit[] = [];
    // The title sentence is chapter 0 in the treebank; it heads chapter 1.
    if (n === 1) {
      source.push({ key: "apt-title", kind: "head", lines: lines(title, 0) });
      target.push(...translation("thorpe-title", english.title, notes, "head"));
    }
    source.push({ key: `apt-${n}`, kind: "prose", lines: lines(division, n) });
    target.push(...translation(`thorpe-${n}`, english.chapters[i]!, notes, "prose"));
    return { id: String(n), sides: { ang: source, en: target } };
  });
  return { slug, rows, analyses: analyses.list, notes, intro: APOLLONIUS_INTRO };
}

// ---- The Gospel of Mark -----------------------------------------------------------------------------------------
function buildMark(): Work {
  slug = "mark";
  const analyses = new AnalysisTable();

  // Each verse's tokens, a line for each of ISWOC's sentences that has some (a sentence may run across verses).
  const verses = new Map<string, IswocToken[][]>();
  let last: [number, number] = [0, 0];
  for (const division of wscp.divisions.filter((d) => d.title.startsWith("Mark "))) {
    for (const sentence of division.sentences) {
      for (let start = 0; start < sentence.tokens.length;) {
        const cite = sentence.tokens[start]!.citation;
        let end = start;
        while (sentence.tokens[end]?.citation === cite) end++;
        const [chapter, verse] = (/^MARK (\d+)\.(\d+)$/u.exec(cite) ?? []).slice(1).map(Number) as [number, number];
        if (!chapter || !verse) throw new Error(`Unexpected citation ${cite}`);
        if (chapter < last[0] || (chapter === last[0] && verse < last[1])) throw new Error(`${cite} is out of order`);
        last = [chapter, verse];
        const id = `${chapter}.${verse}`;
        verses.set(id, [...verses.get(id) ?? [], sentence.tokens.slice(start, end)]);
        start = end;
      }
    }
  }
  const ids = kjv.map((verse) => `${verse.chapter}.${verse.verse}`);
  const missing = ids.filter((id) => !verses.has(id));
  if (missing.join() !== MISSING_VERSES.join()) throw new Error(`ISWOC lacks verses ${missing.join(", ")}; expected ${MISSING_VERSES.join(", ")}`);
  const strays = [...verses.keys()].filter((id) => !ids.includes(id));
  if (strays.length) throw new Error(`ISWOC verses without a King James verse: ${strays.join(", ")}`);

  const rows = kjv.map(({ chapter, verse, text }): Row => {
    const tokens = verses.get(`${chapter}.${verse}`);
    return {
      id: `${chapter}.${verse}`,
      sides: {
        ang: tokens ? [{ key: `wscp-${chapter}-${verse}`, kind: "prose", lines: tokens.map((line) => pieces(line, analyses)) }] : [],
        en: [{ key: `kjv-${chapter}-${verse}`, kind: "prose", lines: [text] }],
      },
    };
  });
  return { slug, rows, analyses: analyses.list, notes: {}, intro: MARK_INTRO };
}

const APOLLONIUS_INTRO = [
  "<i>Apollonius of Tyre</i> is the Old English version of the Latin <i>Historia Apollonii regis Tyri</i>, a romance " +
    "of riddles, shipwrecks and recognitions. It survives in one eleventh-century manuscript, Cambridge, Corpus Christi " +
    "College 201, which has lost part of the story. The Old English here is Peter Goolden’s edition (1958) as annotated " +
    "in the ISWOC treebank, and it ends where the first part of the Old English breaks off, in the king’s speech to " +
    "Apollonius; the Old English that resumes later is not in the treebank.",
  "The treebank divides the text into a title sentence and 22 chapters. They are this reader’s rows, and the title " +
    "stands above chapter 1. Thorpe’s translation (1834) is not divided that way, so each row’s English is his text " +
    "cut at the clause that translates the chapter’s first words. A sentence can therefore run across a row boundary, " +
    "and a row can end with a comma.",
  "Thorpe numbered the pages of the Old English in brackets; the numbers are removed. Where the Old English breaks off " +
    "he goes on with a translation of the Latin; this reader stops where the Old English stops. His footnotes are kept " +
    "(the <i>n</i> buttons). The Wikisource transcription misreads the scan in a few places (<i>hut</i> for <i>but</i>, " +
    "<i>und</i> for <i>and</i>); seven such misreadings are corrected.",
];

const MARK_INTRO = [
  "The West-Saxon Gospels are the Gospels in English of about the year 1000, translated from the Latin Vulgate. The " +
    "Old English here is Walter W. Skeat’s edition of Corpus Christi College 140 as annotated in the ISWOC treebank.",
  "The English is the King James Version, which translates the Greek, not this Old English: the two differ in wording " +
    "and sometimes in what a verse contains. Rows are verses, cited as ISWOC cites them; they have the same chapters and " +
    `verse counts as the King James Version. The Old English has no verse ${MISSING_VERSES.slice(0, -1).join(", ")} or ` +
    `${MISSING_VERSES.at(-1)}, so only the English shows for those.`,
];

const works = [buildApollonius(), buildMark()];
if (works.map((work) => work.slug).join() !== site.works.map((w) => w.slug).join()) {
  throw new Error("The site lists other works than Apollonius of Tyre and Mark");
}
const unused = lexicon.unused();
if (unused.length) throw new Error(`Exception tables that no token used: ${unused.join(", ")}`);
if (lexicon.problems.length) {
  throw new Error(`Lemmas to add to FIXES, SPELLINGS or WITHOUT_ENTRY (packs/ang/build/lemmas.ts):\n${[...new Set(lexicon.problems)].join("\n")}`);
}

// Every name has a line in the names glossary, and every line a name.
const described = new Map(Object.entries(NAMES).map(([lemma, gloss]) => [ang.fold(lemma), gloss]));
const undescribed = [...names].filter(([key]) => !described.has(key)).map(([, name]) => name.lemma);
if (undescribed.length) throw new Error(`Names without a line in names.ts: ${undescribed.join(", ")}`);
const unnamed = [...described.keys()].filter((key) => !names.has(key));
if (unnamed.length) throw new Error(`names.ts describes names that no token has: ${unnamed.join(", ")}`);

const nonNames = coverage.bt + coverage.wikt + coverage.none;
if (coverage.bt < 0.99 * nonNames) throw new Error(`Only ${coverage.bt} of ${nonNames} words that are not names have a Bosworth–Toller entry`);

// Dictionary records for every lemma: Bosworth–Toller's or Wiktionary's entries, and the names glossary.
const records = lexicon.records();
for (const [key, name] of names) {
  const hit: DictHit = records.get(key) ?? { entries: {} };
  const article: Article = { head: name.lemma, works: [...name.works], sections: [{ senses: [{ gloss: esc(described.get(key)!) }] }] };
  records.set(key, { ...hit, entries: { ...hit.entries, names: [article] } });
}
const glossFor = (lemma: string, morph: string): string => {
  const upos = parseMorph(morph).upos;
  return (upos === "PROPN" ? described.get(ang.fold(lemma)) : undefined) ?? lexicon.gloss(lemma, upos);
};

const outputs = new Outputs(site.id);
await outputs.reset();
const concordance = new Concordance(site.sides);
for (const work of works) await outputs.writeWork(work);
for (const work of works) console.log(statsLine(work.slug, work.rows.length, concordance.addWork(work.slug, work.rows, work.analyses)));
await outputs.writeShards("lex", records);
await concordance.write(outputs, glossFor);

const percent = (n: number, of: number) => `${((100 * n) / of).toFixed(2)}%`;
console.log(`words that are not names: ${nonNames}; Bosworth–Toller ${coverage.bt} (${percent(coverage.bt, nonNames)}), ` +
  `Wiktionary ${coverage.wikt}, without an entry ${coverage.none}; names ${coverage.names}, Latin ${coverage.foreign}; ` +
  `written forms of two words: ${coverage.joined}`);
console.log(`labelled morphologies: ${labelled.size}; lemmas with a dictionary record: ${records.size}; concordance lemmas: ${concordance.size}`);
console.log(`lemmas found only with or without the prefix ge-: ${lexicon.prefixed.length}`);
