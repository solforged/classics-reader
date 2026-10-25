// The Gītā Reader: Bhagavadgītā chapter 12 in Sanskrit (DCS) with Annie Besant's English.
import type { ReaderSite } from "./types";

export const gita: ReaderSite = {
  id: "gita",
  name: "The Gītā Reader",
  shortName: "Gītā Reader",
  homeTitle: "The Gītā Reader: Bhagavadgītā chapter 12 in Sanskrit and English",
  description: "Read Bhagavadgītā chapter 12 in IAST Sanskrit with Annie Besant’s English translation, " +
    "word-by-word grammar, a DCS dictionary and full-text search.",
  eyebrow: "Bhagavadgītā · Chapter 12",
  lede: "The yoga of devotion, twenty verses from the Bhagavadgītā, in Sanskrit with a facing English translation. " +
    "Click any Sanskrit word for its lemma, grammar and dictionary entry, including the words joined by sandhi or in compounds.",
  credits: "Sanskrit text, annotation and dictionary: Oliver Hellwig, Digital Corpus of Sanskrit (2010–2024), " +
    '<a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. ' +
    "DCS morphology has been adapted for this reader; its surface forms are retained. " +
    "English: Annie Besant, The Bhagavad-Gita, fourth edition (1922), public domain, via Wikisource. " +
    "The English transcription is retained; translator’s footnotes are omitted.",
  corpus: "Bhagavadgītā chapter 12",
  searchHint: "IAST diacritics are optional: <i>sraddha</i> finds <i>śraddhā</i>, <i>samnyasya</i> finds <i>saṃnyasya</i>.",
  searchPlaceholder: "e.g. bhakti, śraddhā, devotion",
  countNote: "Counts use DCS annotation. Each written token counts once for each lemma it contains, including " +
    "words joined by sandhi or in compounds. Glosses come from the DCS dictionary (Oliver Hellwig, CC BY 4.0).",
  translation: "English",
  groups: ["Bhagavadgītā"],
  works: [{
    slug: "bhagavad-gita-12",
    abbr: "BhG 12",
    title: "Bhagavadgītā, chapter 12",
    english: "The yoga of devotion",
    summary: "Arjuna asks about devotion to the personal and the unmanifested. Krishna describes the path of devotion and the devotee dear to him.",
    collection: "Mahābhārata, Bhīṣmaparvan",
    group: "Bhagavadgītā",
    prose: false,
    unit: "Verse",
    sources: {
      on: "Digital Corpus of Sanskrit (Hellwig), CC BY 4.0",
      en: "Annie Besant (4th ed., 1922)",
    },
  }],
  sourceNotes: {},
};
