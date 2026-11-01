import type { Dictionary } from "../../src/lang/types";

/** BDB's abbreviations as they occur in senses (not the single letters, which mean other things there). */
const ABBREVIATIONS: Readonly<Record<string, string>> = {
  Qal: "Qal stem", Niph: "Niphal stem", Pi: "Piel stem", Pu: "Pual stem", Hiph: "Hiphil stem", Hoph: "Hophal stem",
  Hithp: "Hithpael stem", Pf: "perfect", Impf: "imperfect", Imv: "imperative", Pt: "participle", Inf: "infinitive",
  inf: "infinitive", cstr: "construct", abs: "absolute", pl: "plural", sg: "singular", acc: "accusative", gen: "genitive",
  subj: "subject", obj: "object", pred: "predicate", pers: "person", pron: "pronoun", subst: "substantive",
  adj: "adjective", adv: "adverb", vb: "verb", coll: "collective", reflex: "reflexive", trans: "transitive",
  intrans: "intransitive", interrog: "interrogative", poet: "poetry", fig: "figurative", lit: "literal", esp: "especially",
  specif: "specifically", prop: "properly", oft: "often", usu: "usually", sts: "sometimes", prob: "probably",
  perh: "perhaps", appar: "apparently", dub: "doubtful", opp: "as opposed to", cf: "compare", sq: "followed by",
  phr: "phrase", "i.e": "that is",
};

/** Abbreviations of the grammar line, where a lone m. or f. is the gender. */
const GRAMMAR_ABBREVIATIONS: Readonly<Record<string, string>> = {
  "n.m": "masculine noun", "n.f": "feminine noun", "n. m": "masculine noun", "n. f": "feminine noun",
  "n.pr.m": "masculine proper name", "n.pr.f": "feminine proper name", "n.pr.loc": "place name",
  "n.pr.terr": "territory name", "n.pr.gent": "name of a people", prep: "preposition", conj: "conjunction",
  m: "masculine", f: "feminine", seld: "seldom", du: "dual",
};

export const DICTIONARIES: readonly Dictionary[] = [
  {
    id: "lexicon",
    title: "OSHB lexicon",
    fullTitle: "Open Scriptures Hebrew Lexicon: transliteration, Strong’s number and gloss",
    style: "glosses",
  },
  {
    id: "bdb",
    title: "BDB",
    fullTitle: "Brown–Driver–Briggs, A Hebrew and English Lexicon of the Old Testament (1906), Open Scriptures edition",
    style: "article",
    abbreviations: ABBREVIATIONS,
    grammarAbbreviations: GRAMMAR_ABBREVIATIONS,
  },
];
