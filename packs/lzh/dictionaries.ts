import type { Dictionary } from "../../src/lang/types";

// In the word panel's order: the treebank's own glosses (the senses this corpus uses, with counts), then Wiktionary's
// senses and reconstructions, then Unihan's one-line definition.
export const DICTIONARIES: readonly Dictionary[] = [
  {
    id: "kyoto",
    title: "In the Analects",
    fullTitle: "Glosses in the Kyoto University Treebank, with the number of occurrences in the Analects",
    style: "glosses",
  },
  {
    id: "wiktionary",
    title: "Wiktionary",
    fullTitle: "Wiktionary (Chinese entries, via kaikki.org; literary and archaic senses first)",
    style: "article",
    grammarAbbreviations: {
      MC: "Middle Chinese, in Baxter’s transcription",
      OC: "Old Chinese",
      BS: "Baxter–Sagart reconstruction (2014)",
      ZZ: "Zhengzhang Shangfang’s reconstruction",
    },
  },
  {
    id: "unihan",
    title: "Unihan",
    fullTitle: "Unicode Unihan database: kDefinition and Cantonese reading",
    style: "plain",
    collapsed: true,
  },
];
