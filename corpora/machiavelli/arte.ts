// Dell'arte della guerra, built into one Work: the proemio (book 0) and seven books, 212 paragraphs.
//
// The Italian text is Liber Liber's transcription of Martelli's edition, read from the download fetch.ts decoded and
// corrected by ARTE_TEXT_FIXES (lib/liberliber.ts). The checked-in CoNLL-U gives the words; its # text lines, joined
// by a space within a paragraph, must be that text paragraph for paragraph, with the same book, paragraph number and
// speaker, or the build stops. Each body paragraph is a row, cited AdG. <book>.<paragraph> by Martelli's paragraph
// numbers within the book (the proemio is book 0); the book's heading is the heading of its first row.
//
// The English is Farneworth's, cut into clauses (data/arte/en-sent/) and placed by the hand-checked alignment
// (data/arte/alignment/): the annotation's sentence ids against Farneworth's clause ids. A row shows the clauses
// aligned to its Italian sentences, in his paragraphs: an Italian paragraph he splits shows several English
// paragraphs, and the 27 maxims of Book VII, which he prints as one paragraph, each show their own clauses.
//
// A paragraph that opens a speaker's turn carries the speaker's name on both sides (SourceUnit.speaker), taken from
// the Italian's label; Farneworth prints the labels only in part. His footnotes are translator's notes on the
// clause they follow. An Italian sentence he leaves out is noted on the English side (ARTE_OMISSIONS).
import { join } from "node:path";
import { AnalysisTable } from "../../scripts/core/analyses";
import type { Row, SourceUnit, TextUnit, Work } from "../../scripts/core/types";
import { ARTE_OMISSIONS, ARTE_SPANNING_BEADS, ARTE_TEXT_FIXES } from "./alignment";
import { readCached } from "./fetch";
import { ARTE_DATA, cover, englishBlocks, parseBeads, parseSegments, placeEnglish, type Bead, type SentRow } from "./lib/align";
import type { Annotator } from "./lib/annotate";
import { parseUnit, type Sentence } from "./lib/conllu";
import { parseArteText, SPEAKERS, type ArteBook } from "./lib/liberliber";
import { readPinned, sha256 } from "./lib/pins";
import { titleCase } from "./lib/title";
import { ARTE_BOOKS, ARTE_SHA, ARTE_UNITS, bookNumber, bookOf, DERIVED, LIBERLIBER, type ArteUnit } from "./sources";

/** The Italian ids are the annotation's sent_ids ("1-1-2-16", "p-1-14"); the English are Farneworth's clause ids ("E1-3-21", "Ep-1-1"). */
const ARTE_ID = /^(?:E[p1-7]-\d+-\d+|(?:p|[1-7]-[1-4])-\d+-\d+)$/u;

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII"];

const esc = (text: string): string => text.replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;");

const unitFile = (kind: "conllu" | "alignment", unit: ArteUnit, extension: string): Promise<string> =>
  readPinned(join(ARTE_DATA, kind, `${unit}.${extension}`), ARTE_SHA[kind][unit], `${kind}/${unit}.${extension}`);
const bookFile = (kind: "en" | "en-sent" | "notes", book: ArteBook, extension: string): Promise<string> =>
  readPinned(join(ARTE_DATA, kind, `${book}.${extension}`), ARTE_SHA[kind][book], `${kind}/${book}.${extension}`);

/** Farneworth's heading as shown: "BOOK II." is "Book II.", and the preface's title is in title case. */
function bookHeading(book: ArteBook, text: string): string {
  if (book === "p") return titleCase(text);
  const match = /^BOOK ([IVX]+)\.$/u.exec(text);
  if (!match || match[1] !== ROMAN[Number(book)]) throw new Error(`book ${book}: English heading is not "BOOK ${ROMAN[Number(book)]}.": ${JSON.stringify(text)}`);
  return `Book ${match[1]}.`;
}

interface Footnote {
  id: string;
  book: ArteBook;
  /** The clause the footnote's mark falls in: Farneworth's paragraph and clause number. */
  par: number;
  sent: number;
  /** The words just before the footnote's mark. */
  after: string;
  text: string;
}

function parseFootnotes(tsv: string, book: ArteBook): Footnote[] {
  const lines = tsv.trimEnd().split("\n");
  if (lines[0] !== "note\tpar\tsent\tafter\ttext") throw new Error(`notes/${book}: header is ${JSON.stringify(lines[0])}`);
  return lines.slice(1).map((line, index) => {
    const cols = line.split("\t");
    if (cols.length !== 5) throw new Error(`notes/${book}: row ${index + 2} has ${cols.length} columns`);
    const [id, par, sent, after, text] = cols as [string, string, string, string, string];
    if (!id.startsWith(`N${book}-`) || !/^\d+$/u.test(par) || !/^\d+$/u.test(sent)) throw new Error(`notes/${book}: bad address on row ${index + 2}`);
    return { id, book, par: Number(par), sent: Number(sent), after: after.trim(), text };
  });
}

/** The index of the first character at which two strings differ. */
function firstDifference(a: string, b: string): number {
  let at = 0;
  while (at < a.length && at < b.length && a[at] === b[at]) at++;
  return at;
}

export async function buildArte(an: Annotator): Promise<Work> {
  const slug = "arte-della-guerra";
  an.begin(slug);
  const table = new AnalysisTable();
  const rows: Row[] = [];
  const workNotes: Record<string, string> = {};

  // 1. The text: Liber Liber's file, fixed, as paragraphs.
  const download = await readCached(DERIVED.arteText);
  const downloadSha = sha256(download);
  if (downloadSha !== LIBERLIBER.textSha) throw new Error(`Liber Liber text: SHA-256 ${downloadSha}, pin ${LIBERLIBER.textSha}`);
  const text = parseArteText(download, ARTE_TEXT_FIXES, an.used);

  // 2. The annotation, unit by unit. Its paragraphs are the text's, in order.
  const unitSentences = new Map<ArteUnit, Sentence[]>();
  const paragraphs: { unit: ArteUnit; book: string; par: number; speaker: string | null; sentences: Sentence[] }[] = [];
  for (const unit of ARTE_UNITS) {
    const sentences = parseUnit(await unitFile("conllu", unit, "conllu"), unit);
    unitSentences.set(unit, sentences);
    for (const sentence of sentences) {
      if (sentence.book !== bookOf(unit)) throw new Error(`${sentence.id}: # book ${sentence.book} in unit ${unit}`);
      if (sentence.id !== `${unit}-${sentence.par}-${sentence.n}`) throw new Error(`${sentence.id}: not ${unit}-${sentence.par}-${sentence.n}`);
      const last = paragraphs.at(-1);
      if (last?.unit === unit && last.par === sentence.par) {
        if ((sentence.speaker ?? null) !== last.speaker) throw new Error(`${sentence.id}: speaker ${sentence.speaker} inside a paragraph of ${last.speaker}`);
        last.sentences.push(sentence);
      } else paragraphs.push({ unit, book: sentence.book, par: sentence.par, speaker: sentence.speaker ?? null, sentences: [sentence] });
    }
  }
  if (paragraphs.length !== text.length) throw new Error(`The annotation has ${paragraphs.length} paragraphs and headings, the Liber Liber text ${text.length}`);
  paragraphs.forEach((paragraph, index) => {
    const expected = text[index]!;
    const joined = paragraph.sentences.map((sentence) => sentence.text).join(" ");
    const where = `${paragraph.unit} book ${paragraph.book} paragraph ${paragraph.par}`;
    if (paragraph.book !== expected.book || paragraph.par !== expected.par) throw new Error(`${where} is book ${expected.book} paragraph ${expected.par} of the Liber Liber text`);
    if (paragraph.speaker !== expected.speaker) throw new Error(`${where}: the annotation's speaker is ${paragraph.speaker}, the text's ${expected.speaker}`);
    if (joined !== expected.text) {
      const at = firstDifference(joined, expected.text);
      throw new Error(`${where}: the annotation's text differs from Liber Liber's at character ${at}: ${JSON.stringify(joined.slice(at, at + 40))} against ${JSON.stringify(expected.text.slice(at, at + 40))}`);
    }
  });

  // 3. Farneworth's clauses, which must tile his paragraphs, and his footnotes.
  const segmentsById = new Map<string, SentRow>();
  const footnotes: Footnote[] = [];
  for (const book of ARTE_BOOKS) {
    const segments = parseSegments(await bookFile("en-sent", book, "tsv"), book);
    const lines = (await bookFile("en", book, "txt")).replace(/\n$/u, "").split("\n");
    if (!lines[0]!.startsWith("# ")) throw new Error(`en/${book}: the first line is not the heading`);
    lines[0] = lines[0]!.slice(2);
    const pars = new Set(segments.map((segment) => segment.par));
    if (pars.size !== lines.length || Math.max(...pars) !== lines.length - 1) throw new Error(`en/${book}: ${lines.length} lines, clauses for ${pars.size} paragraphs`);
    for (const par of pars) cover(lines[par]!, segments.filter((segment) => segment.par === par).map((segment) => segment.text), `book ${book} English ${par}`);
    for (const segment of segments) segmentsById.set(segment.id, segment);
    footnotes.push(...parseFootnotes(await bookFile("notes", book, "tsv"), book));
  }

  // 4. The alignment, unit by unit, and the rows.
  const seenEnglish = new Set<string>();
  const lastEnglish = new Map<ArteBook, SentRow>();
  const unitOfSegment = new Map<string, TextUnit>();
  let turns = 0;
  let unaligned = 0;
  let omissions = 0;
  for (const unit of ARTE_UNITS) {
    const book = bookOf(unit);
    const bookNo = bookNumber(book);
    const sentences = unitSentences.get(unit)!;
    const italian: SentRow[] = sentences.map((sentence) => ({ par: sentence.par, sent: sentence.n, id: sentence.id, text: sentence.text }));
    const beads = parseBeads(await unitFile("alignment", unit, "tsv"), unit, ARTE_ID);
    if (beads.flatMap((bead) => bead.itIds).join() !== italian.map((row) => row.id).join()) {
      throw new Error(`${unit}: the alignment's Italian sentences are not the annotation's, one each, in order`);
    }
    const english: SentRow[] = [];
    for (const bead of beads) {
      for (const id of bead.enIds) {
        const segment = segmentsById.get(id);
        if (!segment) throw new Error(`${unit}: alignment names English ${id}, which is not a clause`);
        if (!id.startsWith(`E${book}-`)) throw new Error(`${unit}: English ${id} is not in book ${book}`);
        if (seenEnglish.has(id)) throw new Error(`${unit}: English ${id} is in two beads`);
        const before = lastEnglish.get(book);
        if (before && (segment.par < before.par || (segment.par === before.par && segment.sent < before.sent))) {
          throw new Error(`${unit}: English ${id} comes before ${before.id}, which the alignment placed earlier`);
        }
        seenEnglish.add(id);
        lastEnglish.set(book, segment);
        english.push(segment);
      }
    }
    const spanning = (bead: Bead, pars: readonly number[]): number => {
      const first = bead.itIds[0]!;
      const par = Object.hasOwn(ARTE_SPANNING_BEADS, first) ? ARTE_SPANNING_BEADS[first] : undefined;
      if (par === undefined) throw new Error(`${unit}: the bead from ${first} joins paragraphs ${pars.join(" and ")}; ARTE_SPANNING_BEADS must say where its English goes`);
      if (!pars.includes(par)) throw new Error(`${unit}: ARTE_SPANNING_BEADS puts the bead from ${first} on paragraph ${par}, not one of ${pars.join(", ")}`);
      an.used.add(`ARTE_SPANNING_BEADS ${first}`);
      return par;
    };
    const placed = placeEnglish(beads, italian, english, unit, spanning);
    unaligned += placed.unaligned;

    // Italian sentences with no English: listed, and noted on the English side of their paragraph, at the clause of the
    // last bead before them that has English (the first English paragraph of the row when none does).
    const left = new Map<number, { text: string; after: string | undefined }[]>();
    const sentenceById = new Map(sentences.map((sentence) => [sentence.id, sentence]));
    let after: string | undefined;
    for (const bead of beads) {
      if (bead.itIds.length && bead.enIds.length) after = bead.enIds.at(-1);
      if (!bead.itIds.length || bead.enIds.length) continue;
      for (const id of bead.itIds) {
        if (!Object.hasOwn(ARTE_OMISSIONS, id)) throw new Error(`${unit}: ${id} has no English and is not in ARTE_OMISSIONS`);
        an.used.add(`ARTE_OMISSIONS ${id}`);
        const sentence = sentenceById.get(id)!;
        left.set(sentence.par, [...(left.get(sentence.par) ?? []), { text: sentence.text, after }]);
        omissions++;
      }
    }

    const byPar = new Map<number, Sentence[]>();
    for (const sentence of sentences) byPar.set(sentence.par, [...(byPar.get(sentence.par) ?? []), sentence]);
    const bodyPars = [...byPar.keys()].filter((par) => par > 0).sort((a, b) => a - b);
    if (byPar.has(0) && bodyPars[0] !== 1) throw new Error(`${unit}: the heading is not followed by paragraph 1`);
    for (const par of bodyPars) {
      const group = byPar.get(par)!;
      const label = group[0]!.speaker;
      const names = label === undefined ? undefined : SPEAKERS[label];
      if (label !== undefined && !names) throw new Error(`${group[0]!.id}: ${label} is not a speaker of the dialogue`);
      if (names) turns++;
      const sourceUnits: SourceUnit[] = [];
      const translation: TextUnit[] = [];
      if (par === bodyPars[0] && byPar.has(0)) {
        sourceUnits.push({ key: `it-${bookNo}-h`, kind: "head", lines: [an.pieces(byPar.get(0)!, table)] });
        translation.push({
          key: `en-${bookNo}-h`,
          kind: "head",
          lines: placed.rubric.length ? [bookHeading(book, placed.rubric.map((row) => row.text).join(" "))] : [],
        });
      }
      sourceUnits.push({
        key: `it-${bookNo}.${par}`,
        kind: "prose",
        ...(names ? { speaker: names.it } : {}),
        lines: [an.pieces(group, table)],
      });
      const blocks = englishBlocks(placed.body.get(par) ?? []);
      blocks.forEach((block, index) => {
        const unitOfBlock: TextUnit = {
          key: `en-${bookNo}.${par}-${index}`,
          kind: "prose",
          ...(index === 0 && names ? { speaker: names.en } : {}),
          lines: [block.text],
        };
        translation.push(unitOfBlock);
        for (const row of block.rows) unitOfSegment.set(row.id, unitOfBlock);
      });
      // A turn with no English still names its speaker; a paragraph with no English and no turn has only its note.
      if (!blocks.length && names) translation.push({ key: `en-${bookNo}.${par}-0`, kind: "prose", speaker: names.en, lines: [] });
      const missing = left.get(par);
      if (missing) {
        const prose = translation.filter((unitOfRow) => unitOfRow.kind === "prose");
        const noted = new Map<TextUnit, string[]>();
        for (const { text: sentence, after: clause } of missing) {
          let target = (clause === undefined ? undefined : unitOfSegment.get(clause)) ?? prose[0];
          if (!target || !prose.includes(target)) target = prose[0];
          if (!target) {
            target = { key: `en-${bookNo}.${par}-note`, kind: "prose", lines: [] };
            translation.push(target);
            prose.push(target);
          }
          noted.set(target, [...(noted.get(target) ?? []), sentence]);
        }
        for (const [target, sentences] of noted) {
          const key = `omit-${target.key}`;
          workNotes[key] = sentences.map((sentence) => `<p>Farneworth’s English has nothing for <i>${esc(sentence)}</i></p>`).join("");
          target.notes = [...(target.notes ?? []), key];
        }
      }
      rows.push({ id: `${bookNo}.${par}`, sides: { it: sourceUnits, en: translation } });
    }
  }
  for (const id of segmentsById.keys()) if (!seenEnglish.has(id)) throw new Error(`English ${id} is in no unit's alignment`);

  // 5. Farneworth's footnotes, on the English paragraph that shows the clause each follows. The words before a mark
  // may begin in the clause before (a mark after the first word of a clause), but must end inside the clause it names.
  for (const note of footnotes) {
    const segment = `E${note.book}-${note.par}-${note.sent}`;
    const shown = unitOfSegment.get(segment);
    if (!shown) throw new Error(`footnote ${note.id}: ${segment} is not shown`);
    let prefix = "";
    let clauseStart = 0;
    for (let sent = 1; sent <= note.sent; sent++) {
      const clause = segmentsById.get(`E${note.book}-${note.par}-${sent}`);
      if (!clause) throw new Error(`footnote ${note.id}: ${segment} is not a clause`);
      clauseStart = prefix ? prefix.length + 1 : 0;
      prefix = prefix ? `${prefix} ${clause.text}` : clause.text;
    }
    let anchored = false;
    for (let at = prefix.indexOf(note.after); at >= 0 && !anchored; at = prefix.indexOf(note.after, at + 1)) anchored = at + note.after.length > clauseStart;
    if (!anchored) throw new Error(`footnote ${note.id}: the words before its mark, ${JSON.stringify(note.after)}, do not end in ${segment}`);
    const key = `fn-${note.id}`;
    workNotes[key] = `<p>${esc(note.text)}</p>`;
    shown.notes = [...(shown.notes ?? []), key];
  }

  console.log(`${slug}: ${rows.length} rows, ${turns} speaker turns, ${footnotes.length} footnotes, ${omissions} Italian sentences with no English, ` +
    `${unaligned} English clauses with no Italian sentence, shown with the paragraph before them`);
  return { slug, rows, analyses: table.list, notes: workNotes };
}
