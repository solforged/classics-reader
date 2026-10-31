// The Aeneid Reader: Vergil's Aeneid, book 1, in Latin (Greenough's text with LASLA's annotation) and Theodore C.
// Williams's English, one paragraph of Greenough's per row.
import type { ReaderSite } from "../../src/sites/types";

const GROUPS = ["Books"] as const;

export const site: ReaderSite = {
  id: "aeneid",
  name: "The Aeneid Reader",
  shortName: "Aeneid Reader",
  homeTitle: "The Aeneid Reader: Vergil’s Aeneid in Latin and English",
  description: "Read Vergil’s Aeneid, book 1, in Latin with Theodore C. Williams’s English translation, " +
    "word-by-word grammar from the LASLA corpus, Frieze’s Aeneid vocabulary and full-text search.",
  eyebrow: "P. Vergilius Maro · Aeneis",
  lede: "Vergil’s Aeneid in Latin with a facing English verse translation, paragraph by paragraph. " +
    "Click any Latin word for its lemma, grammar and dictionary entry, including the words joined by -que, -ne and -ve.",
  credits: "Latin annotation: LASLA, Université de Liège, as converted by CIRCSE (LASLA v1.0.1), " +
    '<a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">CC BY-NC-SA 4.0</a>: this reader’s Latin data may ' +
    "be reused only non-commercially and under the same licence. Latin text: J. B. Greenough (1881), public domain, " +
    "via the Perseus Digital Library. English: Theodore C. Williams (1910), public domain, via Perseus. " +
    "Dictionary: Frieze’s Aeneid vocabulary (1902) as revised by Dickinson College Commentaries, " +
    '<a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>.',
  corpus: "the Aeneid",
  searchHint: "Macrons, case and the letters v and j are optional: <i>uirum</i> finds <i>virum</i>, " +
    "<i>iuno</i> finds <i>Iuno</i>.",
  searchPlaceholder: "e.g. arma virumque, Dido, storm",
  countNote: "Counts use LASLA’s annotation. A word with an enclitic (<i>virumque</i>) counts once for each of " +
    "its words. Where Greenough prints a different word from LASLA’s edition, the word counts as probable when its " +
    "candidate analyses agree on one lemma. Glosses come from Frieze’s Aeneid vocabulary (Dickinson College " +
    "Commentaries, CC BY-SA 4.0).",
  sides: [{ id: "la", role: "source", label: "Latin" }, { id: "en", role: "translation", label: "English", lang: "en" }],
  groups: GROUPS,
  works: [{
    slug: "aeneid-1",
    abbr: "Aen. 1",
    title: "Aeneid, book 1",
    english: "Storm and arrival at Carthage",
    summary: "Juno’s anger drives the Trojan fleet onto the coast of Libya. Venus guides Aeneas to Carthage, " +
      "where Dido receives the Trojans and, through Cupid, begins to love Aeneas.",
    collection: "Vergil, Aeneid",
    group: "Books",
    levels: [{ name: "Book" }, { name: "Line" }],
    sources: {
      la: "Greenough (1881); annotation LASLA (CC BY-NC-SA 4.0)",
      en: "Theodore C. Williams (1910)",
    },
  }],
  sourceNotes: {
    a: `<span class="badge" title="Greenough prints a different word from LASLA’s edition here; LASLA annotates this written form this way elsewhere in the Aeneid">candidate</span>`,
  },
};
