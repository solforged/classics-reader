// data/units.json, the English files and the translator's notes. units.json lists the review units (the CoNLL-U files,
// each a run of whole rows within one work), the rows (paragraph ids, "<work slug>.<n>") of every unit, which rows are
// headings and which carry on the edition paragraph of the row before. The English is data/en/<unit>.tsv: one line per
// row of the unit, "<pid>\t<English>", in the order of the Arabic. Both are checked against their pins or against each
// other, so a row cannot be missing or repeated on either side. data/notes.tsv, if there is one, holds the notes.
import { join } from "node:path";
import { OPENITI, UNITS, UNITS_SHA, type MuqUnit } from "../sources";
import { readPinned } from "./pins";

export const DATA = join(import.meta.dir, "..", "data");

export interface UnitsWork {
  slug: string;
  title_ar: string;
  title_en: string;
  /** The work's review units, in reading order. */
  units: string[];
}

export interface UnitInfo {
  /** One of sources.ts's UNITS: loadUnits() checks the file's ids against them. */
  id: MuqUnit;
  work: string;
  /** The unit's rows, in reading order. */
  pids: string[];
  /** Words of the Arabic: whitespace-separated chunks with a letter or digit. */
  words: number;
  /** Heading rows of the unit → their level in the edition (1 outermost). loadUnits() fills in {} where the file has none. */
  headings: Record<string, number>;
  /** The rows that carry on the edition paragraph of the row before them (a subset of `pids`, never a heading). */
  continues: string[];
}

export interface UnitsFile {
  source: { url: string; sha256: string; lines: [number, number] };
  works: UnitsWork[];
  units: UnitInfo[];
}

/** units.json, after its bytes are checked against the pin and its lists against each other and against sources.ts. */
export async function loadUnits(): Promise<UnitsFile> {
  const file = JSON.parse(await readPinned(join(DATA, "units.json"), UNITS_SHA, "data/units.json")) as UnitsFile;
  if (file.source.url !== OPENITI.url || file.source.sha256 !== OPENITI.sha256) throw new Error("units.json names another source than sources.ts");
  if (file.source.lines.join() !== "39,3204") throw new Error(`units.json covers lines ${file.source.lines.join("–")}, not 39–3204`);
  const ids = file.units.map((unit) => unit.id);
  if (ids.join() !== UNITS.join()) throw new Error(`units.json lists the units ${ids.join(" ")}; sources.ts pins ${UNITS.join(" ")}`);
  const claimed = new Set<string>();
  for (const work of file.works) {
    for (const id of work.units) {
      const unit = file.units.find((candidate) => candidate.id === id);
      if (!unit || unit.work !== work.slug) throw new Error(`work ${work.slug} lists unit ${id}, which is not its own`);
      if (claimed.has(id)) throw new Error(`unit ${id} is listed by two works`);
      claimed.add(id);
    }
  }
  if (claimed.size !== file.units.length) throw new Error(`units.json has units that no work lists: ${ids.filter((id) => !claimed.has(id)).join(" ")}`);
  for (const unit of file.units) {
    unit.headings ??= {};
    for (const pid of unit.pids) {
      if (!pid.startsWith(`${unit.work}.`)) throw new Error(`unit ${unit.id}: row ${pid} is not of work ${unit.work}`);
    }
    for (const pid of Object.keys(unit.headings)) {
      if (!unit.pids.includes(pid)) throw new Error(`unit ${unit.id}: heading ${pid} is not one of its rows`);
    }
    for (const pid of unit.continues) {
      if (!unit.pids.includes(pid)) throw new Error(`unit ${unit.id}: continuing row ${pid} is not one of its rows`);
      if (unit.headings[pid] !== undefined) throw new Error(`unit ${unit.id}: continuing row ${pid} is a heading`);
    }
  }
  return file;
}

/**
 * The English of one unit: pid → text. The file must have exactly the unit's rows, in order, each with some English;
 * verse lines of a row are separated by " / " (the build splits them).
 */
export async function readEnglish(unit: UnitInfo): Promise<Map<string, string>> {
  const path = join(DATA, "en", `${unit.id}.tsv`);
  if (!(await Bun.file(path).exists())) throw new Error(`data/en/${unit.id}.tsv is missing: the unit has no translation yet`);
  const lines = (await Bun.file(path).text()).replace(/\n$/u, "").split("\n");
  const english = new Map<string, string>();
  for (const [index, line] of lines.entries()) {
    const cols = line.split("\t");
    const where = `data/en/${unit.id}.tsv:${index + 1}`;
    if (cols.length !== 2) throw new Error(`${where}: expected "<pid>\\t<English>", got ${cols.length} columns`);
    const [pid, text] = [cols[0]!, cols[1]!.trim()];
    if (!text) throw new Error(`${where}: ${pid} has no English`);
    if (english.has(pid)) throw new Error(`${where}: ${pid} appears twice`);
    english.set(pid, text);
  }
  const missing = unit.pids.filter((pid) => !english.has(pid));
  if (missing.length) throw new Error(`data/en/${unit.id}.tsv lacks ${missing.length} rows: ${missing.slice(0, 8).join(", ")}${missing.length > 8 ? ", …" : ""}`);
  const extra = [...english.keys()].filter((pid) => !unit.pids.includes(pid));
  if (extra.length) throw new Error(`data/en/${unit.id}.tsv has rows the unit lacks: ${extra.slice(0, 8).join(", ")}`);
  const order = [...english.keys()].findIndex((pid, i) => pid !== unit.pids[i]);
  if (order >= 0) throw new Error(`data/en/${unit.id}.tsv: row ${[...english.keys()][order]} stands where ${unit.pids[order]} belongs`);
  return english;
}

/**
 * data/notes.tsv: the translator's notes, "<pid>\t<note text>" per line, as many lines to a row as it has notes (they
 * stand in this order). The file may be absent or empty. A line that names a row the reader does not have, or has no
 * note text, stops the build.
 */
export async function readNotes(pids: ReadonlySet<string>): Promise<Map<string, string[]>> {
  const file = Bun.file(join(DATA, "notes.tsv"));
  const notes = new Map<string, string[]>();
  if (!(await file.exists())) return notes;
  for (const [index, line] of (await file.text()).split("\n").entries()) {
    if (!line.trim()) continue;
    const where = `data/notes.tsv:${index + 1}`;
    const cols = line.split("\t");
    if (cols.length !== 2) throw new Error(`${where}: expected "<pid>\\t<note>", got ${cols.length} columns`);
    const [pid, text] = [cols[0]!.trim(), cols[1]!.trim()];
    if (!pids.has(pid)) throw new Error(`${where}: ${JSON.stringify(pid)} is not a row of the reader`);
    if (!text) throw new Error(`${where}: ${pid} has no note text`);
    const list = notes.get(pid);
    if (list) list.push(text);
    else notes.set(pid, [text]);
  }
  return notes;
}

/** A run of Arabic: letters, vowel signs and punctuation, and the ASCII marks and spaces between its words. */
const ARABIC_RUN = /[\u0600-\u06FF]+(?:[\s.:()«»-]+[\u0600-\u06FF]+)*/gu;

/** A note's text as HTML: escaped, with each run of Arabic in Arabic type and direction. */
export const noteHtml = (text: string): string => text.replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;")
  .replace(ARABIC_RUN, (run) => `<span lang="ar" dir="rtl">${run}</span>`);
