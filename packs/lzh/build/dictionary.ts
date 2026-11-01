// Assembles a lemma's dictionary record (src/lib/dict.ts) from the treebank's own glosses, Wiktionary and Unihan, and
// its reading line: pinyin (with Middle Chinese) from Wiktionary, else Unihan, else composed from the characters of a
// name when each has a single modern reading.
import type { Article, DictHit } from "../../../src/lib/dict";
import { describeMorph, glossText } from "../morph";
import type { UnihanChar } from "./unihan";
import { type WiktEntry, wiktionaryArticle, wiktionaryReadings } from "./wiktionary";

/** What the treebank says about one lemma. */
export interface LemmaUse {
  /** The lemma as shown. */
  lemma: string;
  /** UPOS → morphology string → occurrences. */
  morphs: Map<string, Map<string, number>>;
  /** UPOS → the treebank's gloss → occurrences. */
  glosses: Map<string, Map<string, number>>;
}

export interface Lookups {
  wiktionary: ReadonlyMap<string, readonly WiktEntry[]>;
  unihan: ReadonlyMap<string, UnihanChar>;
}

const esc = (text: string): string => text.replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;");
const TONED = /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜńňǹḿ]/u;
const byCount = <T,>(map: ReadonlyMap<T, number>): T[] => [...map].sort((a, b) => b[1] - a[1]).map(([key]) => key);

/** The most frequent of a UPOS's morphology strings. */
export const commonMorph = (use: LemmaUse, upos: string): string => byCount(use.morphs.get(upos)!)[0]!;

/** The treebank's glosses for each class of the lemma, most frequent class and gloss first. */
function kyotoArticle(use: LemmaUse): Article {
  const classes = byCount(new Map([...use.glosses].map(([upos, glosses]) => [upos, [...glosses.values()].reduce((a, b) => a + b, 0)])));
  return {
    head: use.lemma,
    sections: classes.map((upos) => ({
      grammar: esc(describeMorph(commonMorph(use, upos)).pos),
      senses: byCount(use.glosses.get(upos)!).map((gloss) => ({
        gloss: `${esc(glossText(gloss).text)} <span class="gloss-count">×${use.glosses.get(upos)!.get(gloss)}</span>`,
      })),
    })),
  };
}

/** Readings of a headword: Wiktionary's, without a neutral-tone one beside toned ones. */
function wiktionaryReading(entries: readonly WiktEntry[] | undefined): { pinyin: string; mc: string[] }[] {
  const all = entries ? wiktionaryReadings(entries) : [];
  const toned = all.filter((reading) => TONED.test(reading.pinyin));
  return toned.length ? toned : all;
}

/** A character's modern pinyin readings: Wiktionary's, else Unihan's Xiandai Hanyu Cidian ones. */
function charReadings(char: string, lookups: Lookups): string[] {
  const own = wiktionaryReading(lookups.wiktionary.get(char));
  if (own.length) return own.map((reading) => reading.pinyin);
  const unihan = lookups.unihan.get(char);
  return unihan ? [...new Set(unihan.readings.length ? unihan.readings : unihan.mandarin ? [unihan.mandarin] : [])] : [];
}

/** The reading line, or undefined when the lemma has no unambiguous reading. */
export function readingLine(lemma: string, lookups: Lookups): string | undefined {
  const own = wiktionaryReading(lookups.wiktionary.get(lemma));
  if (own.length) return own.map((reading) => (reading.mc.length ? `${reading.pinyin} (MC ${reading.mc.join(", ")})` : reading.pinyin)).join(", ");
  const chars = [...lemma].map((char) => charReadings(char, lookups));
  if (chars.some((readings) => !readings.length)) return undefined;
  if (chars.length === 1) return chars[0]!.join(", ");
  return chars.every((readings) => readings.length === 1) ? chars.map((readings) => readings[0]!).join("") : undefined;
}

/** The first pinyin of a reading line, for the lexicon's short gloss. */
export const firstPinyin = (reading: string): string => reading.split(/,| \(/u)[0]!.trim();

export function dictionaryRecord(use: LemmaUse, lookups: Lookups): DictHit {
  const entries: Record<string, Article[]> = { kyoto: [kyotoArticle(use)] };
  const wiktionary = wiktionaryArticle(use.lemma, lookups.wiktionary.get(use.lemma) ?? []);
  if (wiktionary) entries.wiktionary = [wiktionary];
  const unihan = lookups.unihan.get(use.lemma);
  if (unihan?.definition) {
    const cantonese = unihan.cantonese.length ? ` · Cantonese ${unihan.cantonese.join(", ")}` : "";
    entries.unihan = [{ head: use.lemma, sections: [{ text: `${esc(unihan.definition)}${cantonese}` }] }];
  }
  const reading = readingLine(use.lemma, lookups);
  return { entries, ...(reading ? { reading } : {}) };
}
