// DCS stores two vocalic letters as halfwidth-forms code points in a few lemmas and dictionary headwords
// (āp\uFFDE for āpṝ, atit\uFFDE for atitṝ, k\uFFB1p for kḷp at the pinned commit; the corpus forms āpūryamāṇam,
// atitaranti and kalpate confirm the roots). The mapping is one-to-one, so it is repaired wherever the build reads a
// lemma or headword.
const DAMAGED: Readonly<Record<string, string>> = { "\uFFDE": "ṝ", "\uFFB1": "ḷ" };

export function repairSpelling(text: string): string {
  return text.replace(/[\uFFDE\uFFB1]/gu, (c) => DAMAGED[c]!);
}
