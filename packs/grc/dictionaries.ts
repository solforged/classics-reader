import type { Dictionary } from "../../src/lang/types";

/** Homeric first, then the Middle Liddell, then the LSJ closed: the LSJ's entries are long. */
export const DICTIONARIES: readonly Dictionary[] = [
  {
    id: "autenrieth",
    title: "Autenrieth",
    fullTitle: "Autenrieth’s Homeric Dictionary (1891, Perseus Digital Library)",
    style: "article",
  },
  {
    id: "middle-liddell",
    title: "Middle Liddell",
    fullTitle: "Liddell and Scott, An Intermediate Greek-English Lexicon (1889, Perseus Digital Library)",
    style: "article",
  },
  {
    id: "lsj",
    title: "LSJ",
    fullTitle: "Liddell, Scott and Jones, A Greek-English Lexicon, 9th edition (Perseus Digital Library)",
    style: "article",
    collapsed: true,
  },
];
