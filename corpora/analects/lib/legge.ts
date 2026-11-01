// Reads James Legge's Confucian Analects from Project Gutenberg #4094: Legge's Chinese, broken into 20 books and
// their chapters, and his English. The Chinese lines are interleaved with the English (a Chinese chapter may continue
// after English lines of the same page), so the two are separated by script: a line with a CJK character or a 【 is
// Chinese, every other line English. Strict: anything the format does not explain throws.

/** A unit of Legge's Chinese: a character, a mark of punctuation, a chapter marker or a substituted character. */
export type LeggeUnit =
  | { kind: "char"; char: string }
  | { kind: "mark"; mark: string }
  | { kind: "chapter" }
  /** A rare character Legge (or the digitizer) describes in parentheses, e.g. "(zao4 上穴，中土，下黽)". */
  | { kind: "substitute"; text: string };

export interface LeggeBook {
  book: number;
  /** Legge's English heading, e.g. "HSIO R.". */
  heading: string;
  units: LeggeUnit[];
  /** The English of each chapter, in order, as printed (verse numbers included). */
  english: string[];
}

const CJK = /[\u3400-\u9fff]/u;
const CHINESE_LINE = /[\u3400-\u9fff\u3010\u3011\uff00-\uffef]/u;
const ROMAN = "(?:CHAPTER|CHAP\\.?)\\s+[IVXLC]+\\.?";
/** The digitizer's marks: 、 and 。 as Legge printed them, the half-width 、 in lists, and a few others. */
const MARKS = "、。；？";

/**
 * Legge's printed Chinese for one book, as units. Spaces are dropped; the half-width ideographic comma becomes 、;
 * verse markers (【一節】) are dropped, chapter markers (【第一章】, 【十一章】, 【廿一章】) become `chapter` units.
 */
function chineseUnits(text: string, book: number): LeggeUnit[] {
  const units: LeggeUnit[] = [];
  let i = 0;
  while (i < text.length) {
    const rest = text.slice(i);
    const marker = /^【([^】]*)】/u.exec(rest);
    const substitute = /^[(（][^)）]*[)）]/u.exec(rest);
    const char = String.fromCodePoint(text.codePointAt(i)!);
    if (marker) {
      if (marker[1]!.endsWith("章")) units.push({ kind: "chapter" });
      else if (!marker[1]!.endsWith("節")) throw new Error(`Book ${book}: unexpected marker ${marker[0]}`);
      i += marker[0].length;
    } else if (substitute) {
      units.push({ kind: "substitute", text: substitute[0].slice(1, -1) });
      i += substitute[0].length;
    } else if (CJK.test(char)) {
      units.push({ kind: "char", char });
      i += char.length;
    } else if (MARKS.includes(char)) {
      units.push({ kind: "mark", mark: char });
      i++;
    } else if (char === "､") {
      units.push({ kind: "mark", mark: "、" });
      i++;
    } else if (/\s/u.test(char)) i++;
    else throw new Error(`Book ${book}: unexpected character U+${char.codePointAt(0)!.toString(16)} "${char}" in Legge's Chinese`);
  }
  return units;
}

/** Plain typographic quotes and dashes for Legge's ASCII ones. */
function typeset(text: string): string {
  return text
    .replace(/--/gu, "—")
    .replace(/(^|[\s(—‘“])'/gu, "$1‘")
    .replace(/'/gu, "’")
    .replace(/(^|[\s(—‘“])"/gu, "$1“")
    .replace(/"/gu, "”");
}

/** Legge's English chapters of one book: the text after each "CHAPTER n." heading, unwrapped. */
function englishChapters(lines: readonly string[], book: number): string[] {
  const text = lines.join("\n");
  const headings = [...text.matchAll(new RegExp(ROMAN, "gu"))];
  // Numerals are misprinted in places, so chapters are told apart by position, never by their numeral.
  return headings.map((match, i) => {
    const end = headings[i + 1]?.index ?? text.length;
    const body = text.slice(match.index + match[0].length, end).replace(/\s+/gu, " ").trim();
    if (!body) throw new Error(`Book ${book}: an empty English chapter`);
    return typeset(body);
  });
}

/** The 20 books of Legge's text. */
export function parseLegge(source: string): LeggeBook[] {
  const start = source.indexOf("*** START OF");
  const end = source.indexOf("*** END OF");
  if (start < 0 || end < 0) throw new Error("Project Gutenberg start/end markers not found");
  const lines = source.slice(start, end).split("\n");
  const titles = lines.flatMap((line, index) => (/^\S+第[一二三四五六七八九十]+\s*$/u.test(line) ? [index] : []));
  if (titles.length !== 20) throw new Error(`Found ${titles.length} Chinese book titles, expected 20`);
  return titles.map((first, n): LeggeBook => {
    const block = lines.slice(first + 1, titles[n + 1] ?? lines.length);
    const heading = /^BOOK [IVXL]+\.\s+(.+?)\s*$/u.exec(block.find((line) => /^BOOK /u.test(line)) ?? "")?.[1];
    if (!heading) throw new Error(`Book ${n + 1} has no English heading`);
    const chinese = block.filter((line) => CHINESE_LINE.test(line)).map((line) => line.trim()).join("");
    const english = englishChapters(block.filter((line) => !CHINESE_LINE.test(line) && !/^BOOK /u.test(line)), n + 1);
    return { book: n + 1, heading, units: chineseUnits(chinese, n + 1), english };
  });
}
