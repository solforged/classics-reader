import type { LanguagePack } from "../types";
import { DICTIONARIES } from "./dictionaries";
import { describeMorph } from "./morph";
import { iastToDevanagari } from "./script";
import { fold, searchKey } from "./spelling";

export const sanskrit: LanguagePack = {
  code: "sa-Latn",
  name: "Sanskrit",
  fold,
  searchKey,
  describeMorph,
  dictionaries: DICTIONARIES,
  scriptLabel: "IAST",
  scripts: [{ id: "deva", label: "देवनागरी", tag: "sa-Deva", convert: iastToDevanagari }],
};
