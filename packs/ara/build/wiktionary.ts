// Wiktionary's Arabic entries, from kaikki.org's extract of the English Wiktionary (one JSON object per entry per
// part of speech, 868 MB for Arabic). kaikki.org has deprecated that file, so the reader's build does not read it: it
// reads a small extract kept in the repository, which `extractWiktionary` makes (streaming the dump, never loading it
// whole) from the lemmas of the corpus.
//
// What the dump holds: a page is spelt without vowel signs (كتب), and has one entry per word spelt so and per part of
// speech (the verb كَتَبَ, the noun كُتُب, the noun كَتْب), each with its vocalized head word, a head line ("كِتَاب • (kitāb) m
// (plural كُتُب (kutub))") and its senses. 196,000 of the 233,000 entries have no gloss: they are inflection pages
// of the English Wiktionary's own bookkeeping and are left out. Wiktionary records a verbal noun, a plural, a
// participle or another spelling as an entry of its own that "names" its base word (form_of, alt_of); a lookup that
// finds only such entries follows them to the base word, two steps at most, and the extract carries what they point to.
//
// A lemma's entries are the ones whose vocalized head word has its letters and vowels (vocalKey, in the first of the lemma's
// spellings, build/keys.ts, that has any; a head word of "X or Y" alternates counts as each); when none has, the entries spelt
// with its letters whose part of speech is a near class of the word's (NEAR). The corpus's lemmas are CAMeL's vocalizations
// and a page's vocalization can differ from them, so the second kind of match exists, and `lookup` says which it used.
import type { Article, ArticleSection, Sense } from "../../../src/lib/dict";
import { sameShape, skeleton, spellings, vocalKey } from "./keys";

export interface WiktSense {
  glosses: string[];
  /** Tags worth showing (SHOWN_TAGS) and the ones that classify the sense ("form-of", "alt-of"). */
  tags?: string[];
  topics?: string[];
  /** The words this sense names as the standard spelling or the base word. */
  alt_of?: string[];
  form_of?: string[];
}

export interface WiktEntry {
  /** The page title, without vowel signs. */
  word: string;
  /** The vocalized head word. */
  voc: string;
  pos: string;
  /** The head line's expansion: "كِتَاب • (kitāb) m (plural كُتُب (kutub))". */
  head: string;
  senses: WiktSense[];
}

export interface WiktionaryExtract {
  entries: WiktEntry[];
}

/** kaikki's part-of-speech names → the label shown and the UPOS classes whose readings the section describes. */
const POS: Readonly<Record<string, { label: string; classes: readonly string[] }>> = {
  noun: { label: "noun", classes: ["NOUN"] },
  name: { label: "proper noun", classes: ["PROPN"] },
  verb: { label: "verb", classes: ["VERB", "AUX"] },
  adj: { label: "adjective", classes: ["ADJ"] },
  adv: { label: "adverb", classes: ["ADV"] },
  prep: { label: "preposition", classes: ["ADP"] },
  conj: { label: "conjunction", classes: ["CCONJ", "SCONJ"] },
  pron: { label: "pronoun", classes: ["PRON", "DET"] },
  det: { label: "determiner", classes: ["DET"] },
  article: { label: "article", classes: ["DET"] },
  num: { label: "numeral", classes: ["NUM", "ADJ"] },
  intj: { label: "interjection", classes: ["INTJ"] },
  particle: { label: "particle", classes: ["PART", "ADV"] },
  prep_phrase: { label: "prepositional phrase", classes: ["ADV", "ADP"] },
  phrase: { label: "phrase", classes: [] },
  proverb: { label: "proverb", classes: [] },
  prefix: { label: "prefix", classes: [] },
  suffix: { label: "suffix", classes: [] },
  interfix: { label: "interfix", classes: [] },
  character: { label: "letter", classes: ["NOUN"] },
  symbol: { label: "symbol", classes: [] },
  punct: { label: "punctuation mark", classes: [] },
  abbrev: { label: "abbreviation", classes: [] },
  root: { label: "root", classes: [] },
};

/**
 * The classes whose entries stand for a lemma of a class when no entry has its vowels, by the classes `POS` gives each of
 * Wiktionary's parts of speech. Nouns, proper nouns and adjectives are one class of word in Arabic grammar, and CAMeL's
 * noun_prop (UD PROPN) is given to many common nouns (مَعَادِن) and to nisba adjectives. CAMeL and Wiktionary also label
 * function words alike only in part: إِلّا is ADP or SCONJ to CAMeL and a particle or a conjunction to Wiktionary, a particle
 * is an adverb, a preposition or a conjunction as its use goes, and a tanwin adverb (جَمِيعاً, غالِباً) is an adverb or
 * the adjective or noun it comes from. A lemma of a class not listed has no near class.
 */
const NEAR: Readonly<Record<string, readonly string[]>> = {
  NOUN: ["NOUN", "PROPN", "ADJ"], PROPN: ["NOUN", "PROPN", "ADJ"], ADJ: ["NOUN", "PROPN", "ADJ"],
  VERB: ["VERB"], AUX: ["AUX", "VERB", "PART", "ADV"],
  ADP: ["ADP", "PART", "ADV", "CCONJ", "SCONJ"],
  CCONJ: ["CCONJ", "SCONJ", "PART", "ADV", "ADP"], SCONJ: ["CCONJ", "SCONJ", "PART", "ADV", "ADP"],
  PART: ["PART", "ADV", "ADP", "CCONJ", "SCONJ", "INTJ"],
  ADV: ["ADV", "PART", "ADP", "CCONJ", "SCONJ", "ADJ", "NOUN"],
  INTJ: ["INTJ", "PART", "ADV"],
  PRON: ["PRON", "DET", "NOUN"], DET: ["DET", "PRON", "NOUN"],
  NUM: ["NUM", "ADJ", "NOUN"],
};

/** Sense tags shown before a gloss, in Wiktionary's wording, and the ones that classify an entry as an inflection or a spelling. */
const SHOWN_TAGS: Readonly<Record<string, string>> = {
  transitive: "transitive", intransitive: "intransitive", ditransitive: "ditransitive", obsolete: "obsolete",
  archaic: "archaic", dated: "dated", rare: "rare", literary: "literary", figuratively: "figuratively",
  "by-extension": "by extension", broadly: "broadly", colloquial: "colloquial", dialectal: "dialectal",
  Classical: "Classical", poetic: "poetic", historical: "historical", informal: "informal", formal: "formal",
  vulgar: "vulgar", slang: "slang", Quranic: "Quranic", Islam: "Islam",
};
const CLASSIFYING_TAGS: Readonly<Record<string, true>> = { "form-of": true, "alt-of": true };

/** The sense ids kaikki gives a word are not stable, so nothing here keys on them; the order of a page's senses is. */
const keepTags = (tags: readonly string[] | undefined): string[] =>
  (tags ?? []).filter((tag) => Object.hasOwn(SHOWN_TAGS, tag) || Object.hasOwn(CLASSIFYING_TAGS, tag));

// ---------------------------------------------------------------------------------------------------------------
// Extract

interface KaikkiForm { form?: string; tags?: string[] }
interface KaikkiSense {
  glosses?: string[];
  tags?: string[];
  topics?: string[];
  alt_of?: { word?: string }[];
  form_of?: { word?: string }[];
}
interface KaikkiEntry {
  word: string;
  pos: string;
  head_templates?: { expansion?: string }[];
  forms?: KaikkiForm[];
  senses?: KaikkiSense[];
}

/** The lines of a (large) file, one at a time. */
async function* lines(path: string): AsyncGenerator<string> {
  const decoder = new TextDecoder();
  let rest = "";
  for await (const chunk of Bun.file(path).stream()) {
    rest += decoder.decode(chunk, { stream: true });
    let from = 0;
    for (let at = rest.indexOf("\n", from); at >= 0; at = rest.indexOf("\n", from)) {
      yield rest.slice(from, at);
      from = at + 1;
    }
    rest = rest.slice(from);
  }
  rest += decoder.decode();
  if (rest) yield rest;
}

const words = (list: { word?: string }[] | undefined): string[] | undefined => {
  const out = (list ?? []).map((item) => item.word ?? "").filter(Boolean);
  return out.length ? out : undefined;
};

/** An entry with a gloss, reduced to what the reader shows; undefined for an entry without one. */
function slim(raw: KaikkiEntry): WiktEntry | undefined {
  const senses: WiktSense[] = (raw.senses ?? []).filter((sense) => sense.glosses?.some((gloss) => gloss.trim())).map((sense) => {
    const tags = keepTags(sense.tags);
    const topics = sense.topics?.slice(0, 3);
    return {
      glosses: sense.glosses!.map((gloss) => gloss.trim()),
      ...(tags.length ? { tags } : {}),
      ...(topics?.length ? { topics } : {}),
      ...(words(sense.alt_of) ? { alt_of: words(sense.alt_of) } : {}),
      ...(words(sense.form_of) ? { form_of: words(sense.form_of) } : {}),
    };
  });
  if (!senses.length) return undefined;
  if (!Object.hasOwn(POS, raw.pos)) throw new Error(`Wiktionary: unknown part of speech ${raw.pos} (${raw.word})`);
  const head = (raw.head_templates?.[0]?.expansion ?? "").split("\n")[0]!.trim();
  const voc = head.split(" • ")[0]!.trim() || raw.forms?.find((form) => form.tags?.includes("canonical"))?.form || raw.word;
  return { word: raw.word, voc, pos: raw.pos, head, senses };
}

const redirects = (entry: WiktEntry): string[] => entry.senses.flatMap((sense) => [...sense.alt_of ?? [], ...sense.form_of ?? []]);

/** The vocalized head words of an entry: a page that has several ways of vocalizing a word lists them ("إِصْبَع or إِصْبِع or إِصْبُع"). */
const headWords = (entry: WiktEntry): string[] => entry.voc.split(" or ");

/** The vocal keys under which an entry is found: those of its head words, in each of their spellings (build/keys.ts). */
const vocalKeys = (entry: WiktEntry): Set<string> => new Set(headWords(entry).flatMap(spellings).map(vocalKey));

/** The skeleton and the vocal key of each spelling of a word: the pages and the head words it can be found under. */
const keysOf = (word: string): [skeleton: string, vocal: string][] => spellings(word).map((form) => [skeleton(form), vocalKey(form)]);

/**
 * The entries of the lemmas in a kaikki.org dump, and of the words they redirect to (two steps): `kaikkiJsonlPath` is
 * read as a stream. Of the entries spelt like a lemma only those with its vocalization are kept, unless there are
 * none, which is when a lookup falls back to the part of speech. A lemma is looked for under each of its spellings.
 */
export async function extractWiktionary(kaikkiJsonlPath: string, lemmas: Iterable<string>): Promise<WiktionaryExtract> {
  const wanted = new Map<string, Set<string>>();
  for (const lemma of lemmas) {
    for (const [key, vocalized] of keysOf(lemma)) {
      const vocal = wanted.get(key) ?? new Set<string>();
      vocal.add(vocalized);
      wanted.set(key, vocal);
    }
  }
  // One pass keeps every entry with a gloss (about 37,000 of 233,000), small enough to hold; the closure is then in memory.
  const bySkeleton = new Map<string, WiktEntry[]>();
  for await (const line of lines(kaikkiJsonlPath)) {
    if (!line) continue;
    const entry = slim(JSON.parse(line) as KaikkiEntry);
    if (!entry) continue;
    const key = skeleton(entry.word);
    const list = bySkeleton.get(key);
    if (list) list.push(entry);
    else bySkeleton.set(key, [entry]);
  }
  const kept = new Set<WiktEntry>();
  const take = (key: string, vocal: ReadonlySet<string>): WiktEntry[] => {
    const all = bySkeleton.get(key) ?? [];
    const exact = all.filter((entry) => [...vocalKeys(entry)].some((vocalized) => vocal.has(vocalized)));
    return exact.length ? exact : all;
  };
  let frontier: WiktEntry[] = [];
  for (const [key, vocal] of wanted) frontier.push(...take(key, vocal));
  for (let step = 0; step < 3 && frontier.length; step++) {
    const fresh = frontier.filter((entry) => !kept.has(entry));
    for (const entry of fresh) kept.add(entry);
    frontier = fresh.flatMap(redirects).flatMap((target) => keysOf(target).flatMap(([key, vocal]) => take(key, new Set([vocal]))));
  }
  // The dump's order is the page order; the extract keeps it within a page and sorts the pages.
  const order = new Map([...bySkeleton.values()].flat().map((entry, i) => [entry, i] as const));
  const entries = [...kept].sort((a, b) => skeleton(a.word).localeCompare(skeleton(b.word)) || order.get(a)! - order.get(b)!);
  return { entries };
}

/** The extract as JSON text, one entry to a line so that a changed extract reads as a diff. */
export const formatExtract = (extract: WiktionaryExtract): string =>
  `{"entries":[\n${extract.entries.map((entry) => JSON.stringify(entry)).join(",\n")}\n]}\n`;

// ---------------------------------------------------------------------------------------------------------------
// Articles

const esc = (text: string): string => text.replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;");

const ARABIC_RUN = /[\u0600-\u06FF\u0750-\u077F]+(?:\s[\u0600-\u06FF\u0750-\u077F]+)*/gu;

/** Escaped text with every run of Arabic in a lang="ar" span, which sets its direction and font. */
export const markArabic = (text: string): string => esc(text).replace(ARABIC_RUN, (run) => `<span lang="ar">${run}</span>`);

/** A sense that only names an inflected form or another spelling of a base word. */
const derived = (sense: WiktSense): boolean => Boolean(sense.form_of?.length) || Boolean(sense.alt_of?.length) || Boolean(sense.tags?.some((tag) => Object.hasOwn(CLASSIFYING_TAGS, tag)));

/** The gloss as printed: a parent sense introduces its children ("introduces a verb clause …: to, that; …"). */
const glossOf = (sense: WiktSense): string => sense.glosses.join(": ");

export interface WiktLookup {
  /** One article per vocalized head word found, a section per part of speech. */
  articles: Article[];
  /** The head word whose entries were taken when it is not the lemma's own spelling (a redirect, or a vocalization the page does not have). */
  via?: string;
  /** Short gloss for the lexicon list. */
  gloss: string;
  /** "exact" when the head word has the lemma's vowels, "letters" when only its letters and part of speech fit. */
  match: "exact" | "letters";
}

export class Wiktionary {
  private readonly bySkeleton = new Map<string, WiktEntry[]>();

  constructor(extract: WiktionaryExtract) {
    for (const entry of extract.entries) {
      if (!Object.hasOwn(POS, entry.pos)) throw new Error(`Wiktionary: unknown part of speech ${entry.pos} (${entry.word})`);
      const key = skeleton(entry.word);
      const list = this.bySkeleton.get(key);
      if (list) list.push(entry);
      else this.bySkeleton.set(key, [entry]);
    }
  }

  /**
   * The entries spelt like `word` with its vocalization, in the first of its spellings (build/keys.ts) that has any, else (when
   * `fallback`, the lemma's class, is given) those spelt in any of them whose part of speech is a near class of it (`NEAR`) and whose
   * head word has the word's shadda (`sameShape`). A wrong word is worse than none: the vocal key leaves the sukun out, so that
   * a noun's key is a verb's (نَهْر, نَهَرَ), and no verb is taken for a noun, an adjective or a name.
   */
  private spelt(word: string, fallback?: string): { entries: WiktEntry[]; exact: boolean } {
    const keys = keysOf(word);
    const nominal = fallback === "NOUN" || fallback === "ADJ" || fallback === "PROPN";
    for (const [key, vocal] of keys) {
      const exact = (this.bySkeleton.get(key) ?? []).filter((entry) => vocalKeys(entry).has(vocal) && !(nominal && entry.pos === "verb"));
      if (exact.length) return { entries: exact, exact: true };
    }
    if (fallback === undefined) return { entries: [], exact: true };
    const all = [...new Set(keys.flatMap(([key]) => this.bySkeleton.get(key) ?? []))];
    const near = Object.hasOwn(NEAR, fallback) ? NEAR[fallback]! : [];
    const fits = (entry: WiktEntry): boolean => POS[entry.pos]!.classes.some((cls) => near.includes(cls)) && headWords(entry).some((head) => sameShape(word, head, fallback === "VERB"));
    return { entries: all.filter(fits), exact: false };
  }

  lookup(lemma: string, upos: string): WiktLookup | undefined {
    const first = this.spelt(lemma, upos);
    // Entries that only name another word are the base word's inflections or spellings: they bring its entries, and are
    // listed themselves only when nothing else was found.
    let found = first.entries.filter((entry) => entry.senses.some((sense) => !derived(sense)));
    const named = first.entries.filter((entry) => !found.includes(entry));
    let step = named;
    const followed: WiktEntry[] = [];
    for (let hop = 0; hop < 2 && step.length; hop++) {
      const targets = [...new Set(step.flatMap(redirects))];
      step = targets.flatMap((target) => this.spelt(target).entries).filter((entry) => !found.includes(entry) && !followed.includes(entry) && !named.includes(entry));
      followed.push(...step);
    }
    found = [...found, ...followed];
    if (!found.length) found = named;
    if (!found.length) return undefined;

    const byHead = new Map<string, ArticleSection[]>();
    for (const entry of found) {
      const sections = byHead.get(entry.voc) ?? [];
      sections.push(this.section(entry));
      byHead.set(entry.voc, sections);
    }
    const articles = [...byHead].map(([head, sections]) => ({ head, sections }));
    const real = found.find((entry) => entry.senses.some((sense) => !derived(sense)));
    const gloss = real ? glossOf(real.senses.find((sense) => !derived(sense))!) : glossOf(found[0]!.senses[0]!);
    const lemmaKeys = new Set(keysOf(lemma).map(([, vocal]) => vocal));
    const own = [...vocalKeys(found[0]!)].some((vocal) => lemmaKeys.has(vocal));
    return { articles, ...(own ? {} : { via: found[0]!.voc }), gloss: shortGloss(gloss), match: first.exact ? "exact" : "letters" };
  }

  private section(entry: WiktEntry): ArticleSection {
    const pos = POS[entry.pos]!;
    // Wiktionary's own order: its first sense is the common one. A sense that only names a base word stays when it is
    // all the entry has (and reads "plural of كِتَاب"); beside real senses it is the entry's own relation and is kept first.
    const senses: Sense[] = entry.senses.slice(0, 10).map((sense, i, all) => {
      const shown = (sense.tags ?? []).filter((tag) => Object.hasOwn(SHOWN_TAGS, tag)).map((tag) => SHOWN_TAGS[tag]!);
      const label = [...shown, ...sense.topics ?? []];
      return {
        ...(all.length > 1 ? { marker: `${i + 1}.` } : {}),
        gloss: `${label.length ? `<i>(${esc(label.join(", "))})</i> ` : ""}${markArabic(glossOf(sense))}`,
      };
    });
    const grammar = entry.head.includes(" • ") ? entry.head.slice(entry.head.indexOf(" • ") + 3) : "";
    return {
      label: `<i>${pos.label}</i> `,
      ...(grammar ? { grammar: markArabic(grammar) } : {}),
      senses,
      ...(pos.classes.length ? { classes: [...pos.classes] } : {}),
    };
  }
}

/** A gloss reduced to its first clause, for a list. */
function shortGloss(gloss: string): string {
  const clause = gloss.split(/[;,(]/u)[0]!.trim();
  return clause.length <= 70 ? clause : `${clause.slice(0, 70).trimEnd()}…`;
}
