// The Discorsi's vendored files (data/discorsi, every one pinned in DISCORSI_SHA) and its Italian text, derived from
// Liber Liber's ODT (DISCORSI_SOURCE.odt) as fetch.ts keeps it.
//
// The text comes from the ODT's content.xml. A block is a text:p or text:h anywhere under office:text. Blocks are
// counted from 1 in document order: blocks 1–207 are the colophon, licence, contents and title page, and blocks
// 208–719 are the work. A block's text is its character data. text:s gives text:c spaces (1 by default), text:tab a
// tab and text:line-break a line feed. Spans add their text, and bookmarks and soft page breaks add nothing. A
// character is italic when the innermost text:style-name around it that sets fo:font-style sets "italic". A style
// that sets none defers to its parent-style-name, and then to the element around it. Styles come from styles.xml and
// content.xml; when both define a name, content.xml's definition is used.
//
// Then, in order:
//   1. text/fixes.tsv corrects 16 blocks. Each fix is checked against the unmodified block: its columns must hold
//      `from`, it must be the stated occurrence of `from` there, and the text around it must match. Fixes on one block
//      apply from right to left. Replacement text is italic when any of the text it replaces was.
//   2. Curly apostrophes become straight. A whitespace run inside a block (line breaks included) becomes one space.
//      Whitespace at the ends is removed, and a block left empty is dropped.
//   3. Block 208, the dedication's salutation, is the heading of book 0, chapter 0, and block 209 is the dedication.
//      "LIBRO PRIMO" and "LIBRO SECONDO" are the headings of their books' chapter 0, the proemio. "LIBRO TERZO" is
//      dropped, because Book III has no proemio. A text:h that begins with a number is a chapter's rubric and keeps
//      the number. A heading is paragraph 0, and the paragraphs after it count from 1.
// Strict: an element in the work's blocks other than those above, an undefined style, a character outside the Basic
// Multilingual Plane and whitespace that JavaScript and Python classify differently all throw. The result must then
// match text/manifest.json record for record: text, book, chapter, paragraph, block, italics, «» quotations and the
// block's own line breaks. Each unit's records must also match text/<unit>.txt. The annotation's # text lines are
// checked against these records in discorsi.ts.
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { DOMParser, type Document, type Element, type Node } from "@xmldom/xmldom";
import { ROOT } from "../../../scripts/core/outputs";
import { DISCORSI_CACHE, DISCORSI_SECTIONS, DISCORSI_SHA, DISCORSI_SOURCE, DISCORSI_UNITS, type DiscorsiFix, type DiscorsiKind } from "../discorsi-sources";
import { DATA } from "./align";
import { readPinned, sha256 } from "./pins";
import { zipMember } from "./zip";

/** The vendored files, <kind>/<name>.<extension>. */
export const DISCORSI_DATA = join(DATA, "discorsi");

/** The ODT, where fetch.ts keeps it (its CACHE). */
const ODT = join(ROOT, ".cache", "sources", "machiavelli", DISCORSI_CACHE.odt);

export type DiscorsiBook = "0" | "1" | "2" | "3";

/** A run of a record's text: UTF-16 offsets, end exclusive. The text has no astral characters, so they are also code points. */
export interface DiscorsiSpan {
  start: number;
  end: number;
  text: string;
}

/** One heading or paragraph of the canonical text, in reading order. */
export interface DiscorsiParagraph {
  /** "0" is the dedication; the annotation's # book says the same. */
  book: DiscorsiBook;
  /** 0 for the dedication and the proemi. */
  chapter: number;
  /** 0 for a heading; the paragraphs after it count from 1. */
  par: number;
  kind: "heading" | "paragraph";
  text: string;
  /** The ODT block, counted as DiscorsiFix.line counts. */
  line: number;
  /** The italic runs of `text`. */
  italics: readonly DiscorsiSpan[];
}

// ---- Vendored files ---------------------------------------------------------------------------------------------

/** A vendored file's text, after its bytes are checked against DISCORSI_SHA[kind][name]. */
export function readDiscorsi(kind: DiscorsiKind, name: string, extension: string): Promise<string> {
  const pins: Readonly<Record<string, string>> = DISCORSI_SHA[kind];
  const rel = `${kind}/${name}.${extension}`;
  if (!Object.hasOwn(pins, name)) throw new Error(`discorsi/${rel}: no pin in data/discorsi/pins.json`);
  return readPinned(join(DISCORSI_DATA, rel), pins[name]!, `discorsi/${rel}`);
}

/** The files each kind holds. The dedication ("0-0") has an alignment (every sentence a 1-0 bead) but no English. */
function layout(kind: DiscorsiKind): string[] {
  const english = DISCORSI_SECTIONS.filter((section) => section !== "0-0");
  switch (kind) {
    case "conllu":
      return DISCORSI_UNITS.map((unit) => `${unit}.conllu`);
    case "text":
      return [...DISCORSI_UNITS.map((unit) => `${unit}.txt`), "manifest.json", "fixes.tsv"];
    case "alignment":
      return DISCORSI_SECTIONS.map((section) => `${section}.tsv`);
    case "en":
      return [...english.map((section) => `${section}.txt`), "front.txt"];
    case "en-sent":
      return english.map((section) => `${section}.tsv`);
    case "notes":
      return ["notes.tsv"];
  }
}

const listDifference = (have: readonly string[], want: readonly string[]): string => {
  const missing = want.filter((name) => !have.includes(name));
  const extra = have.filter((name) => !want.includes(name));
  return `missing ${JSON.stringify(missing)}, unexpected ${JSON.stringify(extra)}`;
};

/**
 * Checks every vendored file against its pin. data/discorsi must hold the kinds and pins.json and nothing else. Each
 * kind must hold exactly the files layout() names, and pins.json must pin exactly those. Hidden files (.DS_Store) are
 * not looked at. Returns the number of files.
 */
export async function checkDiscorsiData(): Promise<number> {
  const kinds = Object.keys(DISCORSI_SHA) as DiscorsiKind[];
  const top = (await readdir(DISCORSI_DATA)).filter((name) => !name.startsWith("."));
  const wantTop = [...kinds, "pins.json"];
  if (top.length !== wantTop.length || !wantTop.every((name) => top.includes(name))) {
    throw new Error(`data/discorsi: ${listDifference(top, wantTop)}`);
  }
  let checked = 0;
  for (const kind of kinds) {
    const files = layout(kind);
    const names = files.map((file) => file.slice(0, file.lastIndexOf(".")));
    const pins: Readonly<Record<string, string>> = DISCORSI_SHA[kind];
    const pinned = Object.keys(pins);
    if (pinned.length !== names.length || !names.every((name) => Object.hasOwn(pins, name))) {
      throw new Error(`data/discorsi/pins.json ${kind}: ${listDifference(pinned, names)}`);
    }
    const present = (await readdir(join(DISCORSI_DATA, kind))).filter((name) => !name.startsWith("."));
    if (present.length !== files.length || !files.every((file) => present.includes(file))) {
      throw new Error(`data/discorsi/${kind}: ${listDifference(present, files)}`);
    }
    for (const [i, file] of files.entries()) {
      const actual = sha256(await Bun.file(join(DISCORSI_DATA, kind, file)).bytes());
      const pin = pins[names[i]!]!;
      if (actual !== pin) throw new Error(`discorsi/${kind}/${file}: SHA-256 ${actual}, pin ${pin}`);
      checked++;
    }
  }
  return checked;
}

// ---- The ODT ----------------------------------------------------------------------------------------------------

const NS = {
  office: "urn:oasis:names:tc:opendocument:xmlns:office:1.0",
  style: "urn:oasis:names:tc:opendocument:xmlns:style:1.0",
  text: "urn:oasis:names:tc:opendocument:xmlns:text:1.0",
  fo: "urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0",
} as const;

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;
const CDATA_SECTION_NODE = 4;

/** Blocks in the document; the work is FIRST_BLOCK…BLOCKS. */
const BLOCKS = 719;
const FIRST_BLOCK = 208;
/** The book titles, in order. The third is not a record: Book III has no proemio for it to head. */
const BOOK_TITLES = ["LIBRO PRIMO", "LIBRO SECONDO", "LIBRO TERZO"] as const;
const CHAPTERS: Readonly<Record<string, number>> = { "1": 60, "2": 33, "3": 49 };
/** Elements a block of the work may contain. */
const INLINE: Readonly<Record<string, true>> = {
  "span": true, "a": true, "s": true, "tab": true, "line-break": true, "soft-page-break": true, "bookmark": true, "bookmark-start": true,
  "bookmark-end": true,
};
/** Python's str.isspace() and JavaScript's \s disagree on these; the preparation used Python. */
const AMBIGUOUS_SPACE = /[\x1c-\x1f\x85\ufeff]/u;

const elements = (node: Node): Element[] =>
  Array.from(node.childNodes as unknown as ArrayLike<Node>).filter((child): child is Element => child.nodeType === ELEMENT_NODE);

function parseXml(xml: Uint8Array, name: string): Document {
  return new DOMParser({
    onError: (level, message) => {
      if (level !== "warning") throw new Error(`ODT ${name}: XML ${level}: ${message}`);
    },
  }).parseFromString(new TextDecoder("utf-8", { fatal: true }).decode(xml), "text/xml");
}

interface Style {
  parent: string | null;
  fontStyle: string | null;
}

/** Every style:style by name, styles.xml first, so that content.xml's automatic styles win. */
function styleTable(documents: readonly Document[]): Map<string, Style> {
  const styles = new Map<string, Style>();
  for (const xml of documents) {
    for (const style of Array.from(xml.getElementsByTagNameNS(NS.style, "style") as unknown as ArrayLike<Element>)) {
      const name = style.getAttributeNS(NS.style, "name");
      if (!name) throw new Error("ODT: a style:style with no style:name");
      const properties = elements(style).find((child) => child.namespaceURI === NS.style && child.localName === "text-properties");
      styles.set(name, {
        parent: style.getAttributeNS(NS.style, "parent-style-name") || null,
        fontStyle: properties?.getAttributeNS(NS.fo, "font-style") || null,
      });
    }
  }
  return styles;
}

/** Whether text under the style `name` is italic, when the text around it is `inherited`. */
function italicOf(styles: ReadonlyMap<string, Style>, name: string | null, inherited: boolean): boolean {
  const seen = new Set<string>();
  for (let current = name; current; ) {
    const style = styles.get(current);
    if (!style) throw new Error(`ODT: style ${current} is not defined`);
    if (style.fontStyle) return style.fontStyle === "italic";
    seen.add(current);
    current = style.parent;
    if (current && seen.has(current)) throw new Error(`ODT: style ${name} inherits from itself`);
  }
  return inherited;
}

interface Block {
  /** text:h rather than text:p. */
  heading: boolean;
  text: string;
  /** One flag per UTF-16 unit of `text`. */
  italic: boolean[];
}

function flatten(block: Element, styles: ReadonlyMap<string, Style>): Block {
  let text = "";
  const italic: boolean[] = [];
  const add = (value: string, flag: boolean) => {
    text += value;
    for (let i = 0; i < value.length; i++) italic.push(flag);
  };
  const walk = (element: Element, inherited: boolean) => {
    const flag = italicOf(styles, element.getAttributeNS(NS.text, "style-name"), inherited);
    switch (element.localName) {
      case "s": {
        const count = element.getAttributeNS(NS.text, "c") ?? "1";
        if (!/^\d+$/u.test(count)) throw new Error(`ODT: text:s with text:c ${JSON.stringify(count)}`);
        add(" ".repeat(Number(count)), flag);
        return;
      }
      case "tab":
        add("\t", flag);
        return;
      case "line-break":
        add("\n", flag);
        return;
    }
    for (const child of Array.from(element.childNodes as unknown as ArrayLike<Node>)) {
      if (child.nodeType === TEXT_NODE || child.nodeType === CDATA_SECTION_NODE) add(child.nodeValue ?? "", flag);
      else if (child.nodeType === ELEMENT_NODE) walk(child as Element, flag);
    }
  };
  walk(block, false);
  return { heading: block.localName === "h", text, italic };
}

/** Every text:p and text:h under office:text, in document order, flattened. */
function readBlocks(odt: Uint8Array): Block[] {
  const content = parseXml(zipMember(odt, "content.xml"), "content.xml");
  const styles = styleTable([parseXml(zipMember(odt, "styles.xml"), "styles.xml"), content]);
  const root = content.documentElement;
  const body = root && elements(root).find((child) => child.namespaceURI === NS.office && child.localName === "body");
  const office = body && elements(body).find((child) => child.namespaceURI === NS.office && child.localName === "text");
  if (!office) throw new Error("ODT content.xml: no office:body/office:text");
  const found: Element[] = [];
  const visit = (element: Element) => {
    for (const child of elements(element)) {
      if (child.namespaceURI === NS.text && (child.localName === "p" || child.localName === "h")) found.push(child);
      visit(child);
    }
  };
  visit(office);
  if (found.length !== BLOCKS) throw new Error(`ODT: ${found.length} text:p and text:h blocks, expected ${BLOCKS}`);
  found.slice(FIRST_BLOCK - 1).forEach((block, i) => {
    const check = (element: Element) => {
      for (const child of elements(element)) {
        if (child.namespaceURI !== NS.text || !Object.hasOwn(INLINE, child.localName ?? "")) {
          throw new Error(`ODT block ${FIRST_BLOCK + i}: unexpected element ${child.nodeName}`);
        }
        check(child);
      }
    };
    check(block);
  });
  return found.map((block) => flatten(block, styles));
}

// ---- Fixes ------------------------------------------------------------------------------------------------------

const FIXES_HEADER = ["file", "line", "col_start", "col_end", "occurrence_on_line", "from", "to", "context_before", "context_after", "evidence"] as const;

/** text/fixes.tsv: its rows as the header names them (as text/manifest.json repeats them), and as fixes. */
function parseFixes(tsv: string): { rows: Record<string, string>[]; fixes: DiscorsiFix[] } {
  const lines = tsv.replace(/\r\n/gu, "\n").replace(/\n$/u, "").split("\n");
  if (lines.shift() !== FIXES_HEADER.join("\t")) throw new Error("discorsi/text/fixes.tsv: unexpected header");
  const rows: Record<string, string>[] = [];
  const fixes: DiscorsiFix[] = [];
  const number = (value: string, where: string): number => {
    if (!/^\d+$/u.test(value)) throw new Error(`${where}: ${JSON.stringify(value)} is not a number`);
    return Number(value);
  };
  lines.forEach((line, i) => {
    const where = `discorsi/text/fixes.tsv line ${i + 2}`;
    const cells = line.split("\t");
    // The preparation read the table with Python's csv module, which would have unquoted a quoted cell.
    if (cells.length !== FIXES_HEADER.length || line.includes('"') || line.includes("\r")) throw new Error(`${where}: not ${FIXES_HEADER.length} plain cells`);
    const row = Object.fromEntries(FIXES_HEADER.map((key, k) => [key, cells[k]!])) as Record<(typeof FIXES_HEADER)[number], string>;
    if (row.file !== "discorsi.odt") throw new Error(`${where}: a fix for ${row.file}`);
    rows.push(row);
    fixes.push({
      line: number(row.line, where),
      col: number(row.col_start, where),
      end: number(row.col_end, where),
      occurrence: number(row.occurrence_on_line, where),
      from: row.from,
      to: row.to,
      before: row.context_before,
      after: row.context_after,
      evidence: row.evidence,
    });
  });
  return { rows, fixes };
}

/** Applies the fixes to their blocks, right to left within a block; columns, occurrence and context are checked against the unmodified block. */
function applyFixes(blocks: Block[], fixes: readonly DiscorsiFix[]): void {
  const byLine = new Map<number, DiscorsiFix[]>();
  for (const fix of fixes) byLine.set(fix.line, [...(byLine.get(fix.line) ?? []), fix]);
  for (const [line, group] of byLine) {
    if (line < FIRST_BLOCK || line > blocks.length) throw new Error(`discorsi/text/fixes.tsv: block ${line} is not part of the work`);
    const original = blocks[line - 1]!.text;
    let { text, italic } = blocks[line - 1]!;
    group.sort((a, b) => b.col - a.col);
    group.forEach((fix, k) => {
      const where = `discorsi/text/fixes.tsv block ${line} column ${fix.col} ${JSON.stringify(fix.from)} → ${JSON.stringify(fix.to)}`;
      if (!fix.from || original.slice(fix.col, fix.end) !== fix.from) {
        throw new Error(`${where}: the block has ${JSON.stringify(original.slice(fix.col, fix.end))} at columns ${fix.col}–${fix.end}`);
      }
      if (k > 0 && fix.end > group[k - 1]!.col) throw new Error(`${where}: overlaps the fix after it`);
      let at = original.indexOf(fix.from);
      let occurrence = 1;
      while (at >= 0 && at < fix.col) {
        at = original.indexOf(fix.from, at + fix.from.length);
        occurrence++;
      }
      if (at !== fix.col || occurrence !== fix.occurrence) throw new Error(`${where}: not occurrence ${fix.occurrence} of ${JSON.stringify(fix.from)} in the block`);
      if (!original.slice(0, fix.col).endsWith(fix.before) || !original.slice(fix.end).startsWith(fix.after)) {
        throw new Error(`${where}: the text around it is not ${JSON.stringify(fix.before)} … ${JSON.stringify(fix.after)}`);
      }
      const flag = italic.slice(fix.col, fix.end).some(Boolean);
      text = text.slice(0, fix.col) + fix.to + text.slice(fix.end);
      italic = [...italic.slice(0, fix.col), ...Array.from({ length: fix.to.length }, () => flag), ...italic.slice(fix.end)];
    });
    blocks[line - 1] = { ...blocks[line - 1]!, text, italic };
  }
}

// ---- Normalisation and records ----------------------------------------------------------------------------------

interface Normalisation {
  apostrophes_normalised: number;
  whitespace_runs_normalised: number;
  edge_whitespace_characters_removed: number;
}

/** Curly apostrophes straightened, inner whitespace runs as one space, the ends trimmed; a character of the result is italic when any it stands for was. */
function normalise(block: Block, stats: Normalisation): { text: string; italic: boolean[] } {
  stats.apostrophes_normalised += (block.text.match(/[\u2018\u2019]/gu) ?? []).length;
  let text = "";
  const italic: boolean[] = [];
  for (const match of block.text.matchAll(/\s+|\S/gu)) {
    const value = match[0];
    const start = match.index;
    const end = start + value.length;
    const flag = block.italic.slice(start, end).some(Boolean);
    if (/^\s/u.test(value)) {
      if (start === 0 || end === block.text.length) {
        stats.edge_whitespace_characters_removed += value.length;
        continue;
      }
      if (value !== " ") stats.whitespace_runs_normalised++;
      text += " ";
    } else text += value === "\u2018" || value === "\u2019" ? "'" : value;
    italic.push(flag);
  }
  return { text, italic };
}

const spans = (text: string, flags: readonly boolean[]): DiscorsiSpan[] => {
  const out: DiscorsiSpan[] = [];
  let start = -1;
  for (let i = 0; i <= flags.length; i++) {
    if (flags[i] && start < 0) start = i;
    else if (!flags[i] && start >= 0) {
      out.push({ start, end: i, text: text.slice(start, i) });
      start = -1;
    }
  }
  return out;
};

/** A record with what the manifest also states about it. */
interface Extracted extends DiscorsiParagraph {
  quoted: DiscorsiSpan[];
  /** Positions of the line breaks in the block's text, after the fixes and before normalisation. */
  breaks: number[];
}

/** The records, the normalisation counts, the dropped Book III title's block and the number of chapters per book. */
interface Extraction {
  records: Extracted[];
  stats: Normalisation;
  bookIIITitle: number;
  chapters: Record<string, number>;
}

function extract(blocks: readonly Block[]): Extraction {
  if (!blocks[FIRST_BLOCK - 3]!.text.startsWith("Discorsi sopra")) throw new Error(`ODT block ${FIRST_BLOCK - 2} is not the title`);
  if (!blocks.at(-1)!.text.endsWith("Massimo.")) throw new Error(`ODT block ${blocks.length} is not the end of the work`);
  const stats: Normalisation = { apostrophes_normalised: 0, whitespace_runs_normalised: 0, edge_whitespace_characters_removed: 0 };
  const records: Extracted[] = [];
  const chapters: Record<string, number> = {};
  let book: DiscorsiBook = "0";
  let chapter = 0;
  let par = -1;
  let bookIIITitle = 0;
  for (let i = FIRST_BLOCK - 1; i < blocks.length; i++) {
    const block = blocks[i]!;
    const line = i + 1;
    if (/[\u{10000}-\u{10ffff}]/u.test(block.text)) throw new Error(`ODT block ${line}: a character outside the Basic Multilingual Plane`);
    if (AMBIGUOUS_SPACE.test(block.text)) throw new Error(`ODT block ${line}: whitespace that JavaScript and Python classify differently`);
    const { text, italic } = normalise(block, stats);
    if (!text) continue;
    let kind: DiscorsiParagraph["kind"] = "paragraph";
    const title = (BOOK_TITLES as readonly string[]).indexOf(text);
    if (title >= 0) {
      book = String(title + 1) as DiscorsiBook;
      chapter = 0;
      par = -1;
      if (book === "3") {
        chapters[book] = 0;
        bookIIITitle = line;
        continue;
      }
      kind = "heading";
    } else if (block.heading) {
      const rubric = /^(\d+) /u.exec(text);
      if (!rubric) throw new Error(`ODT block ${line}: a heading that is neither a book's title nor a numbered rubric: ${JSON.stringify(text.slice(0, 60))}`);
      chapter = Number(rubric[1]);
      chapters[book] = chapter;
      par = -1;
      kind = "heading";
    } else if (line === FIRST_BLOCK) kind = "heading";
    par++;
    records.push({
      book, chapter, par, kind, text, line,
      italics: spans(text, italic),
      quoted: [...text.matchAll(/«[^»]*»/gu)].map((match) => ({ start: match.index, end: match.index + match[0].length, text: match[0] })),
      breaks: [...block.text.matchAll(/\n/gu)].map((match) => match.index),
    });
  }
  if (JSON.stringify(chapters) !== JSON.stringify(CHAPTERS)) throw new Error(`ODT: chapters per book ${JSON.stringify(chapters)}, expected ${JSON.stringify(CHAPTERS)}`);
  for (const [b, count] of Object.entries(CHAPTERS)) {
    const numbers = records.filter((record) => record.book === b && record.kind === "heading" && record.chapter > 0).map((record) => record.chapter);
    if (numbers.length !== count || numbers.some((n, i) => n !== i + 1)) throw new Error(`ODT book ${b}: rubrics numbered ${numbers.join(",")}`);
  }
  if (new Set(records.map((record) => `${record.book}.${record.chapter}.${record.par}`)).size !== records.length) throw new Error("ODT: a book, chapter and paragraph twice");
  return { records, stats, bookIIITitle, chapters };
}

// ---- The manifest -----------------------------------------------------------------------------------------------

interface ManifestRecord {
  book: string;
  chapter: number;
  par: number;
  kind: string;
  speaker: null;
  text: string;
  line: number;
  line_end: number;
  italics: DiscorsiSpan[];
  quoted_spans: DiscorsiSpan[];
  source_line_breaks: number[];
  words: number;
}

interface Manifest {
  source: {
    pins: Record<string, { url: string; sha: string; bytes: number }>;
    body_odt_lines: [number, number];
    book_iii_title_odt_line: number;
    chapter_counts: Record<string, number>;
    normalization: Normalisation;
    fixes_final: boolean;
    fixes_sha256: string;
  };
  fixes: Record<string, string>[];
  units: Record<string, {
    book: string;
    chapter_first: number;
    par_first: number;
    chapter_last: number;
    par_last: number;
    paragraphs: ManifestRecord[];
    sha256: string;
  }>;
}

/** The index of the first character at which two strings differ. */
function firstDifference(a: string, b: string): number {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

/** Throws unless the source, the fixes and every record are the manifest's. */
function checkManifest(manifest: Manifest, fixRows: readonly Record<string, string>[], extracted: Extraction): void {
  const { source } = manifest;
  const odt = source.pins["discorsi-odt"];
  if (!odt || odt.url !== DISCORSI_SOURCE.odt.url || odt.sha !== DISCORSI_SOURCE.odt.sha || odt.bytes !== DISCORSI_SOURCE.odt.bytes) {
    throw new Error("discorsi/text/manifest.json: made from another ODT than DISCORSI_SOURCE.odt");
  }
  if (!source.fixes_final || source.fixes_sha256 !== DISCORSI_SHA.text.fixes) throw new Error("discorsi/text/manifest.json: made with other fixes than text/fixes.tsv");
  if (JSON.stringify(manifest.fixes) !== JSON.stringify(fixRows)) throw new Error("discorsi/text/manifest.json: its fixes are not text/fixes.tsv's rows");
  if (source.body_odt_lines[0] !== FIRST_BLOCK || source.body_odt_lines[1] !== BLOCKS) throw new Error(`discorsi/text/manifest.json: the work is blocks ${source.body_odt_lines.join("–")}`);
  if (source.book_iii_title_odt_line !== extracted.bookIIITitle) throw new Error(`discorsi/text/manifest.json: Book III's title is block ${source.book_iii_title_odt_line}, the ODT's ${extracted.bookIIITitle}`);
  if (JSON.stringify(source.chapter_counts) !== JSON.stringify(extracted.chapters)) throw new Error("discorsi/text/manifest.json: other chapter counts");
  for (const key of Object.keys(extracted.stats) as (keyof Normalisation)[]) {
    if (source.normalization[key] !== extracted.stats[key]) throw new Error(`discorsi/text/manifest.json: ${key} ${source.normalization[key]}, the ODT gives ${extracted.stats[key]}`);
  }

  const units = Object.keys(manifest.units);
  if (units.join() !== DISCORSI_UNITS.join()) throw new Error(`discorsi/text/manifest.json: units ${units.join(",")}, not DISCORSI_UNITS`);
  const expected = DISCORSI_UNITS.flatMap((unit) => manifest.units[unit]!.paragraphs);
  const { records } = extracted;
  if (expected.length !== records.length) throw new Error(`discorsi/text/manifest.json: ${expected.length} records, the ODT gives ${records.length}`);
  records.forEach((record, i) => {
    const want = expected[i]!;
    const where = `discorsi/text/manifest.json record ${i + 1} (ODT block ${record.line}, ${record.book}.${record.chapter}.${record.par})`;
    if (record.text !== want.text) {
      const at = firstDifference(record.text, want.text);
      throw new Error(`${where}: the ODT's text differs at character ${at}: ${JSON.stringify(record.text.slice(at, at + 40))} against ${JSON.stringify(want.text.slice(at, at + 40))}`);
    }
    const fields: [string, unknown, unknown][] = [
      ["book", record.book, want.book],
      ["chapter", record.chapter, want.chapter],
      ["par", record.par, want.par],
      ["kind", record.kind, want.kind],
      ["speaker", null, want.speaker],
      ["line", record.line, want.line],
      ["line_end", record.line, want.line_end],
      ["italics", record.italics, want.italics],
      ["quoted_spans", record.quoted, want.quoted_spans],
      ["source_line_breaks", record.breaks, want.source_line_breaks],
      ["words", record.text.split(" ").length, want.words],
    ];
    for (const [field, ours, theirs] of fields) {
      if (JSON.stringify(ours) !== JSON.stringify(theirs)) throw new Error(`${where}: ${field} ${JSON.stringify(theirs)}, the ODT gives ${JSON.stringify(ours)}`);
    }
  });
}

/**
 * Checks each unit's records against the unit's header in the manifest and against text/<unit>.txt: a heading's line
 * starts with "# ", and one record per line.
 */
async function checkUnitTexts(manifest: Manifest, records: readonly DiscorsiParagraph[]): Promise<void> {
  let next = 0;
  for (const name of DISCORSI_UNITS) {
    const unit = manifest.units[name]!;
    const part = records.slice(next, next + unit.paragraphs.length);
    next += unit.paragraphs.length;
    const first = part[0]!;
    const last = part.at(-1)!;
    if (part.some((record) => record.book !== unit.book) || first.chapter !== unit.chapter_first || first.par !== unit.par_first ||
      last.chapter !== unit.chapter_last || last.par !== unit.par_last) {
      throw new Error(`discorsi/text/manifest.json unit ${name}: its header does not describe its records`);
    }
    const text = part.map((record) => (record.kind === "heading" ? "# " : "") + record.text).join("\n") + "\n";
    if (sha256(text) !== unit.sha256) throw new Error(`discorsi/text/manifest.json unit ${name}: SHA-256 ${unit.sha256}, the records give ${sha256(text)}`);
    if (await readDiscorsi("text", name, "txt") !== text) throw new Error(`discorsi/text/${name}.txt: not the unit's records`);
  }
}

/**
 * The canonical text: the pinned ODT that fetch.ts keeps, fixed by text/fixes.tsv. Throws unless it is text/manifest.json
 * and text/<unit>.txt exactly.
 */
export async function getDiscorsiText(): Promise<DiscorsiParagraph[]> {
  const file = Bun.file(ODT);
  if (!await file.exists()) throw new Error(`${ODT} is missing: run READER=machiavelli bun run fetch`);
  const odt = await file.bytes();
  const actual = sha256(odt);
  if (actual !== DISCORSI_SOURCE.odt.sha) throw new Error(`${ODT}: SHA-256 ${actual}, pin ${DISCORSI_SOURCE.odt.sha}`);
  const blocks = readBlocks(odt);
  const { rows, fixes } = parseFixes(await readDiscorsi("text", "fixes", "tsv"));
  applyFixes(blocks, fixes);
  const extracted = extract(blocks);
  const manifest = JSON.parse(await readDiscorsi("text", "manifest", "json")) as Manifest;
  checkManifest(manifest, rows, extracted);
  const records = extracted.records.map(({ book, chapter, par, kind, text, line, italics }): DiscorsiParagraph => ({ book, chapter, par, kind, text, line, italics }));
  await checkUnitTexts(manifest, records);
  return records;
}
