// A reader site: one corpus in one language, built from the shared pages. The build for site `id` writes its data to
// generated/<id>/ (see scripts/core/outputs.ts); `READER=<id> astro build` builds it into dist/<id>/. The site and
// its language pack are listed in src/sites/registry.ts.

/** One level of a work's citations, outermost first: a row id joins one value per level with ".". */
export interface CitationLevel {
  /** What a value of this level is called, e.g. "Book", "Chapter", "Stanza", "Verse". */
  name: string;
  /** List this level's divisions above the text and number their headings, e.g. the chapters of a prose work. */
  list?: boolean;
}

/** One column of the reader: a source text in the site's language or a translation. */
export interface SideSpec {
  /** Key under Row.sides and WorkInfo.sources, and the column's view value, e.g. "non", "en". */
  id: string;
  /** Source sides hold words with analyses, in the pack's language; translation sides hold plain text and notes. */
  role: "source" | "translation";
  /** Column toggle, search filter and edition label, e.g. "Old Norse", "English". */
  label: string;
  /** BCP 47 tag of a translation side, e.g. "en"; source sides use the pack's code. */
  lang?: string;
}

export interface WorkInfo {
  slug: string;
  /** Citation abbreviation, e.g. "Vsp", "BhG 12". */
  abbr: string;
  /** Title as the reader shows it, e.g. "Völuspá". */
  title: string;
  /** English rendering of the title. */
  english: string;
  summary: string;
  /** Id of the work's collection, one of the site's `collections`. */
  collection: string;
  /** Home-page group, one of the site's `groups`. */
  group: string;
  /** How rows are cited, outermost level first; ["Stanza"] for a poem, ["Book", "Line"] for a long epic. */
  levels: readonly CitationLevel[];
  /** Edition of each side (by side id), shown above the text. */
  sources: Readonly<Record<string, string>>;
}

/**
 * A body of works with its own title, e.g. the Poetic Edda. A site with several collections gives each a page at
 * `<id>/`, so an id must not be a work slug; a site with one collection uses its home page instead.
 */
export interface CollectionInfo {
  /** URL slug, e.g. "poetic-edda". */
  id: string;
  /** Title as the reader shows it, e.g. "Poetic Edda"; also the eyebrow above each work's title. */
  title: string;
  /** Line under the title on the collection page, e.g. "Eddukvæði". */
  subtitle?: string;
  /** Collection-page introduction (HTML). */
  intro?: string;
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
  /** Search-page help after "Searches the <sides> of every work." (HTML). */
  searchHint: string;
  /** Search box placeholder, e.g. "e.g. Yggdrasill, “ask veit ek”, hammer". */
  searchPlaceholder: string;
  /** Lexicon-page note on what the counts include (HTML). */
  countNote: string;
  /** The reader's columns in display order; at least one source side. */
  sides: readonly SideSpec[];
  /** Collections in order; works name theirs by id. */
  collections: readonly CollectionInfo[];
  /** Home-page groups in order; each group's works belong to one collection. */
  groups: readonly string[];
  works: readonly WorkInfo[];
  /** Badge (HTML) after the lemma of an analysis from each non-edition source (src/scripts/reader.ts). */
  sourceNotes: Readonly<Record<string, string>>;
  /** Translator's notes and introductions, when the translation has them. */
  notes?: { credit: string; introLabel: string };
}
