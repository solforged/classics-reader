// Cuts the parsed Muqaddimah (lib/openiti.ts) into review units and writes what the later steps start from:
//
//   data/units.json          the works, their units, each unit's paragraph ids, word count, headings and `continues`
//                            (the ids of the rows that carry on the edition paragraph of the row before)
//   <--rows file>            the rows by unit, as JSON, which tools/annotate.py reads
//   <--scratch dir>/<unit>.tsv  "<pid>\t<Arabic>" per row for translators (headings start with "### ", the lines of a
//                            verse row are separated by " / ")
//
// A unit is at most MAX_WORDS words and lies inside one work; it is cut between rows, never right after a heading and
// never inside an edition paragraph that parseOpenITI cut into several rows (a unit never opens with a `continues` row).
// A work that fits is one unit named after it ("preface"); a longer one is cut into the fewest units that fit, as even
// as the rows allow ("introduction-1", "introduction-2").
//
//   bun corpora/muqaddimah/tools/units.ts [--source FILE] [--rows /tmp/muq-build/rows.json] [--scratch /tmp/muq-build/ar]
//
// --source defaults to the file fetch.ts leaves in the cache. The source hash is checked against sources.ts.
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { ROOT } from "../../../scripts/core/outputs";
import { countWords, FIRST_LINE, LAST_LINE, parseOpenITI, type OitiRow, type OitiWork } from "../lib/openiti";
import { DERIVED, OPENITI } from "../sources";
import { createHash } from "node:crypto";

export const MAX_WORDS = 4500;
export const UNITS_FILE = join(ROOT, "corpora", "muqaddimah", "data", "units.json");

export interface UnitPlan {
  id: string;
  work: string;
  rows: OitiRow[];
  words: number;
}

/** Cuts a work's rows into k consecutive groups, minimising the largest, then the sum of squares. */
function cut(rows: readonly OitiRow[], k: number): number[] | null {
  const n = rows.length;
  const size = rows.map((row) => countWords(row.text));
  const prefix = [0];
  for (const s of size) prefix.push(prefix.at(-1)! + s);
  const valid = (at: number): boolean => at === 0 || at === n || (rows[at - 1]!.kind !== "head" && !rows[at]!.continues);
  type Cost = { max: number; square: number; from: number };
  const best: (Cost | undefined)[][] = Array.from({ length: k + 1 }, () => new Array<Cost | undefined>(n + 1));
  best[0]![0] = { max: 0, square: 0, from: -1 };
  for (let j = 1; j <= k; j++) {
    for (let i = 1; i <= n; i++) {
      if (!valid(i)) continue;
      for (let p = 0; p < i; p++) {
        const before = best[j - 1]![p];
        if (!before || !valid(p)) continue;
        const words = prefix[i]! - prefix[p]!;
        const max = Math.max(before.max, words);
        const square = before.square + words * words;
        const now = best[j]![i];
        if (!now || max < now.max || (max === now.max && square < now.square)) best[j]![i] = { max, square, from: p };
      }
    }
  }
  const end = best[k]![n];
  if (!end || end.max > MAX_WORDS) return null;
  const cuts: number[] = [];
  let at = n;
  for (let j = k; j > 0; j--) {
    cuts.unshift(at);
    at = best[j]![at]!.from;
  }
  return cuts;
}

export function planUnits(works: readonly OitiWork[]): UnitPlan[] {
  const plans: UnitPlan[] = [];
  for (const work of works) {
    const total = work.rows.reduce((sum, row) => sum + countWords(row.text), 0);
    let cuts: number[] | null = null;
    for (let k = Math.max(1, Math.ceil(total / MAX_WORDS)); k <= work.rows.length && !cuts; k++) cuts = cut(work.rows, k);
    if (!cuts) throw new Error(`${work.slug}: no way to cut ${total} words into units of at most ${MAX_WORDS}`);
    let from = 0;
    cuts.forEach((to, index) => {
      const rows = work.rows.slice(from, to);
      plans.push({
        id: cuts!.length === 1 ? work.slug : `${work.slug}-${index + 1}`, work: work.slug, rows,
        words: rows.reduce((sum, row) => sum + countWords(row.text), 0),
      });
      from = to;
    });
  }
  return plans;
}

const strings = (values: readonly string[]): string => `[${values.map((v) => JSON.stringify(v)).join(", ")}]`;

/** data/units.json, with the pids of a unit on one line. */
export function unitsJson(works: readonly OitiWork[], plans: readonly UnitPlan[]): string {
  const out: string[] = ["{"];
  out.push(`  "source": { "url": ${JSON.stringify(OPENITI.url)}, "sha256": ${JSON.stringify(OPENITI.sha256)}, "lines": [${FIRST_LINE}, ${LAST_LINE}] },`);
  out.push('  "works": [');
  out.push(works.map((work) => `    { "slug": ${JSON.stringify(work.slug)}, "title_ar": ${JSON.stringify(work.titleAr)}, "title_en": ${JSON.stringify(work.titleEn)}, "units": ${strings(plans.filter((p) => p.work === work.slug).map((p) => p.id))} }`).join(",\n"));
  out.push("  ],");
  out.push('  "units": [');
  out.push(plans.map((plan) => {
    const headings = plan.rows.filter((row) => row.kind === "head").map((row) => `${JSON.stringify(row.pid)}: ${row.level}`).join(", ");
    const continues = plan.rows.filter((row) => row.continues).map((row) => row.pid);
    return `    { "id": ${JSON.stringify(plan.id)}, "work": ${JSON.stringify(plan.work)}, "words": ${plan.words},\n      "headings": { ${headings} },\n      "continues": ${strings(continues)},\n      "pids": ${strings(plan.rows.map((row) => row.pid))} }`;
  }).join(",\n"));
  out.push("  ]", "}");
  return out.join("\n") + "\n";
}

/** The scratch line of a row: heading marker, and " / " between the lines of verse. */
export const scratchLine = (row: OitiRow): string => `${row.pid}\t${row.kind === "head" ? "### " : ""}${row.kind === "verse" ? row.lines!.join(" / ") : row.text}`;

if (import.meta.main) {
  const arg = (name: string, fallback: string): string => {
    const at = process.argv.indexOf(name);
    return at >= 0 ? process.argv[at + 1]! : fallback;
  };
  const source = arg("--source", join(ROOT, ".cache", "sources", "muqaddimah", DERIVED.openiti));
  const bytes = new Uint8Array(await Bun.file(source).arrayBuffer());
  const sha = createHash("sha256").update(bytes).digest("hex");
  if (sha !== OPENITI.sha256) throw new Error(`${source}: SHA-256 ${sha}, pin ${OPENITI.sha256}`);
  const works = parseOpenITI(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  const plans = planUnits(works);

  await Bun.write(UNITS_FILE, unitsJson(works, plans));
  const rowsFile = arg("--rows", "/tmp/muq-build/rows.json");
  await mkdir(join(rowsFile, ".."), { recursive: true });
  await Bun.write(rowsFile, JSON.stringify({ units: plans.map((p) => ({ id: p.id, work: p.work, rows: p.rows })) }));
  const scratch = arg("--scratch", "/tmp/muq-build/ar");
  await mkdir(scratch, { recursive: true });
  for (const plan of plans) await Bun.write(join(scratch, `${plan.id}.tsv`), plan.rows.map(scratchLine).join("\n") + "\n");
  for (const plan of plans) console.log(plan.id.padEnd(16), String(plan.rows.length).padStart(3), "rows", String(plan.words).padStart(5), "words");
  console.log("total", plans.reduce((sum, p) => sum + p.words, 0), "words in", plans.length, "units");
}
