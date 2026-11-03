// Dell'arte della guerra as Liber Liber's TXT of Mario Martelli's edition has it (fetch.ts decodes the download to
// UTF-8 and keeps its CRLF line ends). The file starts with a colophon, the title page and the licence block; the text
// begins at the proemio's heading and ends with the last paragraph. In the text:
//   <B>…</B>         a heading line. The proemio's heading is six such lines in a row, joined with single spaces;
//                    a book's heading is one line, "LIBRO PRIMO" … "LIBRO SETTIMO".
//   COSIMO  Voi …    a paragraph that opens a speaker's turn: the name in capitals, two spaces, the text. A paragraph
//                    with no name continues the turn before it (or is the narrator's).
// Strict: markup, tabs, no-break and double spaces left in a paragraph, a heading that is neither the proemio's nor a
// book's, and a label that is not a speaker of the dialogue all throw. The paragraphs that come out are checked against
// the annotation's # text lines (arte.ts), so a rule here that loses or adds a character does not pass quietly.

export interface TextFix {
  /** Line of the file, counted from 1 across the colophon, as the CRLF-split download has it. */
  line: number;
  /** Column of `from` on that line, counted from 0 (UTF-16 units; the line has no astral characters). */
  col: number;
  from: string;
  to: string;
  /** The text just before and just after `from` on the line: the fix applies only where they match. */
  before: string;
  after: string;
}

export type ArteBook = "p" | "1" | "2" | "3" | "4" | "5" | "6" | "7";

/** One heading or paragraph of the text. `par` is the paragraph's number within its book; a heading is 0. */
export interface ArteParagraph {
  book: ArteBook;
  par: number;
  kind: "heading" | "paragraph";
  /** The speaker's label as the file prints it ("COSIMO"), for a paragraph that opens a turn. */
  speaker: string | null;
  text: string;
  /** Line of the file the paragraph starts on. */
  line: number;
}

const ORDINALS: Readonly<Record<string, ArteBook>> = {
  PRIMO: "1", SECONDO: "2", TERZO: "3", QUARTO: "4", QUINTO: "5", SESTO: "6", SETTIMO: "7",
};
const HEADING = /^<B>(.*)<\/B>$/u;
const LABEL = /^([A-ZÀ-Ý]{3,}) {2}(?=\S)/u;

/**
 * The five speakers of the dialogue: Martelli's label → the name each column prints before the turn's first paragraph.
 * Farneworth spells Batista (Battista della Palla) "Battista"; the others are the same in both.
 */
export const SPEAKERS: Readonly<Record<string, { it: string; en: string }>> = {
  COSIMO: { it: "Cosimo", en: "Cosimo" },
  FABRIZIO: { it: "Fabrizio", en: "Fabrizio" },
  ZANOBI: { it: "Zanobi", en: "Zanobi" },
  BATISTA: { it: "Batista", en: "Battista" },
  LUIGI: { it: "Luigi", en: "Luigi" },
};

/** Curly apostrophes to the text's own straight one, markup out, ends trimmed. */
function clean(text: string): string {
  return text.replace(/[\u2018\u2019]/gu, "'").replace(/<\/?[BI]>/gu, "").trim();
}

/**
 * Applies each fix to its line, right to left within a line. A fix whose columns hold other text, or whose context
 * does not match, throws. `used` is told "ARTE_TEXT_FIXES <line>:<col>" for each fix applied.
 */
function applyFixes(lines: string[], fixes: Readonly<Record<string, TextFix>>, used: Set<string>): void {
  const byLine = new Map<number, [string, TextFix][]>();
  for (const [key, fix] of Object.entries(fixes)) {
    if (key !== `${fix.line}:${fix.col}`) throw new Error(`text fix ${key} is filed under the wrong key; it is ${fix.line}:${fix.col}`);
    const group = byLine.get(fix.line) ?? [];
    group.push([key, fix]);
    byLine.set(fix.line, group);
  }
  for (const [lineNo, group] of byLine) {
    let line = lines[lineNo - 1];
    if (line === undefined) throw new Error(`text fix on line ${lineNo}: the file has ${lines.length} lines`);
    for (const [key, fix] of group.sort((a, b) => b[1].col - a[1].col)) {
      const where = `text fix ${key} ${JSON.stringify(fix.from)} → ${JSON.stringify(fix.to)}`;
      if (line.slice(fix.col, fix.col + fix.from.length) !== fix.from) {
        throw new Error(`${where}: the line has ${JSON.stringify(line.slice(fix.col, fix.col + fix.from.length))} at that column`);
      }
      if (!line.slice(0, fix.col).endsWith(fix.before) || !line.slice(fix.col + fix.from.length).startsWith(fix.after)) {
        throw new Error(`${where}: the text around it is not ${JSON.stringify(fix.before)} … ${JSON.stringify(fix.after)}`);
      }
      line = line.slice(0, fix.col) + fix.to + line.slice(fix.col + fix.from.length);
      used.add(`ARTE_TEXT_FIXES ${key}`);
    }
    lines[lineNo - 1] = line;
  }
}

/** The proemio's heading and paragraph, then each book's heading and paragraphs, in order. */
export function parseArteText(download: string, fixes: Readonly<Record<string, TextFix>>, used: Set<string>): ArteParagraph[] {
  if (download.split("\r\n").join("").includes("\n")) throw new Error("Liber Liber text: a line feed that is not part of a CRLF");
  const lines = download.split("\r\n");
  applyFixes(lines, fixes, used);
  const start = lines.findIndex((line) => line.startsWith("<B>Proemio"));
  if (start < 0) throw new Error("Liber Liber text: no proemio heading");
  const end = lines.findLastIndex((line) => line.trim() !== "");
  if (lines.slice(end + 1).some((line) => line.trim() !== "")) throw new Error("Liber Liber text: text after its last line");

  const out: ArteParagraph[] = [];
  let book: ArteBook | undefined;
  let par = 0;
  let heading: { line: number; parts: string[] } | undefined;
  const flushHeading = () => {
    if (!heading) return;
    const title = heading.parts.join(" ");
    const ordinal = /^LIBRO ([A-Z]+)$/u.exec(title)?.[1];
    const found = title.startsWith("Proemio ") ? "p" : ordinal ? ORDINALS[ordinal] : undefined;
    if (!found) throw new Error(`Liber Liber text line ${heading.line}: unrecognised heading ${JSON.stringify(title)}`);
    book = found;
    par = 0;
    out.push({ book, par, kind: "heading", speaker: null, text: title, line: heading.line });
    heading = undefined;
  };

  for (let i = start; i <= end; i++) {
    const line = lines[i]!;
    const lineNo = i + 1;
    if (line.trim() === "") {
      flushHeading();
      continue;
    }
    const heads = HEADING.exec(line.trim());
    if (heads) {
      (heading ??= { line: lineNo, parts: [] }).parts.push(clean(heads[1]!));
      continue;
    }
    flushHeading();
    const label = LABEL.exec(line);
    const text = clean(label ? line.slice(label[0].length) : line);
    if (/[<>\t\u00a0]| {2}/u.test(text)) throw new Error(`Liber Liber text line ${lineNo}: markup, a tab, a no-break space or a double space in ${JSON.stringify(text.slice(0, 60))}`);
    if (label && !Object.hasOwn(SPEAKERS, label[1]!)) throw new Error(`Liber Liber text line ${lineNo}: ${label[1]} is not a speaker of the dialogue`);
    if (!book) throw new Error(`Liber Liber text line ${lineNo}: a paragraph before any heading`);
    out.push({ book, par: ++par, kind: "paragraph", speaker: label ? label[1]! : null, text, line: lineNo });
  }
  flushHeading();
  return out;
}
