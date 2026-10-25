// Shared by every reader's build: writes what the pages and the word panel read, under generated/<id>/.
//   data/works/<slug>.json   aligned rows, analyses, notes, intro per work
//   data/lexicon.json        lemma frequencies and concordance (build-time only)
//   public/lex/<shard>.json  dictionary records (src/lib/dict.ts), fetched by the word panel
//   public/para/<shard>.json inflection tables (src/lib/paradigm.ts)
//   public/search.json       full-text search index
// static/ (favicon) is copied into public/.
import { cp, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { shardFile } from "../../src/lib/shard";
import { parseMorph } from "../../src/lib/morph";
import type { Analysis, LemmaStat, Row, SearchRow, Work } from "../lib/types";

export const ROOT = join(import.meta.dir, "..", "..");

/**
 * A row's search entry. The source-language text joins units and lines with " / ". Written forms whose edition
 * analyses give the words differently (sandhi, compounds: parayopetāste = parayā upetāḥ te) add a segment
 * [start, end, words] over the text, so a query in the separate words finds the written form.
 */
function searchRow(slug: string, row: Row, analyses: readonly Analysis[]): SearchRow {
  let on = "";
  const segments: [number, number, string][] = [];
  row.on.forEach((unit, u) => unit.lines.forEach((line, l) => {
    if (u || l) on += " / ";
    for (const piece of line) {
      if (typeof piece === "string") {
        on += piece;
        continue;
      }
      const words = piece[1].map((id) => analyses[id]!).filter((a) => a[2] === "e" && a[3]).map((a) => a[3]!).join(" ");
      const start = on.length;
      on += piece[0];
      if (words && words !== piece[0]) segments.push([start, on.length, words]);
    }
  }));
  const en = row.en.map((u) => u.lines.join(" / ")).join(" / ");
  return segments.length ? [slug, row.id, on, en, segments] : [slug, row.id, on, en];
}

export class Outputs {
  readonly data: string;
  readonly public: string;

  constructor(readonly id: string) {
    this.data = join(ROOT, "generated", id, "data");
    this.public = join(ROOT, "generated", id, "public");
  }

  /** Empties the outputs and copies the static assets. */
  async reset(): Promise<void> {
    await rm(join(ROOT, "generated", this.id), { recursive: true, force: true });
    for (const dir of [join(this.data, "works"), join(this.public, "lex"), join(this.public, "para")]) {
      await mkdir(dir, { recursive: true });
    }
    await cp(join(ROOT, "static"), this.public, { recursive: true });
  }

  async writeWork(work: Work): Promise<void> {
    await Bun.write(join(this.data, "works", `${work.slug}.json`), JSON.stringify(work));
  }

  /** Records keyed by the pack's fold(lemma), split into shard files. */
  async writeShards(dir: "lex" | "para", records: ReadonlyMap<string, unknown>): Promise<void> {
    const shards = new Map<string, Record<string, unknown>>();
    for (const [key, record] of records) {
      const shard = shardFile(key);
      const rec = shards.get(shard) ?? {};
      rec[key] = record;
      shards.set(shard, rec);
    }
    for (const [shard, rec] of shards) await Bun.write(join(this.public, dir, `${shard}.json`), JSON.stringify(rec));
  }
}

export interface WorkCounts {
  words: number;
  /** Words with at least one analysis. */
  parsed: number;
  /** Words the edition annotates. */
  annotated: number;
}

const pct = (a: number, b: number) => `${b ? ((100 * a) / b).toFixed(1) : "0.0"}%`.padStart(6);

/** One line of build statistics for a work. */
export function statsLine(slug: string, rows: number, counts: WorkCounts): string {
  return `${slug.padEnd(28)} rows ${String(rows).padStart(4)}  words ${String(counts.words).padStart(6)}  ` +
    `annotated ${pct(counts.annotated, counts.words)}  with analysis ${pct(counts.parsed, counts.words)}`;
}

interface LemmaBucket {
  lemma: string;
  morph: string;
  morphs: string[];
  count: number;
  works: Record<string, number>;
  occ: [string, string, string, number, number][];
}

/** Full-text search rows and the lexicon's frequencies and concordance lines. */
export class Concordance {
  private readonly search: SearchRow[] = [];
  private readonly lemmas = new Map<string, Map<string, LemmaBucket>>();
  private occurrence = 0;

  /** Counts a work's words: edition-annotated lemmas, plus candidates that agree on a single lemma. */
  addWork(slug: string, rows: readonly Row[], analyses: readonly Analysis[]): WorkCounts {
    const counts: WorkCounts = { words: 0, parsed: 0, annotated: 0 };
    for (const row of rows) {
      this.search.push(searchRow(slug, row, analyses));
      for (const u of row.on) {
        for (const line of u.lines) {
          const lineText = line.map((p) => (typeof p === "string" ? p : p[0])).join("");
          for (const p of line) {
            if (typeof p === "string") continue;
            counts.words++;
            if (p[1].length) counts.parsed++;
            const as = p[1].map((id) => analyses[id]!);
            if (as.some((a) => a[2] === "e")) counts.annotated++;
            const lemmaSet = new Set(as.filter((a) => a[2] === "e").map((a) => a[0]));
            let probable = 0;
            if (!lemmaSet.size) {
              const cands = new Set(as.map((a) => a[0]));
              if (cands.size === 1) {
                lemmaSet.add([...cands][0]!);
                probable = 1;
              }
            }
            for (const lemma of lemmaSet) {
              const readings = as.filter((a) => a[0] === lemma && (!as.some((a) => a[2] === "e") || a[2] === "e"));
              const morphs = [...new Map(readings.map((a) => [parseMorph(a[1]).upos, a[1]])).values()];
              const key = morphs.map((morph) => parseMorph(morph).upos).sort().join("|");
              let buckets = this.lemmas.get(lemma);
              if (!buckets) this.lemmas.set(lemma, buckets = new Map());
              let st = buckets.get(key);
              if (!st) {
                st = { lemma, morph: readings[0]?.[1] ?? "", morphs, count: 0, works: {}, occ: [] };
                buckets.set(key, st);
              }
              st.count++;
              st.works[slug] = (st.works[slug] ?? 0) + 1;
              if (st.occ.length < 400) st.occ.push([slug, row.id, lineText.replace(p[0], `⟦${p[0]}⟧`), probable, this.occurrence]);
              this.occurrence++;
            }
          }
        }
      }
    }
    return counts;
  }

  get size(): number {
    return this.lemmas.size;
  }

  async write(
    outputs: Outputs,
    glossFor: (lemma: string, morph: string) => string,
    classFor: (lemma: string, morph: string) => string | undefined = () => "",
  ): Promise<void> {
    await Bun.write(join(outputs.public, "search.json"), JSON.stringify(this.search));
    const lexicon: LemmaStat[] = [];
    for (const [lemma, buckets] of this.lemmas) {
      const groups = new Map<string, LemmaBucket & { classes: Set<string> }>();
      for (const bucket of buckets.values()) {
        const keys = new Set(bucket.morphs.map((morph) => classFor(lemma, morph)));
        // An unannotated reading must agree on the homograph, not merely its spelling.
        if (keys.size !== 1 || keys.has(undefined)) continue;
        const key = [...keys][0]!;
        let group = groups.get(key);
        if (!group) {
          group = { ...bucket, count: 0, works: {}, occ: [], classes: new Set() };
          groups.set(key, group);
        }
        group.count += bucket.count;
        for (const [slug, count] of Object.entries(bucket.works)) group.works[slug] = (group.works[slug] ?? 0) + count;
        group.occ.push(...bucket.occ);
        for (const morph of bucket.morphs) group.classes.add(parseMorph(morph).upos);
      }
      let first = true;
      for (const [key, group] of groups) {
        lexicon.push({
          lemma, morph: group.morph,
          ...(groups.size > 1 ? { classes: [...group.classes], ...(!first ? { homograph: key } : {}) } : {}),
          count: group.count, works: group.works,
          occ: group.occ.sort((a, b) => a[4] - b[4]).slice(0, 400).map(([slug, row, line, probable]) => [slug, row, line, probable]),
          gloss: glossFor(lemma, group.morph),
        });
        first = false;
      }
    }
    lexicon.sort((a, b) => b.count - a.count);
    await Bun.write(join(outputs.data, "lexicon.json"), JSON.stringify(lexicon));
  }
}
