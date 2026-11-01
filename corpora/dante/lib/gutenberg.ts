// The two Project Gutenberg texts: the Italian (#1012), whose lines place the words the treebank leaves without one,
// and Longfellow's translation (#1004). Both print a canto as tercets separated by blank lines, ending in a single
// line. Strict: a canto heading out of order, or a line outside a canto, throws.
import type { Cantica } from "../../../packs/ita/build/conllu";

export const CANTICHE: readonly Cantica[] = ["inferno", "purgatorio", "paradiso"];
export const CANTOS: Readonly<Record<Cantica, number>> = { inferno: 34, purgatorio: 33, paradiso: 33 };

/** A canto's lines and the length of each block (tercets, and the closing line). */
export interface GutenbergCanto {
  lines: string[];
  blocks: number[];
}

const ROMAN: Readonly<Record<string, number>> = { I: 1, V: 5, X: 10, L: 50 };
export function roman(text: string): number {
  let total = 0;
  for (let i = 0; i < text.length; i++) {
    const value = ROMAN[text[i]!];
    const next = ROMAN[text[i + 1] ?? ""] ?? 0;
    if (value === undefined) throw new Error(`Not a Roman numeral: ${text}`);
    total += value < next ? -value : value;
  }
  return total;
}

const body = (text: string, what: string): string[] => {
  const lines = text.replace(/\r\n/gu, "\n").split("\n");
  const start = lines.findIndex((line) => line.startsWith("*** START OF THE PROJECT GUTENBERG EBOOK"));
  const end = lines.findIndex((line) => line.startsWith("*** END OF THE PROJECT GUTENBERG EBOOK"));
  if (start < 0 || end < start) throw new Error(`${what}: no Gutenberg start and end markers`);
  return lines.slice(start + 1, end);
};

/** Collects verse lines into cantos; `heading` recognises a canto heading and returns its cantica and number. */
function cantos(
  lines: readonly string[],
  heading: (line: string) => { cantica: Cantica; canto: number } | undefined,
  ignore: (line: string) => boolean,
  what: string,
): Record<Cantica, GutenbergCanto[]> {
  const out: Record<Cantica, GutenbergCanto[]> = { inferno: [], purgatorio: [], paradiso: [] };
  let current: GutenbergCanto | undefined;
  let block = 0;
  const close = () => {
    if (current && block) current.blocks.push(block);
    block = 0;
  };
  for (const raw of lines) {
    const head = heading(raw);
    if (head) {
      close();
      const list = out[head.cantica];
      if (head.canto !== list.length + 1) throw new Error(`${what}: ${head.cantica} canto ${head.canto} out of order`);
      current = { lines: [], blocks: [] };
      list.push(current);
      continue;
    }
    const line = raw.trim();
    if (!line) {
      close();
      continue;
    }
    if (ignore(raw)) continue;
    if (!current) throw new Error(`${what}: text outside a canto: ${raw}`);
    current.lines.push(line);
    block++;
  }
  close();
  for (const cantica of CANTICHE) {
    if (out[cantica].length !== CANTOS[cantica]) throw new Error(`${what}: ${out[cantica].length} cantos of the ${cantica}`);
  }
  return out;
}

const CANTICA_TITLE = /^\s*(INFERNO|PURGATORIO|PARADISO)\s*$/u;

/** The Italian text: from the first cantica title to the rule before the table of special characters. */
export function parseItalian(text: string): Record<Cantica, GutenbergCanto[]> {
  const lines = body(text, "Gutenberg #1012");
  const first = lines.findIndex((line) => CANTICA_TITLE.test(line));
  const rule = lines.findIndex((line) => /^\s*(- ){5,}/u.test(line));
  if (first < 0 || rule < first) throw new Error("Gutenberg #1012: no cantica title or closing rule");
  return cantos(lines.slice(first, rule), (line) => {
    const match = /^ {2}(Inferno|Purgatorio|Paradiso) • Canto ([IVXL]+)$/u.exec(line);
    return match ? { cantica: match[1]!.toLowerCase() as Cantica, canto: roman(match[2]!) } : undefined;
  }, (line) => CANTICA_TITLE.test(line), "Gutenberg #1012");
}

export interface LongfellowCanto extends GutenbergCanto {
  /** Footnotes after the canto's last line ("* So pleases me…"), each a list of lines, by the line they annotate. */
  notes: Map<number, string[]>;
}

export interface Longfellow {
  cantos: Record<Cantica, LongfellowCanto[]>;
  /** The table of contents: each canto's subjects ("The Dark Forest. The Hill of Difficulty. …"). */
  contents: Record<Cantica, string[]>;
}

/**
 * Longfellow's translation: the table of contents, then the three cantiche to the appendix (his six sonnets on the
 * Commedia). A line ending in "*" has a footnote, printed after the canto's last line as lines starting with "* ".
 */
export function parseLongfellow(text: string): Longfellow {
  const lines = body(text, "Gutenberg #1004");
  const appendix = lines.lastIndexOf("APPENDIX");
  const first = lines.indexOf("INFERNO");
  if (first < 0 || appendix < first) throw new Error("Gutenberg #1004: no INFERNO title or appendix");

  // Contents: "    Canto I. The Dark Forest. …" (Inferno) or "    XXX. The Tenth Heaven, …", continued on lines
  // indented one space more; the cantica names stand alone.
  const contents: Record<Cantica, string[]> = { inferno: [], purgatorio: [], paradiso: [] };
  let cantica: Cantica | undefined;
  for (const line of lines.slice(0, first)) {
    const title = CANTICA_TITLE.exec(line);
    if (title) {
      cantica = title[1]!.toLowerCase() as Cantica;
      continue;
    }
    if (!cantica || !line.trim() || line.trim() === "APPENDIX") continue;
    const entry = /^ {4}(?:Canto )?([IVXL]+)\. (.+)$/u.exec(line);
    if (entry) {
      if (roman(entry[1]!) !== contents[cantica].length + 1) throw new Error(`Gutenberg #1004: contents of ${cantica} out of order at ${line}`);
      contents[cantica].push(entry[2]!.trim());
    } else if (/^ {5,}\S/u.test(line) && contents[cantica].length) {
      contents[cantica][contents[cantica].length - 1] += ` ${line.trim()}`;
    } else throw new Error(`Gutenberg #1004: unexpected contents line: ${line}`);
  }
  for (const c of CANTICHE) if (contents[c].length !== CANTOS[c]) throw new Error(`Gutenberg #1004: contents list ${contents[c].length} cantos of the ${c}`);

  const parsed = cantos(lines.slice(first, appendix), (line) => {
    const match = /^(Inferno|Purgatorio|Paradiso): Canto ([IVXL]+)$/u.exec(line);
    return match ? { cantica: match[1]!.toLowerCase() as Cantica, canto: roman(match[2]!) } : undefined;
  }, (line) => CANTICA_TITLE.test(line), "Gutenberg #1004");

  const out = {} as Record<Cantica, LongfellowCanto[]>;
  for (const c of CANTICHE) {
    out[c] = parsed[c].map((canto) => {
      const start = canto.lines.findIndex((line) => line.startsWith("* "));
      if (start < 0) {
        if (canto.lines.some((line) => line.endsWith("*"))) throw new Error(`Gutenberg #1004: ${c}: a footnote mark without a note`);
        return { ...canto, notes: new Map() };
      }
      const marked = canto.lines.slice(0, start).flatMap((line, i) => (line.endsWith("*") ? [i] : []));
      if (marked.length !== 1) throw new Error(`Gutenberg #1004: ${c}: ${marked.length} footnote marks for one note`);
      const note = canto.lines.slice(start);
      note[0] = note[0]!.slice(2);
      const lines = canto.lines.slice(0, start).map((line) => line.replace(/\*$/u, ""));
      // The note's lines were counted into blocks after the canto's last line: drop them.
      let extra = note.length;
      const blocks = [...canto.blocks];
      while (extra > 0) extra -= blocks.pop()!;
      if (extra !== 0) throw new Error(`Gutenberg #1004: ${c}: the footnote does not end the canto`);
      return { lines, blocks, notes: new Map([[marked[0]!, note]]) };
    });
  }
  return { cantos: out, contents };
}
