// The Machiavelli Reader: Il Principe in the Italian of the 1814 Italia edition beside Luigi Ricci's English, and
// Dell'arte della guerra in Mario Martelli's text beside Ellis Farneworth's, both with the annotation's lemmas and
// morphology. The chapters of the Prince and the books of the Arte are the listed divisions; their headings are the
// rubrics.
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
import type { ReaderSite } from "../../src/sites/types";

export const site: ReaderSite = {
  id: "machiavelli",
  name: "The Machiavelli Reader",
  shortName: "Machiavelli Reader",
  homeTitle: "The Machiavelli Reader: Machiavelli’s Prince and Art of War in Italian and English",
  description: "Read Machiavelli’s Il Principe and Dell’arte della guerra in Italian with English translations, " +
    "word-by-word grammar tagged by UDPipe 2 and checked word by word, Wiktionary, and full-text search.",
  eyebrow: "Il Principe · Dell’arte della guerra",
  lede: "Machiavelli’s <i>Il Principe</i> and <i>Dell’arte della guerra</i>, paragraph by paragraph, with Luigi " +
    "Ricci’s English (1909) beside the Prince and Ellis Farneworth’s (1762) beside the Art of War. Click any " +
    "Italian word for its lemma and grammar. The morphology was tagged by UDPipe 2 (the ISDT model) and checked " +
    "word by word.",
  credits: "Italian text: the Prince in the anonymous “Italia, 1814” edition, proofread on " +
    '<a href="https://it.wikisource.org/wiki/Il_Principe">Italian Wikisource</a>, ' +
    '<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC BY-SA 3.0</a> and the GNU Free Documentation ' +
    "License; the Art of War in Mario Martelli’s edition (Sansoni, 1971), as transcribed by " +
    '<a href="https://www.liberliber.eu/">Liber Liber</a> (progetto Manuzio), ' +
    '<a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">CC BY-NC-SA 4.0</a>. Morphology: UDPipe 2, ' +
    "model italian-isdt-ud-2.17-251125, machine-tagged and checked word by word (the Art of War’s then given a " +
    "consistency pass across its units); the model output is " +
    '<a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">CC BY-NC-SA</a>. English: Luigi Ricci’s ' +
    "translation of the Prince (Oxford, 1909), public domain, via Project Gutenberg; Ellis Farneworth’s of the " +
    "Art of War (1762), public domain, as transcribed on English Wikisource " +
    '(<a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>). Dictionary: Wiktionary (via ' +
    'kaikki.org), <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>.',
  corpus: "Machiavelli’s works",
  searchHint: "Accents, apostrophes and capitals are optional: <i>perche</i> finds <i>perchè</i>, <i>de</i> finds <i>de'</i>.",
  searchPlaceholder: "e.g. virtù, Sforza, fanteria",
  countNote: "Counts use the annotation’s lemmas, which are modern Italian citation forms (<i>debbono</i> is counted " +
    "under <i>dovere</i>). A written word that joins two words (<i>del</i> = <i>di</i> + <i>il</i>, an enclitic " +
    "such as <i>dilettarsi</i>) counts once for each.",
  sides: [{ id: "it", role: "source", label: "Italian" }, { id: "en", role: "translation", label: "English", lang: "en" }],
  collections: [{ id: "machiavelli", title: "Niccolò Machiavelli", subtitle: "Il Principe · Dell’arte della guerra" }],
  groups: ["Il Principe", "Dell’arte della guerra"],
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
  ],
  sourceNotes: {},
  notes: { credit: "Luigi Ricci, The Prince (Oxford, 1909); Ellis Farneworth, The Art of War (1762).", introLabel: "About this work" },
};
