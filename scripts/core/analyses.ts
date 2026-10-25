// Per-work analysis table shared by every build: deduplicates analyses into Work.analyses and tags candidates for
// unannotated forms. What counts as a candidate (a form index, spelling rules) comes from the language pack's build.
import type { Analysis } from "./types";

export interface AnalysisTableOptions {
  /** Readings a form has elsewhere in the annotated edition or in a form list; edition readings ("e") become "a". */
  lookup?: (surface: string) => Analysis[];
  /** Proper-name lemma for a capitalized form with no other readings; tagged "n". */
  names?: (surface: string) => string | undefined;
  /** Normalizes a lemma's morphology before it is stored (e.g. pronoun subclasses). */
  morph?: (lemma: string, morph: string) => string;
}

/** Per-work analysis table; ids index into Work.analyses. */
export class AnalysisTable {
  readonly list: Analysis[] = [];
  private readonly ids = new Map<string, number>();

  constructor(private readonly options: AnalysisTableOptions = {}) {}

  add(a: Analysis): number {
    const morph = this.options.morph?.(a[0], a[1]) ?? a[1];
    if (morph !== a[1]) a = a[3] === undefined ? [a[0], morph, a[2]] : [a[0], morph, a[2], a[3]];
    const k = a.join("\t");
    let id = this.ids.get(k);
    if (id === undefined) {
      id = this.list.length;
      this.list.push(a);
      this.ids.set(k, id);
    }
    return id;
  }

  /** Candidate analyses for an unannotated surface form. Attested-elsewhere entries are tagged "a". */
  lookup(surface: string): number[] {
    const analyses = this.options.lookup?.(surface) ?? [];
    if (!analyses.length && /^\p{Lu}/u.test(surface)) {
      const lemma = this.options.names?.(surface);
      if (lemma) return [this.add([lemma, "PROPN", "n"])];
    }
    return analyses.map((a) => this.add([a[0], a[1], a[2] === "e" ? "a" : a[2]]));
  }
}
