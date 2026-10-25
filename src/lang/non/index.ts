import type { LanguagePack } from "../types";
import { DICTIONARIES, suffixEntry } from "./dictionaries";
import { describeMorph } from "./morph";
import { morphCells, paradigmKind } from "./paradigm";
import { fold, searchKey } from "./spelling";
import { paradigmHtml } from "./tables";

export const oldNorse: LanguagePack = {
  code: "non",
  name: "Old Norse",
  fold,
  searchKey,
  describeMorph,
  dictionaries: DICTIONARIES,
  dictionaryEntry: suffixEntry,
  tables: {
    kind: paradigmKind,
    cells: morphCells,
    heading: (kind) => (kind === "verb" ? "Conjugation" : "Declension"),
    html: paradigmHtml,
  },
};
