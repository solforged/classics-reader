// scripts/core/outputs.ts gives a search segment [start, end, words] to every written word whose analyses carry a
// segmented form that differs from the written text, so that a query in the separate words finds the word. Here every
// analysis carries the word's vocalized form, so every written word would get a segment, though the Arabic search key
// drops the vowels: the segment of a word with no clitic has the very key of the written word and adds nothing but
// weight to search.json. Only the segments whose key differs (the words of a clitic cluster, set apart by spaces) stay.
import { pack } from "../../../packs/ara";
import type { SearchRow, SearchText } from "../../../scripts/core/types";

/** The key the search page (src/pages/search.astro) builds for a text: each character keyed alone, any space one space. */
function key(text: string): string {
  let out = "";
  for (let i = 0; i < text.length; i++) out += /\s/u.test(text[i]!) ? " " : pack.searchKey(text[i]!);
  return out;
}

/** Rewrites search.json without the segments that add no key; returns how many it kept and dropped. */
export async function dropRedundantSegments(path: string): Promise<{ kept: number; dropped: number }> {
  // The page applies a pack's context rules to the whole key; the comparison above is per span, so it needs none.
  if (pack.searchContext) throw new Error("The Arabic pack has a searchContext: lib/search.ts compares spans without it");
  const rows = JSON.parse(await Bun.file(path).text()) as SearchRow[];
  let kept = 0;
  let dropped = 0;
  for (const row of rows) {
    row[2] = row[2].map((entry): SearchText => {
      if (typeof entry === "string") return entry;
      const [text, segments] = entry;
      const useful = segments.filter(([start, end, words]) => key(words) !== key(text.slice(start, end)));
      kept += useful.length;
      dropped += segments.length - useful.length;
      return useful.length ? [text, useful] : text;
    });
  }
  await Bun.write(path, JSON.stringify(rows));
  return { kept, dropped };
}
