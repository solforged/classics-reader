// Exception tables for the Prince. The build throws when an entry is unused, as the other readers do, so a fix
// that a reviewed annotation or a replaced alignment has made unnecessary cannot linger.
//
// Lemma corrections belong in the CoNLL-U (the review edits the file, and a fix here would become unused the
// moment it did). Alignment corrections belong in data/alignment/ (same columns, no code change). An entry
// here is only for a difference the files cannot express.

/**
 * Annotation lemma → the lemma shown and looked up. Keyed by the lemma as the CoNLL-U writes it, so one entry
 * changes every token of that lemma.
 */
export const LEMMA_FIXES: Readonly<Record<string, string>> = {};

/**
 * A bead the alignment file states and the reading must show otherwise: "<unit> <n>" → the English sentence ids
 * (comma-separated, as the file writes en_ids; empty for a sentence left untranslated). Applied before the bead
 * is placed, and only when the file still has the bead.
 */
export const BEAD_OVERRIDES: Readonly<Record<string, string>> = {};

/**
 * A chapter Ricci's 1909 translation does not finish. The note is shown on the first paragraph that has an
 * Italian sentence with no English. The 1921 reprint ends at the same sentence; Vincent's 1935 revision is not used.
 */
export const OMISSIONS: Readonly<Record<string, string>> = {
  "13": "Ricci’s translation (1909) omits the rest of this chapter.",
};
