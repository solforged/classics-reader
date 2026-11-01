// Greek lookup keys. The treebank and the dictionaries disagree on small things: AGDT and Perseus's lexica spell the
// diaeresis, vowel length and the final sigma differently (Πηληιάδης and Πηληϊάδης, ἄριστοσ and ἄριστος), write the grave
// accent of a word in running text where lemmas have the acute, and capitalize names alike but not every common word.
// fold() ignores all of that and keeps what distinguishes words: breathings, accents, iota subscript and the iota of
// a diphthong.

/** Dictionary headwords as printed are not just letters: the hyphens of compounds, the raised dot of divided stems. */
const HEADWORD_MARKS = /[-‑·.]/gu;

export const fold = (text: string): string =>
  text.normalize("NFD")
    .replace(/\u0300/gu, "\u0301") // grave → acute: a word keeps its grave only before another word
    .replace(/[\u0304\u0306\u0308]/gu, "") // macron, breve, diaeresis
    .normalize("NFC")
    .toLowerCase()
    .replace(/ς/gu, "σ");

/** The key of a dictionary headword: fold() without the marks that divide a compound. */
export const headwordKey = (headword: string): string => fold(headword.replace(HEADWORD_MARKS, ""));

/** A key without accents: the second try when a dictionary accents a word differently from the treebank. */
export const unaccent = (key: string): string => key.normalize("NFD").replace(/[\u0301\u0342]/gu, "").normalize("NFC");

/**
 * The key of a headword without its accent: the second try when a dictionary spells a word's accent differently from
 * the treebank (enclitics: τε and τέ; Ζεύς and Ζεῦς). Breathings and the iota subscript still tell words apart
 * (ἔρῳ is not ἐρῶ).
 */
export const looseKey = (headword: string): string => unaccent(headwordKey(headword));

/** Elision and apostrophe marks, which texts write as U+02BC, U+2019, U+1FBD, U+1FBF or '. */
const APOSTROPHE = /[\u02bc\u2019\u1fbd\u1fbf']/gu;

/**
 * Search key: fold() without any diacritic or elision mark, so a query typed without accents or breathings
 * (μηνιν, θεα) finds μῆνιν and θεά, and δʼ is found as δ.
 */
export const searchKey = (text: string): string =>
  fold(text).normalize("NFD").replace(/\p{M}/gu, "").replace(APOSTROPHE, "").normalize("NFC");
