// Dictionary shard records (public/lex/<shard>.json), written by scripts/build-data.ts and read by the word panel and
// the lemma pages. Each shard maps the pack's fold(lemma) to a DictHit. Entries are structured at build time by the
// pack's parser for each dictionary, so src/lib/entry.ts renders every language the same way.

/** One sense: its number as printed ("1)", or "" for an unnumbered sense), gloss and examples (HTML). */
export interface Sense {
  marker?: string;
  gloss: string;
  examples?: string;
}

/** A homograph section (or the whole entry when it has none). */
export interface ArticleSection {
  /** Section label as printed, e.g. "<strong>II)</strong>". */
  label?: string;
  /** Grammar note before the first sense (HTML), e.g. "(-s, -ar), m.". */
  grammar?: string;
  senses?: Sense[];
  /** Section text that the parser could not split into senses (HTML); rendered as is. */
  text?: string;
}

/** A structured dictionary entry. */
export interface Article {
  /** Headword as printed (plain text). */
  head: string;
  sections: ArticleSection[];
  /** Reader slugs the entry cites, for "names" dictionaries; entries citing the current work are preferred. */
  works?: string[];
}

export interface DictHit {
  /** Entries by dictionary id (the pack's `dictionaries`), best-fitting homograph first. */
  entries: Record<string, Article[]>;
  /** Headword spelling the dictionaries use when it differs from the lemma (e.g. "lopt" for loft). */
  via?: string;
  /** Compound parts when no dictionary has the whole word; each part has its own record under fold(part). */
  parts?: string[];
}

/** A dictionary article as digitized: headword and definition chunks (sanitized HTML). Input to the parsers. */
export interface DictEntry {
  w: string;
  d: string[];
}
