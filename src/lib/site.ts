// Build-time access to the active site's works, lexicon and shards (generated/<site>/, scripts/core/outputs.ts).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { LemmaStat, Work } from "../../scripts/lib/types";
import { lang, shardOf } from "../lang";
import { site } from "../sites";
import type { WorkInfo } from "../sites/types";
import type { DictHit } from "./dict";
import type { Paradigm } from "./paradigm";

export { site, type LemmaStat, type WorkInfo };
export const WORKS = site.works;
export const GROUPS = site.groups;

const DATA = join(process.cwd(), "generated", site.id, "data");
const PUBLIC = join(process.cwd(), "generated", site.id, "public");
const readJson = <T,>(path: string): T => JSON.parse(readFileSync(path, "utf8")) as T;

const works = new Map<string, Work>();
export function loadWork(slug: string): Work {
  let w = works.get(slug);
  if (!w) {
    try {
      w = readJson<Work>(join(DATA, "works", `${slug}.json`));
    } catch {
      throw new Error(`no data for ${slug}; run the ${site.id} data build`);
    }
    works.set(slug, w);
  }
  return w;
}

export const workBySlug = new Map(WORKS.map((w) => [w.slug, w]));

export const LEXICON = readJson<LemmaStat[]>(join(DATA, "lexicon.json"));

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

const shards = new Map<string, Record<string, DictHit>>();
/** Dictionary entries for a lemma, read from the shards the word panel fetches. */
export function dictionaryEntry(lemma: string): DictHit | undefined {
  const shard = shardOf(lemma);
  let data = shards.get(shard);
  if (!data) {
    try {
      data = readJson<Record<string, DictHit>>(join(PUBLIC, "lex", `${shard}.json`));
    } catch {
      data = {}; // no corpus lemma with a dictionary entry starts with this letter
    }
    shards.set(shard, data);
  }
  return data[lang.fold(lemma)];
}

const paradigmShards = new Map<string, Record<string, Paradigm[]>>();
/** Inflection tables from the same shards fetched by the word panel. */
export function paradigms(lemma: string): Paradigm[] {
  const shard = shardOf(lemma);
  let data = paradigmShards.get(shard);
  if (!data) {
    try {
      data = readJson<Record<string, Paradigm[]>>(join(PUBLIC, "para", `${shard}.json`));
    } catch {
      data = {};
    }
    paradigmShards.set(shard, data);
  }
  const records = data[lang.fold(lemma)] ?? [];
  const exact = records.filter((record) => record.lemma === lemma);
  return exact.length ? exact : records;
}
