// Alignment review helper.
//   bun corpora/edda/check-alignment.ts dump <slug>    print every unit (key, label, text) of both sides
//   bun corpora/edda/check-alignment.ts check <slug>   validate corpora/edda/alignment/<slug>.json and print the rows side by side
// Reads .cache/raw/<slug>.json (written by corpora/edda/build.ts).
import { join } from "node:path";
import { ROOT } from "../../scripts/core/outputs";
import type { TextUnit, SourceUnit, Piece } from "../../scripts/core/types";
import type { RawWork } from "./raw";

const [cmd, slug] = process.argv.slice(2);
if (!cmd || !slug) {
  console.error("usage: bun corpora/edda/check-alignment.ts dump|check <slug>");
  process.exit(2);
}
const raw = (await Bun.file(join(ROOT, ".cache", "raw", `${slug}.json`)).json()) as RawWork;

const onText = (u: SourceUnit) => u.lines.map((l: Piece[]) => l.map((p) => (typeof p === "string" ? p : p[0])).join("")).join(" / ");
const enText = (u: TextUnit) => u.lines.join(" / ");

if (cmd === "dump") {
  console.log(`# ${slug}\n\n## Old Norse units (on)\n`);
  for (const u of raw.on) console.log(`${u.key}\t${u.kind}\t${u.label ?? "-"}\t${onText(u)}`);
  console.log(`\n## English units (en)\n`);
  for (const u of raw.en) console.log(`${u.key}\t${u.kind}\t${u.label ?? "-"}\t${enText(u)}`);
  process.exit(0);
}

const file = Bun.file(join(import.meta.dir, "alignment", `${slug}.json`));
if (!(await file.exists())) {
  console.error(`corpora/edda/alignment/${slug}.json does not exist`);
  process.exit(1);
}
const spec = (await file.json()) as {
  rows: { id?: string; on: string[]; en: string[] }[];
  omit?: { on?: string[]; en?: string[] };
};
const onBy = new Map(raw.on.map((u) => [u.key, u]));
const enBy = new Map(raw.en.map((u) => [u.key, u]));
const errors: string[] = [];
const seen = new Map<string, number>();
for (const [i, r] of spec.rows.entries()) {
  if (!Array.isArray(r.on) || !Array.isArray(r.en)) errors.push(`row ${i}: on/en must be arrays`);
  for (const k of r.on ?? []) {
    if (!onBy.has(k)) errors.push(`row ${i}: unknown on unit ${k}`);
    if (seen.has(`on:${k}`)) errors.push(`row ${i}: on unit ${k} already used in row ${seen.get(`on:${k}`)}`);
    seen.set(`on:${k}`, i);
  }
  for (const k of r.en ?? []) {
    if (!enBy.has(k)) errors.push(`row ${i}: unknown en unit ${k}`);
    if (seen.has(`en:${k}`)) errors.push(`row ${i}: en unit ${k} already used in row ${seen.get(`en:${k}`)}`);
    seen.set(`en:${k}`, i);
  }
}
for (const k of spec.omit?.on ?? []) seen.has(`on:${k}`) ? errors.push(`omitted on unit ${k} is also in a row`) : seen.set(`on:${k}`, -1);
for (const k of spec.omit?.en ?? []) seen.has(`en:${k}`) ? errors.push(`omitted en unit ${k} is also in a row`) : seen.set(`en:${k}`, -1);
for (const u of raw.on) if (!seen.has(`on:${u.key}`)) errors.push(`on unit ${u.key} is not in any row`);
for (const u of raw.en) if (!seen.has(`en:${u.key}`)) errors.push(`en unit ${u.key} is not in any row`);

for (const [i, r] of spec.rows.entries()) {
  const on = (r.on ?? []).map((k) => onBy.get(k)).filter(Boolean) as SourceUnit[];
  const en = (r.en ?? []).map((k) => enBy.get(k)).filter(Boolean) as TextUnit[];
  const left = on.map((u) => `[${u.label ?? u.kind[0]}] ${onText(u)}`).join(" ‖ ").slice(0, 70);
  const right = en.map((u) => `[${u.label ?? u.kind[0]}] ${enText(u)}`).join(" ‖ ").slice(0, 70);
  console.log(`${String(i).padStart(3)} ${(r.id ?? "").padEnd(5)} ${left.padEnd(72)} | ${right}`);
}
if (errors.length) {
  console.error(`\n${errors.length} problem(s):\n${errors.join("\n")}`);
  process.exit(1);
}
console.log(`\nOK: ${spec.rows.length} rows, every unit used once.`);
