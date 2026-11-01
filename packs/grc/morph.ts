// English labels for Greek morphology: the Universal Dependencies features packs/grc/build/agdt.ts derives from the
// treebank's tags. Tense and aspect combine into the Greek tense names (Tense=Past with no aspect is the aorist,
// Aspect=Imp the imperfect, Aspect=Perf the perfect). A form that is middle or passive alike (Voice=Mid,Pass) reads
// "middle or passive".
import { parseMorph } from "../../src/lib/morph";
import type { MorphLabel } from "../../src/lang/types";

const VALUE: Record<string, Record<string, string>> = {
  Case: { Nom: "nominative", Gen: "genitive", Dat: "dative", Acc: "accusative", Voc: "vocative", Loc: "locative" },
  Gender: { Masc: "masculine", Fem: "feminine", Neut: "neuter" },
  Number: { Sing: "singular", Plur: "plural", Dual: "dual" },
  Person: { "1": "1st person", "2": "2nd person", "3": "3rd person" },
  Degree: { Pos: "", Cmp: "comparative", Sup: "superlative" },
  Mood: { Ind: "indicative", Sub: "subjunctive", Opt: "optative", Imp: "imperative" },
  Voice: { Act: "active", Mid: "middle", Pass: "passive" },
  VerbForm: { Fin: "", Inf: "infinitive", Part: "participle", Ger: "gerund", Gdv: "verbal adjective" },
  // Read together with Aspect (tense()).
  Tense: { Pres: "", Past: "", Pqp: "", Fut: "" },
  Aspect: { Imp: "", Perf: "" },
  PronType: {
    Art: "article", Prs: "personal", Rel: "relative", Dem: "demonstrative", Int: "interrogative", Ind: "indefinite",
  },
  Polarity: { Neg: "negative" },
};

const POS: Record<string, string> = {
  NOUN: "noun", PROPN: "proper noun", ADJ: "adjective", ADV: "adverb", PRON: "pronoun", DET: "article", NUM: "numeral",
  VERB: "verb", AUX: "auxiliary verb", ADP: "preposition", CCONJ: "coordinating conjunction",
  SCONJ: "subordinating conjunction", PART: "particle", INTJ: "interjection", X: "word of unknown class",
};

/** Greek tense name from UD Tense and Aspect. */
function tense(feats: Record<string, string[]>): string {
  const t = feats.Tense?.join(",") ?? "";
  const a = feats.Aspect?.join(",") ?? "";
  if (t === "Pres") return "present";
  if (t === "Pqp") return "pluperfect";
  if (t === "Fut") return a === "Perf" ? "future perfect" : "future";
  if (t === "Past") return a === "Imp" ? "imperfect" : a === "Perf" ? "perfect" : "aorist";
  return "";
}

export function describeMorph(morph: string): MorphLabel {
  const { upos, feats } = parseMorph(morph);
  if (!(upos in POS)) throw new Error(`Unlabelled Greek word class: ${upos}`);
  for (const [name, values] of Object.entries(feats)) {
    const labels = VALUE[name];
    if (!labels) throw new Error(`Unlabelled Greek feature: ${name}`);
    for (const value of values) if (!(value in labels)) throw new Error(`Unlabelled Greek feature value: ${name}=${value}`);
  }
  const v = (name: string) => {
    const labels = [...new Set((feats[name] ?? []).map((value) => VALUE[name]![value]!))].filter(Boolean);
    return labels.length > 1 ? `${labels.slice(0, -1).join(", ")} or ${labels.at(-1)}` : (labels[0] ?? "");
  };
  const verb = upos === "VERB" || upos === "AUX";
  const noun = upos === "NOUN" || upos === "PROPN";
  let form: string[];
  if (verb && feats.VerbForm?.includes("Fin")) {
    form = [v("Person"), v("Number"), tense(feats), v("Mood"), v("Voice")];
  } else if (verb) {
    const named = feats.VerbForm?.[0] === "Part" || feats.VerbForm?.[0] === "Inf"
      ? [tense(feats), v("Voice"), v("VerbForm")]
      : [v("VerbForm")];
    form = [named.filter(Boolean).join(" ") + (feats.Case ? "," : ""), v("Gender"), v("Case"), v("Number")];
  } else {
    // A noun's gender is its own; an adjective, pronoun or article takes it from the noun, so it belongs to the form.
    form = [v("Degree"), noun ? "" : v("Gender"), v("Case"), v("Number")];
  }
  if (!verb && feats.Person) form.unshift(v("Person"));

  const pronoun = upos === "PRON";
  const pos = pronoun && v("PronType") ? `${v("PronType")} ${POS[upos]}` : POS[upos]!;
  const props = [noun ? v("Gender") : "", v("Polarity")];
  return { pos, form: form.filter(Boolean).join(" "), props: props.filter(Boolean) };
}
