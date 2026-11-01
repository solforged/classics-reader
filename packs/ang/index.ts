import type { LanguagePack } from "../../src/lang/types";
import { DICTIONARIES } from "./dictionaries";
import { describeMorph } from "./morph";
import { fold, searchKey } from "./spelling";

export const pack: LanguagePack = {
  code: "ang",
  name: "Old English",
  fold,
  searchKey,
  describeMorph,
  dictionaries: DICTIONARIES,
};
