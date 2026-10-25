import { formatMorph } from "../../../src/lib/morph";

/** DCS's legacy CONJ is coordinating. Keep Case=Cpd and Tense=Impf without inventing absent features. */
export function dcsMorph(upos: string, features: string): string {
  if (!upos || upos === "_") throw new Error("DCS word has no part of speech");
  const feats: Record<string, string[]> = {};
  if (features && features !== "_") {
    for (const pair of features.split("|")) {
      const eq = pair.indexOf("=");
      if (eq < 1 || eq === pair.length - 1) throw new Error(`Malformed DCS feature: ${pair}`);
      const name = pair.slice(0, eq);
      if (name in feats) throw new Error(`Duplicate DCS feature: ${name}`);
      feats[name] = pair.slice(eq + 1).split(",");
    }
  }
  return formatMorph({ upos: upos === "CONJ" ? "CCONJ" : upos, feats });
}
