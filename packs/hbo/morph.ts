// English labels for Hebrew morphology: the Universal Dependencies features packs/hbo/build/morph.ts converts the OSHB
// codes to. UD has no features for the Hebrew verb stem or the sequential tenses, so two are this reader's own:
// HebBinyan (UD's own name; PAAL, NIFAL, PIEL, PUAL, HIFIL, HUFAL and HITPAEL are UD's values, the rarer stems follow
// the OSHB names) and HebConj (the sequential perfect, weqatal, and sequential imperfect, wayyiqtol). Ketiv carries
// the written (ketiv) form of a word read as its qere.
import { parseMorph } from "../../src/lib/morph";
import type { MorphLabel } from "../../src/lang/types";

/** Verb stems: HebBinyan value → the stem as grammars name it. */
export const BINYAN: Readonly<Record<string, string>> = {
  PAAL: "Qal", NIFAL: "Niphal", PIEL: "Piel", PUAL: "Pual", HIFIL: "Hiphil", HUFAL: "Hophal", HITPAEL: "Hithpael",
  POLEL: "Polel", POLAL: "Polal", HITPOLEL: "Hithpolel", POEL: "Poel", POAL: "Poal", PALEL: "Palel", PULAL: "Pulal",
  PAALPASS: "Qal passive", PILPEL: "Pilpel", POLPAL: "Polpal", HITPALPEL: "Hithpalpel", NITPAEL: "Nithpael",
  PEALAL: "Pealal", PILEL: "Pilel", HOTPAAL: "Hothpaal", TIFIL: "Tiphil", HISHTAFEL: "Hishtaphel",
  NITPALEL: "Nithpalel", NITPOEL: "Nithpoel", HITPOEL: "Hithpoel",
};

const VALUE: Record<string, Record<string, string>> = {
  Gender: { Masc: "masculine", Fem: "feminine" },
  Number: { Sing: "singular", Plur: "plural", Dual: "dual" },
  Person: { "1": "1st person", "2": "2nd person", "3": "3rd person" },
  Definite: { Cons: "construct", Def: "definite" },
  Aspect: { Perf: "perfect", Imp: "imperfect" },
  Mood: { Imp: "imperative", Jus: "jussive", Des: "cohortative" },
  VerbForm: { Fin: "", Inf: "infinitive", Part: "participle" },
  Voice: { Act: "active", Pass: "passive" },
  HebBinyan: BINYAN,
  HebConj: { Weqatal: "sequential perfect (weqatal)", Wayyiqtol: "sequential imperfect (wayyiqtol)" },
  PronType: {
    Prs: "personal", Dem: "demonstrative", Int: "interrogative", Rel: "relative", Ind: "indefinite", Art: "article",
  },
  Poss: { Yes: "possessive" },
  Case: { Acc: "accusative" },
  Polarity: { Neg: "negative" },
  NumType: { Card: "cardinal", Ord: "ordinal" },
  NameType: { Nat: "gentilic" },
  PartType: {
    Int: "interrogative", Dem: "demonstrative", Exh: "exhortative", Aff: "affirmative", Dir: "directional he",
    ParH: "paragogic he", ParN: "paragogic nun",
  },
  Clitic: { Yes: "suffix" },
};

const POS: Record<string, string> = {
  NOUN: "noun", PROPN: "proper noun", ADJ: "adjective", NUM: "cardinal number", VERB: "verb", PRON: "pronoun",
  DET: "definite article", ADP: "preposition", ADV: "adverb", CCONJ: "conjunction", SCONJ: "subordinating conjunction",
  PART: "particle", INTJ: "interjection",
};

export function describeMorph(morph: string): MorphLabel {
  const { upos, feats } = parseMorph(morph);
  if (!(upos in POS)) throw new Error(`Unlabelled Hebrew word class: ${upos}`);
  for (const [name, values] of Object.entries(feats)) {
    if (name === "Ketiv") continue; // The one feature whose value is text: the written form of a word read as its qere.
    const labels = VALUE[name];
    if (!labels) throw new Error(`Unlabelled Hebrew feature: ${name}`);
    for (const value of values) if (!(value in labels)) throw new Error(`Unlabelled Hebrew feature value: ${name}=${value}`);
  }
  const v = (name: string) => {
    const labels = [...new Set((feats[name] ?? []).map((value) => VALUE[name]![value]!))].filter(Boolean);
    return labels.length > 1 ? `${labels.slice(0, -1).join(", ")} or ${labels.at(-1)}` : (labels[0] ?? "");
  };
  const suffix = feats.Clitic !== undefined;
  const nominal = (upos === "NOUN" || upos === "ADJ" || upos === "NUM") && feats.Number !== undefined;
  const participle = feats.VerbForm?.includes("Part") ?? false;
  // The absolute state is the unmarked one: it has no feature, but the form names it.
  const state = v("Definite") || (nominal || participle ? "absolute" : "");
  const props: string[] = [];
  let pos = POS[upos]!;
  let form: string[] = [];

  if (upos === "VERB") {
    const stem = v("HebBinyan");
    if (participle) form = [stem, v("Voice"), `participle,`, v("Gender"), v("Number"), state];
    else if (feats.VerbForm?.includes("Inf")) form = [stem, `infinitive ${feats.Definite ? "construct" : "absolute"}`];
    else form = [stem, `${v("HebConj") || v("Mood") || v("Aspect")},`, v("Person"), v("Gender"), v("Number")];
  } else if (upos === "PRON") {
    pos = `${v("PronType")} pronoun`;
    if (feats.Poss) props.push("possessive");
    if (feats.Case) props.push("object of a verb");
    form = [suffix ? "suffix," : "", v("Person"), v("Gender"), v("Number")];
  } else if (upos === "PART" && feats.PartType) {
    pos = suffix ? "suffix" : `${v("PartType")} particle`;
    form = suffix ? [v("PartType")] : [];
  } else if (upos === "ADP" && feats.Case) pos = "direct-object marker";
  else if (upos === "SCONJ" && feats.PronType) pos = "relative particle";
  else if (upos === "PART" && feats.Polarity) pos = "negative particle";
  else if (feats.NumType?.includes("Ord")) {
    pos = "ordinal number";
    form = [v("Gender"), v("Number"), state];
  } else if (nominal) {
    if (feats.NameType) pos = `${v("NameType")} ${pos}`;
    // A noun's gender belongs to the word; an adjective's or numeral's is part of its form.
    if (upos === "NOUN") props.push(v("Gender"));
    form = [upos === "NOUN" ? "" : v("Gender"), v("Number"), state];
  }
  if (feats.Ketiv) props.push(`ketiv ${feats.Ketiv.join(",")} is written; this qere is read`);
  return { pos, form: form.filter(Boolean).join(" ").replace(/,$/u, ""), props: props.filter(Boolean) };
}
