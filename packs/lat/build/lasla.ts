// Reads LASLA CoNLL-UP (CIRCSE/LASLA): CoNLL-U with lemma, UPOS and UD features but no syntax, plus LiLa columns.
// Range rows join a written token's words (virumque = uirum + que); MISC cites each word's line
// (CitationHierarchy=Liber_1,Versus_12; a trailing * marks lines outside the edition's numbering, such as the
// spurious proem before Aeneid 1.1) and LASLAVariant numbers LASLA's homographs (ut 1–4, N for a name).

export interface LaslaWord {
  form: string;
  /** Lowercase, u and i for consonantal v and j, no homograph number (uir, cano, troia). */
  lemma: string;
  upos: string;
  /** UD FEATS as written, "_" for none. */
  feats: string;
  /** LASLA homograph index ("" when the lemma has one), e.g. "4" for the conjunction ut. */
  variant: string;
}

export interface LaslaToken {
  /** Written form: LASLA's lowercase text, capitalized only for names. */
  form: string;
  words: LaslaWord[];
}

export interface LaslaLine {
  book: number;
  /** Line label as cited: "12", or "2*" for an unnumbered line. */
  line: string;
  tokens: LaslaToken[];
}

function misc(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (text === "_") return out;
  for (const pair of text.split("|")) {
    const eq = pair.indexOf("=");
    if (eq < 1) throw new Error(`Malformed LASLA MISC: ${pair}`);
    out[pair.slice(0, eq)] = pair.slice(eq + 1);
  }
  return out;
}

/**
 * Every word row, ignoring token ranges and sentence structure. Other LASLA books have occasional damaged ranges
 * (Aeneid 2.583 repeats a word of etsi), so corpus-wide counts read words only.
 */
export function laslaWords(source: string): LaslaWord[] {
  const words: LaslaWord[] = [];
  for (const row of source.split(/\r?\n/u)) {
    if (!row || row.startsWith("#")) continue;
    const [id, form, lemma, upos, , feats, , , , extra] = row.split("\t");
    if (!id || id.includes("-") || !form || !lemma || !upos || feats === undefined) continue;
    words.push({ form, lemma, upos, feats, variant: misc(extra ?? "_").LASLAVariant ?? "" });
  }
  return words;
}

/** Lines in text order, each with its written tokens. Throws on a malformed row or a token split across lines. */
export function readLasla(source: string): LaslaLine[] {
  const lines: LaslaLine[] = [];
  const byLabel = new Map<string, LaslaLine>();
  for (const block of source.trim().split(/\r?\n\s*\r?\n/u)) {
    let sentence = "";
    let expected = 1;
    let range: { end: number; token: LaslaToken; line?: LaslaLine } | undefined;
    for (const row of block.split(/\r?\n/u)) {
      if (row.startsWith("#")) {
        sentence = /^# sent_id = (.+)$/u.exec(row)?.[1] ?? sentence;
        continue;
      }
      const cols = row.split("\t");
      if (cols.length < 10) throw new Error(`Expected CoNLL-U columns in LASLA ${sentence}: ${row}`);
      const [id, form, lemma, upos, , feats, , , , extra] = cols as [string, string, string, string, string, string, string, string, string, string];
      const span = /^(\d+)-(\d+)$/u.exec(id);
      if (span) {
        if (range || Number(span[1]) !== expected) throw new Error(`Invalid LASLA token range ${id} in ${sentence}`);
        range = { end: Number(span[2]), token: { form, words: [] } };
        continue;
      }
      if (Number(id) !== expected) throw new Error(`Nonconsecutive LASLA word ${id} in ${sentence}`);
      expected++;
      if (!form || form === "_" || !lemma || lemma === "_" || !upos || upos === "_") {
        throw new Error(`Unanalysed LASLA word ${id} in ${sentence}`);
      }
      const fields = misc(extra);
      const cited = /^Liber_(\d+),Versus_(\d+\*?)$/u.exec(fields.CitationHierarchy ?? "");
      if (!cited) throw new Error(`LASLA word ${id} in ${sentence} has no line citation`);
      const label = `${cited[1]}.${cited[2]}`;
      let line = byLabel.get(label);
      if (!line) {
        line = { book: Number(cited[1]), line: cited[2]!, tokens: [] };
        byLabel.set(label, line);
        lines.push(line);
      }
      if (line !== lines.at(-1)) throw new Error(`LASLA line ${label} resumes after another line (${sentence})`);
      const word: LaslaWord = { form, lemma, upos, feats, variant: fields.LASLAVariant ?? "" };
      if (!range) {
        line.tokens.push({ form, words: [word] });
        continue;
      }
      if (range.line && range.line !== line) throw new Error(`LASLA token ${range.token.form} spans two lines (${sentence})`);
      range.line = line;
      range.token.words.push(word);
      if (Number(id) === range.end) {
        line.tokens.push(range.token);
        range = undefined;
      }
    }
    if (range) throw new Error(`Incomplete LASLA token range in ${sentence}`);
  }
  return lines;
}
