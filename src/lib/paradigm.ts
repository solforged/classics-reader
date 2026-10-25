// Inflection table shard records (public/para/<shard>.json), written by a reader's build and drawn by the word panel
// and the lemma pages. Each shard maps the pack's fold(lemma) to Paradigm[] (several when one spelling is several
// words). Kinds, cell keys and sources are defined by the language pack's `tables`.

export interface Paradigm {
  /** The lemma as spelled in the reader. */
  lemma: string;
  /** Table layout, e.g. "noun" or "verb". */
  kind: string;
  /** Inflection class, e.g. "strong a-stem". */
  label?: string;
  /** Cell key → forms, alternative spellings in order. Empty for tables of attested forms only. */
  cells: Record<string, string[]>;
  /** Cell key → { form → count } for forms the edition annotates in this reader. */
  attested: Record<string, Record<string, number>>;
  /** Where the table comes from, e.g. "wiktionary". */
  source: string;
  /** For generated tables, the dictionary note the table was generated from. */
  note?: string;
}

/** The record for a reading: its table kind and exact lemma take precedence over folded spelling matches. */
export function selectParadigm(records: readonly Paradigm[], lemma: string, kind: string | undefined): Paradigm | undefined {
  if (!kind) return undefined;
  return records.find((record) => record.kind === kind && record.lemma === lemma)
    ?? records.find((record) => record.kind === kind);
}
