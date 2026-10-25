// A reader site: one corpus in one language, built from the shared pages. The build for site `id` writes its data to
// generated/<id>/ (see scripts/core/outputs.ts); `READER=<id> astro build` builds it into dist/<id>/. The site's
// language pack is registered in src/lang/index.ts.

export interface WorkInfo {
  slug: string;
  /** Citation abbreviation, e.g. "Vsp", "BhG 12". */
  abbr: string;
  /** Title as the reader shows it, e.g. "Völuspá". */
  title: string;
  /** English rendering of the title. */
  english: string;
  summary: string;
  /** Collection shown above the title, e.g. "Poetic Edda". */
  collection: string;
  /** Home-page group, one of the site's `groups`. */
  group: string;
  /** Prose works number their rows by chapter; verse works by stanza or verse. */
  prose: boolean;
  /** What a row is called in the go-to box, e.g. "Stanza", "Chapter", "Verse". */
  unit: string;
  /** Editions of the two sides, shown above the text. */
  sources: { on: string; en: string };
}

export interface ReaderSite {
  /** Directory and storage key, e.g. "edda". */
  id: string;
  /** Full name, e.g. "The Edda Reader". */
  name: string;
  /** Top-bar link text, e.g. "Edda Reader". */
  shortName: string;
  /** Home-page <title>. */
  homeTitle: string;
  /** Default meta description. */
  description: string;
  /** Home-page line above the name, e.g. "Eddukvæði · Snorra Edda". */
  eyebrow: string;
  /** Home-page introduction (HTML). */
  lede: string;
  /** Home-page footer credits (HTML), followed by a link to the sources page. */
  credits: string;
  /** The corpus in running text, e.g. "the Eddas": "Search the Eddas", "12 occurrences in the Eddas". */
  corpus: string;
  /** Search-page help after "Searches the <lang> and the <translation> of every work." (HTML). */
  searchHint: string;
  /** Search box placeholder, e.g. "e.g. Yggdrasill, “ask veit ek”, hammer". */
  searchPlaceholder: string;
  /** Lexicon-page note on what the counts include (HTML). */
  countNote: string;
  /** Name of the translation side, e.g. "English". */
  translation: string;
  /** Home-page groups in order. */
  groups: readonly string[];
  works: readonly WorkInfo[];
  /** Badge (HTML) after the lemma of an analysis from each non-edition source (src/scripts/reader.ts). */
  sourceNotes: Readonly<Record<string, string>>;
  /** Translator's notes and introductions, when the translation has them. */
  notes?: { credit: string; introLabel: string };
}
