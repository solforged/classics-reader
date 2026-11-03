// Citations: "Vsp 45", "Gylf 12", "BhG 12.47", "Aen. 1.742", "Muq. 1.2.14". A work's abbreviation may already carry its
// outermost division ("BhG 12" is chapter 12, "Aen. 1" is book 1) or its outermost divisions ("Muq. 1.2" is chapter 1,
// discussion 2); the citation then continues it with a dot.
import type { WorkInfo } from "../sites/types";

export type CiteWork = Pick<WorkInfo, "slug" | "abbr" | "levels">;

/** The abbreviation's trailing number ("1" in "Aen. 1", "1.2" in "Muq. 1.2"), when it names divisions. */
const abbrNumber = (abbr: string): string | undefined => abbr.match(/\s(\d+(?:\.\d+)*)$/)?.[1];

/**
 * A citation as printed: the abbreviation and a row id or numbered line. When the abbreviation ends with the
 * citation's first level ("Aen. 1" and "1.742"), that number is not repeated.
 */
export function formatCite(work: CiteWork, cite: string): string {
  const number = abbrNumber(work.abbr);
  if (number === undefined) return `${work.abbr} ${cite}`;
  if (work.levels.length > 1 && cite.startsWith(`${number}.`)) return `${work.abbr}.${cite.slice(number.length + 1)}`;
  return `${work.abbr}.${cite}`;
}

/** Lowercase, without accents, with dots, commas, colons and spaces as single spaces: "Aen. 1.157" → "aen 1 157". */
export function citeKey(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[\s.,:]+/g, " ").trim();
}

/**
 * The work and row or line a typed citation names, or undefined when it names no work. The longest abbreviation
 * that the input starts with wins, so "HHv 3" is not read as "HH" and "BhG 12" not as "BhG 1". A work is passed
 * over when the citation has more values than the work has levels: across readers, "Od 1.1" is the Odyssey
 * ("Od. 1"), not Oddrúnargrátr ("Od"), whose stanzas have one number. The returned citation is "" when the input
 * names only the work.
 */
export function resolveCite<W extends CiteWork>(input: string, works: readonly W[]): { work: W; cite: string } | undefined {
  const typed = citeKey(input);
  let best: { work: W; cite: string; length: number } | undefined;
  for (const work of works) {
    const abbr = citeKey(work.abbr);
    if (!abbr || (typed !== abbr && !typed.startsWith(`${abbr} `))) continue;
    if (best && abbr.length <= best.length) continue;
    const rest = typed.slice(abbr.length).split(" ").filter(Boolean);
    const outer = abbrNumber(work.abbr)?.split(".") ?? [];
    // "Aen. 1.157" cites book 1, line 157: the abbreviation supplies the outer levels the input left out.
    const parts = outer.length > 0 && rest.length > 0 && outer.length + rest.length <= work.levels.length ? [...outer, ...rest] : rest;
    if (parts.length > work.levels.length) continue;
    best = { work, cite: parts.join("."), length: abbr.length };
  }
  return best && { work: best.work, cite: best.cite };
}

/** A work in the library's citation index: the works of every reader on the combined site. */
export interface LibraryWork extends CiteWork {
  /** Reader id, the reader's directory under the library root. */
  reader: string;
  title: string;
}

/** A reader in the citation index. */
export interface LibraryReader {
  id: string;
  name: string;
  shortName: string;
  /** English name of the reader's language, e.g. "Old Norse". */
  language: string;
  eyebrow: string;
}

/** The combined site's citation index (scripts/library.ts), published as citations.json at the library root. */
export interface CitationIndex {
  readers: LibraryReader[];
  works: LibraryWork[];
}
