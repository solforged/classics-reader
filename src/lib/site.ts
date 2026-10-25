// Build-time access to the catalog, work data and lexicon for Astro pages.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { GROUPS, WORKS, type WorkDef } from "../../scripts/catalog";
import type { Work } from "../../scripts/lib/types";
import lexicon from "../data/lexicon.json";
import { fold, shardOf } from "./norse";

export { GROUPS, WORKS, type WorkDef };

const workFiles = import.meta.glob<Work>("../data/works/*.json", { eager: true, import: "default" });

export function loadWork(slug: string): Work {
  const w = workFiles[`../data/works/${slug}.json`];
  if (!w) throw new Error(`no data for ${slug}; run bun run data`);
  return w;
}

export const workBySlug = new Map(WORKS.map((w) => [w.slug, w]));

export interface LemmaStat {
  lemma: string;
  pos: string;
  count: number;
  works: Record<string, number>;
  occ: [string, string, string, number][];
  gloss: string;
}

export const LEXICON = lexicon as LemmaStat[];

/** URL slugs for lemma pages: lowercase, unique even on case-insensitive file systems. */
export const lemmaSlugs = (() => {
  const map = new Map<string, string>();
  const taken = new Set<string>();
  for (const { lemma } of LEXICON) {
    const base = lemma.normalize("NFC").toLowerCase().replace(/[\s/?#%\\]+/g, "-");
    let slug = base;
    for (let i = 2; taken.has(slug); i++) slug = `${base}-${i}`;
    taken.add(slug);
    map.set(lemma, slug);
  }
  return map;
})();

export const lemmaCounts = new Map(LEXICON.map((l) => [l.lemma, l.count]));

export const base = import.meta.env.BASE_URL.replace(/\/?$/, "/");

export interface DictHit {
  z?: { w: string; d: string[] }[];
  c?: { w: string; d: string[] }[];
  w?: { pos: string; glosses: string[] }[];
}

const shards = new Map<string, Record<string, DictHit>>();
/** Dictionary entries for a lemma, read from the shards the word panel fetches. */
export function dictionaryEntry(lemma: string): DictHit | undefined {
  const shard = shardOf(lemma);
  let data = shards.get(shard);
  if (!data) {
    try {
      data = JSON.parse(readFileSync(join(process.cwd(), "public", "lex", `${shard}.json`), "utf8")) as Record<string, DictHit>;
    } catch {
      data = {}; // no corpus lemma with a dictionary entry starts with this letter
    }
    shards.set(shard, data);
  }
  return data[fold(lemma)];
}

export function sourceLine(def: WorkDef): { on: string; en: string } {
  const on = def.snorra
    ? "Snorra Edda, ed. Guðni Jónsson (via Icelandic Wikisource / Heimskringla.no)"
    : def.eae && def.bugge
      ? "Codex Regius, EAE electronic edition (2024); stanzas 30–37 from Bugge (1867)"
      : def.eae
        ? "Codex Regius (GKS 2365 4to), EAE electronic edition (2024)"
        : "Sophus Bugge, Norrœn fornkvæði (1867)";
  const en = def.bellows
    ? "Henry Adams Bellows (1923)"
    : def.brodeur
      ? "Arthur Gilchrist Brodeur (1916)"
      : "No public-domain English translation";
  return { on, en };
}
