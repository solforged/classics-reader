// Finds a dictionary's entries for a lemma. The treebank's lemmas and Perseus's headwords agree letter for letter in
// most cases (spelling.ts headwordKey); where a dictionary has no entry spelled just so, one that differs only in
// the accent answers (the treebank writes the enclitic τε, the dictionaries τέ).
import { headwordKey, looseKey, unaccent } from "../spelling";
import type { LexiconEntry } from "./lexica";

export interface Found {
  entries: LexiconEntry[];
  /** "accent": found only by ignoring accents. */
  how: "exact" | "accent";
}

export class HeadwordIndex {
  private readonly exact = new Map<string, LexiconEntry[]>();
  private readonly loose = new Map<string, LexiconEntry[]>();

  constructor(entries: readonly LexiconEntry[]) {
    for (const entry of entries) {
      for (const key of new Set(entry.keys)) {
        this.exact.set(key, [...(this.exact.get(key) ?? []), entry]);
        const loose = unaccent(key);
        this.loose.set(loose, [...(this.loose.get(loose) ?? []), entry]);
      }
    }
  }

  /** The entries naming the lemma, in dictionary order; undefined when there are none. */
  find(lemma: string): Found | undefined {
    const order = (entries: readonly LexiconEntry[]) => [...new Set(entries)];
    const exact = this.exact.get(headwordKey(lemma));
    if (exact) return { entries: order(exact), how: "exact" };
    const loose = this.loose.get(looseKey(lemma));
    return loose ? { entries: order(loose), how: "accent" } : undefined;
  }
}
