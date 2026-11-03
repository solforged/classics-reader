import type { LanguagePack } from "../../src/lang/types";
import { DICTIONARIES } from "./dictionaries";
import { describeMorph } from "./morph";
import { fold, searchKey } from "./spelling";

export const pack: LanguagePack = {
  code: "ar",
  name: "Classical Arabic",
  dir: "rtl",
  fold,
  searchKey,
  describeMorph,
  dictionaries: DICTIONARIES,
};
