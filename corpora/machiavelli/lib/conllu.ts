// Reads one division of Il Principe or Dell'arte della guerra from the checked-in CoNLL-U. A written word is a surface:
// a plain token, or a multiword token's range line ("del" = di + il, "de'" = di + i) with its syntactic words. Empty
// nodes (ids like 2.1) are not words of the text. Strict: a line the format does not explain throws, and the surfaces
// must reproduce the sentence's # text.
//
// The Prince's paragraph text the manifest hashes is the # text lines of one # par joined by a space, paragraphs in
// order joined by newlines. The dedication's file starts with a blank line (it has no rubric). paragraphFile()
// rebuilds those bytes. The Arte's files add # book (the proemio is "p") and, for a paragraph that opens a speaker's
// turn, # speaker on each of its sentences; its paragraphs are checked against the Liber Liber text (arte.ts).

export interface Token {
  form: string;
  lemma: string;
  upos: string;
  /** UD features as given, "" for none. */
  feats: string;
}

export interface Surface {
  /** The written word ("de'", "del", ","). */
  form: string;
  /** Syntactic words. Empty when the surface is only punctuation. */
  words: Token[];
  /** False when the annotation marks SpaceAfter=No. */
  spaceAfter: boolean;
}

export interface Sentence {
  unit: string;
  /** Paragraph in the edition. 0 is a chapter rubric; the dedication starts at 1. In the Arte, the paragraph's number within its book. */
  par: number;
  /** 1-based index within the paragraph, in file order. */
  n: number;
  id: string;
  text: string;
  surfaces: Surface[];
  /** # book (the Arte): "p" for the proemio, "1" … "7". */
  book?: string;
  /** # speaker (the Arte): the label of the turn this sentence's paragraph opens, as the edition prints it. */
  speaker?: string;
}

const COMMENT_KEYS: Record<string, true> = {
  generator: true, udpipe_model: true, udpipe_model_licence: true, unit: true, par: true, sent_id: true, text: true,
  book: true, speaker: true,
};
const MISC_KEYS: Record<string, true> = { SpaceAfter: true, SpacesAfter: true };

function miscPairs(field: string, where: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!field || field === "_") return out;
  for (const pair of field.split("|")) {
    const eq = pair.indexOf("=");
    if (eq <= 0) throw new Error(`${where}: bad field ${pair}`);
    const name = pair.slice(0, eq);
    if (!MISC_KEYS[name]) throw new Error(`${where}: unexpected MISC ${name}`);
    out[name] = pair.slice(eq + 1);
  }
  return out;
}

/** The sentence as its surfaces write it, spaces included only where the annotation leaves one. */
export function surfaceText(surfaces: readonly Surface[]): string {
  let out = "";
  for (let i = 0; i < surfaces.length; i++) {
    out += surfaces[i]!.form;
    if (i < surfaces.length - 1 && surfaces[i]!.spaceAfter) out += " ";
  }
  return out;
}

function parseSentence(block: string, unit: string, seen: Map<number, number>): Sentence {
  const comments: Record<string, string> = {};
  const rows: string[][] = [];
  for (const line of block.split("\n")) {
    if (!line) continue;
    if (line.startsWith("#")) {
      const match = /^# (\S+) = (.*)$/u.exec(line);
      if (!match) throw new Error(`${unit}: bad comment ${line}`);
      if (!COMMENT_KEYS[match[1]!]) throw new Error(`${unit}: unexpected comment ${match[1]}`);
      comments[match[1]!] = match[2]!;
      continue;
    }
    const cols = line.split("\t");
    if (cols.length !== 10) throw new Error(`${unit}: a token line has ${cols.length} columns, not 10`);
    rows.push(cols);
  }
  if (comments.unit !== unit) throw new Error(`${unit}: sentence says unit ${comments.unit}`);
  if (comments.par === undefined || comments.text === undefined || comments.sent_id === undefined) {
    throw new Error(`${unit}: a sentence lacks par, sent_id or text`);
  }
  const par = Number(comments.par);
  if (!Number.isInteger(par) || par < 0) throw new Error(`${unit}: bad paragraph ${comments.par}`);
  const n = (seen.get(par) ?? 0) + 1;
  seen.set(par, n);
  const where = comments.sent_id;

  const surfaces: Surface[] = [];
  let i = 0;
  while (i < rows.length) {
    const cols = rows[i]!;
    const id = cols[0]!;
    if (id.includes(".")) throw new Error(`${where}: empty node ${id} is not in this text`);
    if (id.includes("-")) {
      const [start, end] = id.split("-").map(Number) as [number, number];
      if (!Number.isInteger(start) || !Number.isInteger(end) || end < start) throw new Error(`${where}: bad range ${id}`);
      const words: Token[] = [];
      i++;
      for (let expect = start; expect <= end; expect++, i++) {
        const part = rows[i];
        if (!part || part[0] !== String(expect)) throw new Error(`${where}: range ${id} lacks word ${expect}`);
        if (part[2] === "_" || part[3] === "_") throw new Error(`${where}: ${part[1]} has no lemma or class`);
        words.push({ form: part[1]!, lemma: part[2]!, upos: part[3]!, feats: part[5] === "_" ? "" : part[5]! });
        miscPairs(part[9]!, `${where}:${part[1]}`);
      }
      const rangeMisc = miscPairs(cols[9]!, where);
      const lastMisc = miscPairs(rows[i - 1]![9]!, where);
      const rangeNoSpace = rangeMisc.SpaceAfter === "No";
      const lastNoSpace = lastMisc.SpaceAfter === "No";
      if (rangeNoSpace !== lastNoSpace && rows[i - 1]![9] !== "_") {
        throw new Error(`${where}: ${cols[1]} disagrees with its last word about the space after it`);
      }
      surfaces.push({ form: cols[1]!, words, spaceAfter: !rangeNoSpace && !lastNoSpace });
      continue;
    }
    if (!/^\d+$/u.test(id)) throw new Error(`${where}: bad id ${id}`);
    const upos = cols[3]!;
    const lemma = cols[2]!;
    if (upos !== "PUNCT" && (lemma === "_" || upos === "_")) throw new Error(`${where}: ${cols[1]} has no lemma or class`);
    const words = upos === "PUNCT" ? [] : [{ form: cols[1]!, lemma, upos, feats: cols[5] === "_" ? "" : cols[5]! }];
    surfaces.push({ form: cols[1]!, words, spaceAfter: miscPairs(cols[9]!, where).SpaceAfter !== "No" });
    i++;
  }
  const rebuilt = surfaceText(surfaces);
  if (rebuilt !== comments.text) throw new Error(`${where}: tokens rebuild ${JSON.stringify(rebuilt)}, not ${JSON.stringify(comments.text)}`);
  return {
    unit, par, n, id: where, text: comments.text, surfaces,
    ...(comments.book === undefined ? {} : { book: comments.book }),
    ...(comments.speaker === undefined ? {} : { speaker: comments.speaker }),
  };
}

/** The sentences of one division, in reading order. */
export function parseUnit(source: string, unit: string): Sentence[] {
  const seen = new Map<number, number>();
  const sentences: Sentence[] = [];
  for (const block of source.split(/\n\n+/u)) {
    if (!block.includes("\t")) {
      // The file header (generator, model, licence) has comments and no tokens.
      if (block.includes("# text = ")) throw new Error(`${unit}: a header block carries text`);
      continue;
    }
    sentences.push(parseSentence(block, unit, seen));
  }
  if (!sentences.length) throw new Error(`${unit}: no sentences`);
  return sentences;
}

/** # text lines of one paragraph, joined by a space, in paragraph order. */
export function paragraphLines(sentences: readonly Sentence[]): string[] {
  const byPar = new Map<number, string[]>();
  for (const sentence of sentences) {
    const list = byPar.get(sentence.par) ?? [];
    list.push(sentence.text);
    byPar.set(sentence.par, list);
  }
  return [...byPar.keys()].sort((a, b) => a - b).map((par) => byPar.get(par)!.join(" "));
}

/**
 * The paragraph file the manifest hashes. A division with no rubric (the dedication) starts with the blank line
 * the edition file has in its place.
 */
export function paragraphFile(sentences: readonly Sentence[], emptyRubric: boolean): string {
  const lines = paragraphLines(sentences);
  const hasRubric = sentences.some((sentence) => sentence.par === 0);
  if (emptyRubric && !hasRubric) return `\n${lines.join("\n")}\n`;
  return `${lines.join("\n")}\n`;
}
