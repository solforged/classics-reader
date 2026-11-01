// What the build has to be told about the sources. Each table is checked against the text: the build throws when an
// entry is not used, and when the text needs one that is missing.
import type { Exceptions } from "../../packs/hbo/build/morph";

/**
 * OSHB gives a pronominal suffix no lemma of its own. It takes the independent pronoun's lemma for its person,
 * gender and number, in the form that serves as the pronoun's entry: אֲנִי (589), אֲנַחְנוּ (587), אַתָּה (859a),
 * אַתְּ (859c), אַתֶּם (859d), הוּא and הִיא (1931), הֵם (1992), הֵנָּה (2007).
 */
export const SUFFIX_LEMMAS: Readonly<Record<string, string>> = {
  "1cs": "589", "1cp": "587", "2ms": "859a", "2fs": "859c", "2mp": "859d",
  "3ms": "1931", "3fs": "1931", "3mp": "1992", "3fp": "2007",
};

/**
 * Stand-alone words coded as conjunctions that introduce a clause: כִּי (3588a), אִם (518a), פֶּן (6435), בִּלְתִּי (1115).
 * The conjunction וְ prefixed to a word coordinates.
 */
export const SUBORDINATORS: readonly string[] = ["3588a", "518a", "6435", "1115"];

export const EXCEPTIONS: Exceptions = { suffixLemmas: SUFFIX_LEMMAS, subordinators: SUBORDINATORS };

/** The keys EXCEPTIONS must use, as `oshbMorphemes` records them. */
export const EXCEPTION_KEYS: readonly string[] = [
  ...Object.keys(SUFFIX_LEMMAS).map((key) => `suffix:${key}`),
  ...SUBORDINATORS.map((lemma) => `sconj:${lemma}`),
];

/**
 * Words the manuscript writes one way (ketiv) and the tradition reads another (qere), by verse. OSHB analyses both;
 * the reader shows the qere, with the ketiv in the word's panel.
 */
export const KETIV_QERE: Readonly<Record<string, string>> = { "8.17": "הוצא" };
