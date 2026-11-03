// Arabic spelling keys. The reader shows the edition's own text, which has no vowel signs; lemmas, dictionary
// headwords and the word panel's forms are vocalized. Nothing here rewrites displayed text: fold() keys the dictionary
// shards, searchKey() lets a query typed with or without vowels, hamza seats or tatweel find the text.

const TATWEEL = /\u0640/gu;

/** Letter folds applied to a search key after all marks are gone (the decomposed hamza signs are marks). */
const LETTERS: Readonly<Record<string, string>> = {
  // Alef wasla has no decomposition; alef with hamza or madda (أ إ آ) decomposes to alef plus a mark.
  "ٱ": "ا",
  // Alef maqsura and the Persian and Urdu yeh forms.
  "ى": "ي", "ی": "ي", "ې": "ي", "ێ": "ي",
  // Ta marbuta and the Persian and Urdu heh forms.
  "ة": "ه", "ھ": "ه", "ہ": "ه", "ە": "ه",
  // Persian and Urdu kaf.
  "ک": "ك",
};

/**
 * Lookup key for lemmas; dictionary shards are keyed by it. Canonical composition (alef plus hamza above is أ) and no
 * tatweel; the vowel signs stay, because a vocalized lemma is what tells كَتَبَ (he wrote) from كُتُب (books) apart.
 */
export const fold = (text: string): string => text.normalize("NFC").replace(TATWEEL, "");

const DIGIT = /[\u0660-\u0669\u06F0-\u06F9]/gu;
const JOINERS = /[\u200C\u200D]/gu;

/**
 * Search key: no vowel signs, no hamza or madda signs, no tatweel; alef variants, yeh forms, ta marbuta and the Persian
 * letters folded to the plain Arabic ones (ؤ → و, ئ → ي, أ إ آ ٱ → ا, ى → ي, ة → ه); Arabic-Indic digits written as
 * ASCII. The standalone hamza ء stays. Other text (the English side shares this key) loses its accents and its case.
 * A character of the text gives zero or one key characters; only a presentation ligature such as ﷲ gives several.
 */
export function searchKey(text: string): string {
  return text.normalize("NFKD").replace(/\p{M}/gu, "").replace(TATWEEL, "").replace(JOINERS, "")
    .replace(DIGIT, (digit) => String(digit.codePointAt(0)! % 16))
    .replace(/[^\u0000-\u007F]/gu, (letter) => LETTERS[letter] ?? letter).toLowerCase();
}
