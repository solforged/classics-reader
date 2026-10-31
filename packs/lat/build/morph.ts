// LASLA's UD features to this reader's morphology (src/lib/morph.ts).
import { formatMorph, parseMorph } from "../../../src/lib/morph";

/**
 * Keeps LASLA's features except the declension of participles and infinitives (InflClass[nominal]) and, for nouns,
 * gender: LASLA files first-declension masculines (Aeneas, agricola) as feminine and several Greek names as neuter, so
 * a noun's gender comes from its dictionary entry instead. Number=Plural (on some numerals) becomes Plur. Verbs whose
 * lemma ends in -or are deponent: LASLA marks them Voice=Pass, so they gain Deponent=Yes.
 */
export function laslaMorph(lemma: string, upos: string, feats: string): string {
  const { feats: parsed } = parseMorph(`${upos} ${feats === "_" ? "" : feats}`);
  delete parsed["InflClass[nominal]"];
  if (upos === "NOUN" || upos === "PROPN") delete parsed.Gender;
  if (parsed.Number) parsed.Number = parsed.Number.map((value) => (value === "Plural" ? "Plur" : value));
  if ((upos === "VERB" || upos === "AUX") && lemma.endsWith("or")) parsed.Deponent = ["Yes"];
  return formatMorph({ upos, feats: parsed });
}
