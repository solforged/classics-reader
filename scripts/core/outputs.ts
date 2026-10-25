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

/** Full-text search rows and the lexicon's frequencies and concordance lines. */
export class Concordance {
  private readonly search: SearchRow[] = [];
  private readonly lemmas = new Map<string, Omit<LemmaStat, "gloss">>();

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
              let st = this.lemmas.get(lemma);
              if (!st) {
                st = { lemma, morph: as.find((a) => a[0] === lemma)?.[1] ?? "", count: 0, works: {}, occ: [] };
                this.lemmas.set(lemma, st);
              }
              st.count++;
              st.works[slug] = (st.works[slug] ?? 0) + 1;
              if (st.occ.length < 400) st.occ.push([slug, row.id, lineText.replace(p[0], `⟦${p[0]}⟧`), probable]);
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

  async write(outputs: Outputs, glossFor: (lemma: string) => string): Promise<void> {
    await Bun.write(join(outputs.public, "search.json"), JSON.stringify(this.search));
    const lexicon: LemmaStat[] = [...this.lemmas.values()]
      .sort((a, b) => b.count - a.count)
      .map((l) => ({ ...l, gloss: glossFor(l.lemma) }));
    await Bun.write(join(outputs.data, "lexicon.json"), JSON.stringify(lexicon));
  }
}
