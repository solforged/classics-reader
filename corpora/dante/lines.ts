// Lays out a cantica of the treebank's text in cantos and lines, as printed text.
//
// Lines: a word takes the treebank's MISC Canto and Verso. Where the treebank has none (on punctuation, and on some
// words of the Paradiso), the word takes the line of the same word in Gutenberg's Italian text, found by aligning the
// two texts' words (Myers's difference); a word Gutenberg reads otherwise takes the line its neighbours share, or the
// line PLACEMENTS gives. Where the two texts disagree on a word's line, VERSE_FIXES must say which is right.
// Punctuation goes with the word before it; opening quotation marks and brackets with the word after.
//
// Spacing: the treebank's SpaceAfter is complete only in the Inferno, so the reader uses rules that reproduce it
// there: no space before closing punctuation or after an opening mark, and none after an elided word ending in a
// consonant and an apostrophe (ch’i’, l’altre), except the apocopated ver’ and ’nver’. Quotation marks: the Inferno
// writes them as curly quotes; the Purgatorio and Paradiso as straight ' and ", which open and close in turn.
import type { Cantica, Sentence, Surface } from "../../packs/ita/build/conllu";
import { looseKey } from "../../packs/ita/spelling";
import { MARKS, PLACEMENTS, VERSE_FIXES } from "./alignment";
import { matchKeys } from "./lib/diff";
import type { GutenbergCanto } from "./lib/gutenberg";

/** How a written item joins its neighbours. */
export type ItemKind = "word" | "open" | "close" | "dash" | "hyphen";

export interface Item {
  surface: Surface;
  /** Sentence id without the "OldItalian_Dante_" prefix. */
  sentence: string;
  kind: ItemKind;
  /** As printed: apostrophes as ’, quotation marks curly. */
  text: string;
  canto: number;
  line: number;
}

export interface CanticaLayout {
  /** Items of each line: cantos[canto - 1][line - 1]. */
  cantos: Item[][][];
  stats: { words: number; treebank: number; gutenberg: number; neighbours: number; table: number; fixed: number };
}

const CLOSING = new Set([",", ".", ";", ":", "?", "!", "»", ")", "”", "’", "..."]);
const OPENING = new Set(["«", "(", "“", "‘"]);
/** Elided words written with a space after them. */
const SPACED_ELISIONS = new Set(["ver'", "'nver'"]);

const isWord = (surface: Surface): boolean => surface.words.some((word) => word.upos !== "PUNCT");
const runs = (text: string): string[] => (text.match(/[\p{L}\p{M}]+/gu) ?? []).map(looseKey);

/** A space between two items of a line? */
export function spaced(a: Item, b: Item): boolean {
  if (b.kind === "close" || b.kind === "hyphen") return false;
  if (a.kind === "open") return false;
  if (a.kind === "word" && /[^aeiouàèéìòóù'\s]'$/iu.test(a.surface.form) && !SPACED_ELISIONS.has(a.surface.form.toLowerCase())) return false;
  return true;
}

export function layCantica(cantica: Cantica, sentences: readonly Sentence[], italian: readonly GutenbergCanto[], used: Set<string>): CanticaLayout {
  const stats = { words: 0, treebank: 0, gutenberg: 0, neighbours: 0, table: 0, fixed: 0 };
  // 1. Every written item in reading order, with its kind and printed text.
  const items: (Omit<Item, "canto" | "line"> & { canto?: number; line?: number })[] = [];
  const straight: Record<string, boolean> = {};
  for (const sentence of sentences) {
    const sid = sentence.id.replace(/^OldItalian_Dante_/u, "");
    const seen: Record<string, number> = {};
    for (const surface of sentence.surfaces) {
      const occurrence = seen[surface.form] = (seen[surface.form] ?? 0) + 1;
      const markKey = `${sid} ${surface.form} ${occurrence}`;
      const mark = MARKS[markKey];
      if (mark) used.add(`MARKS ${markKey}`);
      let kind: ItemKind;
      let text = surface.form;
      if (mark) {
        kind = mark.kind;
        text = mark.text;
      } else if (isWord(surface)) {
        kind = "word";
        text = surface.form.replace(/'/gu, "’");
      } else if (surface.form === "-") {
        kind = "dash";
        text = "–";
      } else if (surface.form === "'" || surface.form === '"') {
        // Straight quotation marks open and close in turn through the cantica.
        const open = straight[surface.form] = !straight[surface.form];
        kind = open ? "open" : "close";
        text = surface.form === "'" ? (open ? "‘" : "’") : (open ? "“" : "”");
      } else if (OPENING.has(surface.form)) kind = "open";
      else if (CLOSING.has(surface.form)) {
        kind = "close";
        if (surface.form === "...") text = "…";
      } else throw new Error(`${sid}: punctuation ${surface.form} has no rule`);
      items.push({ surface, sentence: sid, kind, text, ...(surface.canto ? { canto: surface.canto, line: surface.line } : {}) });
    }
  }
  for (const [mark, open] of Object.entries(straight)) if (open) throw new Error(`${cantica}: a ${mark} quotation is not closed`);

  // 2. Gutenberg's line for each word, by aligning the two texts' letter runs.
  const tbKeys: string[] = [];
  const tbItem: number[] = [];
  items.forEach((item, i) => {
    if (item.kind !== "word" || !isWord(item.surface)) return;
    for (const key of runs(item.surface.form)) {
      tbKeys.push(key);
      tbItem.push(i);
    }
  });
  const gKeys: string[] = [];
  const gPos: [number, number][] = [];
  italian.forEach((canto, c) => canto.lines.forEach((text, l) => {
    for (const key of runs(text)) {
      gKeys.push(key);
      gPos.push([c + 1, l + 1]);
    }
  }));
  const gutenberg = new Map<number, [number, number]>();
  for (const [t, g] of matchKeys(tbKeys, gKeys)) if (!gutenberg.has(tbItem[t]!)) gutenberg.set(tbItem[t]!, gPos[g]!);

  // 3. Words: the treebank's line, checked against Gutenberg's; else Gutenberg's.
  const pending: number[] = [];
  items.forEach((item, i) => {
    if (item.kind !== "word" || !isWord(item.surface)) return;
    stats.words++;
    const g = gutenberg.get(i);
    if (item.canto !== undefined) {
      if (g && (g[0] !== item.canto || g[1] !== item.line)) {
        const key = `${item.sentence} ${item.surface.form} ${item.canto}.${item.line}`;
        if (VERSE_FIXES[key] !== g[1] || g[0] !== item.canto) {
          throw new Error(`${cantica}: the treebank puts ${key} where Gutenberg has ${g[0]}.${g[1]}; add it to VERSE_FIXES`);
        }
        used.add(`VERSE_FIXES ${key}`);
        item.line = g[1];
        stats.fixed++;
      }
      stats.treebank++;
    } else if (g) {
      [item.canto, item.line] = g;
      stats.gutenberg++;
    } else pending.push(i);
  });
  const placedWord = (from: number, step: number): typeof items[number] | undefined => {
    for (let j = from; j >= 0 && j < items.length; j += step) {
      const other = items[j]!;
      if (other.kind === "word" && isWord(other.surface) && other.canto !== undefined) return other;
    }
    return undefined;
  };
  for (const i of pending) {
    const item = items[i]!;
    const before = placedWord(i - 1, -1);
    const after = placedWord(i + 1, 1);
    const key = `${item.sentence} ${item.surface.form}`;
    const table = PLACEMENTS[key];
    if (table) {
      used.add(`PLACEMENTS ${key}`);
      [item.canto, item.line] = table.split(".").map(Number) as [number, number];
      stats.table++;
    } else if (before && after && before.canto === after.canto && before.line === after.line) {
      [item.canto, item.line] = [before.canto!, before.line!];
      stats.neighbours++;
    } else {
      throw new Error(`${cantica}: no line for ${key} (between ${before?.canto}.${before?.line} and ${after?.canto}.${after?.line}); add it to PLACEMENTS`);
    }
  }

  // 4. Punctuation, and marks the treebank files as punctuation: with the word before, or after for opening marks.
  items.forEach((item, i) => {
    if (item.canto !== undefined) return;
    const next = item.kind === "open" || (item.kind === "dash" && !placedWord(i - 1, -1));
    const anchor = next ? placedWord(i + 1, 1) ?? placedWord(i - 1, -1) : placedWord(i - 1, -1) ?? placedWord(i + 1, 1);
    if (!anchor) throw new Error(`${cantica}: ${item.sentence} has no words`);
    [item.canto, item.line] = [anchor.canto!, anchor.line!];
  });

  // 5. Lines in order, every line of every canto present.
  const cantos: Item[][][] = italian.map((canto) => canto.lines.map(() => []));
  let last: [number, number] = [1, 1];
  for (const item of items as Item[]) {
    if (item.canto < last[0] || (item.canto === last[0] && item.line < last[1])) {
      throw new Error(`${cantica}: ${item.sentence} ${item.surface.form} at ${item.canto}.${item.line} comes after ${last.join(".")}`);
    }
    last = [item.canto, item.line];
    const line = cantos[item.canto - 1]?.[item.line - 1];
    if (!line) throw new Error(`${cantica}: ${item.sentence} ${item.surface.form} at ${item.canto}.${item.line}, beyond Gutenberg's lines`);
    line.push(item);
  }
  cantos.forEach((canto, c) => canto.forEach((line, l) => {
    if (!line.some((item) => item.kind === "word")) throw new Error(`${cantica} ${c + 1}.${l + 1} has no words`);
  }));
  return { cantos, stats };
}
