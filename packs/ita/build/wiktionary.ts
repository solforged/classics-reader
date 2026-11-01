// Wiktionary's Italian entries, as corpora/dante/fetch.ts reduces the kaikki.org dump: one entry per headword and part
// of speech, with its head line ("sùrgere (first-person singular present sùrgo, …)") and its senses' glosses and
// tags. Wiktionary records Dante's spellings as archaic or poetic forms of the modern word (surgere, "Alternative
// form of sorgere"), and inflected forms as pages of their own (cammino, "first-person singular present indicative of
// camminare"). A lookup takes the entries spelt like the treebank's lemma, leaves out pages that only name an
// inflected form, and follows a page that only names another spelling to that spelling's entries.
import type { Article, ArticleSection, Sense } from "../../../src/lib/dict";
import { fold, looseKey } from "../spelling";

export interface WiktSense {
  glosses?: string[];
  tags?: string[];
  /** The standard spelling this sense names ("Alternative form of sorgere"). */
  alt_of?: string[];
  /** The base word of an inflected form ("first-person singular present indicative of camminare"). */
  form_of?: string[];
}

export interface WiktEntry {
  word: string;
  pos: string;
  /** The head template's expansion. */
  head: string;
  senses: WiktSense[];
}

/** The headwords an entry's senses name as their standard spelling or base word. */
export const redirects = (entry: WiktEntry): string[] => entry.senses.flatMap((sense) => [...sense.alt_of ?? [], ...sense.form_of ?? []]);

const POS: Record<string, { label: string; classes: string[] }> = {
  noun: { label: "noun", classes: ["NOUN"] },
  name: { label: "proper noun", classes: ["PROPN"] },
  verb: { label: "verb", classes: ["VERB", "AUX"] },
  adj: { label: "adjective", classes: ["ADJ"] },
  adv: { label: "adverb", classes: ["ADV"] },
  prep: { label: "preposition", classes: ["ADP"] },
  conj: { label: "conjunction", classes: ["CCONJ", "SCONJ"] },
  pron: { label: "pronoun", classes: ["PRON"] },
  det: { label: "determiner", classes: ["DET"] },
  article: { label: "article", classes: ["DET"] },
  num: { label: "numeral", classes: ["NUM", "ADJ"] },
  intj: { label: "interjection", classes: ["INTJ"] },
  particle: { label: "particle", classes: ["PART", "ADV"] },
  contraction: { label: "contraction", classes: ["ADP", "DET"] },
  prep_phrase: { label: "prepositional phrase", classes: ["ADV", "ADP"] },
  phrase: { label: "phrase", classes: [] },
  prefix: { label: "prefix", classes: [] },
  suffix: { label: "suffix", classes: [] },
  character: { label: "letter", classes: ["NOUN"] },
  symbol: { label: "symbol", classes: [] },
  punct: { label: "punctuation mark", classes: [] },
  romanization: { label: "romanization", classes: [] },
  proverb: { label: "proverb", classes: [] },
};

/** Sense tags shown before a gloss, in Wiktionary's wording: period and register labels, and the verb's use. */
const SHOWN_TAGS: Readonly<Record<string, string>> = {
  archaic: "archaic", obsolete: "obsolete", poetic: "poetic", literary: "literary", dated: "dated", rare: "rare",
  historical: "historical", figuratively: "figuratively", "by-extension": "by extension", broadly: "broadly",
  transitive: "transitive", intransitive: "intransitive", pronominal: "pronominal", reflexive: "reflexive",
  impersonal: "impersonal", auxiliary: "auxiliary", regional: "regional", dialectal: "dialectal", Tuscany: "Tuscany",
  informal: "informal", formal: "formal", uncommon: "uncommon", Christianity: "Christianity", religion: "religion",
};

const esc = (text: string): string => text.replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;");

/** A sense that only names an inflected form of another word. */
const inflection = (sense: WiktSense): boolean => Boolean(sense.form_of?.length) || (sense.tags ?? []).includes("form-of");
/** A sense that only names another spelling. */
const alternative = (sense: WiktSense): boolean => Boolean(sense.alt_of?.length);

/** The gloss as printed: the innermost sense's gloss, after its parent's when the parent introduces it ("inflection of X:"). */
const glossOf = (sense: WiktSense): string => {
  const glosses = sense.glosses ?? [];
  const last = glosses.at(-1) ?? "";
  return glosses.length > 1 && glosses[0]!.endsWith(":") ? `${glosses[0]} ${last}` : last;
};

export interface WiktLookup {
  /** One article per headword found, a section per part of speech. */
  articles: Article[];
  /** The headword whose entries were taken, when it is not spelt like the lemma (accents, or another spelling). */
  via?: string;
  /** Short gloss for the lexicon list. */
  gloss: string;
}

export class Wiktionary {
  private readonly byKey = new Map<string, WiktEntry[]>();
  private readonly byLoose = new Map<string, WiktEntry[]>();

  constructor(jsonl: string) {
    for (const line of jsonl.split("\n")) {
      if (!line) continue;
      const entry = JSON.parse(line) as WiktEntry;
      if (!(entry.pos in POS)) throw new Error(`Wiktionary: unknown part of speech ${entry.pos} (${entry.word})`);
      for (const [map, key] of [[this.byKey, fold(entry.word)], [this.byLoose, looseKey(entry.word)]] as const) {
        const list = map.get(key);
        if (list) list.push(entry);
        else map.set(key, [entry]);
      }
    }
  }

  /** Entries spelt as `word`, capitalized ones only for a name and lower-case ones otherwise when both exist. */
  private spelt(word: string, name: boolean, loose: boolean): WiktEntry[] {
    const all = (loose ? this.byLoose.get(looseKey(word)) : this.byKey.get(fold(word))) ?? [];
    const proper = all.filter((entry) => /^\p{Lu}/u.test(entry.word));
    const common = all.filter((entry) => !/^\p{Lu}/u.test(entry.word));
    const cased = name ? (proper.length ? proper : common) : (common.length ? common : proper);
    // Pages that only name an inflected form describe another lemma.
    return cased.filter((entry) => !entry.senses.every(inflection));
  }

  /**
   * The entries for a treebank lemma: spelt exactly (accents included), else ignoring accents and apostrophes; a
   * headword whose senses all name another spelling also brings that spelling's entries (two steps at most).
   */
  lookup(lemma: string, upos: string): WiktLookup | undefined {
    const name = upos === "PROPN";
    let entries = this.spelt(lemma, name, false);
    if (!entries.length) entries = this.spelt(lemma, name, true);
    // A verb Wiktionary lists only as pronominal: accorgere under accorgersi, pentire under pentirsi.
    if (!entries.length && (upos === "VERB" || upos === "AUX") && /[aei]re$/u.test(lemma)) entries = this.spelt(`${lemma.slice(0, -1)}si`, name, false);
    if (!entries.length) return undefined;
    const found = [...entries];
    for (let step = 0; step < 2; step++) {
      const last = found.slice(-entries.length);
      const targets = [...new Set(last.filter((entry) => entry.senses.every((sense) => alternative(sense) || !glossOf(sense))).flatMap(redirects))];
      entries = targets.flatMap((target) => this.spelt(target, name, false)).filter((entry) => !found.includes(entry));
      if (!entries.length) break;
      found.push(...entries);
    }
    const byHead = new Map<string, ArticleSection[]>();
    for (const entry of found) {
      const sections = byHead.get(entry.word) ?? [];
      const section = this.section(entry);
      if (section) sections.push(section);
      byHead.set(entry.word, sections);
    }
    const articles = [...byHead].filter(([, sections]) => sections.length).map(([head, sections]) => ({ head, sections }));
    if (!articles.length) return undefined;
    const first = found[0]!.word;
    const real = found.find((entry) => entry.senses.some((sense) => !alternative(sense) && !inflection(sense) && glossOf(sense)));
    const gloss = real ? glossOf(real.senses.find((sense) => !alternative(sense) && !inflection(sense) && glossOf(sense))!) : "";
    return { articles, ...(fold(first) !== fold(lemma) ? { via: first } : {}), gloss };
  }

  private section(entry: WiktEntry): ArticleSection | undefined {
    const pos = POS[entry.pos]!;
    const usable = entry.senses.filter((sense) => glossOf(sense) && !inflection(sense));
    if (!usable.length) return undefined;
    // Wiktionary's own order: its first sense is the common one (selva: forest), its archaic senses are labelled.
    const senses: Sense[] = usable.slice(0, 10).map((sense, i, all) => {
      const tags = (sense.tags ?? []).filter((tag) => tag in SHOWN_TAGS).map((tag) => SHOWN_TAGS[tag]);
      const label = tags.length ? `<i>(${tags.join(", ")})</i> ` : "";
      return { ...(all.length > 1 ? { marker: `${i + 1}.` } : {}), gloss: `${label}${esc(glossOf(sense))}` };
    });
    const grammar = entry.head && fold(entry.head) !== fold(entry.word) ? esc(entry.head) : "";
    return {
      label: `<i>${pos.label}</i> `,
      ...(grammar ? { grammar } : {}),
      senses,
      ...(pos.classes.length ? { classes: pos.classes } : {}),
    };
  }
}
