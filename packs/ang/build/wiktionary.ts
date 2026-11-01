// Reads the Old English entries of English Wiktionary as kaikki.org extracts them (one JSON object per line): the
// fallback for lemmas Bosworth–Toller lacks and for proper names. Headwords in the file are unmarked ("halig");
// the entry's head template gives the scholarly form ("hāliġ"), which is shown without the dots over c and g so
// that it spells like the rest of the reader (hālig).
import type { Article, ArticleSection, Sense } from "../../../src/lib/dict";
import { fold } from "../spelling";

interface RawSense {
  glosses?: string[];
  tags?: string[];
}

interface RawEntry {
  word: string;
  pos: string;
  head_templates?: { expansion?: string }[];
  senses?: RawSense[];
}

export interface WiktEntry {
  /** The headword with length marks, without dots. */
  head: string;
  pos: string;
  /** The head template's expansion: "ġifta f pl". */
  grammar: string;
  glosses: string[];
}

const POS: Record<string, string> = {
  noun: "noun", verb: "verb", adj: "adjective", adv: "adverb", prep: "preposition", conj: "conjunction",
  pron: "pronoun", det: "determiner", num: "numeral", name: "proper noun", particle: "particle", intj: "interjection",
  article: "article", phrase: "phrase", prefix: "prefix", suffix: "suffix", postp: "postposition",
};

const esc = (text: string): string => text.replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;");

/** Without the dots over c and g that Wiktionary writes (ċ, ġ); length marks stay. */
const undot = (text: string): string => text.normalize("NFD").replace(/\u0307/gu, "").normalize("NFC");

export class Wiktionary {
  private readonly byKey = new Map<string, WiktEntry[]>();

  constructor(jsonl: string) {
    for (const line of jsonl.split("\n")) {
      if (!line) continue;
      const raw = JSON.parse(line) as RawEntry;
      const glosses = (raw.senses ?? []).flatMap((sense) => (sense.glosses ?? []).slice(-1));
      if (!glosses.length) continue;
      const expansion = raw.head_templates?.[0]?.expansion ?? "";
      const head = undot((expansion.split(/\s+/u)[0] ?? "") || raw.word);
      // The expansion's first word must be the headword itself, not a label.
      const entry: WiktEntry = {
        head: fold(head) === fold(raw.word) ? head : raw.word,
        pos: raw.pos, grammar: expansion ? undot(expansion) : "", glosses,
      };
      const key = fold(raw.word);
      const list = this.byKey.get(key);
      if (list) list.push(entry);
      else this.byKey.set(key, [entry]);
    }
  }

  has(key: string): boolean {
    return this.byKey.has(key);
  }

  /** The entries under a key, a capitalized name before a common word when `name` is set. */
  entries(key: string, name = false): WiktEntry[] {
    const all = this.byKey.get(key) ?? [];
    const proper = all.filter((entry) => /^\p{Lu}/u.test(entry.head));
    return name && proper.length ? proper : all;
  }

  /** The lemma as shown: the first entry's head, capitalized as the entry is. */
  headword(key: string, name = false): string | undefined {
    return this.entries(key, name)[0]?.head;
  }

  /** An article per printed headword, a section per entry. */
  article(key: string, name = false): Article[] | undefined {
    const entries = this.entries(key, name);
    if (!entries.length) return undefined;
    const byHead = new Map<string, ArticleSection[]>();
    for (const entry of entries) {
      const senses: Sense[] = entry.glosses.slice(0, 8).map((gloss, i, all) => ({
        ...(all.length > 1 ? { marker: `${i + 1}.` } : {}), gloss: esc(gloss),
      }));
      const section: ArticleSection = {
        label: `<i>${esc(POS[entry.pos] ?? entry.pos)}</i> `,
        ...(entry.grammar && entry.grammar !== entry.head ? { grammar: esc(entry.grammar) } : {}),
        senses,
      };
      const sections = byHead.get(entry.head);
      if (sections) sections.push(section);
      else byHead.set(entry.head, [section]);
    }
    return [...byHead].map(([head, sections]) => ({ head, sections }));
  }

  /** A short gloss for the lexicon. */
  gloss(key: string, name = false): string {
    return this.entries(key, name)[0]?.glosses[0] ?? "";
  }
}
