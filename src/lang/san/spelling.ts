// IAST remains intact in lookup keys; only search ignores diacritics.
import { devanagariToIast } from "./script";

export const fold = (text: string): string => text.normalize("NFC").toLowerCase();

const DEVANAGARI = /[\u0900-\u097F]/u;

/** Search key: IAST without diacritics. A query typed in Devanagari is transliterated first. */
export const searchKey = (text: string): string =>
  fold(DEVANAGARI.test(text) ? devanagariToIast(text) : text).normalize("NFD").replace(/\p{M}/gu, "").normalize("NFC");
