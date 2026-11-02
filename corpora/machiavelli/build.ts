// Builds the Machiavelli Reader into generated/machiavelli/. Run `READER=machiavelli bun run fetch` first.
//
// The Italian is the checked-in CoNLL-U: its # text lines are the edition, checked against the manifest's
// paragraph hashes, and its lemmas and features (converted to the pack's conventions) are the word panel.
// Each body paragraph is a row, cited Prin. <chapter>.<paragraph>; the rubric is the chapter heading on the
// first row, and the dedication's address, which has no rubric, is that heading. Ricci's sentences are placed
// by data/alignment/<unit>.tsv. The English heading is that sentence in title case, the chapter number set off.
import { createHash } from "node:crypto";
import { join } from "node:path";
import { Wiktionary } from "../../packs/ita/build/wiktionary";
import { fold } from "../../packs/ita/spelling";
import { AnalysisTable } from "../../scripts/core/analyses";
import { Concordance, Outputs, statsLine } from "../../scripts/core/outputs";
import type { Analysis, Piece, Row, SourceUnit, TextUnit, Work } from "../../scripts/core/types";
import type { DictHit } from "../../src/lib/dict";
import { parseMorph } from "../../src/lib/morph";
import { BEAD_OVERRIDES, LEMMA_FIXES, OMISSIONS } from "./alignment";
import { CACHE } from "./fetch";
import { alignPath, cover, DATA, parseBeads, parseSentences, placeEnglish, proseBlocks, type Bead } from "./lib/align";
import { paragraphFile, parseUnit, type Sentence, type Token } from "./lib/conllu";
import { assertFromGutenberg } from "./lib/gutenberg";
import { toPackMorph, type MorphStats } from "./lib/morph";
import { site } from "./site";
import { CONLLU_SHA, DERIVED, TEXT, UNITS, chapterOf, type UnitId } from "./sources";

/** Share of the words that are not names or foreign whose lemma must have a Wiktionary entry. 99.72% measured, rounded down. */
const MIN_COVERAGE = 0.99;

const sha256 = (text: string): string => createHash("sha256").update(text).digest("hex");
const read = (rel: string) => Bun.file(join(CACHE, rel)).text();
const esc = (text: string): string => text.replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;");

const wiktionary = new Wiktionary(await read(DERIVED.wiktionary));
const used = new Set<string>();
const labelled = new Set<string>();
const stats: MorphStats = { gerund: 0, pastHistoric: 0, imperfect: 0, dropped: {}, labelled: 0 };
const counts = { words: 0, multiword: 0, names: 0, foreign: 0, common: 0, commonWithEntry: 0 };
const lemmaClasses = new Map<string, Set<string>>();
const missing = new Map<string, number>();
const commonLemmas = new Set<string>();
const coveredLemmas = new Set<string>();
const redirects = new Map<string, string>();
const gutenbergParagraphs: string[] = [];
const workNotes: Record<string, string> = {};

function lemmaOf(lemma: string): string {
  const fixed = LEMMA_FIXES[lemma];
  if (fixed === undefined) return lemma;
  used.add(`LEMMA_FIXES ${lemma}`);
  return fixed;
}

function analysis(word: Token, where: string, segment?: string): Analysis {
  const lemma = lemmaOf(word.lemma);
  const morph = toPackMorph(word.upos, word.feats, where, stats, labelled);
  const classes = lemmaClasses.get(lemma) ?? new Set<string>();
  classes.add(word.upos);
  lemmaClasses.set(lemma, classes);
  const foreign = word.upos === "X" || word.feats.includes("Foreign=");
  if (word.upos === "PROPN") counts.names++;
  else if (foreign) counts.foreign++;
  else {
    counts.common++;
    commonLemmas.add(lemma);
    if (wiktionary.lookup(lemma, word.upos)) {
      counts.commonWithEntry++;
      coveredLemmas.add(lemma);
    } else missing.set(lemma, (missing.get(lemma) ?? 0) + 1);
  }
  return segment === undefined ? [lemma, morph, "e"] : [lemma, morph, "e", segment];
}

/** One paragraph's pieces. Spaces follow the annotation inside a sentence and a single space between sentences. */
function piecesOf(sentences: readonly Sentence[], table: AnalysisTable): Piece[] {
  const out: Piece[] = [];
  const pushText = (text: string) => {
    if (typeof out.at(-1) === "string") out[out.length - 1] += text;
    else out.push(text);
  };
  sentences.forEach((sentence, sentenceIndex) => {
    if (sentenceIndex) pushText(" ");
    sentence.surfaces.forEach((surface, index) => {
      if (index && sentence.surfaces[index - 1]!.spaceAfter) pushText(" ");
      const words = surface.words.filter((word) => word.upos !== "PUNCT");
      if (!words.length) {
        pushText(surface.form);
        return;
      }
      if (words.length !== surface.words.length) throw new Error(`${sentence.id}: ${surface.form} joins punctuation and words`);
      counts.words++;
      if (words.length > 1) counts.multiword++;
      const ids = words.map((word) => table.add(analysis(word, `${sentence.id} ${word.form}`, words.length > 1 ? word.form : undefined)));
      out.push([surface.form, ids]);
    });
  });
  const plain = out.map((piece) => (typeof piece === "string" ? piece : piece[0])).join("");
  const expected = sentences.map((sentence) => sentence.text).join(" ");
  if (plain !== expected) {
    throw new Error(`${sentences[0]?.id}: pieces rebuild ${JSON.stringify(plain.slice(0, 80))}, not ${JSON.stringify(expected.slice(0, 80))}`);
  }
  return out;
}

function withOverrides(beads: readonly Bead[], unit: UnitId): Bead[] {
  return beads.map((bead) => {
    const key = `${unit} ${bead.n}`;
    const replacement = BEAD_OVERRIDES[key];
    if (replacement === undefined) return bead;
    used.add(`BEAD_OVERRIDES ${key}`);
    const enIds = replacement ? replacement.split(",") : [];
    return { ...bead, enIds, kind: `${bead.itIds.length}-${enIds.length}` };
  });
}

/** Short function words left lowercase in a title, except as its first word. "di" is the name particle. */
const MINOR = new Set(["a", "an", "the", "and", "but", "or", "nor", "for", "of", "in", "on", "at", "to", "by", "from", "with", "as", "into", "over", "upon", "against", "after", "under", "than", "di"]);

/**
 * Ricci's all-caps heading as a title, on the model of corpora/analects/build.ts titleCase, with minor words
 * lowercase. A chapter is "Chapter I. The Various Kinds…"; the dedication's address is title case too.
 */
function displayHeading(text: string, chapter: number): string {
  const cased = (title: string): string => {
    let first = true;
    return title.toLowerCase().replace(/[^\s]+/gu, (word) => {
      const bare = word.replace(/^[^\p{L}']+|[^\p{L}']+$/gu, "");
      const cap = first || !MINOR.has(bare);
      first = false;
      if (!cap) return word;
      return word.replace(/(^|-)(\p{L})/gu, (_, before: string, letter: string) => before + letter.toUpperCase());
    });
  };
  if (chapter === 0) return cased(text);
  const match = text.match(/^CHAPTER\s+([IVXLCDM]+)\s+([\s\S]+)$/u);
  if (!match) throw new Error(`chapter ${chapter}: English heading is not "CHAPTER <numeral> <title>": ${text.slice(0, 80)}`);
  const trailed = match[2]!.endsWith(".");
  const title = trailed ? match[2]!.slice(0, -1) : match[2]!;
  return `Chapter ${match[1]}. ${cased(title)}${trailed ? "." : ""}`;
}


const table = new AnalysisTable();
const rows: Row[] = [];
let unaligned = 0;

for (const unit of UNITS) {
  const source = await Bun.file(join(DATA, `${unit}.conllu`)).text();
  const hash = sha256(source);
  const pinned = CONLLU_SHA[unit];
  if (hash !== pinned) throw new Error(`${unit}: CoNLL-U SHA-256 ${hash}, pin ${pinned}`);
  const sentences = parseUnit(source, unit);
  const pin = TEXT[unit]!;
  const file = paragraphFile(sentences, pin.rubric === "");
  const fileHash = sha256(file);
  if (fileHash !== pin.sha256) throw new Error(`${unit}: paragraph text SHA-256 ${fileHash}, manifest ${pin.sha256}`);

  const byPar = new Map<number, Sentence[]>();
  for (const sentence of sentences) {
    const list = byPar.get(sentence.par) ?? [];
    list.push(sentence);
    byPar.set(sentence.par, list);
  }
  const bodyPars = [...byPar.keys()].filter((par) => par > 0).sort((a, b) => a - b);
  if (bodyPars.length !== pin.paragraphs) throw new Error(`${unit}: ${bodyPars.length} body paragraphs, manifest says ${pin.paragraphs}`);

  const italian = parseSentences(await Bun.file(join(DATA, "it-sent", `${unit}.tsv`)).text(), unit, "Italian");
  const english = parseSentences(await Bun.file(join(DATA, "en-sent", `${unit}.tsv`)).text(), unit, "English");
  const enLines = (await Bun.file(join(DATA, "en", `${unit}.txt`)).text()).replace(/\n$/u, "").split("\n");
  gutenbergParagraphs.push(...enLines);
  for (const [par, group] of byPar) {
    cover(group.map((sentence) => sentence.text).join(" "), italian.filter((row) => row.par === par).map((row) => row.text), `${unit} Italian ${par}`);
  }
  for (const par of new Set(english.map((row) => row.par))) {
    const line = enLines[par];
    if (line === undefined) throw new Error(`${unit}: English paragraph ${par} has no line`);
    cover(line, english.filter((row) => row.par === par).map((row) => row.text), `${unit} English ${par}`);
  }
  const beads = withOverrides(parseBeads(await Bun.file(alignPath(unit)).text(), unit), unit);
  const placed = placeEnglish(beads, italian, english, unit);
  unaligned += placed.unaligned;
  // Paragraphs whose Italian sentences the translation simply does not contain. The note goes on the first.
  const omitted = new Set(beads.filter((bead) => bead.itIds.length && !bead.enIds.length).flatMap((bead) => bead.itIds.map((id) => Number(id.split(".")[0]))));
  if (omitted.size && !(unit in OMISSIONS)) throw new Error(`${unit}: Italian sentences with no English, and no omission note`);
  let noted = false;

  const chapter = chapterOf(unit);
  const addressIsHeading = !byPar.has(0);
  for (const par of bodyPars) {
    const first = par === bodyPars[0];
    const sourceUnits: SourceUnit[] = [];
    const translation: TextUnit[] = [];
    if (first) {
      const headSentences = addressIsHeading ? byPar.get(par)! : byPar.get(0)!;
      sourceUnits.push({
        key: `it-${chapter}-h`,
        kind: "head",
        label: chapter === 0 ? "Dedica" : String(chapter),
        lines: [piecesOf(headSentences, table)],
      });
      const headEnglish = addressIsHeading ? (placed.body.get(par) ?? []) : placed.rubric;
      translation.push({
        key: `en-${chapter}-h`,
        kind: "head",
        lines: headEnglish.length ? [displayHeading(headEnglish.map((row) => row.text).join(" "), chapter)] : [],
      });
    }
    if (!(first && addressIsHeading)) {
      sourceUnits.push({ key: `it-${chapter}.${par}`, kind: "prose", lines: [piecesOf(byPar.get(par)!, table)] });
      proseBlocks(placed.body.get(par) ?? []).forEach((text, index) => {
        translation.push({ key: `en-${chapter}.${par}-${index}`, kind: "prose", lines: [text] });
      });
    }
    if (omitted.has(par) && !noted) {
      const key = `omit-${unit}`;
      workNotes[key] = `<p>${esc(OMISSIONS[unit]!)}</p>`;
      used.add(`OMISSIONS ${unit}`);
      noted = true;
      const last = translation.at(-1);
      if (last) last.notes = [key];
      else translation.push({ key: `en-${chapter}.${par}-note`, kind: "prose", lines: [], notes: [key] });
    }
    rows.push({ id: `${chapter}.${par}`, sides: { it: sourceUnits, en: translation } });
  }
}

if (site.works.map((work) => work.slug).join() !== "principe") throw new Error("The site lists other works than the one built");

const records = new Map<string, DictHit>();
const glosses = new Map<string, string>();
for (const [lemma, classes] of lemmaClasses) {
  const hit: DictHit = records.get(fold(lemma)) ?? { entries: {} };
  for (const upos of classes) {
    const found = wiktionary.lookup(lemma, upos);
    if (!found) continue;
    const have = new Set((hit.entries.wikt ?? []).map((article) => article.head));
    hit.entries.wikt = [...hit.entries.wikt ?? [], ...found.articles.filter((article) => !have.has(article.head))];
    if (found.via && !hit.via) {
      hit.via = found.via;
      redirects.set(lemma, found.via);
    }
    const glossKey = `${lemma} ${upos === "PROPN"}`;
    if (found.gloss && !glosses.has(glossKey)) glosses.set(glossKey, found.gloss);
  }
  if (Object.keys(hit.entries).length) records.set(fold(lemma), hit);
}

const glossFor = (lemma: string, morph: string): string => {
  const name = parseMorph(morph).upos === "PROPN";
  return glosses.get(`${lemma} ${name}`) ?? glosses.get(`${lemma} ${!name}`) ?? "";
};

const tables = { LEMMA_FIXES, BEAD_OVERRIDES, OMISSIONS };
const unused = Object.entries(tables).flatMap(([name, table]) => Object.keys(table).map((key) => `${name} ${key}`)).filter((key) => !used.has(key));
if (unused.length) throw new Error(`Exception tables that nothing used: ${unused.join(", ")}`);

const coverage = counts.commonWithEntry / counts.common;
if (coverage < MIN_COVERAGE) {
  const top = [...missing].sort((a, b) => b[1] - a[1]).slice(0, 40).map(([lemma, n]) => `${lemma} (${n})`).join(", ");
  throw new Error(`Only ${(100 * coverage).toFixed(2)}% of common words have a Wiktionary entry; most frequent without: ${top}`);
}
assertFromGutenberg(await read("ricci.txt"), gutenbergParagraphs);

const work: Work = { slug: "principe", rows, analyses: table.list, notes: workNotes };
const outputs = new Outputs(site.id);
await outputs.reset();
const concordance = new Concordance(site.sides, { markPosition: true });
await outputs.writeWork(work);
const workStats = concordance.addWork(work.slug, work.rows, work.analyses);
console.log(statsLine(work.slug, work.rows.length, workStats));
await outputs.writeShards("lex", records);
await concordance.write(outputs, glossFor);

const topMissing = [...missing].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([lemma, n]) => `${lemma} ${n}`).join(", ");
console.log(`words: ${counts.words} (${counts.multiword} written as one with another), names ${counts.names}, foreign ${counts.foreign}`);
console.log(`common words with a Wiktionary entry: ${counts.commonWithEntry} of ${counts.common} (${((100 * counts.commonWithEntry) / counts.common).toFixed(2)}%); ` +
  `lemmas ${coveredLemmas.size} of ${commonLemmas.size} (${((100 * coveredLemmas.size) / commonLemmas.size).toFixed(2)}%)`);
console.log(`lemmas without an entry: ${missing.size}, most frequent: ${topMissing}`);
console.log(`reached by a Wiktionary redirect: ${redirects.size}, e.g. ${[...redirects].slice(0, 8).map(([lemma, via]) => `${lemma} → ${via}`).join(", ")}`);
console.log(`morphology: gerund ${stats.gerund}, past historic ${stats.pastHistoric}, imperfect ${stats.imperfect}, ` +
  `dropped ${Object.entries(stats.dropped).map(([name, n]) => `${name} ${n}`).join(", ") || "none"}; labelled ${stats.labelled}`);
console.log(`English sentences with no Italian sentence, shown with the paragraph before them: ${unaligned}`);
console.log(`rows: ${rows.length}; dictionary records: ${records.size}; concordance lemmas: ${concordance.size}`);
