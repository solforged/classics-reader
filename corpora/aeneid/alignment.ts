// Joins Greenough's printed words (Perseus) to LASLA's annotated tokens, line by line. LASLA follows another edition:
// on some lines a word is spelled differently (ruont for ruunt, omnis for omnes) or is another
// word altogether (adorat for adoret). Spellings keep LASLA's annotation; different words are listed in READINGS and
// get candidate analyses instead (build.ts). Lines 610 and 701 order two words differently and pair by spelling.
import type { LaslaToken } from "../../packs/lat/build/lasla";
import { fold } from "../../packs/lat/spelling";

/**
 * Greenough's reading where LASLA's edition has another word or form ("line word": LASLA's word). LASLA's annotation
 * describes its own reading, so these words take analyses LASLA gives the printed form elsewhere in the Aeneid.
 */
export const READINGS: Readonly<Record<string, string>> = {
  "48 adoret": "adorat", // subjunctive, not indicative
  "211 deripiunt": "diripiunt", // dēripiō, not dīripiō
  "236 omni": "omnis", // ablative singular with dicione, not accusative plural
  "281 mecumque": "mecum", // with -que
  "365 cernis": "cernes", // present, not future
  "374 componat": "componet", // subjunctive, not future
  "441 umbra": "umbrae", // ablative, not genitive
  "513 perculsus": "percussus", // percellō, not percutiō
  "550 arvaque": "armaque",
  "604 iustitia": "iustitiae", // nominative, not genitive
  "642 antiqua": "antiquae", // ablative with origine, not genitive
  "656 ita": "iter",
  "668 iniquae": "acerbae",
  "670 Hunc": "nunc",
};

export interface AlignedWord {
  /** Greenough's word as printed. */
  surface: string;
  token: LaslaToken;
  /** same: the editions agree (u/v, i/j and case aside); spelling: LASLA spells it differently; reading: READINGS. */
  match: "same" | "spelling" | "reading";
}

/** A printed line's words paired with LASLA's tokens; throws when the counts differ or a pair is unexplained. */
export function alignLine(n: number, text: string, tokens: readonly LaslaToken[], used: Set<string>): AlignedWord[] {
  const words = text.match(/\p{L}+/gu) ?? [];
  if (words.length !== tokens.length) {
    throw new Error(`Aeneid 1.${n}: Greenough has ${words.length} words, LASLA ${tokens.length} tokens`);
  }
  // Pair equal spellings first, in order, so that two swapped words still find each other.
  const pairs = new Array<LaslaToken | undefined>(words.length);
  const free = new Set(tokens.keys());
  words.forEach((word, i) => {
    if (fold(word) === fold(tokens[i]!.form)) {
      pairs[i] = tokens[i];
      free.delete(i);
    }
  });
  words.forEach((word, i) => {
    if (pairs[i]) return;
    const j = [...free].find((k) => fold(tokens[k]!.form) === fold(word)) ?? [...free][0]!;
    pairs[i] = tokens[j];
    free.delete(j);
  });
  return words.map((surface, i) => {
    const token = pairs[i]!;
    if (fold(surface) === fold(token.form)) return { surface, token, match: "same" };
    const key = `${n} ${surface}`;
    if (READINGS[key] === undefined) return { surface, token, match: "spelling" };
    if (fold(READINGS[key]) !== fold(token.form)) throw new Error(`Aeneid 1.${n}: LASLA reads ${token.form}, not ${READINGS[key]}`);
    used.add(key);
    return { surface, token, match: "reading" };
  });
}
