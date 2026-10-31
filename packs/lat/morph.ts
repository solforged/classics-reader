// English labels for Latin morphology: LASLA's UD features as packs/lat/build/morph.ts keeps them. Tense and aspect
// combine into the Latin tense names (Aspect=Perf|Tense=Past is the perfect, Aspect=Imp|Tense=Past the imperfect).
import { parseMorph } from "../../src/lib/morph";
import type { MorphLabel } from "../../src/lang/types";

const VALUE: Record<string, Record<string, string>> = {
  Case: {
    Nom: "nominative", Gen: "genitive", Dat: "dative", Acc: "accusative", Abl: "ablative", Voc: "vocative",
    Loc: "locative",
  },
  Gender: { Masc: "masculine", Fem: "feminine", Neut: "neuter" },
  Number: { Sing: "singular", Plur: "plural" },
  Person: { "1": "1st person", "2": "2nd person", "3": "3rd person" },
  Degree: { Pos: "", Cmp: "comparative", Abs: "superlative" },
  Mood: { Ind: "indicative", Sub: "subjunctive", Imp: "imperative" },
  Voice: { Act: "active", Pass: "passive" },
  VerbForm: { Fin: "", Inf: "infinitive", Part: "participle", Ger: "gerund", Gdv: "gerundive", Sup: "supine" },
  // Read together with Aspect (tense()).
  Tense: { Pres: "", Past: "", Pqp: "", Fut: "" },
  Aspect: { Imp: "", Perf: "", Prosp: "" },
  NumType: { Card: "cardinal", Ord: "ordinal", Dist: "distributive", Mult: "multiplicative" },
  PronType: {
    Prs: "personal", Rel: "relative", Dem: "demonstrative", Int: "interrogative", Ind: "indefinite",
    Emp: "intensive", Tot: "quantifying", Neg: "negative", Con: "contrastive",
  },
  Poss: { Yes: "possessive" },
  Reflex: { Yes: "reflexive" },
  Polarity: { Neg: "negative" },
  PartType: { Emp: "exclamatory", Int: "interrogative" },
  AdpType: { Prep: "" },
  ConjType: { Cmpr: "comparative" },
  Variant: { Greek: "Greek inflection" },
  Deponent: { Yes: "deponent" },
  "Person[psor]": { "1": "1st person", "2": "2nd person", "3": "3rd person" },
  "Number[psor]": { Sing: "singular", Plur: "plural" },
  InflClass: {
    IndEurA: "first declension", IndEurO: "second declension", IndEurX: "third declension",
    IndEurI: "third declension, i-stem", IndEurU: "fourth declension", IndEurE: "fifth declension",
    Ind: "indeclinable", LatPron: "pronominal declension", LatAnom: "irregular",
    LatA: "first conjugation", LatE: "second conjugation", LatX: "third conjugation", LatI2: "third conjugation, -iō",
    LatI: "fourth conjugation",
  },
};

const POS: Record<string, string> = {
  NOUN: "noun", PROPN: "proper noun", ADJ: "adjective", ADV: "adverb", PRON: "pronoun", DET: "determiner",
  NUM: "numeral", VERB: "verb", AUX: "auxiliary verb", ADP: "preposition", CCONJ: "coordinating conjunction",
  SCONJ: "subordinating conjunction", PART: "particle", INTJ: "interjection",
};

/** Latin tense name from UD Tense and Aspect: finite verbs have six tenses, participles and infinitives three. */
function tense(feats: Record<string, string[]>, finite: boolean): string {
  const t = feats.Tense?.join(",") ?? "";
  const a = feats.Aspect?.join(",") ?? "";
  if (a === "Prosp") return "future";
  if (!finite) return a === "Perf" ? "perfect" : t === "Fut" ? "future" : a === "Imp" || t === "Pres" ? "present" : "";
  if (a === "Perf") return { Past: "perfect", Pqp: "pluperfect", Fut: "future perfect" }[t] ?? "perfect";
  return { Pres: "present", Past: "imperfect", Fut: "future" }[t] ?? "";
}

export function describeMorph(morph: string): MorphLabel {
  const { upos, feats } = parseMorph(morph);
  if (!(upos in POS)) throw new Error(`Unlabelled Latin word class: ${upos}`);
  for (const [name, values] of Object.entries(feats)) {
    const labels = VALUE[name];
    if (!labels) throw new Error(`Unlabelled Latin feature: ${name}`);
    for (const value of values) if (!(value in labels)) throw new Error(`Unlabelled Latin feature value: ${name}=${value}`);
  }
  const v = (name: string) => {
    const labels = [...new Set((feats[name] ?? []).map((value) => VALUE[name]![value]!))].filter(Boolean);
    return labels.length > 1 ? `${labels.slice(0, -1).join(", ")} or ${labels.at(-1)}` : (labels[0] ?? "");
  };
  const verb = upos === "VERB" || upos === "AUX";
  const finite = feats.VerbForm?.includes("Fin") ?? false;
  const voice = feats.Deponent ? "" : v("Voice");
  let form: string[];
  if (verb && finite) form = [v("Person"), v("Number"), tense(feats, true), v("Mood"), voice];
  else if (verb) {
    const verbForm = feats.VerbForm?.[0];
    const named = verbForm === "Ger" || verbForm === "Gdv" || verbForm === "Sup" ? [v("VerbForm")] : [tense(feats, false), voice, v("VerbForm")];
    form = [named.filter(Boolean).join(" ") + (feats.Case ? "," : ""), v("Gender"), v("Case"), v("Number")];
  } else form = [v("Degree"), v("Gender"), v("Case"), v("Number")];
  if (!verb && feats.Person && !feats["Person[psor]"]) form.unshift(v("Person"));

  const kind = [v("Reflex"), v("Poss") ? "possessive" : v("PronType")].filter(Boolean).join(" ");
  const pos = upos === "PRON" || upos === "DET" ? `${kind ? `${kind} ` : ""}${POS[upos]}` : POS[upos]!;
  const possessor = feats["Person[psor]"] ? `${v("Person[psor]")} ${v("Number[psor]")} possessor`.replace(/\s+/gu, " ") : "";
  const props = [
    v("InflClass"), v("Deponent"), v("NumType"), upos === "PRON" || upos === "DET" ? "" : v("PronType"), v("Polarity"),
    v("PartType"), v("ConjType"), v("Variant"), possessor,
  ];
  return { pos, form: form.filter(Boolean).join(" "), props: props.filter(Boolean) };
}
