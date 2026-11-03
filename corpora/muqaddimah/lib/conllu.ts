// Reads one review unit of the Muqaddimah from its checked-in CoNLL-U (data/conllu/<unit>.conllu). A unit is a run of
// paragraphs, each opened by "# newpar id = <pid>" on its first sentence; a sentence is "# sent_id = <pid>.<k>", "# text
// = …" and its token lines. A written word is a surface: a plain token, or a multiword token's range line (وبالعلم =
// و + ب + العلم) with its syntactic words, the clitic cluster of one written word. Punctuation is a token of its own.
// Empty nodes (ids like 2.1) are not words of the text. Strict: a line the format does not explain throws, and each
// sentence's surfaces must rebuild its # text.
//
// MISC carries Root (CAMeL's root, radicals joined by ".", "#" for a radical it leaves open; absent for words with
// none) and Diac (the word's own vocalized form, the segment of a clitic cluster) on words, and SpaceAfter=No on the
// surface that the next token touches: the range line, for a multiword token. A paragraph's Arabic is its sentences'
// # text joined by one space; a verse paragraph has a sentence per verse line, with a "..." token at the hemistich
// break.

export interface Token {
  form: string;
  lemma: string;
  upos: string;
  /** UD features as given, "" for none. */
  feats: string;
  /** CAMeL's root, "#" standing for a radical it leaves open; undefined when the word has none. */
  root: string | undefined;
  /** The word's vocalized form; undefined for a word the tagger did not vocalize (a numeral in digits). */
  diac: string | undefined;
}

export interface Surface {
  /** The written word ("وبالعلم", "،"). */
  form: string;
  /** Syntactic words. Empty when the surface is only punctuation. */
  words: Token[];
  /** False when the annotation marks SpaceAfter=No. */
  spaceAfter: boolean;
}

export interface Sentence {
  /** "<pid>.<k>", k counted from 1 within the paragraph. */
  id: string;
  text: string;
  surfaces: Surface[];
}

export interface Paragraph {
  pid: string;
  sentences: Sentence[];
  /** The sentences' text joined by a space: the row's Arabic. */
  text: string;
}

const MISC_KEYS: Record<string, true> = { SpaceAfter: true, Root: true, Diac: true };

function miscPairs(field: string, where: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (field === "_") return out;
  for (const pair of field.split("|")) {
    const eq = pair.indexOf("=");
    if (eq <= 0) throw new Error(`${where}: bad MISC field ${pair}`);
    const name = pair.slice(0, eq);
    if (!MISC_KEYS[name]) throw new Error(`${where}: unexpected MISC ${name}`);
    if (name in out) throw new Error(`${where}: MISC ${name} twice`);
    out[name] = pair.slice(eq + 1);
  }
  if (out.SpaceAfter !== undefined && out.SpaceAfter !== "No") throw new Error(`${where}: SpaceAfter=${out.SpaceAfter}`);
  return out;
}

/** The sentence as its surfaces write it, spaces included only where the annotation leaves one. */
export function surfaceText(surfaces: readonly Surface[]): string {
  let out = "";
  surfaces.forEach((surface, i) => {
    out += surface.form;
    if (i < surfaces.length - 1 && surface.spaceAfter) out += " ";
  });
  return out;
}

/** A syntactic word from its token line. `inRange`: it is part of a multiword token, whose range line holds the spacing. */
function word(cols: readonly string[], where: string, inRange: boolean): Token {
  const form = cols[1]!;
  const [lemma, upos] = [cols[2]!, cols[3]!];
  if (lemma === "_" || upos === "_") throw new Error(`${where}: ${form} has no lemma or class`);
  if (upos === "PUNCT") throw new Error(`${where}: ${form} is punctuation inside a multiword token`);
  const misc = miscPairs(cols[9]!, `${where}:${form}`);
  if (inRange && misc.SpaceAfter !== undefined) throw new Error(`${where}: ${form} carries SpaceAfter inside a multiword token`);
  return { form, lemma, upos, feats: cols[5] === "_" ? "" : cols[5]!, root: misc.Root, diac: misc.Diac };
}

function parseSurfaces(rows: readonly string[][], where: string): Surface[] {
  const surfaces: Surface[] = [];
  let i = 0;
  while (i < rows.length) {
    const cols = rows[i]!;
    const id = cols[0]!;
    if (id.includes(".")) throw new Error(`${where}: empty node ${id} is not in this text`);
    if (id.includes("-")) {
      const [start, end] = id.split("-").map(Number) as [number, number];
      if (!Number.isInteger(start) || !Number.isInteger(end) || end <= start) throw new Error(`${where}: bad range ${id}`);
      if (cols.slice(2, 9).some((col) => col !== "_")) throw new Error(`${where}: range ${id} has columns beyond its form`);
      const misc = miscPairs(cols[9]!, `${where}:${cols[1]}`);
      if (misc.Root !== undefined || misc.Diac !== undefined) throw new Error(`${where}: range ${id} carries a word's MISC`);
      const words: Token[] = [];
      i++;
      for (let expect = start; expect <= end; expect++, i++) {
        const part = rows[i];
        if (!part || part[0] !== String(expect)) throw new Error(`${where}: range ${id} lacks word ${expect}`);
        words.push(word(part, where, true));
      }
      surfaces.push({ form: cols[1]!, words, spaceAfter: misc.SpaceAfter !== "No" });
      continue;
    }
    if (!/^\d+$/u.test(id)) throw new Error(`${where}: bad id ${id}`);
    const misc = miscPairs(cols[9]!, `${where}:${cols[1]}`);
    const punct = cols[3] === "PUNCT";
    surfaces.push({
      form: cols[1]!,
      words: punct ? [] : [word(cols, where, false)],
      spaceAfter: misc.SpaceAfter !== "No",
    });
    i++;
  }
  return surfaces;
}

interface Block {
  newpar: string | undefined;
  id: string;
  text: string;
  rows: string[][];
}

function readBlock(block: string, unit: string): Block {
  let newpar: string | undefined;
  let id: string | undefined;
  let text: string | undefined;
  const rows: string[][] = [];
  for (const line of block.split("\n")) {
    if (!line) continue;
    if (line.startsWith("#")) {
      const found = /^# (newpar id|sent_id|text) = (.*)$/u.exec(line);
      if (!found) throw new Error(`${unit}: unexpected comment ${line}`);
      const [, key, value] = found as unknown as [string, string, string];
      if (key === "newpar id") {
        if (newpar !== undefined || !/^\S+$/u.test(value)) throw new Error(`${unit}: bad paragraph comment ${line}`);
        newpar = value;
      } else if (key === "sent_id") {
        if (id !== undefined || !/^\S+$/u.test(value)) throw new Error(`${unit}: bad sentence comment ${line}`);
        id = value;
      } else {
        if (text !== undefined) throw new Error(`${unit}: a sentence has two # text lines`);
        text = value;
      }
      continue;
    }
    const cols = line.split("\t");
    if (cols.length !== 10) throw new Error(`${unit}: a token line has ${cols.length} columns, not 10`);
    rows.push(cols);
  }
  if (id === undefined || text === undefined) throw new Error(`${unit}: a sentence lacks # sent_id or # text`);
  return { newpar, id, text, rows };
}

/** The paragraphs of one review unit, in reading order. */
export function parseUnit(source: string, unit: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const seen = new Set<string>();
  let current: Paragraph | undefined;
  for (const [index, raw] of source.split(/\n\n+/u).entries()) {
    if (!raw.trim()) continue;
    if (!raw.includes("\t")) {
      // The file header (generator, licence) has comments and no tokens, and only comes first.
      if (index > 0 || /^# (newpar id|sent_id|text) =/mu.test(raw)) throw new Error(`${unit}: a block without tokens that is not a header`);
      continue;
    }
    const block = readBlock(raw, unit);
    if (block.newpar !== undefined) {
      if (seen.has(block.newpar)) throw new Error(`${unit}: paragraph ${block.newpar} twice`);
      seen.add(block.newpar);
      current = { pid: block.newpar, sentences: [], text: "" };
      paragraphs.push(current);
    }
    if (!current) throw new Error(`${unit}: ${block.id} comes before any # newpar id`);
    const where = block.id;
    const expected = `${current.pid}.${current.sentences.length + 1}`;
    if (block.id !== expected) throw new Error(`${unit}: sentence ${block.id}, expected ${expected}`);
    const surfaces = parseSurfaces(block.rows, where);
    const rebuilt = surfaceText(surfaces);
    if (rebuilt !== block.text) throw new Error(`${where}: tokens rebuild ${JSON.stringify(rebuilt)}, not ${JSON.stringify(block.text)}`);
    current.sentences.push({ id: block.id, text: block.text, surfaces });
  }
  if (!paragraphs.length) throw new Error(`${unit}: no paragraphs`);
  for (const paragraph of paragraphs) paragraph.text = paragraph.sentences.map((sentence) => sentence.text).join(" ");
  return paragraphs;
}
