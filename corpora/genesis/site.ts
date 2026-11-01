// The Genesis Reader: Genesis 1–11 in Hebrew (the Westminster Leningrad Codex with the Open Scriptures Hebrew Bible's
// annotation) and the Jewish Publication Society's 1917 English, one verse per row.
import type { ReaderSite } from "../../src/sites/types";

const GROUPS = ["Genesis"] as const;
const hebrew = (text: string) => `<span lang="hbo" dir="rtl">${text}</span>`;

export const site: ReaderSite = {
  id: "genesis",
  name: "The Genesis Reader",
  shortName: "Genesis Reader",
  homeTitle: "The Genesis Reader: Genesis 1–11 in Hebrew and English",
  description: "Read Genesis 1–11 in Hebrew with the Jewish Publication Society’s 1917 English, word-by-word grammar " +
    "from the Open Scriptures Hebrew Bible, Brown–Driver–Briggs and full-text search.",
  eyebrow: "Bereshit · Genesis 1–11",
  lede: "The first eleven chapters of Genesis in Hebrew with a facing English translation, verse by verse. Click any " +
    "Hebrew word for its parts (prefixes, stem and suffixes), each with its lemma, grammar and Brown–Driver–Briggs entry.",
  credits: "Hebrew text: the Westminster Leningrad Codex, public domain. Lemmas and morphology: the Open Scriptures " +
    "Hebrew Bible (OSHB) Parsing Project, " +
    '<a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>: original work of the Open Scriptures Hebrew ' +
    'Bible available at <a href="https://github.com/openscriptures/morphhb">github.com/openscriptures/morphhb</a>. ' +
    "Dictionary: Brown–Driver–Briggs (1906) and Strong’s (1894), public domain, as encoded and indexed by the Open " +
    'Scriptures Hebrew Lexicon, <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. English: the ' +
    "Jewish Publication Society’s TaNaKH (1917), public domain, from eBible.org.",
  corpus: "Genesis 1–11",
  searchHint: `Vowel points and accents are optional, and final letters fold: ${hebrew("בראשית")} finds ` +
    `${hebrew("בְּרֵאשִׁית")}, ${hebrew("ארץ")} finds ${hebrew("אֶרֶץ")}. Words joined by a maqqef are separate words.`,
  searchPlaceholder: "e.g. בראשית, serpent, ארץ",
  countNote: "Counts use the OSHB annotation. A written word with a prefix or a suffix (" + hebrew("וַיֹּאמֶר") +
    ") counts once for each of its parts, so the conjunction " + hebrew("וְ") + " and the article " + hebrew("הַ") +
    " are among the most frequent. Glosses come from Brown–Driver–Briggs, or from the Open Scriptures lexical index " +
    "for an entry BDB gives no definition (most names).",
  sides: [
    { id: "hbo", role: "source", label: "Hebrew" },
    { id: "en", role: "translation", label: "English", lang: "en" },
  ],
  collections: [{ id: "torah", title: "Torah" }],
  groups: GROUPS,
  works: [{
    slug: "genesis",
    abbr: "Gen",
    title: "Genesis 1–11",
    english: "From creation to Babel",
    summary: "Creation, the garden and the first brothers, the generations from Adam to Noah, the flood, the " +
      "nations of the earth, the tower of Babel, and the line from Shem to Terah.",
    collection: "torah",
    group: "Genesis",
    levels: [{ name: "Chapter", list: true, opening: true }, { name: "Verse" }],
    sources: {
      hbo: "Westminster Leningrad Codex; annotation Open Scriptures Hebrew Bible (CC BY 4.0)",
      en: "Jewish Publication Society (1917)",
    },
  }],
  sourceNotes: {},
};
