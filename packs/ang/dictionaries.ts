import type { Dictionary } from "../../src/lang/types";

export const DICTIONARIES: readonly Dictionary[] = [{
  id: "bt",
  title: "Bosworth–Toller",
  fullTitle: "Bosworth–Toller, An Anglo-Saxon Dictionary Online (Tichý et al., Charles University)",
  style: "article",
  // Printed in grammar notes only, where "m." means masculine and "pl." plural.
  grammarAbbreviations: {
    "m.": "masculine", "f.": "feminine", "n.": "neuter", "sg.": "singular", "pl.": "plural", "gen.": "genitive",
    "dat.": "dative", "acc.": "accusative", "nom.": "nominative", "inst.": "instrumental", "adj.": "adjective",
    "adv.": "adverb", "prep.": "preposition", "conj.": "conjunction", "pron.": "pronoun", "interj.": "interjection",
    "num.": "numeral", "pret.": "preterite", "pp.": "past participle", "pres.": "present", "ind.": "indicative",
    "subj.": "subjunctive", "imp.": "imperative", "inf.": "infinitive", "part.": "participle", "comp.": "comparative",
    "superl.": "superlative", "p.": "preterite", "indecl.": "indeclinable",
  },
}, {
  id: "wikt",
  title: "Wiktionary",
  fullTitle: "Wiktionary, Old English entries (via kaikki.org)",
  style: "article",
  fallbackFor: "bt",
}, {
  id: "names",
  title: "Name",
  fullTitle: "Names in the texts",
  style: "names",
}];
