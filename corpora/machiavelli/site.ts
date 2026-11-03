// The Machiavelli Reader: Il Principe in the Italian of the 1814 Italia edition beside Luigi Ricci's English;
// Dell'arte della guerra in Mario Martelli's text beside Ellis Farneworth's; and the Discorsi sopra la prima deca di
// Tito Livio in Martelli's text beside Ninian Hill Thomson's; all with the annotation's lemmas and morphology. The
// chapters of the Prince, the books of the Arte and the chapters of each book of the Discorsi are the listed
// divisions; their headings are the rubrics. The Discorsi is a collection of its own: the dedication, then one work
// per book.
//
// Citations. The Prince's abbreviation is Prin. A row id is "<chapter>.<paragraph>", and the go-to box treats a bare
// chapter number as that chapter's first row, so Prin. 18 opens chapter 18 and Prin. 18.2 is its second body
// paragraph (the rubric is the heading, not a paragraph). The dedication has no rubric and is chapter 0:
// Prin. 0 and Prin. 0.1 are the address, Prin. 0.2 the letter. The outline still numbers it 0 and quotes the
// address: the shared outline takes its number from the row id and its text from the heading lines, and there is
// no site field to replace either.
//
// The Arte's is AdG. ("Arte" alone is an ordinary Italian word, which the go-to box would take for a citation). A row
// id is "<book>.<paragraph>", the paragraph numbered within its book as Martelli's text runs it, so AdG. 3 opens book III
// and AdG. 7.12 is the first of Book VII's maxims. The proemio, addressed to Lorenzo Strozzi, is book 0, as the
// dedication is chapter 0: AdG. 0.1. Its outline entry is numbered 0 for the same reason.
//
// The Discorsi's books are Disc. 1, Disc. 2 and Disc. 3, as the Aeneid's are Aen. 1 and the rest. A row id is
// "<book>.<chapter>.<paragraph>", and the abbreviation supplies the book (src/lib/cite.ts), so Disc. 1.11.3 is Book I,
// chapter 11, paragraph 3, and Disc. 1.11 opens that chapter. As in the Prince, a chapter's rubric is its heading,
// not a paragraph. The proemi of Books I and II are chapter 0 (Disc. 1.0.1, Disc. 2.0.1); Book III has none. The
// dedication to Zanobi Buondelmonti and Cosimo Rucellai, which the whole work numbers book 0, chapter 0, is a short
// work of its own, Disc. 0, so that it is cited Disc. 0.1 (its letter; the salutation is the heading) and not
// Disc. 1.0.0.1, as it would print within Book I.
import type { ReaderSite, WorkInfo } from "../../src/sites/types";

const DISCORSI_SOURCES = {
  it: "Mario Martelli’s edition (Sansoni, 1971), Liber Liber’s transcription (CC BY-NC-SA 4.0). Morphology: UDPipe 2, " +
    "ISDT model, machine-tagged, then checked word by word and given a consistency pass (CC BY-NC-SA).",
  en: "Ninian Hill Thomson (1883)",
} as const;

const DISCORSI_BOOKS = [
  {
    title: "Discorsi, libro primo",
    english: "Discourses on Livy, Book I",
    summary: "What Rome did at home and by public counsel: how cities are founded and governed, the tribunes and " +
      "the strife of plebs and senate, religion, accusations, the dictatorship and the Decemvirate, and whether a " +
      "people or a prince is the wiser.",
  },
  {
    title: "Discorsi, libro secondo",
    english: "Discourses on Livy, Book II",
    summary: "How Rome won its empire abroad: the ways republics grow, Rome’s wars, colonies and allies, money and " +
      "the sinews of war, auxiliaries and mercenaries, artillery, infantry and horse, and fortresses.",
  },
  {
    title: "Discorsi, libro terzo",
    english: "Discourses on Livy, Book III",
    summary: "How the deeds of single men made Rome great: bringing states back to their beginnings, conspiracies, " +
      "changing with the times, what makes a captain, and fraud in war.",
  },
] as const;

export const site: ReaderSite = {
  id: "machiavelli",
  name: "The Machiavelli Reader",
  shortName: "Machiavelli Reader",
  homeTitle: "The Machiavelli Reader: Machiavelli’s Prince, Art of War and Discourses on Livy in Italian and English",
  description: "Read Machiavelli’s Il Principe, Dell’arte della guerra and Discorsi sopra la prima deca di Tito Livio " +
    "in Italian with English translations, word-by-word grammar tagged by UDPipe 2, Wiktionary, and full-text search.",
  eyebrow: "Il Principe · Dell’arte della guerra · Discorsi",
  lede: "Machiavelli’s <i>Il Principe</i>, <i>Dell’arte della guerra</i> and <i>Discorsi sopra la prima deca di Tito " +
    "Livio</i>, paragraph by paragraph, with Luigi Ricci’s English (1909) beside the Prince, Ellis Farneworth’s (1762) " +
    "beside the Art of War and Ninian Hill Thomson’s (1883) beside the Discourses. Click any Italian word for its " +
    "lemma and grammar. The morphology was tagged by UDPipe 2 (the ISDT model) and checked word by word.",
  credits: "Italian text: the Prince in the anonymous “Italia, 1814” edition, proofread on " +
    '<a href="https://it.wikisource.org/wiki/Il_Principe">Italian Wikisource</a>, ' +
    '<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC BY-SA 3.0</a> and the GNU Free Documentation ' +
    "License; the Art of War and the Discourses in Mario Martelli’s edition (Sansoni, 1971), as transcribed by " +
    '<a href="https://www.liberliber.eu/">Liber Liber</a> (progetto Manuzio), ' +
    '<a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">CC BY-NC-SA 4.0</a>. Morphology: UDPipe 2, ' +
    "model italian-isdt-ud-2.17-251125, machine-tagged, then checked word by word (the Art of War’s and the " +
    "Discourses’ then given a consistency pass across their units); the model output is " +
    '<a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">CC BY-NC-SA</a>. English: Luigi Ricci’s ' +
    "translation of the Prince (Oxford, 1909), public domain, via Project Gutenberg; Ellis Farneworth’s of the " +
    "Art of War (1762), public domain, as transcribed on English Wikisource " +
    '(<a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>); Ninian Hill Thomson’s of the ' +
    "Discourses (London, 1883), public domain, via Project Gutenberg. Dictionary: Wiktionary (via " +
    'kaikki.org), <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>.',
  corpus: "Machiavelli’s works",
  searchHint: "Accents, apostrophes and capitals are optional: <i>perche</i> finds <i>perchè</i>, <i>de</i> finds <i>de'</i>.",
  searchPlaceholder: "e.g. virtù, Sforza, fanteria",
  countNote: "Counts use the annotation’s lemmas, which are modern Italian citation forms (<i>debbono</i> is counted " +
    "under <i>dovere</i>). A written word that joins two words (<i>del</i> = <i>di</i> + <i>il</i>, an enclitic " +
    "such as <i>dilettarsi</i>) counts once for each.",
  sides: [{ id: "it", role: "source", label: "Italian" }, { id: "en", role: "translation", label: "English", lang: "en" }],
  collections: [
    { id: "machiavelli", title: "Niccolò Machiavelli", subtitle: "Il Principe · Dell’arte della guerra" },
    {
      id: "discorsi",
      title: "Discorsi",
      subtitle: "Discourses on Livy",
      intro: "<i>Discorsi sopra la prima deca di Tito Livio</i>: Machiavelli’s discourses on the first ten books of " +
        "Livy’s history of Rome, written in the 1510s and printed in 1531, after his death. Book I is what Rome did " +
        "within the city, Book II how it grew its empire, Book III how single men made it great. The Italian is Mario " +
        "Martelli’s text; the English is Ninian Hill Thomson’s translation of 1883, which leaves out the dedication.",
    },
  ],
  groups: ["Il Principe", "Dell’arte della guerra", "Discorsi"],
  works: [
    {
      slug: "principe",
      abbr: "Prin.",
      title: "Il Principe",
      english: "The Prince",
      summary: "What kinds of state there are, and how a prince wins and holds each: by his own arms or another’s, " +
        "by virtue or by fortune, and the exhortation to free Italy from foreign rule.",
      collection: "machiavelli",
      group: "Il Principe",
      // Chapter, then paragraph. A listed chapter is the outline; a bare Prin. 18 opens that chapter's first row.
      // The dedication is chapter 0 (see the comment above). opening: the dedication's heading is its address, but
      // a chapter whose rubric failed to parse would still be listed by its first words.
      levels: [{ name: "Chapter", list: true, opening: true }, { name: "Paragraph" }],
      sources: {
        it: "Italia, 1814 (Wikisource). Morphology: UDPipe 2, ISDT model, machine-tagged and checked word by word (CC BY-NC-SA).",
        en: "Luigi Ricci (1909)",
      },
    },
    {
      slug: "arte-della-guerra",
      abbr: "AdG.",
      title: "Dell’arte della guerra",
      english: "The Art of War",
      summary: "A dialogue in the Rucellai gardens at Florence. The soldier Fabrizio Colonna answers the young " +
        "Florentines’ questions on how to raise a citizen army, arm and drill it, draw it up for battle, march and " +
        "encamp it, and defend or besiege a town.",
      collection: "machiavelli",
      group: "Dell’arte della guerra",
      // Book, then paragraph (Martelli's numbering within the book). A listed book is the outline; a bare AdG. 3 opens
      // book III. The proemio is book 0. Each book's heading ("LIBRO PRIMO") is the heading of its first row.
      levels: [{ name: "Book", list: true }, { name: "Paragraph" }],
      sources: {
        it: "Mario Martelli’s edition (Sansoni, 1971), Liber Liber’s transcription (CC BY-NC-SA 4.0). Morphology: UDPipe 2, ISDT model, machine-tagged, hand-checked word by word, then a consistency pass across units (CC BY-NC-SA).",
        en: "Ellis Farneworth (1762), as transcribed on English Wikisource",
      },
    },
    {
      slug: "discorsi-dedication",
      abbr: "Disc. 0",
      title: "Discorsi · Dedica",
      english: "Discourses on Livy, Dedication",
      summary: "Machiavelli sends the Discourses to Zanobi Buondelmonti and Cosimo Rucellai, choosing not princes " +
        "but men who deserve to be. Thomson’s translation leaves it out.",
      collection: "discorsi",
      group: "Discorsi",
      // One paragraph, the letter, headed by its salutation: Disc. 0.1 (see the comment above).
      levels: [{ name: "Paragraph" }],
      sources: DISCORSI_SOURCES,
    },
    ...DISCORSI_BOOKS.map(({ title, english, summary }, i): WorkInfo => ({
      slug: `discorsi-${i + 1}`,
      abbr: `Disc. ${i + 1}`,
      title,
      english,
      summary,
      collection: "discorsi",
      group: "Discorsi",
      // Book, chapter, paragraph; the abbreviation carries the book, and the chapters are listed. The proemi of
      // Books I and II are chapter 0 (see the comment above).
      levels: [{ name: "Book" }, { name: "Chapter", list: true }, { name: "Paragraph" }],
      sources: DISCORSI_SOURCES,
    })),
  ],
  sourceNotes: {},
  notes: {
    credit: "Luigi Ricci, The Prince (Oxford, 1909); Ellis Farneworth, The Art of War (1762); Ninian Hill Thomson, " +
      "Discourses on the First Decade of Titus Livius (London, 1883).",
    introLabel: "About this work",
  },
};
