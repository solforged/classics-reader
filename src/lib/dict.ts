// Dictionary shard records (public/lex/<shard>.json), written by scripts/build-data.ts and read by the
// word panel and the lemma pages. Each shard maps fold(lemma) to a DictHit.

/** One dictionary article: headword as printed, and its definition chunks (sanitized HTML). */
export interface DictEntry {
  w: string;
  d: string[];
}

/** A Wiktionary sense group. */
export interface WiktGloss {
  pos: string;
  glosses: string[];
}

/** An entry in Bellows's "Pronouncing Index of Proper Names" (1923). */
export interface NameGloss {
  /** Bellows's spelling, e.g. "Grani", "Hreithmar". */
  name: string;
  /** His identification, e.g. "Sigurth's horse", without page references. */
  desc: string;
  /** Reader slugs whose Bellows pages the entry cites; empty when none map to a work. */
  works: string[];
}

export interface DictHit {
  /** Zoëga, A Concise Dictionary of Old Icelandic (1910); best-fitting homograph first. */
  z?: DictEntry[];
  /** Cleasby–Vigfússon (1874). */
  c?: DictEntry[];
  /** Wiktionary. */
  w?: WiktGloss[];
  /** Headword spelling the dictionaries use when it differs from the lemma (e.g. "lopt" for loft). */
  via?: string;
  /** Bellows's index of names, for proper nouns. */
  n?: NameGloss[];
  /** Compound parts when no dictionary has the whole word; each part has its own record under fold(part). */
  parts?: string[];
}
