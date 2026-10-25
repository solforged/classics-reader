// Builds the site's data from the cached sources (run scripts/fetch-sources.ts first).
//   src/data/works/<slug>.json   aligned rows, analyses, notes, intro per work
//   src/data/lexicon.json        lemma frequencies and concordance (build-time only)
//   public/lex/<shard>.json      dictionary entries, fetched by the word panel
//   public/search.json           full-text search index
//   .cache/raw/<slug>.json       unaligned units, input for alignment review
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { WORKS, type WorkDef } from "./catalog";
import { entryFits, fold, shardOf } from "../src/lib/norse";
import { AnalysisTable, FormIndex } from "./lib/analyses";
import { parseBellows } from "./lib/bellows";
import { parseBugge } from "./lib/bugge";
import { eaeUnits, headText, parseEae } from "./lib/eae";
import { indexDictionary, indexEae, indexWiktionary, sanitizeDef, type DictEntry } from "./lib/lexicon";
import { parseBrodeur, parseSnorra } from "./lib/snorra";
import type { EnUnit, OnUnit, Piece, RawWork, Row, Work } from "./lib/types";

const ROOT = join(import.meta.dir, "..");
const SRC = join(ROOT, ".cache", "sources");
const read = (rel: string) => Bun.file(join(SRC, rel)).text();

console.time("total");
const index = new FormIndex();
const eae = parseEae(await read("eae/codex-regius.xml"), await read("eae/menota-entities.txt"));
indexEae(eae, index);
const wiktGlosses = indexWiktionary(await read("lex/wiktionary-non.jsonl"), index);
console.log(`form index: ${index.size.toLocaleString()} spellings`);

const bellows = parseBellows(await read("bellows/bellows.html"));
const brodeur: Record<string, EnUnit[]> = {};
for (const s of ["prologue", "gylfaginning", "skaldskaparmal"]) brodeur[s] = parseBrodeur(await read(`brodeur/${s}.html`));

// ---------------------------------------------------------------- raw works

function eaeSide(def: WorkDef, table: AnalysisTable): OnUnit[] {
  const out: OnUnit[] = [];
  def.eae!.forEach((entry, i) => {
    const spec = typeof entry === "string" ? { div: entry } : entry;
    const div = eae.get(spec.div);
    if (!div) throw new Error(`EAE div not found: ${spec.div}`);
    const prefix = def.eae!.length > 1 ? `d${i + 1}.` : "";
    let units = eaeUnits(div, table, prefix);
    // "p2@Guðrún sat" splits prose unit p2 before that phrase; the remainder becomes p2b.
    for (const marker of [spec.from, spec.until]) {
      const [key, phrase] = marker?.split("@") ?? [];
      if (!key || !phrase) continue;
      const k = units.findIndex((u) => u.key === prefix + key);
      const unit = units[k];
      if (!unit || unit.lines.length !== 1) throw new Error(`${def.slug}: cannot split ${key}`);
      const line = unit.lines[0]!;
      let offset = 0;
      const text = line.map((p) => (typeof p === "string" ? p : p[0])).join("");
      const target = text.indexOf(phrase);
      const cut = line.findIndex((p) => {
        const hit = offset === target;
        offset += (typeof p === "string" ? p : p[0]).length;
        return hit;
      });
      if (target < 0 || cut < 0) throw new Error(`${def.slug}: phrase "${phrase}" not at a word boundary in ${key}`);
      const before = line.slice(0, cut);
      if (typeof before.at(-1) === "string") before[before.length - 1] = (before.at(-1) as string).trimEnd();
      units.splice(k, 1, { ...unit, lines: [before] }, { ...unit, key: `${unit.key}b`, lines: [line.slice(cut)] });
    }
    const at = (marker: string) => {
      const [key, phrase] = marker.split("@");
      const want = phrase ? `${prefix}${key}b` : prefix + marker;
      const k = units.findIndex((u) => u.key === want || (u.kind === "head" && headText(u) === marker));
      if (k < 0) throw new Error(`${def.slug}: slice marker "${marker}" not found in ${spec.div}`);
      return k;
    };
    if (spec.until) units = units.slice(0, at(spec.until));
    if (spec.from) units = units.slice(at(spec.from));
    // Conventional stanza numbers (from the edition's xml:id) are the citation labels;
    // groups without one continue the previous stanza.
    for (const u of units) {
      if (u.kind === "stanza") u.label = u.ref;
      delete u.ref;
    }
    out.push(...units);
  });
  return out;
}

async function rawWork(def: WorkDef): Promise<RawWork> {
  const diplomatic = !def.eae && !!def.bugge;
  const table = new AnalysisTable(index, diplomatic);
  let on: OnUnit[] = [];
  let en: EnUnit[] = [];
  let notes: Record<string, string> = {};
  let intro: string[] | undefined;

  if (def.eae) on = eaeSide(def, table);
  if (def.bugge) {
    const heads: Record<string, string> = { "svipdag1.html": "Grógaldr", "svipdag2.html": "Fjölsvinnsmál" };
    for (const [i, file] of def.bugge.entries()) {
      // Bugge supplies the end of Sigrdrífumál, lost in the Codex Regius lacuna.
      const lacunaTable = def.eae ? new AnalysisTable(index, true) : table;
      const units = parseBugge(await read(`bugge/${file}`), lacunaTable, {
        keyPrefix: `b${i + 1}.`,
        fromStanza: def.eae ? 30 : undefined,
        head: heads[file],
      });
      if (def.eae) {
        // Re-home analyses into the work's table.
        for (const u of units)
          for (const line of u.lines)
            for (const p of line)
              if (typeof p !== "string") p[1] = p[1].map((id) => table.add(lacunaTable.list[id]!));
      }
      on.push(...units);
    }
  }
  if (def.snorra) on = parseSnorra(await read(`snorra/${def.snorra}.wiki`), table);

  if (def.bellows) {
    const b = bellows.get(def.bellows);
    if (!b) throw new Error(`Bellows chapter not found: ${def.bellows}`);
    en = b.units;
    notes = b.notes;
    intro = b.intro;
  }
  if (def.brodeur === "grottasongr") {
    // Brodeur translates Gróttasöngr inside Skáldskaparmál XLII.
    en = brodeur.skaldskaparmal!.filter((u) => u.key.startsWith("c42.") && u.kind === "stanza");
  } else if (def.brodeur) en = brodeur[def.brodeur]!;

  return { slug: def.slug, on, en, analyses: table.list, notes, intro };
}

// ---------------------------------------------------------------- alignment

interface AlignFile {
  rows: { id?: string; on: string[]; en: string[] }[];
  omit?: { on?: string[]; en?: string[] };
}

/** Bucket units by stanza number (poems) or chapter (prose) when no curated alignment exists. */
function defaultRows(def: WorkDef, raw: RawWork): AlignFile["rows"] {
  const buckets = new Map<string, { on: string[]; en: string[] }>();
  const order: string[] = [];
  const put = (b: string, side: "on" | "en", key: string) => {
    if (!buckets.has(b)) {
      buckets.set(b, { on: [], en: [] });
      order.push(b);
    }
    buckets.get(b)![side].push(key);
  };
  if (def.collection === "prose" && def.slug !== "hattatal") {
    for (const u of raw.on) put(u.key.split(".")[0]!, "on", u.key);
    for (const u of raw.en) put(u.key.split(".")[0]!, "en", u.key);
    return order.map((b) => ({ id: b.replace(/^c/, ""), ...buckets.get(b)! }));
  }
  for (const side of ["on", "en"] as const) {
    let cur = "0";
    for (const u of raw[side]) {
      if (u.kind === "stanza" && u.label && /^\d+$/.test(u.label)) cur = u.label;
      else if (u.kind !== "stanza") cur = cur.replace(/p$/, "") + "p";
      put(cur, side, u.key);
    }
  }
  const num = (b: string) => parseInt(b, 10) + (b.endsWith("p") ? 0.5 : 0);
  return [...buckets.entries()]
    .sort((a, b) => num(a[0]) - num(b[0]))
    .map(([b, v]) => ({ id: b === "0p" ? "intro" : b, ...v }));
}

async function align(def: WorkDef, raw: RawWork): Promise<Row[]> {
  const file = Bun.file(join(ROOT, "alignment", `${def.slug}.json`));
  const curated = (await file.exists()) ? ((await file.json()) as AlignFile) : undefined;
  const spec = curated?.rows ?? defaultRows(def, raw);
  const onBy = new Map(raw.on.map((u) => [u.key, u]));
  const enBy = new Map(raw.en.map((u) => [u.key, u]));
  // Units deliberately left out (e.g. verses Brodeur quotes around Gróttasöngr that are not part of it).
  const used = new Set<string>([
    ...(curated?.omit?.on ?? []).map((k) => `on:${k}`),
    ...(curated?.omit?.en ?? []).map((k) => `en:${k}`),
  ]);
  const rows: Row[] = [];
  const ids = new Set<string>();
  for (const [i, r] of spec.entries()) {
    const on = r.on.map((k) => onBy.get(k) ?? missing(def, "on", k));
    const en = r.en.map((k) => enBy.get(k) ?? missing(def, "en", k));
    for (const k of [...r.on.map((k) => `on:${k}`), ...r.en.map((k) => `en:${k}`)]) {
      if (used.has(k)) throw new Error(`${def.slug}: unit ${k} aligned twice`);
      used.add(k);
    }
    const firstStanza = on.find((u) => u.kind === "stanza" && u.label) ?? en.find((u) => u.kind === "stanza" && u.label);
    let id = r.id ?? firstStanza?.label ?? `r${i + 1}`;
    while (ids.has(id)) id += "b";
    ids.add(id);
    rows.push({ id, on, en });
  }
  const leftover = [
    ...raw.on.filter((u) => !used.has(`on:${u.key}`)).map((u) => `on:${u.key}`),
    ...raw.en.filter((u) => !used.has(`en:${u.key}`)).map((u) => `en:${u.key}`),
  ];
  if (leftover.length) throw new Error(`${def.slug}: units missing from alignment: ${leftover.join(", ")}`);
  return rows;
}

function missing(def: WorkDef, side: string, key: string): never {
  throw new Error(`${def.slug}: alignment references unknown ${side} unit ${key}`);
}

// ---------------------------------------------------------------- outputs

const plain = (lines: Piece[][]) =>
  lines.map((l) => l.map((p) => (typeof p === "string" ? p : p[0])).join("")).join(" / ");

await mkdir(join(ROOT, ".cache", "raw"), { recursive: true });

// `--raw <slug>...` only rewrites the unaligned units of those works (for alignment review).
const rawOnly = process.argv.includes("--raw") ? process.argv.slice(process.argv.indexOf("--raw") + 1) : undefined;
if (rawOnly) {
  for (const def of WORKS.filter((w) => rawOnly.includes(w.slug))) {
    await Bun.write(join(ROOT, ".cache", "raw", `${def.slug}.json`), JSON.stringify(await rawWork(def), null, 1));
    console.log(`raw: ${def.slug}`);
  }
  process.exit(0);
}

await rm(join(ROOT, "src", "data", "works"), { recursive: true, force: true });
await rm(join(ROOT, "public", "lex"), { recursive: true, force: true });
await mkdir(join(ROOT, "src", "data", "works"), { recursive: true });
await mkdir(join(ROOT, "public", "lex"), { recursive: true });

type SearchRow = [string, string, string, string]; // slug, row id, Old Norse, English
const search: SearchRow[] = [];
interface LemmaStat {
  lemma: string;
  pos: string;
  count: number;
  works: Record<string, number>;
  occ: [string, string, string, number][]; // slug, row id, line, 1 = probable (not edition-annotated)
}
const lemmas = new Map<string, LemmaStat>();
const usedLemmas = new Set<string>();
const lemmaMsa = new Map<string, string>(); // a representative analysis, to rank dictionary homographs
const stats: string[] = [];

for (const def of WORKS) {
  const raw = await rawWork(def);
  await Bun.write(join(ROOT, ".cache", "raw", `${def.slug}.json`), JSON.stringify(raw, null, 1));
  const rows = await align(def, raw);
  const work: Work = { slug: def.slug, rows, analyses: raw.analyses, notes: raw.notes, intro: raw.intro };
  await Bun.write(join(ROOT, "src", "data", "works", `${def.slug}.json`), JSON.stringify(work));

  let words = 0;
  let parsed = 0;
  let annotated = 0;
  for (const a of raw.analyses) {
    usedLemmas.add(a[0]);
    if (!lemmaMsa.has(a[0]) || a[2] === "e") lemmaMsa.set(a[0], a[1]);
  }
  for (const row of rows) {
    search.push([def.slug, row.id, row.on.map((u) => plain(u.lines)).join(" / "), row.en.map((u) => u.lines.join(" / ")).join(" / ")]);
    for (const u of row.on) {
      for (const line of u.lines) {
        const lineText = line.map((p) => (typeof p === "string" ? p : p[0])).join("");
        for (const p of line) {
          if (typeof p === "string") continue;
          words++;
          if (p[1].length) parsed++;
          const as = p[1].map((id) => raw.analyses[id]!);
          if (as.some((a) => a[2] === "e")) annotated++;
          // Concordance: edition-annotated words, plus candidates that agree on a single lemma.
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
            const k = lemma;
            let st = lemmas.get(k);
            if (!st) {
              st = { lemma, pos: as.find((a) => a[0] === lemma)?.[1].split(" ")[0] ?? "", count: 0, works: {}, occ: [] };
              lemmas.set(k, st);
            }
            st.count++;
            st.works[def.slug] = (st.works[def.slug] ?? 0) + 1;
            if (st.occ.length < 400) st.occ.push([def.slug, row.id, lineText.replace(p[0], `⟦${p[0]}⟧`), probable]);
          }
        }
      }
    }
  }
  stats.push(
    `${def.slug.padEnd(28)} rows ${String(rows.length).padStart(4)}  words ${String(words).padStart(6)}  annotated ${pct(annotated, words)}  with analysis ${pct(parsed, words)}`,
  );
}

function pct(a: number, b: number) {
  return `${b ? ((100 * a) / b).toFixed(1) : "0.0"}%`.padStart(6);
}

await Bun.write(join(ROOT, "public", "search.json"), JSON.stringify(search));

// Dictionary shards: only lemmas that occur in the corpus.
const zoega = indexDictionary(JSON.parse(await read("lex/zoega.json")) as DictEntry[]);
const cv = indexDictionary(JSON.parse(await read("lex/cleasby-vigfusson.json")) as DictEntry[]);
const shards = new Map<string, Record<string, unknown>>();
const shortGloss = new Map<string, string>();
let withGloss = 0;
for (const lemma of usedLemmas) {
  const k = fold(lemma);
  if (!k) continue;
  const msa = lemmaMsa.get(lemma) ?? "";
  const z = zoega
    .get(k)
    ?.map((e) => ({ w: e.word, d: e.definitions.map(sanitizeDef) }))
    .sort((a, b) => Number(entryFits(msa, b.d.join(" "))) - Number(entryFits(msa, a.d.join(" "))));
  const c = cv.get(k)?.map((e) => ({ w: e.word, d: e.definitions.map((d) => (d.length > 2400 ? `${d.slice(0, 2400)}…` : d)) }));
  const w = wiktGlosses.get(k);
  if (!z && !c && !w) continue;
  withGloss++;
  // Zoëga italicizes the English sense; its first italic span is a good one-line gloss.
  const italic = z?.[0]?.d.join(" ").match(/<i>([^<]+)<\/i>/)?.[1];
  const gloss = (italic ?? w?.[0]?.glosses[0] ?? "").replace(/[;,.:\s]+$/, "");
  if (gloss) shortGloss.set(lemma, gloss.length > 70 ? `${gloss.slice(0, 70)}…` : gloss);
  const shard = shardOf(lemma);
  const rec = shards.get(shard) ?? {};
  rec[k] = { z, c, w };
  shards.set(shard, rec);
}
for (const [s, rec] of shards) await Bun.write(join(ROOT, "public", "lex", `${s}.json`), JSON.stringify(rec));

await Bun.write(
  join(ROOT, "src", "data", "lexicon.json"),
  JSON.stringify(
    [...lemmas.values()].sort((a, b) => b.count - a.count).map((l) => ({ ...l, gloss: shortGloss.get(l.lemma) ?? "" })),
  ),
);

console.log(stats.join("\n"));
console.log(`lemmas in corpus: ${usedLemmas.size}, with a dictionary entry: ${withGloss}; concordance lemmas: ${lemmas.size}`);
console.timeEnd("total");
