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
}

export interface DcsSentence {
  id: string;
  verse: number;
  part: number;
  text: string;
  tokens: DcsToken[];
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

/** Range rows are written tokens; the integer rows they cover are ordered grammatical words. */
export function parseConllu(source: string): DcsSentence[] {
  const sentences: DcsSentence[] = [];
  const ids = new Set<string>();
  for (const block of source.trim().split(/\r?\n\s*\r?\n/u)) {
    const meta: Record<string, string> = {};
    const words: DcsWord[] = [];
    const ranges = new Map<number, { end: number; form: string }>();
    for (const line of block.split(/\r?\n/u)) {
      if (line.startsWith("#")) {
        const match = /^# (\w+)\s*=\s*(.*)$/u.exec(line);
        if (match) meta[match[1]!] = match[2]!;
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
        if (start !== words.length + 1 || end <= start || ranges.has(start)) {
          throw new Error(`Invalid CoNLL-U token range ${id} in ${meta.sent_id}`);
        }
        ranges.set(start, { end, form });
      } else {
        if (!/^\d+$/u.test(id) || Number(id) !== words.length + 1) {
          throw new Error(`Nonconsecutive CoNLL-U word ${id} in ${meta.sent_id}`);
        }
        if (!form || form === "_" || !lemma || lemma === "_") throw new Error(`Unanalysed DCS word in ${meta.sent_id}: ${id}`);
        words.push({ id: Number(id), form, lemma, upos, features, misc: fields(misc) });
      }
    }
    if (!words.length) continue;
    const id = meta.sent_id;
    const verse = Number(meta.sent_counter);
    const part = Number(meta.sent_subcounter);
    if (!id || !Number.isInteger(verse) || verse < 1 || !Number.isInteger(part) || part < 1) {
      throw new Error(`Missing DCS citation metadata: ${JSON.stringify(meta)}`);
    }
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
    if (!text || tokens.map((token) => token.form).join(" ") !== text) {
      throw new Error(`DCS surface tokens do not reproduce sentence ${id}`);
    }
    sentences.push({ id, verse, part, text, tokens });
  }
  return sentences;
}
