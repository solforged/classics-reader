// What a language pack supplies to the shared reader: spelling keys, labels for its morphology, and the dictionaries
// its build writes into the lexicon shards. Build-side parsers (sources, tagset conversion, dictionary structuring)
// live with the pack's build scripts.

export interface MorphLabel {
  /** Word class, e.g. "noun", "personal pronoun". */
  pos: string;
  /** Inflection in reading order, e.g. "accusative plural" or "1st person singular present indicative active". */
  form: string;
  /** Lexical properties: gender of nouns, verb class, case government. */
  props: string[];
}

/** How a dictionary's entries render (see src/lib/entry.ts). */
export type DictionaryStyle =
  /** Headword, homograph sections with grammar notes, numbered senses with glosses and examples. */
  | "article"
  /** Headword and running text. */
  | "plain"
  /** One line per section: grammar note, then glosses (headword not shown). */
  | "glosses"
  /** Name and identification, for proper nouns only; entries citing the current work come first. */
  | "names";

export interface Dictionary {
  /** Key under DictHit.entries. */
  id: string;
  /** Heading in the word panel. */
  title: string;
  /** Heading on lemma pages. */
  fullTitle: string;
  style: DictionaryStyle;
  /** Rendered inside a closed <details> whose summary is the title. */
  collapsed?: boolean;
  /** Shown only when the dictionary with this id has no entries. */
  fallbackFor?: string;
  /** Abbreviation → expansion, marked up with <abbr> in grammar notes, glosses and examples. */
  abbreviations?: Readonly<Record<string, string>>;
  /** Abbreviations expanded only in grammar notes (where "m." means masculine, not something else). */
  grammarAbbreviations?: Readonly<Record<string, string>>;
  /** Character the dictionary prints in place of the headword in examples (Zoëga's "~"). */
  headwordMark?: string;
  /**
   * Does a homograph section's grammar note (parentheses removed, plain text) fit this analysis? When exactly one
   * section fits, the others are collapsed.
   */
  fits?: (morph: string, grammar: string) => boolean;
}

export interface LanguagePack {
  /** ISO 639-3 code, e.g. "non". */
  code: string;
  /** English name, e.g. "Old Norse". */
  name: string;
  /** Lookup key for lemmas and forms; dictionary and table shards are keyed by it. */
  fold(text: string): string;
  /** Search key: fold() reduced further so a query typed without diacritics matches. */
  searchKey(text: string): string;
  /** English labels for a UD morphology string (src/lib/morph.ts). */
  describeMorph(morph: string): MorphLabel;
  /** Dictionaries in display order. */
  dictionaries: readonly Dictionary[];
}
