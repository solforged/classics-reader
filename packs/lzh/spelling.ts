// Lookup and search keys for Classical Chinese. The treebank lemmatizes to Kanripo's forms (為 → 爲) while the text and
// dictionaries use another form, so each pair of variant forms folds to the form the text prints. The pairs are
// Unihan variants; corpora/analects/build.ts checks each against Unihan.
export const VARIANTS: Readonly<Record<string, string>> = {
  爲: "為", 吿: "告", 衆: "眾", 郷: "鄉", 衞: "衛", 愼: "慎", 敎: "教", 絶: "絕", 尙: "尚", 顚: "顛", 喩: "喻", 竝: "並",
};

/** Lookup key: variant forms replaced by the form the text prints. */
export function fold(text: string): string {
  let out = "";
  for (const char of text.normalize("NFC")) out += VARIANTS[char] ?? char;
  return out;
}

/** Search key: the lookup key without punctuation, case or tone marks, so pinyin typed plain also matches. */
export function searchKey(text: string): string {
  return fold(text).normalize("NFD").replace(/[\p{M}\p{P}\p{S}]/gu, "").toLowerCase();
}
