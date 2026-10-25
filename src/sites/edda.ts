// The Edda Reader: the Poetic and Prose Eddas in Old Norse with Bellows's and Brodeur's English.
import { GROUPS, WORKS, type WorkDef } from "../../scripts/catalog";
import type { ReaderSite } from "./types";

function sources(def: WorkDef): { on: string; en: string } {
  const on = def.snorra
    ? "Snorra Edda, ed. Guðni Jónsson (via Icelandic Wikisource / Heimskringla.no)"
    : def.eae && def.bugge
      ? "Codex Regius, EAE electronic edition (2024); stanzas 30–37 from Bugge (1867)"
      : def.eae
        ? "Codex Regius (GKS 2365 4to), EAE electronic edition (2024)"
        : "Sophus Bugge, Norrœn fornkvæði (1867)";
  const en = def.bellows
    ? "Henry Adams Bellows (1923)"
    : def.brodeur
      ? "Arthur Gilchrist Brodeur (1916)"
      : "No public-domain English translation";
  return { on, en };
}

export const edda: ReaderSite = {
  id: "edda",
  name: "The Edda Reader",
  shortName: "Edda Reader",
  homeTitle: "The Edda Reader: the Poetic and Prose Eddas in Old Norse and English",
  description: "The Poetic and Prose Eddas in Old Norse with facing English translations, click-to-parse words, " +
    "a Zoëga glossary, stanza citation and full-text search.",
  eyebrow: "Eddukvæði · Snorra Edda",
  lede: "The Poetic and Prose Eddas in Old Norse with a facing English translation, stanza by stanza. Click any " +
    "Old Norse word for its lemma, grammar and dictionary entry.",
  credits: "Old Norse: Codex Regius, EAE electronic edition (CC BY-SA 4.0); Bugge (1867); Snorra Edda ed. Guðni " +
    "Jónsson. English: Bellows (1923); Brodeur (1916). Dictionaries: Zoëga (1910), Cleasby–Vigfússon (1874), Wiktionary.",
  corpus: "the Eddas",
  searchHint: "Accents and Old Norse letters are optional: <i>voluspa</i> finds <i>Völuspá</i>, <i>thorr</i> finds " +
    "<i>Þórr</i>.",
  searchPlaceholder: "e.g. Yggdrasill, “ask veit ek”, hammer",
  countNote: "Counts come from the Codex Regius edition’s own annotation, plus words elsewhere whose possible " +
    "analyses all agree on one lemma. Glosses from Zoëga’s <i>Concise Dictionary of Old Icelandic</i> (1910) or " +
    "Wiktionary.",
  translation: "English",
  groups: GROUPS,
  works: WORKS.map((def) => {
    const prose = def.collection === "prose" && def.slug !== "hattatal";
    return {
      slug: def.slug,
      abbr: def.abbr,
      title: def.title,
      english: def.english,
      summary: def.summary,
      collection: def.collection === "poetic" ? "Poetic Edda" : "Prose Edda",
      group: def.group,
      prose,
      unit: prose ? "Chapter" : "Stanza",
      sources: sources(def),
    };
  }),
  sourceNotes: {
    a: `<span class="badge" title="Not annotated here; this spelling is annotated this way elsewhere in the Codex Regius edition">candidate</span>`,
    w: `<span class="badge" title="Not annotated here; candidate from Wiktionary inflection tables">candidate</span>`,
    n: `<span class="badge" title="Not annotated here; read as a proper name from its spelling, with no grammatical analysis">name</span>`,
  },
  notes: { credit: "Henry Adams Bellows, The Poetic Edda (1923).", introLabel: "Translator’s introductory note (Bellows)" },
};
