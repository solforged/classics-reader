// English labels for Arabic morphology: the Universal Dependencies UPOS and the FEATS packs/ara's CoNLL-U files use
// (corpora/muqaddimah/data/conllu, converted from CAMeL Tools' analyses by corpora/muqaddimah/tools). The inventory is
// closed: any other feature or value is a build error, so a conversion that starts writing a new one is noticed.
//
// Arabic has no infinitive: the verbal noun (maṣdar) is VerbForm=Vnoun and the participles VerbForm=Part, with Voice
// telling the active participle from the passive one; neither is a finite verb, so their forms read like a noun's.
// The construct state (Definite=Cons) is the first term of an idafa, كِتَابُ اللهِ, and has no article or tanwin.
import { parseMorph } from "../../src/lib/morph";
import type { MorphLabel } from "../../src/lang/types";

const VALUE: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  Aspect: { Perf: "perfect", Imp: "imperfect" },
  Case: { Nom: "nominative", Acc: "accusative", Gen: "genitive" },
  Definite: { Def: "definite", Ind: "indefinite", Cons: "construct state" },
  Gender: { Masc: "masculine", Fem: "feminine" },
  Mood: { Ind: "indicative", Sub: "subjunctive", Jus: "jussive", Imp: "imperative" },
  Number: { Sing: "singular", Dual: "dual", Plur: "plural" },
  Person: { "1": "1st person", "2": "2nd person", "3": "3rd person" },
  Voice: { Act: "active", Pass: "passive" },
  VerbForm: { Fin: "finite", Part: "participle", Vnoun: "verbal noun" },
  PronType: { Prs: "personal", Dem: "demonstrative", Rel: "relative", Int: "interrogative" },
  NumForm: { Word: "written as a word", Digit: "written in digits" },
  Abbr: { Yes: "abbreviation" },
  Polarity: { Neg: "negative" },
};

const POS: Readonly<Record<string, string>> = {
  ADJ: "adjective", ADP: "preposition", ADV: "adverb", AUX: "auxiliary verb", CCONJ: "conjunction", DET: "determiner",
  INTJ: "interjection", NOUN: "noun", NUM: "number", PART: "particle", PRON: "pronoun", PROPN: "proper noun",
  PUNCT: "punctuation mark", SCONJ: "subordinating conjunction", SYM: "symbol", VERB: "verb", X: "other word",
};

export function describeMorph(morph: string): MorphLabel {
  const { upos, feats } = parseMorph(morph);
  if (!(upos in POS)) throw new Error(`Unlabelled Arabic word class: ${upos}`);
  for (const [name, values] of Object.entries(feats)) {
    const labels = VALUE[name];
    if (!labels) throw new Error(`Unlabelled Arabic feature: ${name}`);
    for (const value of values) if (!(value in labels)) throw new Error(`Unlabelled Arabic feature value: ${name}=${value}`);
  }
  // A feature's labels, "accusative or genitive" when the analysis leaves the value open.
  const v = (name: string): string => {
    const labels = [...new Set((feats[name] ?? []).map((value) => VALUE[name]![value]!))];
    return labels.length > 1 ? `${labels.slice(0, -1).join(", ")} or ${labels.at(-1)}` : (labels[0] ?? "");
  };
  const has = (name: string, value: string): boolean => feats[name]?.includes(value) ?? false;

  let pos = POS[upos]!;
  const props: string[] = [];
  // Pronouns, determiners, adverbs and particles are told apart by their type: relative pronoun, interrogative adverb.
  if (feats.PronType) pos = upos === "PRON" ? `${v("PronType")} pronoun` : `${v("PronType")} ${upos === "DET" ? "determiner" : pos}`;
  else if (upos === "DET" && has("Definite", "Def")) pos = "definite article";
  if (feats.Polarity) pos = `${v("Polarity")} ${pos}`;
  // A noun's gender belongs to the word; an adjective's, participle's or pronoun's is part of its form.
  if (upos === "NOUN" && feats.Gender) props.push(v("Gender"));
  if (feats.Abbr) props.push(v("Abbr"));
  if (feats.NumForm) props.push(v("NumForm"));

  // The imperative has no aspect of its own: it is a mood of the verb stem, and its Aspect (when a source writes one)
  // would read "imperfect".
  const imperative = feats.Mood?.join() === "Imp";
  const tense = imperative ? "imperative" : [v("Aspect"), v("Mood")].filter(Boolean).join(" ");
  const finite = feats.VerbForm?.join() === "Fin";
  const nominal = feats.VerbForm ? !finite : false;
  let kind = "";
  if (nominal) {
    const participle = has("Voice", "Act") && !has("Voice", "Pass") ? "active participle"
      : has("Voice", "Pass") && !has("Voice", "Act") ? "passive participle" : "participle";
    kind = (feats.VerbForm ?? []).map((value) => (value === "Part" ? participle : VALUE.VerbForm![value]!)).join(" or ");
  }

  const form = finite || (!nominal && (feats.Aspect || feats.Mood || feats.Voice))
    ? [v("Person"), v("Gender"), v("Number"), tense, v("Voice")]
    : [kind, v("Person"), upos === "NOUN" ? "" : v("Gender"), v("Number"), v("Case"), v("Definite")];
  return { pos, form: form.filter(Boolean).join(" "), props: props.filter(Boolean) };
}
