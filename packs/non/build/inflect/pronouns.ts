// Zoëga lists manngi and its genitive, but gives no complete -gi declension to extrapolate.
import type { DictEntry } from "../../../../src/lib/dict";
import { fold } from "../../spelling";
import { grammarNotes, type Generated } from "./zoega";

/** Only the explicitly listed nominative and genitive; unsupported cases stay empty. */
export function inflectPronoun(lemma: string, entry: DictEntry): Generated | undefined {
  if (fold(lemma) !== "manngi" || fold(entry.w) !== "manngi") return undefined;
  for (const note of grammarNotes(entry)) {
    if (note.pos !== "pron.") continue;
    const genitive = note.paren.match(/^gen\. ([a-záéíóúýæœöøǫǿðþ]+)$/)?.[1];
    if (!genitive) continue;
    return {
      cells: { "|nsm": [entry.w], "|gsm": [genitive] },
      label: "partial pronominal declension",
      note: `${note.text}; nominative and genitive only`,
    };
  }
  return undefined;
}
