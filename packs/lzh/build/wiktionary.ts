// Wiktionary's Chinese entries, as corpora/analects/fetch.ts reduces the kaikki.org dump: for each headword of the
// treebank its entries (one per reading of a character, or one per part of speech of a word) with their senses and
// their Mandarin, Middle Chinese and Old Chinese pronunciations. This builds the word panel's articles and the
// lemma's reading line (pinyin with Middle Chinese).
import type { Article, ArticleSection, Sense } from "../../../src/lib/dict";

export interface WiktSense {
  glosses?: string[];
  tags?: string[];
  raw_tags?: string[];
  alt_of?: string[];
  form_of?: string[];
}

export interface WiktEntry {
  word: string;
  pos: string;
  senses: WiktSense[];
  sounds: { zh_pron: string; tags: string[] }[];
}

/** One reading of a headword. */
export interface Reading {
  pinyin: string[];
  /** Middle Chinese in Baxter's transcription. */
  mc: string[];
  /** Old Chinese: Baxter–Sagart and Zhengzhang reconstructions. */
  bs: string[];
  zz: string[];
}

export function parseWiktionary(source: string): Map<string, WiktEntry[]> {
  const out = new Map<string, WiktEntry[]>();
  for (const line of source.split("\n")) {
    if (!line) continue;
    const entry = JSON.parse(line) as WiktEntry;
    out.set(entry.word, [...(out.get(entry.word) ?? []), entry]);
  }
  return out;
}

const esc = (text: string): string => text.replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;");

/** Senses of other Chinese languages and registers than a reader of the classics needs. */
const MODERN = [
  "Cantonese", "Hokkien", "Min", "Southern", "Eastern", "Teochew", "Hakka", "Wu", "Taiwanese-Hokkien", "Quanzhou", "Xiamen",
  "Zhangzhou", "Zhangzhou-Hokkien", "Puxian-Min", "Hong-Kong", "Mainland-China", "Internet", "neologism", "slang",
  "dialectal", "Mandarin", "Singapore", "Malaysia", "Taiwan", "Leizhou", "Teochew", "Jin", "Gan", "Xiang", "Northern",
  "Hainanese", "Hokkien-Taiwanese", "Shanghainese", "Singapore-Hokkien", "Philippine-Hokkien", "Penang-Hokkien", "Jinjiang",
  "Tong'an", "Sixian", "Hailu", "Meixian", "Hui", "Chengdu", "Sichuanese", "Xi'an", "Nanjing", "Guangzhou",
];
const PERIOD = ["literary", "Classical", "archaic", "obsolete", "historical"];

/** The reading information of one entry: its pinyin (standard pronunciation), Middle and Old Chinese. */
export function readingOf(entry: WiktEntry): Reading {
  const tagged = (tag: string) => entry.sounds.filter((sound) => sound.tags.includes(tag)).map((sound) => sound.zh_pron);
  const standard = entry.sounds.filter((sound) => sound.tags.includes("Pinyin") && !sound.tags.includes("phonetic")
    && (sound.tags.includes("Standard-Chinese") || sound.tags.includes("Standard")));
  const pinyin = standard.map((sound) => sound.zh_pron.replace(/\s*\(.*\)$/u, ""));
  const old = (system: string) => entry.sounds.filter((sound) => sound.tags.includes("Old-Chinese") && sound.tags.includes(system))
    .map((sound) => sound.zh_pron.replace(/^\/|\/$/gu, ""));
  return { pinyin: [...new Set(pinyin)], mc: [...new Set(tagged("Middle-Chinese"))], bs: [...new Set(old("Baxter-Sagart"))], zz: [...new Set(old("Zhengzhang"))] };
}

/** Wiktionary parts of speech and the treebank's UPOS classes they can describe. */
const CLASSES: Record<string, string[]> = {
  noun: ["NOUN"], name: ["PROPN"], num: ["NUM"], verb: ["VERB", "AUX"], adj: ["VERB"], pron: ["PRON"], det: ["PRON"],
  adv: ["ADV"], prep: ["ADP"], conj: ["CCONJ", "SCONJ"], particle: ["PART"], suffix: ["PART"], intj: ["INTJ"],
};

/** An entry's usable senses: no other Chinese language, a gloss; period tags first, then Wiktionary's order. */
function senses(entry: WiktEntry): Sense[] {
  const usable = entry.senses.filter((sense) => sense.glosses?.length && !(sense.tags ?? []).some((tag) => MODERN.includes(tag)));
  const rank = (sense: WiktSense) => (sense.alt_of?.length || sense.form_of?.length ? 2 : (sense.tags ?? []).some((tag) => PERIOD.includes(tag)) ? 0 : 1);
  const ordered = usable.map((sense, i) => ({ sense, i })).sort((a, b) => rank(a.sense) - rank(b.sense) || a.i - b.i);
  return ordered.map(({ sense }, n) => {
    const tags = (sense.tags ?? []).filter((tag) => !["alt-of", "alternative", "form-of"].includes(tag));
    const prefix = tags.length ? `<em>(${esc(tags.join(", ").replaceAll("-", " "))})</em> ` : "";
    return { marker: `${n + 1}.`, gloss: prefix + esc(sense.glosses!.join(" ")) };
  });
}

/** Sections for one headword's entries; a character's entries without a standard Mandarin reading are other languages'. */
function sections(entries: readonly WiktEntry[]): ArticleSection[] {
  const out: ArticleSection[] = [];
  for (const entry of entries) {
    if (entry.pos === "soft-redirect") continue;
    const reading = readingOf(entry);
    const character = entry.pos === "character";
    if (character && !reading.pinyin.length) continue;
    const list = senses(entry);
    if (!list.length) continue;
    const parts = [
      character ? "" : `<i>${esc(entry.pos)}</i>`,
      reading.mc.length ? `MC <i>${esc(reading.mc.join(", "))}</i>` : "",
      reading.bs.length || reading.zz.length
        ? `OC ${[...reading.bs.map((form) => `<i>${esc(form)}</i> (BS)`), ...reading.zz.map((form) => `<i>${esc(form)}</i> (ZZ)`)].join(", ")}`
        : "",
    ].filter(Boolean);
    out.push({
      ...(reading.pinyin.length ? { label: `<strong>${esc(reading.pinyin.join(" / "))}</strong>` } : {}),
      ...(parts.length ? { grammar: `${reading.pinyin.length ? " · " : ""}${parts.join(" · ")}` } : {}),
      senses: list,
      ...(CLASSES[entry.pos] ? { classes: CLASSES[entry.pos]! } : {}),
    });
  }
  return out;
}

/** The article for a headword: its Wiktionary entries as sections. Undefined when none has a usable sense. */
export function wiktionaryArticle(head: string, entries: readonly WiktEntry[]): Article | undefined {
  const out = sections(entries);
  return out.length ? { head, sections: out } : undefined;
}

/** Pinyin readings of a headword with their Middle Chinese, from the entries with a standard Mandarin reading. */
export function wiktionaryReadings(entries: readonly WiktEntry[]): { pinyin: string; mc: string[] }[] {
  const out = new Map<string, Set<string>>();
  for (const entry of entries) {
    if (entry.pos === "soft-redirect") continue;
    const reading = readingOf(entry);
    for (const pinyin of reading.pinyin.slice(0, entry.pos === "character" ? 1 : undefined)) {
      const mc = out.get(pinyin) ?? new Set<string>();
      for (const form of reading.mc) mc.add(form);
      out.set(pinyin, mc);
    }
  }
  return [...out].map(([pinyin, mc]) => ({ pinyin, mc: [...mc] }));
}
