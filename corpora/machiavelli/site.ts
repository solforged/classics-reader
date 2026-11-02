// The Machiavelli Reader: Il Principe in the Italian of the 1814 Italia edition, with the annotation's lemmas and
// morphology, beside Luigi Ricci's English. One work. Chapters are the listed divisions; their headings are the
// rubrics. The dedication comes first.
//
// Citations. The abbreviation is Prin. A row id is "<chapter>.<paragraph>", and the go-to box treats a bare
// chapter number as that chapter's first row, so Prin. 18 opens chapter 18 and Prin. 18.2 is its second body
// paragraph (the rubric is the heading, not a paragraph). The dedication has no rubric and is chapter 0:
// Prin. 0 and Prin. 0.1 are the address, Prin. 0.2 the letter. The outline still numbers it 0 and quotes the
// address: the shared outline takes its number from the row id and its text from the heading lines, and there is
// no site field to replace either.
import type { ReaderSite } from "../../src/sites/types";

export const site: ReaderSite = {
  id: "machiavelli",
  name: "The Machiavelli Reader",
  shortName: "Machiavelli Reader",
  homeTitle: "The Machiavelli Reader: Machiavelli’s Prince in Italian and English",
  description: "Read Machiavelli’s Il Principe in the Italian of the 1814 edition with Luigi Ricci’s English, " +
    "word-by-word grammar tagged by UDPipe 2 and checked word by word, Wiktionary, and full-text search.",
  eyebrow: "Il Principe · The Prince",
  lede: "Machiavelli’s <i>Il Principe</i> in the Italian of the 1814 edition, paragraph by paragraph, with Luigi " +
    "Ricci’s English (1909) beside it. Click any Italian word for its lemma and grammar. The morphology was tagged " +
    "by UDPipe 2 (the ISDT model) and checked word by word.",
  credits: "Italian text: the anonymous “Italia, 1814” edition, proofread on " +
    '<a href="https://it.wikisource.org/wiki/Il_Principe">Italian Wikisource</a>, ' +
    '<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC BY-SA 3.0</a> and the GNU Free Documentation ' +
    "License. Morphology: UDPipe 2, model italian-isdt-ud-2.17-251125, machine-tagged and checked word by word; " +
    'the model output is <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">CC BY-NC-SA</a>. English: ' +
    "Luigi Ricci’s translation (Oxford, 1909), public domain, via Project Gutenberg. Dictionary: Wiktionary (via " +
    'kaikki.org), <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>.',
  corpus: "the Prince",
  searchHint: "Accents, apostrophes and capitals are optional: <i>perche</i> finds <i>perchè</i>, <i>de</i> finds <i>de'</i>.",
  searchPlaceholder: "e.g. virtù, Sforza, fortune",
  countNote: "Counts use the annotation’s lemmas, which are modern Italian citation forms (<i>debbono</i> is counted " +
    "under <i>dovere</i>). A written word that joins two words (<i>del</i> = <i>di</i> + <i>il</i>, an enclitic " +
    "such as <i>dilettarsi</i>) counts once for each.",
  sides: [{ id: "it", role: "source", label: "Italian" }, { id: "en", role: "translation", label: "English", lang: "en" }],
  collections: [{ id: "machiavelli", title: "Niccolò Machiavelli", subtitle: "Il Principe" }],
  groups: ["Il Principe"],
  works: [{
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
  }],
  sourceNotes: {},
  notes: { credit: "Luigi Ricci, The Prince (Oxford, 1909).", introLabel: "About this work" },
};
