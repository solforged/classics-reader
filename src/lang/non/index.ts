import type { LanguagePack } from "../types";
import { DICTIONARIES } from "./dictionaries";
import { describeMorph } from "./morph";
import { fold, searchKey } from "./spelling";

export const oldNorse: LanguagePack = {
  code: "non",
  name: "Old Norse",
  fold,
  searchKey,
  describeMorph,
  dictionaries: DICTIONARIES,
};
