// Citations: "Vsp 45", "Gylf 12", "BhG 12.47", "Aen. 1.742". A work's abbreviation may already carry its outermost
// division ("BhG 12" is chapter 12, "Aen. 1" is book 1); the citation then continues it with a dot.
import type { WorkInfo } from "../sites/types";

export type CiteWork = Pick<WorkInfo, "slug" | "abbr" | "levels">;

/** The abbreviation's trailing number ("1" in "Aen. 1"), when it names a division. */
const abbrNumber = (abbr: string): string | undefined => abbr.match(/\s(\d+)$/)?.[1];

/**
 * A citation as printed: the abbreviation and a row id or numbered line. When the abbreviation ends with the
 * citation's first level ("Aen. 1" and "1.742"), that number is not repeated.
 */
export function formatCite(work: CiteWork, cite: string): string {
  const number = abbrNumber(work.abbr);
  if (number === undefined) return `${work.abbr} ${cite}`;
  const parts = cite.split(".");
  if (work.levels.length > 1 && parts.length > 1 && parts[0] === number) return `${work.abbr}.${parts.slice(1).join(".")}`;
  return `${work.abbr}.${cite}`;
}

/** Lowercase, without accents, with dots, commas, colons and spaces as single spaces: "Aen. 1.157" → "aen 1 157". */
function key(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[\s.,:]+/g, " ").trim();
}

/**
 * The work and row or line a typed citation names, or undefined when it names no work. The longest abbreviation
 * that the input starts with wins, so "HHv 3" is not read as "HH" and "BhG 12" not as "BhG 1". The returned
 * citation is "" when the input names only the work.
 */
export function resolveCite(input: string, works: readonly CiteWork[]): { slug: string; cite: string } | undefined {
  const typed = key(input);
  let best: { work: CiteWork; length: number } | undefined;
  for (const work of works) {
    const abbr = key(work.abbr);
    if (!abbr || (typed !== abbr && !typed.startsWith(`${abbr} `))) continue;
    if (!best || abbr.length > best.length) best = { work, length: abbr.length };
  }
  if (!best) return undefined;
  const { work, length } = best;
  const rest = typed.slice(length).split(" ").filter(Boolean);
  const number = abbrNumber(work.abbr);
  // "Aen. 1.157" cites book 1, line 157: the abbreviation supplies the outer level the input left out.
  const parts = number !== undefined && rest.length > 0 && rest.length < work.levels.length ? [number, ...rest] : rest;
  return { slug: work.slug, cite: parts.join(".") };
}
