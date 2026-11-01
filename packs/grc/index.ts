import type { LanguagePack } from "../../src/lang/types";
import { DICTIONARIES } from "./dictionaries";
import { describeMorph } from "./morph";
import { fold, searchKey } from "./spelling";

export const pack: LanguagePack = {
  code: "grc",
  name: "Ancient Greek",
  fold,
  searchKey,
  describeMorph,
  dictionaries: DICTIONARIES,
};
