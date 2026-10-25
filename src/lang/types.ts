// What a language pack supplies to the shared reader: spelling keys, labels for its morphology, and the dictionaries
// its build writes into the lexicon shards. Build-side parsers (sources, tagset conversion, dictionary structuring)
// live with the pack's build scripts.
import type { Paradigm } from "../lib/paradigm";
import type { DictHit } from "../lib/dict";

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

export interface TableOptions {
  /** Unique within the page, so native radio switches do not affect another table. */
  id: string;
  /** Cells of the clicked reading. */
  highlight?: readonly string[];
  /** Written form of this word, excluding any other words joined to it. */
  form?: string;
}

/** Inflection tables (src/lib/paradigm.ts shards) for packs whose build writes them. */
export interface Tables {
  /** Table kind for an analysis, or undefined for classes without tables. */
  kind(morph: string, lemma: string): string | undefined;
  /** Cells an analysis occupies; an ambiguous one occupies several. */
  cells(morph: string, lemma: string): string[];
  /** Heading of the panel's table block, e.g. "Declension". */
  heading(kind: string): string;
  html(paradigm: Paradigm, options: TableOptions): string;
}

/** Another writing system the reader can show source-language text in (src/scripts/script.ts). */
export interface DisplayScript {
  /** Storage value, e.g. "deva". */
  id: string;
  /** Toggle label, written in the script itself, e.g. "देवनागरी". */
  label: string;
  /** BCP 47 tag for converted text, e.g. "sa-Deva". */
  tag: string;
  /** Converts text from the stored spelling (the pack's `code`). */
  convert(text: string): string;
}

export interface LanguagePack {
  /** BCP 47 tag for lang attributes on source-language text, e.g. "non", "sa-Latn". */
  code: string;
  /** English name, e.g. "Old Norse". */
  name: string;
  /** Lookup key for lemmas and forms; dictionary and table shards are keyed by it. */
  fold(text: string): string;
  /** Search key: fold() reduced further so a query typed without diacritics matches. */
  searchKey(text: string): string;
  /**
   * Rewrites a search key using neighbouring characters, without changing its length; searchKey() applies it. The
   * search page builds keys a character at a time (to map matches back to the text) and applies it afterwards.
   */
  searchContext?(key: string): string;
  /** English labels for a UD morphology string (src/lib/morph.ts). */
  describeMorph(morph: string, options?: { tableLabel?: string }): MorphLabel;
  /** Dictionaries in display order. */
  dictionaries: readonly Dictionary[];
  /** Exact-lemma entries for senses that spelling-folded dictionary shards cannot distinguish. */
  dictionaryEntry?(lemma: string): DictHit | undefined;
  /** Inflection tables; absent when the pack has none. */
  tables?: Tables;
  /** Label of the stored spelling in the script toggle, e.g. "IAST"; set together with `scripts`. */
  scriptLabel?: string;
  /** Other scripts the reader can display; absent when text is shown only as stored. */
  scripts?: readonly DisplayScript[];
}
