// Italian lookup keys. The treebank writes the apostrophe of elision as ' ("ch'", "'l"), Gutenberg's text and the
// reader as ’; Petrocchi marks a diaeresis that dictionaries do not (süave, Böezio). fold() ignores both and letter
// case, and keeps the accents that tell words apart: è (is) and e (and), là and la, sé and se, né and ne.

const APOSTROPHE = /[\u2019\u2018\u02bc']/gu;

export const fold = (text: string): string =>
  text.normalize("NFD").replace(/\u0308/gu, "").normalize("NFC").toLowerCase().replace(APOSTROPHE, "'");

/**
 * fold() without accents or apostrophes: the second try when a dictionary accents a word otherwise than the treebank
 * (perchè and perché), and the key under which the treebank's few lemmas written with a final apostrophe (cio', for
 * ciò) find their entries.
 */
export const looseKey = (text: string): string =>
  fold(text).normalize("NFD").replace(/\p{M}/gu, "").replace(/'/gu, "").normalize("NFC");

/** Search key: so a query typed without accents or apostrophes (perche, chi) finds perché and ch’i’. */
export const searchKey = looseKey;
