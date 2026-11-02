// UDPipe's ISDT model writes Universal Dependencies features, but not the conventions packs/ita/morph.ts labels.
// The conversion is the whole of the difference, and it throws on a feature or a context it was not written for:
// a reviewed file that invents a feature stops the build instead of showing a blank grammar.
//
//   VerbForm=Ger            → VerbForm=Conv     the pack's name for the gerund
//   finite Tense=Past, no Aspect, Mood=Ind → Aspect=Perf     the past historic, which the pack names from
//                                             Tense=Past|Aspect=Perf. A participle's Tense=Past is left alone:
//                                             the pack already calls that a past participle.
//   Tense=Imp               left as it is       the pack already labels it imperfect
//   ExtPos, Typo, Polarity  dropped             no pack label, and nothing the word panel shows
import { describeMorph } from "../../../packs/ita/morph";
import { formatMorph, parseMorph } from "../../../src/lib/morph";

const DROPPED: Record<string, true> = { ExtPos: true, Typo: true, Polarity: true };

export interface MorphStats {
  gerund: number;
  pastHistoric: number;
  imperfect: number;
  dropped: Record<string, number>;
  labelled: number;
}

/** ISDT features as the pack's describeMorph accepts them. `where` names the token in an error. */
export function toPackMorph(upos: string, feats: string, where: string, stats: MorphStats, labelled: Set<string>): string {
  const parsed = parseMorph(feats ? `${upos} ${feats}` : upos);
  if (parsed.upos !== upos) throw new Error(`${where}: morphology lost its class`);
  for (const name of Object.keys(parsed.feats)) {
    if (!DROPPED[name]) continue;
    stats.dropped[name] = (stats.dropped[name] ?? 0) + 1;
    delete parsed.feats[name];
  }
  const verbForm = parsed.feats.VerbForm?.[0];
  if (verbForm === "Ger") {
    if (parsed.feats.VerbForm!.length !== 1) throw new Error(`${where}: more than one VerbForm`);
    if (parsed.feats.Tense || parsed.feats.Mood || parsed.feats.Aspect) {
      throw new Error(`${where}: a gerund carries tense, mood or aspect (${feats})`);
    }
    parsed.feats.VerbForm = ["Conv"];
    stats.gerund++;
  }
  const finite = parsed.feats.VerbForm?.[0] === "Fin";
  if (finite && parsed.feats.Tense?.includes("Past") && !parsed.feats.Aspect) {
    if (parsed.feats.Mood?.[0] !== "Ind") {
      throw new Error(`${where}: finite past is not indicative (${feats}); not labelled as the past historic`);
    }
    parsed.feats.Aspect = ["Perf"];
    stats.pastHistoric++;
  }
  if (parsed.feats.Tense?.includes("Imp")) stats.imperfect++;
  const morph = formatMorph(parsed);
  if (!labelled.has(morph)) {
    describeMorph(morph);
    labelled.add(morph);
    stats.labelled++;
  }
  return morph;
}
