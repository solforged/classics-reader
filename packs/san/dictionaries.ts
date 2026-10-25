import type { Dictionary } from "../../src/lang/types";

export const DICTIONARIES: readonly Dictionary[] = [{
  id: "dcs",
  title: "DCS dictionary",
  fullTitle: "Digital Corpus of Sanskrit dictionary (Hellwig)",
  style: "article",
  grammarAbbreviations: {
    m: "masculine", f: "feminine", n: "neuter", adj: "adjective", pron: "pronoun", ind: "indeclinable",
    mf: "masculine or feminine", mn: "masculine or neuter", fn: "feminine or neuter",
    mfn: "masculine, feminine or neuter", nr: "numeral",
    "P.": "parasmaipada (active endings)", "Ā.": "ātmanepada (middle endings)",
    "Denom.": "denominative verb", "Caus.": "causative verb", "Desid.": "desiderative verb", "Int.": "intensive verb",
  },
}];
