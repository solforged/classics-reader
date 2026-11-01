// Turns ISWOC's lemmas into the lemmas the reader shows and finds each one's dictionary entries: Bosworth–Toller
// first (under the lemma's key, or the other spelling it prints, packs/ang/build/lemmas.ts), Wiktionary for what
// Bosworth–Toller lacks. The lemma shown is Bosworth–Toller's headword with macrons (hālig, not ISWOC's halig),
// Wiktionary's for a word only it has, and ISWOC's own otherwise. Dictionary shards are keyed by fold(lemma shown).
import type { DictHit } from "../../../src/lib/dict";
import { fold } from "../spelling";
import { btKey, btLemma, type BtDictionary } from "./bt";
import { FIXES, SPELLINGS, WITHOUT_ENTRY } from "./lemmas";
import type { Wiktionary } from "./wiktionary";

export interface Resolved {
  /** The lemma as shown. */
  lemma: string;
  source: "bt" | "wikt" | "none";
  /** The dictionary key of the entries (Bosworth–Toller's or Wiktionary's key; the shard key is fold(lemma)). */
  key: string;
  /** The headword the dictionary prints, when it is not the lemma shown. */
  via?: string;
}

const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

export class Lexicon {
  private readonly resolved = new Map<string, Resolved>();
  private readonly shards = new Map<string, Resolved>();
  private readonly used = new Set<string>();
  /** Lemmas found only by adding or dropping the prefix ge-, for the build to report. */
  readonly prefixed: string[] = [];
  /** Lemmas that nothing explains: no entry in either dictionary and not in WITHOUT_ENTRY, or Wiktionary alone has one. */
  readonly problems: string[] = [];

  constructor(private readonly bt: BtDictionary, private readonly wikt: Wiktionary) {}

  /** The lemma of an ISWOC token ("pos" is its PROIEL tag, "upos" its UD class); throws when nothing explains a missing entry. */
  resolve(lemma: string, pos: string, upos: string): Resolved {
    const memo = `${lemma}\t${pos}\t${upos}`;
    const known = this.resolved.get(memo);
    if (known) return known;
    const found = this.find(lemma, pos, upos);
    this.resolved.set(memo, found);
    const shard = fold(found.lemma);
    const other = this.shards.get(shard);
    if (other && (other.source !== found.source || other.key !== found.key || other.via !== found.via)) {
      throw new Error(`Lemma ${found.lemma} is found under two dictionary keys: ${JSON.stringify(other)} and ${JSON.stringify(found)}`);
    }
    this.shards.set(shard, found);
    return found;
  }

  private table(table: Readonly<Record<string, string>>, lemma: string, pos: string): string | undefined {
    for (const key of [`${lemma}:${pos}`, lemma]) {
      if (Object.hasOwn(table, key)) {
        this.used.add(`${table === FIXES ? "FIXES" : "SPELLINGS"} ${key}`);
        return table[key];
      }
    }
    return undefined;
  }

  private find(lemma: string, pos: string, upos: string): Resolved {
    const name = upos === "PROPN";
    const fixed = this.table(FIXES, lemma, pos) ?? lemma;
    const spelling = this.table(SPELLINGS, lemma, pos);
    // ISWOC's lemmas are lowercase except for names; "&" is the manuscripts' sign for and.
    const own = (fixed === "&" ? "and" : fixed.replace(/#\d+$/u, "")).replace(/^\p{Lu}/u, (c) => (name || pos === "Nb" ? c : c.toLowerCase()));
    // Latin and Hebrew words in the text (F-) are not Old English and have no entry.
    if (pos === "F-") return { lemma: own, source: "none", key: fold(own) };
    const key = btKey(spelling ?? own);
    let btFound = this.bt.has(key) ? key : undefined;
    if (!btFound && !spelling) {
      for (const variant of [`ge${key}`, key.startsWith("ge") ? key.slice(2) : ""]) {
        if (variant.length > 2 && this.bt.has(variant)) {
          btFound = variant;
          this.prefixed.push(`${lemma} → ${variant}`);
          break;
        }
      }
    }
    const article = btFound ? this.bt.article(btFound) : undefined;
    if (btFound && article) {
      const head = btLemma(this.bt.headword(btFound, upos)!);
      const printed = article.via ?? head;
      // A lemma ISWOC spells otherwise than the dictionary keeps ISWOC's spelling.
      const shown = spelling || btFound !== key ? own : name ? capitalize(head) : head;
      return { lemma: shown, source: "bt", key: btFound, ...(fold(printed) !== fold(shown) || article.via ? { via: printed } : {}) };
    }
    const wiktKey = fold(spelling ?? own);
    const without = Object.hasOwn(WITHOUT_ENTRY, lemma);
    if (without) this.used.add(`WITHOUT_ENTRY ${lemma}`);
    if (this.wikt.has(wiktKey)) {
      if (!name && !without) this.problems.push(`${lemma} (${pos}): Wiktionary has an entry but Bosworth–Toller has none`);
      return { lemma: this.wikt.headword(wiktKey, name) ?? own, source: "wikt", key: wiktKey };
    }
    if (!name && !without && pos !== "F-") this.problems.push(`${lemma} (${pos}): no dictionary entry`);
    return { lemma: own, source: "none", key: fold(own) };
  }

  /** Entries of the exception tables that no token used. */
  unused(): string[] {
    const all = [
      ...Object.keys(FIXES).map((key) => `FIXES ${key}`), ...Object.keys(SPELLINGS).map((key) => `SPELLINGS ${key}`),
      ...Object.keys(WITHOUT_ENTRY).map((key) => `WITHOUT_ENTRY ${key}`),
    ];
    return all.filter((entry) => !this.used.has(entry));
  }

  /** Dictionary records for every lemma resolved, keyed by fold(lemma shown). */
  records(): Map<string, DictHit> {
    const out = new Map<string, DictHit>();
    for (const [shard, found] of this.shards) {
      if (found.source === "bt") {
        const article = this.bt.article(found.key)!;
        out.set(shard, { entries: { bt: article.articles }, ...(found.via ? { via: found.via } : {}) });
      } else if (found.source === "wikt") {
        out.set(shard, { entries: { wikt: this.wikt.article(found.key, /^\p{Lu}/u.test(found.lemma))! } });
      }
    }
    return out;
  }

  /** The lexicon's gloss for a lemma and word class. */
  gloss(lemma: string, upos: string): string {
    const found = this.shards.get(fold(lemma));
    if (!found) return "";
    if (found.source === "bt") return this.bt.gloss(found.key, upos);
    if (found.source === "wikt") return this.wikt.gloss(found.key, /^\p{Lu}/u.test(found.lemma));
    return "";
  }
}
