// Reads the slice of the OpenITI Muqaddimah file this reader covers (lines 39–3204: the author's preface, the
// Introduction, the Book One preface and the six prefatory discussions of Book One, chapter 1) into works and rows.
//
// The file is Khalīl Shaḥāda's edition (rev. Suhayl Zakkār, Dār al-Fikr, Beirut 1988), typed for al-Maktaba
// al-Shāmila #12320 and carried into OpenITI as mARkdown. What the file does, and what this parser does about it:
//
//   ### |, ### ||, ### |||, ### ||||   a heading of level 1 to 4 (the number of bars). Every heading is a row of its work.
//   # text                             opens a paragraph.
//   ~~text                             continues the paragraph over the wrapped line.
//   PageV01P005                        a page marker, at the end of a line or on a line of its own. Dropped. The line
//                                      after it opens with "# " even in the middle of a paragraph (the converter
//                                      starts a line per page), so a "# " line that follows a page marker continues the
//                                      row before it unless that row ends a sentence (. ؟ ! :): 137 of the 144 markers.
//   ms0013                             a manuscript-folio marker of the edition. Dropped.
//   [1]                                a footnote reference; the footnote bodies are not in the file. Dropped, with the
//                                      space before it when a punctuation mark follows (word [1] ، → word،).
//   # hemistich ... hemistich          a line of verse. The run of verse lines between two prose paragraphs is one
//                                      "verse" row; its `lines` keep the line breaks and " ... " is the break between
//                                      the hemistichs, kept in the text as the edition prints it.
//
// Rows. A paragraph of more than SPLIT_ABOVE (250) words is too long for a parallel reader, so it becomes several rows
// cut at the ends of the sentences tools/camel_run.py cuts for the CoNLL-U: after . ؟ ! : (not the colon of a "89: 6"
// reference) and the paragraph's end, and, because the edition punctuates long stretches hardly at all, inside a
// sentence of more than 110 words at the cut camel_run.py gives it (after a comma, else before a conjunction word, in the
// 50th to 90th word). The cut is greedy: each row as near TARGET (150) words as the sentence ends allow and not above 250
// unless one sentence is longer, and a last piece under MIN_TAIL (40) words joins the row before it. Headings and verse
// rows are never cut, and a paragraph of up to 250 words stays whole. Rows are numbered in order after the cut (`pid`),
// and a row that carries on the edition's paragraph of the row before it has `continues` set, so the reader can show
// where the edition's paragraphs begin.
//
// One footnote body is in the text itself (line 2918, LEAKED_FOOTNOTES); everything else the parser does not explain
// throws: a line that is none of the kinds above, a character outside the Arabic letters, digits and the punctuation
// the slice uses, a heading that is not where WORKS says, a work that does not begin or end where WORKS says. The
// text of a row is single-spaced and trimmed, so it is exactly what the CoNLL-U sentences of the row give back when
// they are joined by one space (the annotation tool cuts a row at a space only).

export const FIRST_LINE = 39;
export const LAST_LINE = 3204;

/** A prose paragraph above this many words is cut into rows; the rows aim at TARGET words and a short tail joins the row before. */
export const SPLIT_ABOVE = 250;
export const TARGET = 150;
export const MIN_TAIL = 40;

export type RowKind = "head" | "prose" | "verse";

export interface OitiRow {
  /** `<work slug>.<n>`. */
  pid: string;
  work: string;
  /** 1-based position among the work's rows, headings included. */
  n: number;
  kind: RowKind;
  /** A heading's level: the number of bars (1 to 4) in the source. Heads only. */
  level?: number;
  /** The row's text. A verse row's text is its lines joined by a space. */
  text: string;
  /** A verse row's lines, each "hemistich ... hemistich". Verse only. */
  lines?: string[];
  /** First and last line of the file the row comes from (1-based); the rows cut from one paragraph share them. */
  source: [number, number];
  /** Set on a row that carries on the edition's paragraph of the row before it. Prose rows only. */
  continues?: true;
}

export interface WorkSpec {
  slug: string;
  titleEn: string;
  /** First and last line of the file (1-based, inclusive). */
  first: number;
  last: number;
  /** The heading that opens the work: the line it is on and its level. */
  opening: { line: number; level: number };
}

export interface OitiWork extends WorkSpec {
  /** The opening heading's text. */
  titleAr: string;
  rows: OitiRow[];
}

/**
 * The works of this reader, in the file's order. Each work ends where the next begins (the bāb heading of line 1075
 * closes Book One's preface and introduces the six discussions). The English titles are this project's own.
 */
export const WORKS: readonly WorkSpec[] = [
  { slug: "preface", titleEn: "The Author's Preface", first: 39, last: 193, opening: { line: 39, level: 1 } },
  {
    slug: "introduction", titleEn: "Introduction: On the Merit of the Science of History", first: 194, last: 895,
    opening: { line: 194, level: 1 },
  },
  { slug: "book-one", titleEn: "Book One: On Human Civilization", first: 896, last: 1075, opening: { line: 896, level: 1 } },
  {
    slug: "discussion-1", titleEn: "First Discussion: Human Society Is Necessary", first: 1076, last: 1142,
    opening: { line: 1076, level: 3 },
  },
  {
    slug: "discussion-2", titleEn: "Second Discussion: The Inhabited Part of the Earth", first: 1143, last: 2187,
    opening: { line: 1143, level: 3 },
  },
  {
    slug: "discussion-3", titleEn: "Third Discussion: The Temperate Zones and the Effect of the Air on Skin Colour",
    first: 2188, last: 2295, opening: { line: 2188, level: 3 },
  },
  {
    slug: "discussion-4", titleEn: "Fourth Discussion: The Effect of the Air on Human Character", first: 2296, last: 2327,
    opening: { line: 2296, level: 3 },
  },
  {
    slug: "discussion-5", titleEn: "Fifth Discussion: Plenty and Hunger, and Their Effects on Bodies and Character",
    first: 2328, last: 2439, opening: { line: 2328, level: 3 },
  },
  {
    slug: "discussion-6", titleEn: "Sixth Discussion: The Kinds of Human Perceivers, with Revelation and Dreams",
    first: 2440, last: 3204, opening: { line: 2440, level: 3 },
  },
];

/**
 * A footnote body the file has in the text. Line 2918 is "# [1] وعراف اليمامة هو رباح بن عجلة وعراف نجد الأبلق
 * الأسدي. ومن هذه …": the sentence after the reference is the editor's note on the two 'arrāfs of the verses above,
 * and the author's text resumes at "ومن هذه". The parser drops the note and keeps the paragraph break.
 */
const LEAKED_FOOTNOTES: readonly { line: number; text: string }[] = [
  { line: 2918, text: "[1] وعراف اليمامة هو رباح بن عجلة وعراف نجد الأبلق الأسدي." },
];

const HEADING = /^### (\|{1,4}) (.*)$/u;
const PAGE = /PageV\d+P\d+/gu;
const FOLIO = /\bms\d+\b/gu;
const NOTE_BEFORE_MARK = /\s*\[\d+\]\s*(?=[،.؟:!؛»)])/gu;
const NOTE = /\s*\[\d+\]\s*/gu;
const END_OF_SENTENCE = /[.؟!:](?:\s*[»)])*$/u;
const VERSE_BREAK = " ... ";

/** Arabic letters and the alif wasla, digits, space and the punctuation the slice uses. Anything else is a surprise. */
const ALLOWED = /^[\u0621-\u064A\u0671 0-9.،؛؟:!«»()\-]+$/u;

/** One line's text without the markers, and whether it carried a page marker. */
function clean(raw: string, line: number): { text: string; page: boolean } {
  const page = /PageV\d+P\d+/u.test(raw);
  const text = raw
    .replace(PAGE, " ")
    .replace(FOLIO, " ")
    .replace(NOTE_BEFORE_MARK, "")
    .replace(NOTE, " ")
    .replace(/\s+/gu, " ")
    .trim();
  if (text.includes("[") || text.includes("]")) throw new Error(`line ${line}: a bracket the parser does not explain: ${JSON.stringify(text)}`);
  return { text, page };
}

function checkCharacters(text: string, where: string): void {
  if (text === "") return;
  const stripped = text.replaceAll(VERSE_BREAK, " ");
  if (!ALLOWED.test(stripped)) {
    const bad = [...stripped].find((ch) => !ALLOWED.test(ch));
    throw new Error(`${where}: unexpected character ${JSON.stringify(bad)} (U+${bad?.codePointAt(0)?.toString(16)}) in ${JSON.stringify(text)}`);
  }
}

interface Draft {
  kind: RowKind;
  level: number | null;
  parts: string[];
  lines: string[];
  first: number;
  last: number;
}

const CLOSERS_ONLY = /^[»)\]]+[.؟!:]*$/u;
const CONJUNCTION_WORD = /^[وف][\u0621-\u064A\u0671]{2,}$/u;
/** tools/camel_run.py's cap on a sentence: one longer than CAP + SLACK words is cut in a window of CAP words (CUT_FROM..CAP). */
const SENTENCE_CAP = 90;
const CUT_FROM = 50;
const SLACK = 20;

/** A sentence of more than SENTENCE_CAP + SLACK words, cut after a comma, else before a conjunction word, else at the cap. */
function capSentence(chunks: string[]): string[][] {
  const out: string[][] = [];
  let rest = chunks;
  while (rest.length > SENTENCE_CAP + SLACK) {
    let at: number | undefined;
    for (let k = SENTENCE_CAP; k >= CUT_FROM && at === undefined; k--) if (rest[k - 1]!.endsWith("،")) at = k;
    for (let k = SENTENCE_CAP; k >= CUT_FROM && at === undefined; k--) if (CONJUNCTION_WORD.test(rest[k]!)) at = k;
    at ??= SENTENCE_CAP;
    out.push(rest.slice(0, at));
    rest = rest.slice(at);
  }
  out.push(rest);
  return out;
}

/**
 * A paragraph's sentences, as tools/camel_run.py cuts them for the CoNLL-U: after a word ending in . ؟ ! : (not the colon
 * of a "89: 6" reference, not before a lone closing mark), and a sentence that is still too long cut again by capSentence.
 */
export function splitSentences(text: string): string[] {
  const chunks = text.split(" ");
  const sentences: string[][] = [];
  let current: string[] = [];
  chunks.forEach((chunk, i) => {
    current.push(chunk);
    const next = chunks[i + 1];
    if (next === undefined || !END_OF_SENTENCE.test(chunk)) return;
    if (/\d:$/u.test(chunk) && /^\d/u.test(next)) return;
    if (CLOSERS_ONLY.test(next)) return;
    sentences.push(current);
    current = [];
  });
  if (current.length) sentences.push(current);
  return sentences.flatMap(capSentence).map((sentence) => sentence.join(" "));
}

/** The rows of a prose paragraph: itself when it has at most SPLIT_ABOVE words, else pieces cut at sentence ends. */
export function splitParagraph(text: string): string[] {
  if (countWords(text) <= SPLIT_ABOVE) return [text];
  const pieces: { sentences: string[]; words: number }[] = [];
  let current = { sentences: [] as string[], words: 0 };
  for (const sentence of splitSentences(text)) {
    const words = countWords(sentence);
    if (current.sentences.length) {
      const joined = current.words + words;
      const keeps = current.words < TARGET && joined <= SPLIT_ABOVE &&
        (joined <= TARGET || joined - TARGET < TARGET - current.words);
      if (!keeps) {
        pieces.push(current);
        current = { sentences: [], words: 0 };
      }
    }
    current.sentences.push(sentence);
    current.words += words;
  }
  pieces.push(current);
  if (pieces.length > 1 && pieces.at(-1)!.words < MIN_TAIL) {
    const tail = pieces.pop()!;
    pieces.at(-1)!.sentences.push(...tail.sentences);
  }
  return pieces.map((piece) => piece.sentences.join(" "));
}

export function parseOpenITI(markdown: string): OitiWork[] {
  const file = markdown.split("\n");
  if (file.length < LAST_LINE) throw new Error(`the file has ${file.length} lines, not ${LAST_LINE} or more`);

  const usedFootnotes = new Set<number>();
  const drafts: Draft[] = [];
  let pageSince = false;

  for (let no = FIRST_LINE; no <= LAST_LINE; no++) {
    const raw = file[no - 1]!;
    const where = `line ${no}`;
    const heading = HEADING.exec(raw);
    const paragraph = raw.startsWith("# ");
    const wrapped = raw.startsWith("~~");
    const markerOnly = /^PageV\d+P\d+\s*$/u.test(raw);
    if (!heading && !paragraph && !wrapped && !markerOnly) throw new Error(`${where}: not a heading, paragraph, continuation or page marker: ${JSON.stringify(raw.slice(0, 60))}`);

    const body = heading ? heading[2]! : paragraph ? raw.slice(2) : wrapped ? raw.slice(2) : raw;
    const cleaned = clean(body, no);
    const page = cleaned.page;
    let text = cleaned.text;
    for (const leak of LEAKED_FOOTNOTES) {
      if (leak.line !== no) continue;
      const bare = body.replace(PAGE, " ").replace(FOLIO, " ").replace(/\s+/gu, " ").trim();
      if (!bare.startsWith(leak.text)) throw new Error(`${where}: the leaked footnote ${JSON.stringify(leak.text)} is not at the start of the line`);
      text = clean(bare.slice(leak.text.length), no).text;
      usedFootnotes.add(no);
    }
    checkCharacters(text, where);

    if (heading) {
      drafts.push({ kind: "head", level: heading[1]!.length, parts: [text], lines: [], first: no, last: no });
      pageSince = page;
      continue;
    }
    if (markerOnly) {
      pageSince = true;
      continue;
    }
    const last = drafts.at(-1);

    if (wrapped) {
      if (!last || last.kind !== "prose") throw new Error(`${where}: a continuation line after a ${last?.kind ?? "start of the slice"}`);
      if (text) last.parts.push(text);
      last.last = no;
      pageSince = page;
      continue;
    }

    // "# " line: a verse line, a continuation after a page marker, or a new paragraph.
    if (text.includes(VERSE_BREAK)) {
      if (text.split(VERSE_BREAK).length !== 2) throw new Error(`${where}: a verse line with other than two hemistichs`);
      if (last?.kind === "verse") {
        last.lines.push(text);
        last.last = no;
      } else drafts.push({ kind: "verse", level: null, parts: [], lines: [text], first: no, last: no });
      pageSince = page;
      continue;
    }
    if (text.includes("...")) throw new Error(`${where}: "..." that is not a verse break: ${JSON.stringify(text)}`);

    const previousText = last?.kind === "prose" ? last.parts.join(" ") : "";
    if (last?.kind === "prose" && pageSince && !END_OF_SENTENCE.test(previousText)) {
      if (text) last.parts.push(text);
      last.last = no;
    } else if (text) {
      drafts.push({ kind: "prose", level: null, parts: [text], lines: [], first: no, last: no });
    } else {
      throw new Error(`${where}: an empty paragraph`);
    }
    pageSince = page;
  }
  for (const leak of LEAKED_FOOTNOTES) {
    if (!usedFootnotes.has(leak.line)) throw new Error(`LEAKED_FOOTNOTES: line ${leak.line} was not used`);
  }

  // Cut the drafts into works at the lines WORKS names.
  const works: OitiWork[] = [];
  let at = 0;
  for (const spec of WORKS) {
    const first = drafts[at];
    if (!first || first.first !== spec.opening.line || first.kind !== "head" || first.level !== spec.opening.level) {
      throw new Error(`${spec.slug}: expected a level ${spec.opening.level} heading at line ${spec.opening.line}, found ${first ? `${first.kind} at line ${first.first}` : "the end"}`);
    }
    const rows: OitiRow[] = [];
    while (at < drafts.length && drafts[at]!.first <= spec.last) {
      const draft = drafts[at]!;
      if (draft.last > spec.last) throw new Error(`${spec.slug}: a row from line ${draft.first} runs past line ${spec.last}`);
      const text = draft.kind === "verse" ? draft.lines.join(" ") : draft.parts.join(" ");
      (draft.kind === "prose" ? splitParagraph(text) : [text]).forEach((piece, k) => {
        const n = rows.length + 1;
        rows.push({
          pid: `${spec.slug}.${n}`, work: spec.slug, n, kind: draft.kind, text: piece, source: [draft.first, draft.last],
          ...(draft.kind === "head" ? { level: draft.level! } : {}),
          ...(draft.kind === "verse" ? { lines: draft.lines } : {}),
          ...(k > 0 ? { continues: true as const } : {}),
        });
      });
      at++;
    }
    const lastRow = rows.at(-1)!;
    if (lastRow.source[1] !== spec.last) {
      // A work's last lines may be page markers only.
      const trailing = file.slice(lastRow.source[1], spec.last).every((l) => /^PageV\d+P\d+\s*$/u.test(l));
      if (!trailing) throw new Error(`${spec.slug}: its last row ends at line ${lastRow.source[1]}, not ${spec.last}`);
    }
    works.push({ ...spec, titleAr: rows[0]!.text, rows });
  }
  if (at !== drafts.length) throw new Error(`${drafts.length - at} rows after the last work`);
  return works;
}

/** Whitespace-separated words of a text that carry a letter or digit (not a lone "»" or "..."). */
export const countWords = (text: string): number => text.split(" ").filter((word) => /[\u0621-\u064A\u0671 0-9]/u.test(word)).length;
