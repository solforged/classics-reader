import type { LanguagePack } from "../../src/lang/types";
import { DICTIONARIES } from "./dictionaries";
import { describeMorph } from "./morph";
import { fold, searchKey } from "./spelling";

export const pack: LanguagePack = {
  // Classical Chinese in the traditional script: the script subtag makes browsers choose traditional glyph forms.
  code: "lzh-Hant",
  name: "Classical Chinese",
  fold,
  searchKey,
  describeMorph,
  dictionaries: DICTIONARIES,
};
