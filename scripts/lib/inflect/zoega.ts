// Grammar notes at the head of Zoëga entries, e.g. "(gen. dals, dat. dal or dali, pl. dalar or dalir), m." or
// "(gef; gaf, gáfum; gefinn), v.", split by homograph section (I), II) …).
import type { DictEntry } from "../../../src/lib/dict";

/** A generated table: cell key (src/lib/paradigm.ts) → forms, an inflection-class label and the note it came from. */
export interface Generated {
  cells: Record<string, string[]>;
  label: string;
  note: string;
}

export interface GrammarNote {
  /** Inside of the leading parentheses, e.g. "gen. dals, dat. dal or dali, pl. dalar or dalir"; "" if none. */
  paren: string;
  /** Word-class marker after the parentheses: "m.", "f.", "n.", "a.", "v.", "v. refl.", "m. pl.", "pron." …; "" if none. */
  pos: string;
  /** The note as printed, parentheses and marker, e.g. "(-s, -ar), m.". */
  text: string;
}

const strip = (html: string) =>
  html
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

const POS = /^(?:(?:m|f|n)\. pl\.|v\. refl\.|v\. impers\.|pron\.|num\.|adv\.|prep\.|conj\.|interj\.|a\.|m\.|f\.|n\.|v\.)/;

/** Grammar notes of each homograph section of a Zoëga entry, in order. */
export function grammarNotes(entry: DictEntry): GrammarNote[] {
  const text = strip(entry.d.join(" "));
  const sections = text.split(/(?:^|\s)[IVX]+\)\s/).filter((s) => s.trim());
  return sections.map((section) => {
    let rest = section.trim();
    let paren = "";
    if (rest.startsWith("(")) {
      let depth = 0;
      let end = -1;
      for (let i = 0; i < rest.length; i++) {
        if (rest[i] === "(") depth++;
        else if (rest[i] === ")" && --depth === 0) {
          end = i;
          break;
        }
      }
      if (end > 0) {
        paren = rest.slice(1, end).trim();
        rest = rest.slice(end + 1).replace(/^,?\s*/, "");
      }
    }
    const pos = rest.match(POS)?.[0] ?? "";
    const indeclinable = rest.slice(pos.length).match(/^\s*indecl\./)?.[0].trim() ?? "";
    const printed = `${paren ? `(${paren})` : ""}${paren && pos ? ", " : ""}${pos}${indeclinable ? ` ${indeclinable}` : ""}`;
    return { paren, pos, text: printed };
  });
}
