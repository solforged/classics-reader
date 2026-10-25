// English labels for DCS morphology. Case=Cpd and Tense=Impf retain the source's values.
import { parseMorph } from "../../lib/morph";
import type { MorphLabel } from "../types";

const VALUE: Record<string, Record<string, string>> = {
  Case: {
    Nom: "nominative", Acc: "accusative", Ins: "instrumental", Dat: "dative", Abl: "ablative",
    Gen: "genitive", Loc: "locative", Voc: "vocative", Cpd: "compound member",
  },
  Number: { Sing: "singular", Dual: "dual", Plur: "plural" },
  Gender: { Masc: "masculine", Fem: "feminine", Neut: "neuter" },
  Person: { "1": "1st person", "2": "2nd person", "3": "3rd person" },
  Tense: { Pres: "present", Past: "past", Impf: "imperfect", Fut: "future", Pqp: "pluperfect" },
  Mood: { Ind: "indicative", Imp: "imperative", Opt: "optative", Sub: "subjunctive", Juss: "jussive", Inj: "injunctive", Cnd: "conditional" },
  Voice: { Act: "active", Mid: "middle", Pass: "passive" },
  VerbForm: { Fin: "", Inf: "infinitive", Part: "participle", Conv: "absolutive", Gdv: "gerundive" },
  Degree: { Pos: "", Cmp: "comparative", Sup: "superlative" },
  Aspect: { Imp: "imperfective", Perf: "perfective", Prosp: "prospective", Prog: "progressive" },
  NumType: { Card: "cardinal", Ord: "ordinal", Mult: "multiplicative", Frac: "fractional" },
};

const POS: Record<string, string> = {
  NOUN: "noun", PROPN: "proper noun", ADJ: "adjective", ADV: "adverb", PRON: "pronoun",
  DET: "determiner", NUM: "numeral", VERB: "verb", AUX: "auxiliary verb", ADP: "adposition",
  CCONJ: "coordinating conjunction", SCONJ: "subordinating conjunction", PART: "particle",
  INTJ: "interjection", X: "indeclinable", PUNCT: "punctuation", SYM: "symbol",
};

export function describeMorph(morph: string): MorphLabel {
  const { upos, feats } = parseMorph(morph);
  const v = (name: string) => {
    const labels = [...new Set((feats[name] ?? []).map((value) => VALUE[name]?.[value] ?? value.toLowerCase()))].filter(Boolean);
    return labels.length > 1 ? `${labels.slice(0, -1).join(", ")} or ${labels.at(-1)}` : (labels[0] ?? "");
  };
  const verb = upos === "VERB" || upos === "AUX";
  const noun = upos === "NOUN" || upos === "PROPN";
  const nonfinite = feats.VerbForm?.some((value) => value !== "Fin") ?? false;
  const form = verb
    ? nonfinite
      ? [v("Tense"), v("VerbForm"), v("Gender"), v("Case"), v("Number"), v("Voice")]
      : [v("Person"), v("Number"), v("Tense"), v("Mood"), v("Voice")]
    : [v("Degree"), noun ? "" : v("Gender"), v("Case"), v("Number")];
  if (!verb && feats.Person) form.unshift(v("Person"));
  const props = [noun ? v("Gender") : "", v("Aspect"), v("NumType")];
  return { pos: POS[upos] ?? "", form: form.filter(Boolean).join(" "), props: props.filter(Boolean) };
}
