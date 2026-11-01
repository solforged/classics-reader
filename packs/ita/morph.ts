// English labels for the morphology of UD_Italian-Old (the Commedia's treebank): UD's UPOS and features as the
// treebank gives them, plus one pack feature, Lang=oc, for the Old Occitan of Arnaut Daniel's lines in Purgatorio 26
// (the treebank's MISC Lang=fro). The treebank's tenses follow Italian grammar: Tense=Past with Aspect=Imp is the
// imperfect, with Aspect=Perf the past historic (passato remoto); Tense=Imp is the imperfect subjunctive. Its
// features are not always complete (a finite verb may lack VerbForm, a conditional has Mood=Cnd alone), so labels are
// composed from whatever features a word has, and an unknown feature or value throws.
import { parseMorph } from "../../src/lib/morph";
import type { MorphLabel } from "../../src/lang/types";

const VALUE: Record<string, Record<string, string>> = {
  Gender: { Masc: "masculine", Fem: "feminine" },
  Number: { Sing: "singular", Plur: "plural" },
  Person: { "1": "1st person", "2": "2nd person", "3": "3rd person" },
  Degree: { Cmp: "comparative", Sup: "superlative", Abs: "absolute superlative" },
  Mood: { Ind: "indicative", Sub: "subjunctive", Cnd: "conditional", Imp: "imperative" },
  Tense: { Pres: "present", Past: "past", Fut: "future", Imp: "imperfect" },
  Aspect: { Imp: "imperfective", Perf: "perfective" },
  VerbForm: { Fin: "", Inf: "infinitive", Part: "participle", Conv: "gerund" },
  Voice: { Act: "", Pass: "passive" },
  Definite: { Def: "definite", Ind: "indefinite" },
  PronType: {
    Prs: "personal", Dem: "demonstrative", Int: "interrogative", Rel: "relative", Ind: "indefinite", Neg: "negative",
    Tot: "universal", Exc: "exclamative", Art: "",
  },
  Poss: { Yes: "possessive" },
  Reflex: { Yes: "reflexive" },
  Clitic: { Yes: "clitic (unstressed)" },
  NumType: { Card: "cardinal", Ord: "ordinal" },
  Foreign: { Yes: "" },
  Lang: { oc: "Old Occitan" },
};

const POS: Record<string, string> = {
  NOUN: "noun", PROPN: "proper noun", ADJ: "adjective", ADV: "adverb", PRON: "pronoun", DET: "determiner",
  NUM: "numeral", VERB: "verb", AUX: "auxiliary verb", ADP: "preposition", CCONJ: "coordinating conjunction",
  SCONJ: "subordinating conjunction", PART: "particle", INTJ: "interjection", X: "word of another language",
};

export function describeMorph(morph: string): MorphLabel {
  const { upos, feats } = parseMorph(morph);
  if (!(upos in POS)) throw new Error(`Unlabelled Italian word class: ${upos}`);
  for (const [name, values] of Object.entries(feats)) {
    const labels = VALUE[name];
    if (!labels) throw new Error(`Unlabelled Italian feature: ${name}`);
    for (const value of values) if (!(value in labels)) throw new Error(`Unlabelled Italian feature value: ${name}=${value}`);
  }
  const v = (name: string) => {
    const labels = [...new Set((feats[name] ?? []).map((value) => VALUE[name]![value]!))].filter(Boolean);
    return labels.length > 1 ? `${labels.slice(0, -1).join(", ")} or ${labels.at(-1)}` : (labels[0] ?? "");
  };
  const has = (name: string, value: string) => feats[name]?.includes(value) ?? false;
  const verb = upos === "VERB" || upos === "AUX";
  const verbForm = feats.VerbForm?.[0];

  /** The tense as Italian grammar names it, from Tense and Aspect. */
  const tense = (): string => {
    if (has("Tense", "Past") && has("Aspect", "Imp")) return "imperfect";
    if (has("Tense", "Past") && has("Aspect", "Perf")) return "past historic";
    if (has("Mood", "Cnd") && has("Tense", "Pres")) return "";
    if (has("Mood", "Imp")) return "";
    return v("Tense");
  };

  let form: string[];
  let props: string[] = [];
  if (verbForm === "Part" || (!verbForm && verb && feats.Aspect && !feats.Mood && !feats.Person)) {
    // Voice is left out: the treebank marks most past participles passive, including those of compound tenses.
    const kind = has("Tense", "Pres") || (has("Aspect", "Imp") && !has("Tense", "Past")) ? "present participle" : "past participle";
    form = [`${kind}${feats.Gender || feats.Number ? "," : ""}`, v("Gender"), v("Number")];
  } else if (verbForm === "Inf" || verbForm === "Conv") {
    form = [v("VerbForm"), v("Voice")];
  } else if (verb || feats.Mood) {
    form = [v("Person"), v("Number"), tense(), v("Mood"), v("Voice")];
    if (!feats.Mood && feats.Gender) form.push(v("Gender"));
  } else if (upos === "NOUN" || upos === "PROPN") {
    form = [v("Number")];
    props = [v("Gender")];
  } else {
    form = [v("Degree"), feats.Person && !feats.Poss ? v("Person") : "", v("Gender"), v("Number")];
  }
  if (!verb && verbForm && upos !== "ADJ") form.push(`(${v("VerbForm") || "finite verb"} used as a ${POS[upos]})`);
  if (!verb && upos === "ADJ" && verbForm) props.push(`${v("VerbForm") || "verb form"} used as an adjective`);
  if ((upos === "NOUN" || upos === "PROPN") && feats.Degree) form.unshift(v("Degree"));

  let pos = POS[upos]!;
  if (feats.PronType?.includes("Art")) pos = `${v("Definite")} article`.trim();
  else if (upos === "PRON" || upos === "DET") {
    const kind = feats.Poss ? "possessive" : v("PronType");
    pos = `${kind ? `${kind} ` : ""}${pos}`;
  } else if (upos === "NUM") pos = `${v("NumType")} numeral`.trim();
  if (upos !== "PRON" && upos !== "DET" && upos !== "NUM") props.push(v("PronType"), v("Poss"), v("NumType"));
  props.push(v("Reflex"), v("Clitic"), v("Lang"));
  return { pos, form: form.filter(Boolean).join(" ").replace(/,$/u, ""), props: props.filter(Boolean) };
}
