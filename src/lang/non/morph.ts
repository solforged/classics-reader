// English labels for Old Norse analyses. The build converts the edition's Menota tags to UD morphology
// (scripts/lib/menota.ts); these labels follow the edition's own terms (weak/strong adjectives, suffixed article).
import { parseMorph } from "../../lib/morph";
import type { MorphLabel } from "../types";

const VALUE: Record<string, Record<string, string>> = {
  Gender: { Masc: "masculine", Fem: "feminine", Neut: "neuter" },
  Number: { Sing: "singular", Dual: "dual", Plur: "plural" },
  Case: { Nom: "nominative", Acc: "accusative", Dat: "dative", Gen: "genitive" },
  Degree: { Pos: "", Cmp: "comparative", Sup: "superlative" },
  Tense: { Pres: "present", Past: "past" },
  Mood: { Ind: "indicative", Sub: "subjunctive", Imp: "imperative" },
  Person: { "1": "1st person", "2": "2nd person", "3": "3rd person" },
  Voice: { Act: "active", Mid: "middle" },
  InflClass: { Strong: "strong", Weak: "weak", Redup: "reduplicating", PretPres: "preterite-present" },
  Govern: { Acc: "takes accusative", Dat: "takes dative", Gen: "takes genitive" },
};

/** Word class label; UPOS plus the lexical features that keep the edition's finer classes apart. */
function wordClass(upos: string, has: (name: string, value: string) => boolean): string {
  switch (upos) {
    case "NOUN": return "noun";
    case "PROPN": return "proper noun";
    case "ADJ": return has("NumType", "Ord") ? "ordinal numeral" : "adjective";
    case "ADV": return has("PronType", "Int") ? "interrogative adverb" : "adverb";
    case "ADP": return "preposition";
    case "CCONJ": return has("ConjType", "Unsp") ? "conjunction" : "coordinating conjunction";
    case "SCONJ": return "subordinating conjunction";
    case "INTJ": return "interjection";
    case "NUM": return "numeral";
    case "VERB": return "verb";
    case "PART":
      if (has("PartType", "Inf")) return "infinitive marker";
      return has("PronType", "Rel") ? "relative particle" : "particle";
    case "PRON":
      if (has("Poss", "Yes")) return "possessive pronoun";
      if (has("Reflex", "Yes")) return "reflexive pronoun";
      if (has("PronType", "Prs")) return "personal pronoun";
      if (has("PronType", "Ind")) return "indefinite pronoun";
      if (has("PronType", "Int")) return "interrogative pronoun";
      if (has("PronType", "Dem")) return "demonstrative pronoun";
      if (has("PronType", "Art")) return "article";
      return "pronoun";
    case "DET":
      if (has("Poss", "Yes")) return "possessive";
      if (has("PronType", "Dem")) return "demonstrative";
      return has("PronType", "Art") ? "article" : "quantifier";
    case "X": return has("Foreign", "Yes") ? "foreign word" : "unclassified word";
    default: return "";
  }
}

export function describeMorph(morph: string, options: { tableLabel?: string } = {}): MorphLabel {
  const { upos, feats } = parseMorph(morph);
  const has = (name: string, value: string) => feats[name]?.includes(value) ?? false;
  /** Label of a feature; an ambiguous one lists its values ("accusative, dative or genitive"). */
  const v = (name: string) => {
    const order = Object.keys(VALUE[name] ?? {});
    const values = [...(feats[name] ?? [])].sort((a, b) => order.indexOf(a) - order.indexOf(b));
    const labels = values.map((value) => VALUE[name]?.[value] ?? "").filter(Boolean);
    if (name === "Person" && labels.length > 1) {
      return `${labels.map((label) => label.replace(" person", "")).join(" or ")} person`;
    }
    return labels.length > 1 ? `${labels.slice(0, -1).join(", ")} or ${labels.at(-1)}` : (labels[0] ?? "");
  };
  const noun = upos === "NOUN" || upos === "PROPN";
  const props: string[] = [];
  const form: string[] = [];
  if (upos === "VERB") {
    const participle = has("VerbForm", "Part");
    const middle = has("Voice", "Mid") ? "middle" : "";
    if (has("VerbForm", "Inf")) form.push(v("Tense"), middle, "infinitive");
    else if (participle) {
      form.push(v("Tense") || "present", middle, "participle", v("Gender"), v("Case"), v("Number"));
    } else form.push(v("Person"), v("Number"), v("Tense"), v("Mood"), middle);
    if (feats.InflClass && !options.tableLabel) props.push(`${v("InflClass")} verb`);
  } else {
    const definite = feats.Definite?.length === 1 ? feats.Definite[0] : undefined;
    if (upos === "ADJ" && !has("Degree", "Cmp") && definite) {
      form.push(definite === "Def" ? "weak" : "strong");
    }
    if (noun) props.push(v("Gender"));
    else form.push(v("Degree"), v("Gender"));
    if (upos === "PRON" && feats.Person) form.unshift(v("Person"));
    form.push(v("Case"), v("Number"));
    if (noun && definite === "Def") form.push("with suffixed article");
    props.push(v("Govern"));
  }
  if (has("Clitic", "Yes")) props.push("enclitic");
  if (has("Poss", "Yes") && feats.Possessor?.length === 1) props.push(`possessive of ${feats.Possessor[0]}`);
  return {
    pos: wordClass(upos, has),
    form: form.filter(Boolean).join(" "),
    props: props.filter(Boolean),
  };
}
