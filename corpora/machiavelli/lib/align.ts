// Ricci's sentence alignment, as checked in data/alignment/<unit>.tsv. Sentence ids are "<par>.<sent>",
// comma-separated, and a 1-0 or 0-1 bead leaves one side empty rather than dropping the sentence. The id lists
// are what is read; a bead may join any number of sentences.
//
// Italian sentences are slices of the paragraph the CoNLL-U # text lines rebuild, not the tagger's own sentence
// breaks (those are finer), so the build reads data/it-sent/. English sentences are slices of data/en/<unit>.txt,
// whose first line is the heading (paragraph 0) and whose later lines are body paragraphs; those sentence breaks
// are data/en-sent/. Neither split is marked in the pinned Gutenberg file, and the alignment names ids, not text.
import { join } from "node:path";

export const DATA = join(import.meta.dir, "..", "data");

/** The checked alignment for one division. */
export function alignPath(unit: string): string {
  return join(DATA, "alignment", `${unit}.tsv`);
}

export interface Bead {
  n: number;
  itIds: string[];
  enIds: string[];
  /** "<n Italian>-<n English>", as the file labels the bead. Checked against the id lists, not trusted alone. */
  kind: string;
}

export interface SentRow {
  par: number;
  sent: number;
  id: string;
  text: string;
}

const ALIGN_HEADER = "n\tit_ids\ten_ids\tbead\tlength_ratio\tconfidence";
const SENT_HEADER = "par\tsent\ttext";

export function parseBeads(tsv: string, unit: string): Bead[] {
  const lines = tsv.trim().split("\n");
  if (lines[0] !== ALIGN_HEADER) throw new Error(`${unit}: alignment header is ${JSON.stringify(lines[0])}`);
  return lines.slice(1).map((line, index) => {
    const cols = line.split("\t");
    if (cols.length !== 6) throw new Error(`${unit}: alignment row ${index + 2} has ${cols.length} columns`);
    const [n, it, en, kind] = cols as [string, string, string, string, string, string];
    const itIds = it ? it.split(",") : [];
    const enIds = en ? en.split(",") : [];
    for (const id of [...itIds, ...enIds]) {
      if (!/^\d+\.\d+$/u.test(id)) throw new Error(`${unit}: bad sentence id ${JSON.stringify(id)}`);
    }
    const [nIt, nEn] = kind.split("-").map(Number) as [number, number];
    if (nIt !== itIds.length || nEn !== enIds.length) {
      throw new Error(`${unit} bead ${n}: labelled ${kind} but has ${itIds.length} Italian and ${enIds.length} English ids`);
    }
    return { n: Number(n), itIds, enIds, kind };
  });
}

export function parseSentences(tsv: string, unit: string, side: string): SentRow[] {
  const lines = tsv.trim().split("\n");
  if (lines[0] !== SENT_HEADER) throw new Error(`${unit} ${side}: sentence header is ${JSON.stringify(lines[0])}`);
  return lines.slice(1).map((line, index) => {
    const first = line.indexOf("\t");
    const second = line.indexOf("\t", first + 1);
    if (first < 0 || second < 0) throw new Error(`${unit} ${side}: sentence row ${index + 2} has no text`);
    const par = Number(line.slice(0, first));
    const sent = Number(line.slice(first + 1, second));
    if (!Number.isInteger(par) || !Number.isInteger(sent) || sent < 1) {
      throw new Error(`${unit} ${side}: bad sentence address on row ${index + 2}`);
    }
    return { par, sent, id: `${par}.${sent}`, text: line.slice(second + 1) };
  });
}

/**
 * Sentences of one paragraph must be contiguous slices of its text, in order. A space the slicer left between
 * sentences is allowed; any other gap throws.
 */
export function cover(paragraph: string, slices: readonly string[], where: string): void {
  let cursor = 0;
  for (const slice of slices) {
    const at = paragraph.indexOf(slice, cursor);
    if (at < 0) throw new Error(`${where}: not a slice of the paragraph: ${JSON.stringify(slice.slice(0, 60))}`);
    const gap = paragraph.slice(cursor, at);
    if (gap && !/^\s+$/u.test(gap)) throw new Error(`${where}: text between sentences ${JSON.stringify(gap)}`);
    cursor = at + slice.length;
  }
  const tail = paragraph.slice(cursor);
  if (tail && !/^\s+$/u.test(tail)) throw new Error(`${where}: paragraph continues after its sentences: ${JSON.stringify(tail.slice(0, 40))}`);
}

export interface Placed {
  /** English sentences aligned to the Italian rubric (paragraph 0). */
  rubric: SentRow[];
  /** Italian body paragraph → the English sentences aligned to it, in reading order. */
  body: Map<number, SentRow[]>;
  /** English sentences an alignment left with no Italian sentence, attached to the preceding paragraph. */
  unaligned: number;
}

/**
 * Places every English sentence on the Italian paragraph its bead names. A bead with no Italian sentence attaches
 * to the paragraph before it (or the next one, when it is the first bead). A bead whose Italian sentences span
 * two paragraphs — none do, in the provisional alignment — keeps its English with the first of them.
 */
export function placeEnglish(
  beads: readonly Bead[],
  italian: readonly SentRow[],
  english: readonly SentRow[],
  unit: string,
): Placed {
  const itById = new Map(italian.map((row) => [row.id, row]));
  const enById = new Map(english.map((row) => [row.id, row]));
  if (itById.size !== italian.length) throw new Error(`${unit}: a repeated Italian sentence id`);
  if (enById.size !== english.length) throw new Error(`${unit}: a repeated English sentence id`);
  const seenIt = new Set<string>();
  const seenEn = new Set<string>();
  const rubric: SentRow[] = [];
  const body = new Map<number, SentRow[]>();
  let last: { kind: "rubric" } | { kind: "body"; par: number } | null = null;
  const pending: SentRow[] = [];
  let unaligned = 0;

  const take = (ids: readonly string[]): SentRow[] => ids.map((id) => {
    const row = enById.get(id);
    if (!row) throw new Error(`${unit}: alignment names English ${id}, which is not a sentence`);
    if (seenEn.has(id)) throw new Error(`${unit}: English ${id} is in two beads`);
    seenEn.add(id);
    return row;
  });
  const add = (target: { kind: "rubric" } | { kind: "body"; par: number }, rows: readonly SentRow[]) => {
    if (!rows.length) return;
    if (target.kind === "rubric") rubric.push(...rows);
    else {
      const list = body.get(target.par) ?? [];
      list.push(...rows);
      body.set(target.par, list);
    }
  };

  for (const bead of beads) {
    for (const id of bead.itIds) {
      if (!itById.has(id)) throw new Error(`${unit}: alignment names Italian ${id}, which is not a sentence`);
      if (seenIt.has(id)) throw new Error(`${unit}: Italian ${id} is in two beads`);
      seenIt.add(id);
    }
    if (!bead.itIds.length) {
      unaligned += bead.enIds.length;
      const rows = take(bead.enIds);
      if (last) add(last, rows);
      else pending.push(...rows);
      continue;
    }
    const pars = bead.itIds.map((id) => itById.get(id)!.par);
    const target = pars.every((par) => par === 0)
      ? { kind: "rubric" as const }
      : { kind: "body" as const, par: Math.min(...pars.filter((par) => par > 0)) };
    if (pending.length) {
      add(target, pending);
      pending.length = 0;
    }
    add(target, take(bead.enIds));
    last = target;
  }
  if (pending.length) throw new Error(`${unit}: English sentences before any Italian sentence: ${pending.map((row) => row.id).join(", ")}`);
  for (const id of itById.keys()) if (!seenIt.has(id)) throw new Error(`${unit}: Italian ${id} is in no bead`);
  for (const id of enById.keys()) if (!seenEn.has(id)) throw new Error(`${unit}: English ${id} is in no bead`);
  return { rubric, body, unaligned };
}

/** Consecutive sentences of one English paragraph, joined; a new paragraph starts a new string. */
export function proseBlocks(rows: readonly SentRow[]): string[] {
  const blocks: { par: number; text: string[] }[] = [];
  for (const row of rows) {
    const last = blocks.at(-1);
    if (!last || last.par !== row.par) blocks.push({ par: row.par, text: [row.text] });
    else last.text.push(row.text);
  }
  return blocks.map((block) => block.text.join(" "));
}
