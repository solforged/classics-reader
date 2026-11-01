// The Homer Reader: book 1 of the Iliad and of the Odyssey in Greek (the text Perseus gives, with the Ancient Greek
// Dependency Treebank's annotation of the same words) and A. T. Murray's English prose, one Loeb page (a "card") of
// the Greek per row.
import type { ReaderSite } from "../../src/sites/types";

const GROUPS = ["Iliad", "Odyssey"] as const;

export const site: ReaderSite = {
  id: "homer",
  name: "The Homer Reader",
  shortName: "Homer Reader",
  homeTitle: "The Homer Reader: Iliad 1 and Odyssey 1 in Greek and English",
  description: "Read Homer’s Iliad and Odyssey, book 1, in Greek with A. T. Murray’s English prose translation, " +
    "word-by-word grammar from the Ancient Greek Dependency Treebank, Autenrieth’s Homeric Dictionary, Liddell and Scott, and full-text search.",
  eyebrow: "Ὅμηρος · Ἰλιάς · Ὀδύσσεια",
  lede: "The first books of Homer’s Iliad and Odyssey in Greek, with a facing English prose translation, page by page. " +
    "Click any Greek word for its lemma, grammar and dictionary entries: Autenrieth’s Homeric Dictionary, " +
    "the Middle Liddell and the LSJ.",
  credits: "Greek annotation: the Ancient Greek Dependency Treebank 2.1, Perseus Digital Library, Tufts University, " +
    '<a href="https://creativecommons.org/licenses/by-sa/3.0/us/">CC BY-SA 3.0 US</a>. Greek text: Monro and Allen’s Oxford ' +
    "text of the Iliad (1920) and A. T. Murray’s Loeb text of the Odyssey (1919), public domain, via the Perseus Digital " +
    "Library (encoding " + '<a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>). ' +
    "English: A. T. Murray’s Loeb translation (1924, 1919), public domain, via Perseus. Dictionaries: Autenrieth’s " +
    "<i>Homeric Dictionary</i> (1891), as Perseus publishes it; the Middle Liddell (1889) and Liddell, Scott " +
    'and Jones’s <i>Greek-English Lexicon</i> (1940), Perseus’s editions, <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>.',
  corpus: "Homer",
  searchHint: "Accents, breathings and capitals are optional: <i>μηνιν</i> finds <i>μῆνιν</i>, " +
    "<i>αχιλλευς</i> finds <i>Ἀχιλλεύς</i>.",
  searchPlaceholder: "e.g. μῆνιν, Ἀχιλλεύς, wrath",
  countNote: "Counts use the Ancient Greek Dependency Treebank’s annotation. A written word that the treebank divides " +
    "(<i>οὐδέ</i> as <i>οὐ</i> + <i>δέ</i>) counts once for each of its words. Glosses come from Autenrieth’s Homeric Dictionary, " +
    "then the Middle Liddell and the LSJ.",
  sides: [{ id: "grc", role: "source", label: "Greek" }, { id: "en", role: "translation", label: "English", lang: "en" }],
  collections: [{ id: "homer", title: "Homer" }],
  groups: GROUPS,
  works: [
    {
      slug: "iliad-1",
      abbr: "Il. 1",
      title: "Iliad, book 1",
      english: "The wrath of Achilles",
      summary: "A plague falls on the Greek camp because Agamemnon has dishonoured Apollo’s priest. The quarrel of " +
        "Agamemnon and Achilles follows, Thetis begs Zeus to honour her son, and the gods quarrel on Olympus.",
      collection: "homer",
      group: "Iliad",
      levels: [{ name: "Book" }, { name: "Line" }],
      sources: {
        grc: "Monro and Allen (1920); annotation: Ancient Greek Dependency Treebank (CC BY-SA 3.0 US)",
        en: "A. T. Murray, Loeb Classical Library (1924)",
      },
    },
    {
      slug: "odyssey-1",
      abbr: "Od. 1",
      title: "Odyssey, book 1",
      english: "The council of the gods, and Telemachus",
      summary: "The Muse is asked to sing of Odysseus, kept by Calypso. The gods meet on Olympus, and Athena, " +
        "in the likeness of Mentes, goes to Ithaca to rouse Telemachus against his mother’s suitors.",
      collection: "homer",
      group: "Odyssey",
      levels: [{ name: "Book" }, { name: "Line" }],
      sources: {
        grc: "A. T. Murray’s Loeb text (1919); annotation: Ancient Greek Dependency Treebank (CC BY-SA 3.0 US)",
        en: "A. T. Murray, Loeb Classical Library (1919)",
      },
    },
  ],
  sourceNotes: {},
};
