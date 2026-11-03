// Data shapes shared by the build scripts and the site.

/** A displayed source-language piece: plain text (spaces, punctuation) or a clickable word. */
export type Piece = string | WordPiece;
/** [surface text, analysis ids (into Work.analyses), flags]. Flags: 1 = editorially supplied text. */
export type WordPiece = [string, number[]] | [string, number[], number];

export type UnitKind = "stanza" | "prose" | "head";

/** A unit of a source side: lines of pieces, whose words open the word panel. */
export interface SourceUnit {
  key: string;
  kind: UnitKind;
  /** Edition label shown in the margin (stanza number, chapter number). */
  label?: string;
  /**
   * Citation number of the first line, when each line is a numbered verse of continuous (stichic) verse, as in an
   * epic: the reader numbers every fifth line and does not indent alternate lines.
   */
  firstLine?: number;
  /**
   * A dialogue's speaker whose turn this prose unit opens ("Fabrizio"). The page prints it before the text as a small-caps
   * cue, outside the words: it has no analysis, and the search text and the concordance read only `lines`.
   */
  speaker?: string;
  lines: Piece[][];
}

/** A unit of a translation side. */
export interface TextUnit {
  key: string;
  kind: UnitKind;
  label?: string;
  /** Plain text lines (stanza) or paragraphs (prose). */
  lines: string[];
  /** Continuous (stichic) verse, as a verse translation of an epic: alternate lines are not indented. */
  stichic?: true;
  /** The speaker whose turn this prose unit opens, as for a source unit (SourceUnit.speaker). */
  speaker?: string;
  /** Translator's note keys attached to this unit. */
  notes?: string[];
}

/** A row's units on one side; the side's role (src/sites/types.ts SideSpec) says which kind. */
export type SideUnits = SourceUnit[] | TextUnit[];

/** Source of a word analysis. e = the edition's own annotation for this occurrence;
 * a = attested elsewhere in the annotated edition with this spelling; w = Wiktionary form table;
 * n = proper-name match from a names index (Bellows's for the Edda); its morph carries case and number only when
 * the written form matches a cell of the name's table. */
export type AnalysisSource = "e" | "a" | "w" | "n";
/**
 * [lemma, UD morphology (src/lib/morph.ts) or "", source, word]. `word` is the word as the edition segments it, when
 * one written form joins several words (Norse enclitics, Sanskrit sandhi and compounds): the token's edition
 * analyses are then its words in order. A single Sanskrit word also carries it when sandhi changes its written form
 * (mano for manaḥ). An empty word marks an independent surface the edition does not supply.
 */
export type Analysis = [lemma: string, morph: string, source: AnalysisSource, word?: string];


export interface Row {
  id: string; // citation anchor, e.g. "12", "1.23" or "p-before-1"
  /** Units per side id (ReaderSite.sides); a side with nothing in this row has an empty list. */
  sides: Record<string, SideUnits>;
}

/** A row's units on a source side. */
export const sourceUnits = (row: Row, side: string): SourceUnit[] => (row.sides[side] ?? []) as SourceUnit[];
/** A row's units on a translation side. */
export const textUnits = (row: Row, side: string): TextUnit[] => (row.sides[side] ?? []) as TextUnit[];

export interface Work {
  slug: string;
  rows: Row[];
  analyses: Analysis[];
  notes: Record<string, string>;
  intro?: string[];
}

/** A written form's separate words: [start, end, words] over its side's text (scripts/core/outputs.ts). */
export type Segment = [number, number, string];
/** One side's search text, with segments when written forms differ from their words. */
export type SearchText = string | [string, Segment[]];
/** [slug, row id, text per side in ReaderSite.sides order] */
export type SearchRow = [string, string, SearchText[]];

/** A lexicon entry (data/lexicon.json). */
export interface LemmaStat {
  lemma: string;
  /** A representative analysis (UD morphology); lexicon pages show its word class. */
  morph: string;
  /** UPOS classes belonging to this entry, when the lemma has separate homograph pages. */
  classes?: string[];
  /** Class discriminator for additional homograph page slugs; the first entry retains the old slug. */
  homograph?: string;
  count: number;
  works: Record<string, number>;
  /**
   * Concordance lines: slug, citation (the row id, or the line's own number in numbered verse: "1.742"), line with
   * the word marked ⟦…⟧, 1 = probable (not edition-annotated).
   */
  occ: [string, string, string, number][];
  /** Short gloss for the lexicon list. */
  gloss: string;
}
