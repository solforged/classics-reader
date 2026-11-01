// English labels for Old English morphology: the Universal Dependencies features that packs/ang/build/morph.ts
// derives from ISWOC's PROIEL tags. Features the pack adds to UD's set: Strength (strong or weak adjective
// declension), Person[psor] and Number[psor] (the possessor of a possessive), PartType=Inf (the infinitive marker
// to). A feature with several values (Case=Acc,Dat) is one the treebank leaves undecided between them.
import { parseMorph } from "../../src/lib/morph";
import type { MorphLabel } from "../../src/lang/types";

const VALUE: Record<string, Record<string, string>> = {
  Case: {
    Nom: "nominative", Gen: "genitive", Dat: "dative", Acc: "accusative", Ins: "instrumental", Abl: "ablative",
    Voc: "vocative", Loc: "locative",
  },
  Gender: { Masc: "masculine", Fem: "feminine", Neut: "neuter" },
  Number: { Sing: "singular", Plur: "plural", Dual: "dual" },
  Person: { "1": "1st person", "2": "2nd person", "3": "3rd person" },
  Degree: { Pos: "", Cmp: "comparative", Sup: "superlative" },
  Strength: { Strong: "strong", Weak: "weak" },
  Mood: { Ind: "indicative", Sub: "subjunctive", Imp: "imperative" },
  VerbForm: { Fin: "", Inf: "infinitive", Part: "participle" },
  Tense: { Pres: "present", Past: "past" },
  NumType: { Card: "cardinal", Ord: "ordinal" },
  PronType: {
    Prs: "personal", Dem: "demonstrative", Int: "interrogative", Ind: "indefinite", Tot: "universal", Neg: "negative",
    Rel: "relative",
  },
  Poss: { Yes: "possessive" },
  Polarity: { Neg: "negative" },
  PartType: { Inf: "infinitive marker" },
  Foreign: { Yes: "foreign word" },
  "Person[psor]": { "1": "1st person", "2": "2nd person", "3": "3rd person" },
  "Number[psor]": { Sing: "singular", Plur: "plural" },
};

const POS: Record<string, string> = {
  NOUN: "noun", PROPN: "proper noun", ADJ: "adjective", ADV: "adverb", PRON: "pronoun", DET: "determiner",
  NUM: "numeral", VERB: "verb", AUX: "auxiliary verb", ADP: "preposition", CCONJ: "coordinating conjunction",
  SCONJ: "subordinating conjunction", PART: "particle", INTJ: "interjection", X: "foreign word",
};

export function describeMorph(morph: string): MorphLabel {
  const { upos, feats } = parseMorph(morph);
  if (!(upos in POS)) throw new Error(`Unlabelled Old English word class: ${upos}`);
  for (const [name, values] of Object.entries(feats)) {
    const labels = VALUE[name];
    if (!labels) throw new Error(`Unlabelled Old English feature: ${name}`);
    for (const value of values) if (!(value in labels)) throw new Error(`Unlabelled Old English feature value: ${name}=${value}`);
  }
  /** A feature's labels in plain English: "accusative or dative" for an undecided case. */
  const v = (name: string) => {
    const labels = [...new Set((feats[name] ?? []).map((value) => VALUE[name]![value]!))].filter(Boolean);
    return labels.length > 1 ? `${labels.slice(0, -1).join(", ")} or ${labels.at(-1)}` : (labels[0] ?? "");
  };
  const verb = upos === "VERB" || upos === "AUX";
  const verbForm = feats.VerbForm?.[0];
  let form: string[];
  if (verb && verbForm === "Fin") form = [v("Person"), v("Number"), v("Tense"), v("Mood")];
  else if (verb && verbForm === "Part") {
    form = [`${[v("Tense"), "participle"].filter(Boolean).join(" ")}${feats.Case || feats.Gender || feats.Number ? "," : ""}`,
      v("Strength"), v("Gender"), v("Case"), v("Number")];
  } else if (verb) form = [v("VerbForm")];
  else form = [v("Degree"), v("Strength"), v("Gender"), v("Case"), v("Number")];
  if (!verb && feats.Person && !feats["Person[psor]"]) form.unshift(v("Person"));

  const kind = [v("Poss") ? "possessive" : v("PronType")].filter(Boolean).join(" ");
  const pos = upos === "PRON" || upos === "DET" ? `${kind ? `${kind} ` : ""}${POS[upos]}` : POS[upos]!;
  const possessor = feats["Person[psor]"] ? `${v("Person[psor]")} ${v("Number[psor]")} possessor`.replace(/\s+/gu, " ") : "";
  const props = [
    upos === "PRON" || upos === "DET" ? "" : v("PronType"), v("NumType"), v("Polarity"), v("PartType"), possessor,
  ];
  return { pos, form: form.filter(Boolean).join(" "), props: props.filter(Boolean) };
}
