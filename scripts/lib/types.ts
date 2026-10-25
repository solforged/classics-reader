// Intermediate (pre-alignment) and final data shapes shared by the build scripts and the site.

/** A displayed source-language piece: plain text (spaces, punctuation) or a clickable word. */
export type Piece = string | WordPiece;
/** [surface text, analysis ids (into Work.analyses), flags]. Flags: 1 = editorially supplied text. */
export type WordPiece = [string, number[]] | [string, number[], number];

export type UnitKind = "stanza" | "prose" | "head";

export interface OnUnit {
  key: string;
  kind: UnitKind;
  /** Edition label shown in the margin (stanza number, chapter number). */
  label?: string;
  lines: Piece[][];
}

export interface EnUnit {
  key: string;
  kind: UnitKind;
  label?: string;
  /** Plain text lines (stanza) or paragraphs (prose). */
  lines: string[];
  /** Translator's note keys attached to this unit. */
  notes?: string[];
}

/** Source of a word analysis. e = the edition's own annotation for this occurrence;
 * a = attested elsewhere in the annotated edition with this spelling; w = Wiktionary form table;
 * n = proper-name match from Bellows's index (morph "PROPN", without inflection). */
export type AnalysisSource = "e" | "a" | "w" | "n";
/**
 * [lemma, UD morphology (src/lib/morph.ts) or "", source, word]. `word` is the word as the edition segments it, when
 * one written form joins several words (Sanskrit sandhi and compounds): the token's edition analyses are then its
 * words in order.
 */
export type Analysis = [lemma: string, morph: string, source: AnalysisSource, word?: string];

export interface RawSide<U> {
  units: U[];
}

export interface RawWork {
  slug: string;
  on: OnUnit[];
  en: EnUnit[];
  analyses: Analysis[];
  notes: Record<string, string>; // note key → sanitized HTML
  intro?: string[]; // translator's introductory note, sanitized HTML paragraphs
}

export interface Row {
  id: string; // citation anchor, e.g. "12" or "p-before-1"
  on: OnUnit[];
  en: EnUnit[];
}

export interface Work {
  slug: string;
  rows: Row[];
  analyses: Analysis[];
  notes: Record<string, string>;
  intro?: string[];
}

/** [slug, row id, source-language text, translation text] */
export type SearchRow = [string, string, string, string];

/** A lexicon entry (data/lexicon.json). */
export interface LemmaStat {
  lemma: string;
  /** The lemma's first analysis (UD morphology); lexicon pages show its word class. */
  morph: string;
  count: number;
  works: Record<string, number>;
  /** Concordance lines: slug, row id, line with the word marked ⟦…⟧, 1 = probable (not edition-annotated). */
  occ: [string, string, string, number][];
  /** Short gloss for the lexicon list. */
  gloss: string;
}
