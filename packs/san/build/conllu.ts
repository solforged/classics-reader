import { repairSpelling } from "./repair";

export interface DcsWord {
  id: number;
  form: string;
  lemma: string;
  upos: string;
  features: string;
  misc: Record<string, string>;
}

export interface DcsToken {
  form: string;
  words: DcsWord[];
  /** Only explicit source exception tables may mark a printed form without an analysis. */
  unanalysed?: true;
}

/** Unresolved citations occur in DCS's syntactically revised source blocks. */
export interface DcsSourceSentence {
  id: string;
  verse: number | null;
  part: number | null;
  text: string;
  tokens: DcsToken[];
}

/** Citation resolution and source exceptions belong to gita/alignment.ts. */
export interface DcsSentence extends DcsSourceSentence {
  verse: number;
  part: number;
}

function fields(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (text && text !== "_") {
    for (const pair of text.split("|")) {
      const eq = pair.indexOf("=");
      if (eq < 1) throw new Error(`Malformed DCS MISC: ${pair}`);
      out[pair.slice(0, eq)] = pair.slice(eq + 1);
    }
  }
  return out;
}

function counter(value: string | undefined, id: string): number | null {
  if (value === undefined) return null;
  if (!/^[1-9]\d*$/u.test(value)) throw new Error(`Invalid DCS citation in ${id}: ${value}`);
  return Number(value);
}

/**
 * Range rows are written tokens; their integer rows are ordered grammatical words.
 * This reads source structure only. readDcsChapter validates citations and #text
 * against the explicitly documented source omissions in alignment.ts.
 */
export function parseConllu(source: string): DcsSourceSentence[] {
  const sentences: DcsSourceSentence[] = [];
  const ids = new Set<string>();
  for (const block of source.trim().split(/\r?\n\s*\r?\n/u)) {
    const meta: Record<string, string> = {};
    const words: DcsWord[] = [];
    const ranges = new Map<number, { end: number; form: string }>();
    for (const line of block.split(/\r?\n/u)) {
      if (line.startsWith("#")) {
        const match = /^# (\w+)\s*=\s*(.*)$/u.exec(line);
        if (match) {
          if (Object.hasOwn(meta, match[1]!)) throw new Error(`Duplicate DCS metadata: ${line}`);
          meta[match[1]!] = match[2]!;
        }
        continue;
      }
      if (!line.trim()) continue;
      const cols = line.split("\t");
      if (cols.length !== 10) throw new Error(`Expected ten CoNLL-U columns: ${line}`);
      const [id, form, lemma, upos, , features, , , , misc] = cols as [string, string, string, string, string, string, string, string, string, string];
      const range = /^(\d+)-(\d+)$/u.exec(id);
      if (range) {
        const start = Number(range[1]);
        const end = Number(range[2]);
        if (!form || form === "_" || start !== words.length + 1 || end <= start || ranges.has(start)) {
          throw new Error(`Invalid CoNLL-U token range ${id} in ${meta.sent_id}`);
        }
        ranges.set(start, { end, form });
      } else {
        if (!/^\d+$/u.test(id) || Number(id) !== words.length + 1) {
          throw new Error(`Nonconsecutive CoNLL-U word ${id} in ${meta.sent_id}`);
        }
        if (!form || form === "_" || !lemma || lemma === "_" || !upos || upos === "_") {
          throw new Error(`Unanalysed DCS word in ${meta.sent_id}: ${id}`);
        }
        words.push({ id: Number(id), form, lemma: repairSpelling(lemma), upos, features, misc: fields(misc) });
      }
    }
    if (!words.length) {
      if (meta.sent_id || ranges.size) throw new Error(`Empty DCS sentence ${meta.sent_id}`);
      continue;
    }
    const id = meta.sent_id;
    if (!id) throw new Error(`Missing DCS sentence id: ${JSON.stringify(meta)}`);
    const verse = counter(meta.sent_counter, id);
    const part = counter(meta.sent_subcounter, id);
    if ((verse === null) !== (part === null)) throw new Error(`Incomplete DCS citation in ${id}`);
    if (ids.has(id)) throw new Error(`Duplicate DCS sentence ${id}`);
    ids.add(id);
    const tokens: DcsToken[] = [];
    for (let index = 0; index < words.length;) {
      const start = index + 1;
      const range = ranges.get(start);
      const end = range?.end ?? start;
      if (end > words.length) throw new Error(`Incomplete CoNLL-U token range in ${id}`);
      for (let inner = start + 1; inner <= end; inner++) {
        if (ranges.has(inner)) throw new Error(`Overlapping CoNLL-U token ranges in ${id}`);
      }
      tokens.push({ form: range?.form ?? words[index]!.form, words: words.slice(index, end) });
      index = end;
    }
    const text = meta.text;
    if (!text) throw new Error(`Missing DCS sentence text in ${id}`);
    sentences.push({ id, verse, part, text, tokens });
  }
  return sentences;
}
