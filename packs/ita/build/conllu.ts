// Reads the Commedia from UD_Italian-Old (CoNLL-U), as corpora/dante/fetch.ts puts its sentences in reading order.
// A written word is a "surface": a plain token, or a multiword token's range line ("del" = di + il, "dimmi" = di' +
// mi) with its words. Canto and line come from MISC Canto= and Verso=, on the range line of a multiword token; the
// treebank leaves them off punctuation and off some words of the Paradiso, which corpora/dante/lines.ts places.
// Empty nodes (ids like 2.1, the enhanced graph's elided predicates) are not words of the text and are skipped.
// Strict: a line the format does not explain throws.

export type Cantica = "inferno" | "purgatorio" | "paradiso";

export interface TreebankWord {
  form: string;
  lemma: string;
  upos: string;
  /** UD features as given, "" for none. */
  feats: string;
  misc: Readonly<Record<string, string>>;
}

export interface Surface {
  /** The written word as the treebank gives it ("Tant'", "del", "«"). */
  form: string;
  /** Its syntactic words: one, or the parts of a multiword token. */
  words: TreebankWord[];
  canto?: number;
  line?: number;
  /** False when the treebank marks SpaceAfter=No. */
  spaceAfter: boolean;
}

export interface Sentence {
  id: string;
  cantica: Cantica;
  /** Number within the cantica (the sent_id's). */
  n: number;
  surfaces: Surface[];
}

/** MISC keys the treebank uses; any other throws. Only Canto, Verso, SpaceAfter and Lang are read. */
const MISC_KEYS: Readonly<Record<string, true>> = {
  UniqueTokenId: true, Canto: true, Verso: true, SpaceAfter: true, Comment: true, Clitic: true, Antec: true,
  AntecPosit: true, Form: true, Lang: true, Epithesis: true, Foreign: true, Value: true, Nominalellipsis: true,
  Dislocated: true, Forn: true,
};

function pairs(field: string, where: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (field === "_") return out;
  for (const pair of field.split("|")) {
    const eq = pair.indexOf("=");
    if (eq <= 0) throw new Error(`${where}: malformed field ${field}`);
    out[pair.slice(0, eq)] = pair.slice(eq + 1);
  }
  return out;
}

function misc(field: string, where: string): Record<string, string> {
  const out = pairs(field, where);
  for (const key of Object.keys(out)) if (!MISC_KEYS[key]) throw new Error(`${where}: unexpected MISC ${key}`);
  return out;
}

const position = (m: Readonly<Record<string, string>>, where: string): { canto?: number; line?: number } => {
  if ((m.Canto === undefined) !== (m.Verso === undefined)) throw new Error(`${where}: Canto without Verso or the reverse`);
  if (m.Canto === undefined) return {};
  const canto = Number(m.Canto);
  const line = Number(m.Verso);
  if (!Number.isInteger(canto) || !Number.isInteger(line) || canto < 1 || line < 1) throw new Error(`${where}: bad Canto/Verso`);
  return { canto, line };
};

const SENT_ID = /^OldItalian_Dante_(Inferno|Purgatorio|Paradiso)-(\d+)$/u;

export function parseCommedia(source: string): Sentence[] {
  const sentences: Sentence[] = [];
  for (const block of source.split(/\n{2,}/u)) {
    if (!block.trim()) continue;
    const lines = block.split("\n");
    const idLine = lines.find((line) => line.startsWith("# sent_id = "));
    const id = idLine?.slice("# sent_id = ".length) ?? "";
    const match = SENT_ID.exec(id);
    if (!match) throw new Error(`Sentence without a Commedia sent_id: ${lines[0]}`);
    const sentence: Sentence = { id, cantica: match[1]!.toLowerCase() as Cantica, n: Number(match[2]), surfaces: [] };
    let range: { surface: Surface; last: number } | undefined;
    for (const line of lines) {
      if (!line || line.startsWith("#")) continue;
      const cols = line.split("\t");
      if (cols.length !== 10) throw new Error(`${id}: expected 10 columns: ${line}`);
      const [tokenId, form, lemma, upos, , feats, , , , miscField] = cols as [string, string, string, string, string, string, string, string, string, string];
      const where = `${id} ${tokenId} ${form}`;
      if (/^\d+\.\d+$/u.test(tokenId)) continue;
      const m = misc(miscField, where);
      const multi = /^(\d+)-(\d+)$/u.exec(tokenId);
      if (multi) {
        const surface: Surface = { form, words: [], ...position(m, where), spaceAfter: m.SpaceAfter !== "No" };
        sentence.surfaces.push(surface);
        range = { surface, last: Number(multi[2]) };
        continue;
      }
      if (!/^\d+$/u.test(tokenId)) throw new Error(`${where}: unexpected token id`);
      if (lemma === "_" && upos !== "_") throw new Error(`${where}: word without a lemma`);
      const word: TreebankWord = { form, lemma, upos, feats: feats === "_" ? "" : feats, misc: m };
      if (range && Number(tokenId) <= range.last) {
        range.surface.words.push(word);
        if (Number(tokenId) === range.last) range = undefined;
        continue;
      }
      sentence.surfaces.push({ form, words: [word], ...position(m, where), spaceAfter: m.SpaceAfter !== "No" });
    }
    if (range) throw new Error(`${id}: multiword token ${range.surface.form} has missing words`);
    sentences.push(sentence);
  }
  return sentences;
}
