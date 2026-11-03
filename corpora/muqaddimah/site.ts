// The Muqaddimah Reader: the opening of Ibn Khaldūn's Muqaddima (the author's preface, the Introduction, the preface to
// Book One and the six prefatory discussions of its first chapter) in Arabic, from the OpenITI text of Khalīl Shaḥāda's
// edition with CAMeL Tools' lemma, root and morphology, beside a new English translation, one row per Arabic paragraph.
// The Arabic reads right to left (LanguagePack.dir), with the English in the left column, as in the Genesis Reader.
//
// Rows and outline. A row is a paragraph of the edition, a verse passage or a heading (the work's title and the
// sub-headings inside it), numbered in order within its work: Muq. Pr. 3 is the third row of the author's preface. A
// paragraph of more than 250 words is cut at sentence ends into several rows; `paragraphMarks` makes the page open each
// row that begins a paragraph of the edition with ¶, and the rows cut from it carry on without. The edition's headings
// have no numbers of their own and a work has only a handful, so the outline lists every row: a heading by its text,
// a paragraph by its opening words (the CitationLevel's `list` with `opening`, which Genesis uses for chapters that
// have no heading text). The outline's numbers are then the citations.
//
// Citations. An abbreviation that carries its outer divisions is how the six discussions are cited: "Muq. 1.2" is
// Book One's chapter 1, discussion 2, and src/lib/cite.ts continues it with a dot: Muq. 1.2.14 is that discussion's
// fourteenth row. Muq. 1.0 is the Book One preface (which ends with the heading of chapter 1), Muq. Pr. the author's
// preface and Muq. In. the Introduction; those two take a space, as Vsp 45 does.
import type { ReaderSite } from "../../src/sites/types";
import { REVIEW_STATUS } from "./sources";

const arabic = (text: string) => `<span lang="ar" dir="rtl">${text}</span>`;
const BY_NC_SA = '<a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">CC BY-NC-SA 4.0</a>';
const BY_SA = '<a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>';

const reviewed = REVIEW_STATUS === "reviewed";
const tagging = reviewed ? "machine-tagged, then reviewed word by word" : "machine-tagged and not yet checked by hand";

const PREFACE_AND_INTRODUCTION = "Preface and Introduction";
const CHAPTER_ONE = "Book One, Chapter 1";

const ARABIC_EDITION = "Khalīl Shaḥāda’s edition, revised by Suhayl Zakkār (Beirut, 1988), in the OpenITI text from " +
  `al-Maktaba al-Shāmila (CC BY-NC-SA 4.0). Morphology: CAMeL Tools 1.6.0, ${tagging}.`;
const ENGLISH_EDITION = "A new translation made for this reader from the Arabic with AI assistance, reviewed by a second reader against the Arabic " +
  "and checked against William MacGuckin de Slane’s French (Les Prolégomènes d’Ibn Khaldoun, 1863–68). It is not a published translation.";

export const site: ReaderSite = {
  id: "muqaddimah",
  name: "The Muqaddimah Reader",
  shortName: "Muqaddimah Reader",
  homeTitle: "The Muqaddimah Reader: Ibn Khaldūn’s Muqaddimah in Arabic and English",
  description: "Read the opening of Ibn Khaldūn’s Muqaddimah in Arabic with a new English translation, word-by-word " +
    "grammar (vocalized form, lemma, root, morphology), Lane’s Lexicon, Wiktionary and full-text search.",
  eyebrow: "Ibn Khaldūn · al-Muqaddima",
  lede: "The opening of Ibn Khaldūn’s <i>Muqaddimah</i> (1377): the author’s preface, the Introduction on the science of " +
    "history, the preface to Book One and its six prefatory discussions, paragraph by paragraph, with a new English " +
    "translation beside the Arabic. Click any Arabic word for its vocalized form, lemma, root and grammar and the " +
    `entries of Lane’s Lexicon and Wiktionary. The grammar is from CAMeL Tools, ${tagging}.`,
  credits: "Arabic text: Khalīl Shaḥāda’s edition, revised by Suhayl Zakkār (Dār al-Fikr, Beirut, 1988), as typed for " +
    '<a href="https://shamela.ws/book/12320">al-Maktaba al-Shāmila</a> and published by the ' +
    '<a href="https://openiti.org/">OpenITI</a> project (release 2025.1.9, ' +
    `<a href="https://doi.org/10.5281/zenodo.17767721">doi:10.5281/zenodo.17767721</a>), ${BY_NC_SA}: the reader’s Arabic ` +
    "data is for non-commercial use only. Lemmas, roots and morphology: " +
    '<a href="https://github.com/CAMeL-Lab/camel_tools">CAMeL Tools</a> 1.6.0 (MIT), its BERT disambiguator over the ' +
    `calima-msa-r13 database (GPL-2), ${tagging}. Dictionaries: Lane’s <i>Arabic–English Lexicon</i>, ` +
    "“Text provided by Perseus Digital Library, with funding from The U.S. Department of Education and The Max Planck " +
    'Society”, as amended by <a href="https://github.com/laneslexicon/lexicon_xml">laneslexicon</a>; Wiktionary (via ' +
    `kaikki.org), ${BY_SA} and the GNU Free Documentation License. English: a new translation made for this reader ` +
    "from the Arabic with AI assistance, reviewed by a second reader against the Arabic, and checked against de Slane’s French (1863–68), " +
    "consulted in the Classiques des sciences sociales transcription (Université du Québec à Chicoutimi) and not reproduced; not a published translation.",
  corpus: "the Muqaddimah",
  searchHint: `Vowel marks and tatweel in a query are ignored (the text itself has none): ${arabic("العَصَبِيَّة")} finds ` +
    `${arabic("العصبية")}. Hamza seats fold together (${arabic("أ إ آ")} = ${arabic("ا")}), and ${arabic("ى")} = ${arabic("ي")}, ` +
    `${arabic("ة")} = ${arabic("ه")}: ${arabic("عصبيه")} finds ${arabic("العصبية")} too. A query matches inside a written ` +
    `word, so ${arabic("علم")} also finds ${arabic("والعلم")}.`,
  searchPlaceholder: "e.g. العمران, عصبية, dynasty",
  countNote: "Counts use CAMeL Tools’ lemmas, as reviewed by hand, in vocalized form. A written word with clitics (" + arabic("وبالعلم") + " = " +
    arabic("وَ") + " + " + arabic("بِ") + " + " + arabic("العِلْم") + ") counts once for each of its words, so the conjunction " +
    arabic("وَ") + ", the prepositions " + arabic("بِ") + " and " + arabic("لِ") + " and the pronoun suffix " + arabic("هُوَ") +
    " are among the most frequent. Glosses come from Lane’s Lexicon or Wiktionary.",
  sides: [
    { id: "ar", role: "source", label: "Arabic" },
    { id: "en", role: "translation", label: "English", lang: "en" },
  ],
  collections: [{
    id: "muqaddimah",
    title: "The Muqaddimah",
    subtitle: "al-Muqaddima · Ibn Khaldūn",
    intro: "Ibn Khaldūn’s <i>Muqaddima</i>, the introduction to his universal history <i>Kitāb al-ʿIbar</i> (1377). " +
      "It opens with the author’s preface and an introduction on the merit and method of history, then lays the " +
      "foundations of a new science of human civilization (<i>ʿilm al-ʿumrān</i>) in the first book. This reader " +
      "covers the preface, the Introduction, the preface to Book One and the six prefatory discussions that open " +
      "its first chapter.",
  }],
  groups: [PREFACE_AND_INTRODUCTION, CHAPTER_ONE],
  works: [
    {
      slug: "preface",
      abbr: "Muq. Pr.",
      title: "مقدمة المؤلف",
      english: "The Author’s Preface",
      summary: "Ibn Khaldūn’s preface to his history in rhymed prose: praise of God, what the book takes in (the " +
        "beginnings of generations and dynasties, desert and town, crafts and sciences), a plea for the reader’s " +
        "indulgence, and the gift of this copy to the library of the Marinid sultan at the Qarawiyyīn in Fez.",
      collection: "muqaddimah",
      group: PREFACE_AND_INTRODUCTION,
    },
    {
      slug: "introduction",
      abbr: "Muq. In.",
      title: "المقدمة في فضل علم التاريخ",
      english: "Introduction: On the Merit of the Science of History",
      summary: "What makes history a noble art, the knowledge it demands of a historian, and the errors that " +
        "historians, exegetes and transmitters commonly fall into, with some of their causes.",
      collection: "muqaddimah",
      group: PREFACE_AND_INTRODUCTION,
    },
    {
      slug: "book-one",
      abbr: "Muq. 1.0",
      title: "الكتاب الأول في طبيعة العمران",
      english: "Book One: On Human Civilization",
      summary: "Why reports go wrong (partisanship, misplaced trust, tales that the nature of things rules out) and why " +
        "history needs a science of human civilization; the plan of the book’s six chapters, ending at the heading of the first.",
      collection: "muqaddimah",
      group: CHAPTER_ONE,
    },
    {
      slug: "discussion-1",
      abbr: "Muq. 1.1",
      title: "المقدمة الأولى",
      english: "First Discussion: Human Society Is Necessary",
      summary: "One man cannot win his own food or defend himself, so people must live together and cooperate: " +
        "the philosophers’ saying that man is political by nature.",
      collection: "muqaddimah",
      group: CHAPTER_ONE,
    },
    {
      slug: "discussion-2",
      abbr: "Muq. 1.2",
      title: "المقدمة الثانية",
      english: "Second Discussion: The Inhabited Part of the Earth",
      summary: "The share of the earth that is settled, with its mountains, rivers, seas and climes; the supplement " +
        "on why the northern quarter is more populated than the southern; and the long detailed description of the geography.",
      collection: "muqaddimah",
      group: CHAPTER_ONE,
    },
    {
      slug: "discussion-3",
      abbr: "Muq. 1.3",
      title: "المقدمة الثالثة",
      english: "Third Discussion: The Temperate Zones and the Effect of the Air on Skin Colour",
      summary: "Which climes are temperate and which are not, and how the air shapes people’s complexions and conditions.",
      collection: "muqaddimah",
      group: CHAPTER_ONE,
    },
    {
      slug: "discussion-4",
      abbr: "Muq. 1.4",
      title: "المقدمة الرابعة",
      english: "Fourth Discussion: The Effect of the Air on Human Character",
      summary: "How climate bears on the character of the peoples who live in it.",
      collection: "muqaddimah",
      group: CHAPTER_ONE,
    },
    {
      slug: "discussion-5",
      abbr: "Muq. 1.5",
      title: "المقدمة الخامسة",
      english: "Fifth Discussion: Plenty and Hunger, and Their Effects on Bodies and Character",
      summary: "How the conditions of civilization differ between plenty and dearth, and what each does to " +
        "people’s bodies and characters.",
      collection: "muqaddimah",
      group: CHAPTER_ONE,
    },
    {
      slug: "discussion-6",
      abbr: "Muq. 1.6",
      title: "المقدمة السادسة",
      english: "Sixth Discussion: The Kinds of Human Perceivers, with Revelation and Dreams",
      summary: "The kinds of people who perceive what is hidden, by nature or by training: revelation and the " +
        "nature of prophecy, soothsaying, dreams and the other ways of knowing the unseen.",
      collection: "muqaddimah",
      group: CHAPTER_ONE,
    },
  ].map((work) => ({
    ...work,
    // Row numbers within the work, listed in the outline: a heading by its text, a paragraph by its opening words.
    levels: [{ name: "Paragraph", list: true, opening: true }],
    sources: { ar: ARABIC_EDITION, en: ENGLISH_EDITION },
  })),
  sourceNotes: {},
  paragraphMarks: true,
  notes: {
    credit: "Written for this reader’s new English translation, which is not a published one.",
    introLabel: "About this work",
  },
};
