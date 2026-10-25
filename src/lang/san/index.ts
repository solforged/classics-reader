import type { LanguagePack } from "../types";
import { DICTIONARIES } from "./dictionaries";
import { describeMorph } from "./morph";
import { fold, searchKey } from "./spelling";

export const sanskrit: LanguagePack = {
  code: "sa-Latn",
  name: "Sanskrit",
  fold,
  searchKey,
  describeMorph,
  dictionaries: DICTIONARIES,
};
