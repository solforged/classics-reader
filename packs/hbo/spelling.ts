// Hebrew spelling keys. The reader shows the Westminster Leningrad Codex's own character sequences: they are never
// normalized (NFC reorders vowel points and accents), only marks are removed.

/** Cantillation marks (te'amim), U+0591–U+05AF. The meteg (U+05BD) and the vowel points are not among them. */
export const ACCENTS = /[\u0591-\u05AF]/gu;

/** The text without cantillation marks. */
export const stripAccents = (text: string): string => text.replace(ACCENTS, "");

/** Lookup key for lemmas: the lemma without cantillation marks; vowel points keep homographs apart. */
export const fold = stripAccents;

const FINAL: Readonly<Record<string, string>> = { ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" };

/**
 * Search key: consonants only, so בראשית finds בְּרֵאשִׁית. Vowel points, accents, the meteg and the shin and sin dots
 * are marks and fall away; final letters take their medial shapes; the maqqef, paseq, sof pasuq and nun hafukha
 * separate words. Other text (the English side shares this key) loses its accents and its case.
 */
export function searchKey(text: string): string {
  return text.normalize("NFKD").replace(/[\u05BE\u05C0\u05C3\u05C6]/gu, " ").replace(/\p{M}/gu, "")
    .replace(/[ךםןףץ]/gu, (letter) => FINAL[letter]!).toLowerCase();
}
