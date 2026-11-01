// The Old English Reader: two prose texts in the West Saxon of about 1000, with ISWOC's gold annotation and
// Bosworth–Toller's dictionary: the story of Apollonius of Tyre (rows are the treebank's 22 chapters, with Benjamin
// Thorpe's translation cut to fit) and the West-Saxon Gospel of Mark (a row for each verse, with the King James English).
import type { ReaderSite } from "../../src/sites/types";

const GROUPS = ["Romance", "Gospel"] as const;

export const site: ReaderSite = {
  id: "oldenglish",
  name: "The Old English Reader",
  shortName: "Old English Reader",
  homeTitle: "The Old English Reader: Apollonius of Tyre and the Gospel of Mark in Old English",
  description: "Read Apollonius of Tyre and the West-Saxon Gospel of Mark in Old English with English translations, " +
    "word-by-word grammar from the ISWOC treebank, Bosworth–Toller dictionary entries and full-text search.",
  eyebrow: "Ænglisc · Old English prose",
  lede: "A prose romance and a Gospel in the English of about the year 1000, each with a facing English translation. " +
    "Click any Old English word for its lemma, grammar and Bosworth–Toller entry; <i>n</i> + <i>æs</i> written together as " +
    "<i>næs</i> opens both words.",
  credits: "Old English text and annotation: ISWOC, the Oslo treebank of Old English (Bech and Eide, 2014), " +
    '<a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">CC BY-NC-SA 4.0</a>: this reader’s Old English data ' +
    "may be reused only non-commercially and under the same licence. <i>Apollonius of Tyre</i> is Peter Goolden’s " +
    "edition (1958); the Gospel is Walter W. Skeat’s (1871–77), public domain. English: Benjamin Thorpe, <i>The " +
    "Anglo-Saxon Version of the Story of Apollonius of Tyre</i> (1834), public domain, as transcribed on Wikisource; " +
    "the King James Version of Mark (1611), public domain, via Project Gutenberg. Dictionaries: Bosworth–Toller, " +
    "<i>An Anglo-Saxon Dictionary Online</i> (Tichý et al., Charles University), " +
    '<a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>; Wiktionary’s Old English entries, ' +
    '<a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>.',
  corpus: "the Old English texts",
  searchHint: "Length marks and case are optional, <i>þ</i> and <i>ð</i> are one letter and may be typed <i>th</i>, " +
    "<i>æ</i> may be typed <i>ae</i>: <i>thaet</i> finds <i>þæt</i> and <i>ðæt</i>, and <i>and</i> finds the " +
    "ampersand the manuscripts write for it.",
  searchPlaceholder: "e.g. thaet, gelamp, “Apollonius”, shipwreck",
  countNote: "Counts use ISWOC’s lemmas and annotation, with the spellings and length marks of Bosworth–Toller’s " +
    "headwords. A written form that joins two words (<i>næs</i> = <i>ne</i> + <i>wæs</i>) counts once for each. " +
    "<i>hē</i>, <i>hit</i>, <i>hēo</i> and their cases count together under <i>hē</i>. Glosses come from " +
    "Bosworth–Toller (CC BY 4.0) and, for words it lacks, Wiktionary (CC BY-SA 4.0).",
  sides: [{ id: "ang", role: "source", label: "Old English" }, { id: "en", role: "translation", label: "English", lang: "en" }],
  collections: [{ id: "old-english-prose", title: "Old English prose" }],
  groups: GROUPS,
  works: [{
    slug: "apollonius-of-tyre",
    abbr: "ApT",
    title: "Apollonius of Tyre",
    english: "Antiochus, the riddle and the shipwrecked prince",
    summary: "Antiochus of Antioch sets a deadly riddle to keep his daughter for himself. Apollonius, prince of Tyre, " +
      "solves it and flees, feeds starving Tharsus, is shipwrecked at Pentapolis and wins the king’s daughter as his " +
      "pupil and bride. The Old English breaks off in the middle of the story.",
    collection: "old-english-prose",
    group: "Romance",
    levels: [{ name: "Chapter", list: true, opening: true }],
    sources: {
      ang: "ISWOC (CC BY-NC-SA 4.0); text after Goolden (1958), Cambridge, Corpus Christi College 201",
      en: "Benjamin Thorpe (1834), cut at the Old English chapters",
    },
  }, {
    slug: "mark",
    abbr: "Mk",
    title: "The Gospel of Mark",
    english: "The West-Saxon Gospel according to Mark",
    summary: "The shortest Gospel in the West Saxon translation of about 1000: Jesus’s baptism, ministry and teaching in " +
      "Galilee, the road to Jerusalem, the crucifixion and the empty tomb.",
    collection: "old-english-prose",
    group: "Gospel",
    levels: [{ name: "Chapter", list: true, opening: true }, { name: "Verse" }],
    sources: {
      ang: "ISWOC (CC BY-NC-SA 4.0); text after Skeat (1871–77), Cambridge, Corpus Christi College 140",
      en: "King James Version (1611), verse by verse",
    },
  }],
  sourceNotes: {},
  notes: { credit: "Benjamin Thorpe, The Anglo-Saxon Version of the Story of Apollonius of Tyre (1834).", introLabel: "About this text and its English" },
};
