// Intermediate (pre-alignment) and final data shapes shared by the build scripts and the site.

/** A displayed Old Norse piece: plain text (spaces, punctuation) or a clickable word. */
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
 * a = attested elsewhere in the annotated edition with this spelling; w = Wiktionary form table. */
export type AnalysisSource = "e" | "a" | "w";
/** [lemma, Menota msa tag string or "", source] */
export type Analysis = [string, string, AnalysisSource];

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
