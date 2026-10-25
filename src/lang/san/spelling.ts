// IAST remains intact in lookup keys; only search ignores diacritics.
import { devanagariToIast } from "./script";

export const fold = (text: string): string => text.normalize("NFC").toLowerCase();

const DEVANAGARI = /[\u0900-\u097F]/u;

/**
 * Anusvāra and a class nasal spell the same sound before a stop (saṃjaya, sañjaya; kiṃkara, kiṅkara): once
 * diacritics are gone, m before a non-labial stop reads n. Before a labial both are already m.
 */
export const searchContext = (key: string): string => key.replace(/m(?=[kgcjtd])/g, "n");

/** Search key: IAST without diacritics. A query typed in Devanagari is transliterated first. */
export const searchKey = (text: string): string => searchContext(
  fold(DEVANAGARI.test(text) ? devanagariToIast(text) : text).normalize("NFD").replace(/\p{M}/gu, "").normalize("NFC"),
);
