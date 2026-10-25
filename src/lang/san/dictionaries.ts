import type { Dictionary } from "../types";

export const DICTIONARIES: readonly Dictionary[] = [{
  id: "dcs",
  title: "DCS dictionary",
  fullTitle: "Digital Corpus of Sanskrit dictionary (Hellwig)",
  style: "article",
  grammarAbbreviations: {
    m: "masculine", f: "feminine", n: "neuter", adj: "adjective", pron: "pronoun", ind: "indeclinable",
    "P.": "parasmaipada (active endings)", "Ā.": "ātmanepada (middle endings)",
    "Denom.": "denominative verb", "Caus.": "causative verb", "Desid.": "desiderative verb",
  },
}];
