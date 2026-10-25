// Builds the site's data from the cached sources (run scripts/fetch-sources.ts first).
//   src/data/works/<slug>.json   aligned rows, analyses, notes, intro per work
//   src/data/lexicon.json        lemma frequencies and concordance (build-time only)
//   public/lex/<shard>.json      dictionary entries, fetched by the word panel
//   public/para/<shard>.json     inflection tables and edition-attested forms for corpus lemmas
//   public/search.json           full-text search index
//   .cache/raw/<slug>.json       unaligned units, input for alignment review
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { WORKS, type WorkDef } from "./catalog";
import { shardOf } from "../src/lang";
import { zoegaFits, zoegaGrammarPattern } from "../src/lang/non/dictionaries";
import { fold } from "../src/lang/non/spelling";
import type { DictEntry as PrintedEntry, DictHit } from "../src/lib/dict";
import { parseMorph } from "../src/lib/morph";
import type { Paradigm } from "../src/lib/paradigm";
import { glossArticle, nameArticle, plainArticle, zoegaArticle } from "./lib/articles";
import { AnalysisTable, FormIndex } from "./lib/analyses";
import { parseBellows } from "./lib/bellows";
import { parseBugge } from "./lib/bugge";
import { NameIndex, type NameGloss } from "./lib/names";
import { eaeUnits, headText, parseEae } from "./lib/eae";
import { ParadigmBuilder } from "./lib/paradigms";
import {
  dictionaryHeadword,
  indexDictionary,
  indexEae,
  indexWiktionary,
  looseDictionaryKey,
  sanitizeDef,
  type DictEntry,
  type WiktGloss,
} from "./lib/lexicon";
import { parseBrodeur, parseSnorra } from "./lib/snorra";
import type { EnUnit, OnUnit, Piece, RawWork, Row, Work } from "./lib/types";

const ROOT = join(import.meta.dir, "..");
const SRC = join(ROOT, ".cache", "sources");
const read = (rel: string) => Bun.file(join(SRC, rel)).text();

console.time("total");
const index = new FormIndex();
const eae = parseEae(await read("eae/codex-regius.xml"), await read("eae/menota-entities.txt"));
indexEae(eae, index);
const wiktionary = await read("lex/wiktionary-non.jsonl");
const wiktGlosses = indexWiktionary(wiktionary, index);
console.log(`form index: ${index.size.toLocaleString()} spellings`);

const bellows = parseBellows(await read("bellows/bellows.html"));
const brodeur: Record<string, EnUnit[]> = {};
for (const s of ["prologue", "gylfaginning", "skaldskaparmal"]) brodeur[s] = parseBrodeur(await read(`brodeur/${s}.html`));

// Bellows's index of names glosses proper nouns and names unanalysed capitalized words in the prose.
const names = new NameIndex(
  await read("bellows/bellows.html"),
  new Map(WORKS.flatMap((w) => (w.bellows ? [[w.bellows, w.slug] as const] : []))),
);
/** Proper-noun lemmas seen so far; WORKS lists the poems (edition-annotated) before the prose. */
const knownNames = new Set<string>();
const nameFor = (surface: string) => names.lemmaFor(surface, knownNames);

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
  const table = new AnalysisTable(index, diplomatic, nameFor);
  let on: OnUnit[] = [];
  let en: EnUnit[] = [];
  let notes: Record<string, string> = {};
  let intro: string[] | undefined;

  if (def.eae) on = eaeSide(def, table);
  if (def.bugge) {
    const heads: Record<string, string> = { "svipdag1.html": "Grógaldr", "svipdag2.html": "Fjölsvinnsmál" };
    for (const [i, file] of def.bugge.entries()) {
      // Bugge supplies the end of Sigrdrífumál, lost in the Codex Regius lacuna.
      const lacunaTable = def.eae ? new AnalysisTable(index, true, nameFor) : table;
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
await rm(join(ROOT, "public", "para"), { recursive: true, force: true });
await mkdir(join(ROOT, "src", "data", "works"), { recursive: true });
await mkdir(join(ROOT, "public", "lex"), { recursive: true });
await mkdir(join(ROOT, "public", "para"), { recursive: true });

type SearchRow = [string, string, string, string]; // slug, row id, Old Norse, English
const search: SearchRow[] = [];
interface LemmaStat {
  lemma: string;
  /** The lemma's first analysis (UD morphology); lexicon pages show its word class. */
  morph: string;
  count: number;
  works: Record<string, number>;
  occ: [string, string, string, number][]; // slug, row id, line, 1 = probable (not edition-annotated)
}
const lemmas = new Map<string, LemmaStat>();
const usedLemmas = new Set<string>();
const lemmaMorph = new Map<string, string>(); // a representative analysis, to rank dictionary homographs
const stats: string[] = [];
const paradigms = new ParadigmBuilder();

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
    paradigms.use(a);
    if (!lemmaMorph.has(a[0]) || a[2] === "e") lemmaMorph.set(a[0], a[1]);
    if (parseMorph(a[1]).upos === "PROPN" && a[2] !== "n") knownNames.add(a[0]);
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
          paradigms.attest(p[0], as);
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
              st = { lemma, morph: as.find((a) => a[0] === lemma)?.[1] ?? "", count: 0, works: {}, occ: [] };
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

// Dictionary shards: corpus lemmas, plus the headwords needed to explain compounds.
const zoegaEntries = JSON.parse(await read("lex/zoega.json")) as DictEntry[];
const cvEntries = JSON.parse(await read("lex/cleasby-vigfusson.json")) as DictEntry[];
const zoega = indexDictionary(zoegaEntries);
const cv = indexDictionary(cvEntries);
const looseZoega = indexDictionary(zoegaEntries, looseDictionaryKey);
const looseCv = indexDictionary(cvEntries, looseDictionaryKey);
/** Dictionary matches for a lemma while the build assembles them; structured into a DictHit when written. */
interface RawHit {
  /** Zoëga, best-fitting homograph first. */
  z?: PrintedEntry[];
  /** Cleasby–Vigfússon. */
  c?: PrintedEntry[];
  w?: WiktGloss[];
  /** Bellows's index of names, for proper nouns. */
  n?: NameGloss[];
  via?: string;
  parts?: string[];
}
const shards = new Map<string, Record<string, RawHit>>();
const shortGloss = new Map<string, string>();

function dictionaryHit(lemma: string, morph = ""): RawHit {
  const k = fold(lemma);
  const proper = /^\p{Lu}/u.test(lemma);
  const accepts = (e: DictEntry) => !proper || /^\p{Lu}/u.test(dictionaryHeadword(e.word));
  // CV's all-capital common headwords are typography, not evidence for a name spelling.
  const acceptsLoose = (e: DictEntry) => {
    if (!accepts(e) || (proper && !/\p{Ll}/u.test(dictionaryHeadword(e.word)))) return false;
    const head = e.definitions.join(" ").replace(/<[^>]+>/g, "").replace(/\badj\./g, "a.").slice(0, 80);
    const ranked = zoegaGrammarPattern(morph) !== undefined;
    const grammar = /(?:^|[\s,(;])(?:m|f|n|a|adv|prep|pron|v)\./.test(head);
    return !ranked || !grammar || zoegaFits(morph, head);
  };
  let ze = zoega.get(k)?.filter(accepts);
  let ce = cv.get(k)?.filter(accepts);
  const loose = looseDictionaryKey(lemma);
  if (!ze?.length) ze = looseZoega.get(loose)?.filter(acceptsLoose);
  if (!ce?.length) ce = looseCv.get(loose)?.filter(acceptsLoose);
  const z = ze?.length
    ? ze.map((e) => ({ w: e.word, d: e.definitions.map(sanitizeDef) }))
      .sort((a, b) => Number(zoegaFits(morph, b.d.join(" "))) - Number(zoegaFits(morph, a.d.join(" "))))
    : undefined;
  const c = ce?.length
    ? ce.map((e) => ({ w: e.word, d: e.definitions.map((d) => (d.length > 2400 ? `${d.slice(0, 2400)}…` : d)) }))
    : undefined;
  const w = wiktGlosses.get(k);
  const printed = z?.[0]?.w ?? c?.[0]?.w;
  const headword = printed ? dictionaryHeadword(printed) : undefined;
  const via = headword && fold(headword) !== k ? headword : undefined;
  return { z, c, w, via };
}

/** Zoëga italicizes its English senses; Wiktionary is the fallback for a brief gloss. */
function dictionaryGloss(hit: RawHit): string {
  const italic = hit.z?.[0]?.d.join(" ").match(/<i>([^<]+)<\/i>/)?.[1];
  return (italic ?? hit.w?.[0]?.glosses[0] ?? "").replace(/[;,.:\s]+$/, "");
}

/** The shard record: entries structured under the pack's dictionary ids (src/lang/non/dictionaries.ts). */
function shardRecord(hit: RawHit): DictHit {
  const entries: DictHit["entries"] = {};
  if (hit.n?.length) entries.bellows = hit.n.map(nameArticle);
  if (hit.z?.length) entries.zoega = hit.z.map(zoegaArticle);
  if (hit.w?.length) entries.wiktionary = hit.w.map(glossArticle);
  if (hit.c?.length) entries.cleasby = hit.c.map(plainArticle);
  return { entries, ...(hit.via ? { via: hit.via } : {}), ...(hit.parts ? { parts: hit.parts } : {}) };
}

const NOUN_GRAMMAR = /(?:^|[\s,(;])[mfn]\./;
const ADJECTIVE_GRAMMAR = /(?:^|[\s,(;])(?:a|adj)\./;
const ADVERB_GRAMMAR = /(?:^|[\s,(;])adv\./;
type PartRole = "noun" | "adjective" | "first";
interface CompoundPart {
  word: string;
  hit: RawHit;
  gloss: string;
  ambiguous: boolean;
}

const headwords = new Map<string, string>();
const prefixes = new Map<string, string>();
for (const entries of [zoegaEntries, cvEntries]) {
  for (const e of entries) {
    let word = dictionaryHeadword(e.word);
    // Lowercase compounds should not be decomposed into personal or place names.
    if (/^\p{Lu}/u.test(word) && /\p{Ll}/u.test(word)) continue;
    word = word.toLowerCase();
    const k = fold(word);
    if (entries === zoegaEntries && /[-‑]$/.test(e.word) && /\bprefix(?:ed)?\b|\bcompds?\b/.test(e.definitions.join(" "))) {
      prefixes.set(k, `${word}-`);
    }
    if (k && !headwords.has(k)) headwords.set(k, word);
  }
}

function compoundPart(word: string, role: PartRole): CompoundPart | undefined {
  if (role === "first" && !zoega.has(fold(word))) return undefined;
  const hit = dictionaryHit(word, role === "noun" ? "NOUN" : role === "adjective" ? "ADJ" : "");
  const prefix = word.endsWith("-");
  // The first element needs Zoëga evidence; a second element may use CV when Zoëga lacks it.
  const entries = (hit.z ?? (role === "first" ? undefined : hit.c)) ?? [];
  for (const entry of entries) {
    if (prefix && !/[-‑]$/.test(entry.w)) continue;
    const sections = entry.d.join(" ").split(/<strong>[IVX]+\)<\/strong>/).filter((s) => s.trim());
    const section = sections.find((s) => {
      if (prefix) return true;
      const lead = s.split("<i>", 1)[0]!.replace(/<[^>]+>/g, "");
      if (role === "noun") return NOUN_GRAMMAR.test(lead);
      if (role === "adjective") return ADJECTIVE_GRAMMAR.test(lead);
      return NOUN_GRAMMAR.test(lead) || ADJECTIVE_GRAMMAR.test(lead) || ADVERB_GRAMMAR.test(lead);
    });
    if (!section) continue;
    const italic = section.match(/<i>([^<]+)<\/i>/)?.[1];
    const gloss = (italic ?? hit.w?.[0]?.glosses[0] ?? "").replace(/[;,.:\s]+$/, "");
    if (!gloss) continue;
    return { word, hit, gloss, ambiguous: sections.length > 1 || entries.length > 1 };
  }
  return undefined;
}

function compoundParts(lemma: string, morph: string): [CompoundPart, CompoundPart] | undefined {
  if (!/^\p{Ll}/u.test(lemma)) return undefined;
  const { upos, feats } = parseMorph(morph);
  const role = upos === "NOUN" ? "noun" : upos === "ADJ" && !feats.NumType ? "adjective" : undefined;
  if (!role) return undefined;
  const k = fold(lemma);
  if (/(?:andi|inn|aðr)$/.test(k)) return undefined;
  // Earliest boundary gives the longest second headword with matching grammar.
  for (let at = 1; at <= k.length - 3; at++) {
    const secondWord = headwords.get(k.slice(at));
    const second = secondWord ? compoundPart(secondWord, role) : undefined;
    if (!second) continue;
    const prefix = k.slice(0, at);
    const firstKeys = [prefix];
    for (const ending of ["s", "a", "ar", "u", "i"]) {
      if (prefix.endsWith(ending)) firstKeys.push(prefix.slice(0, -ending.length));
    }
    for (const key of firstKeys) {
      const firstWord = prefixes.get(key) ?? (key.length >= 2 ? headwords.get(key) : undefined);
      const first = firstWord ? compoundPart(firstWord, "first") : undefined;
      if (first) return [first, second];
    }
  }
  return undefined;
}

function writeHit(lemma: string, hit: RawHit, overwrite = false) {
  const shard = shardOf(lemma);
  const rec = shards.get(shard) ?? {};
  const k = fold(lemma);
  const old = rec[k];
  if (!old) rec[k] = hit;
  else if (overwrite) {
    // fold() lowercases, so a proper noun and a common noun (Askr, askr) share one record: merge, don't replace.
    const merged: RawHit = { ...old };
    for (const [key, value] of Object.entries(hit)) if (value !== undefined) Object.assign(merged, { [key]: value });
    rec[k] = merged;
  }
  shards.set(shard, rec);
}

let withGloss = 0;
for (const lemma of usedLemmas) {
  if (!fold(lemma)) continue;
  const morph = lemmaMorph.get(lemma) ?? "";
  const hit = dictionaryHit(lemma, morph);
  let gloss = dictionaryGloss(hit);
  const proper = parseMorph(morph).upos === "PROPN";
  const n = proper ? names.glosses(lemma) : [];
  if (n.length) {
    hit.n = n;
    // A proper noun's own identification beats a gloss of the common word it shares a spelling with.
    gloss = [...new Set(n.map((e) => e.desc))].slice(0, 2).join("; ");
  }
  if (!hit.z && !hit.c && !hit.w && !hit.n) {
    const parts = compoundParts(lemma, morph);
    if (!parts) continue;
    hit.parts = parts.map((part) => part.word);
    // Do not turn an ambiguous homograph into an asserted compound translation.
    gloss = parts.some((part) => part.ambiguous) ? "" : parts.map((part) => part.gloss).join(" + ");
    for (const part of parts) writeHit(part.word, part.hit);
  }
  withGloss++;
  if (gloss) shortGloss.set(lemma, gloss.length > 70 ? `${gloss.slice(0, 70)}…` : gloss);
  writeHit(lemma, hit, true);
}
for (const [s, rec] of shards) {
  const records = Object.fromEntries(Object.entries(rec).map(([k, hit]) => [k, shardRecord(hit)]));
  await Bun.write(join(ROOT, "public", "lex", `${s}.json`), JSON.stringify(records));
}

const paraShards = new Map<string, Record<string, Paradigm[]>>();
for (const paradigm of paradigms.build(wiktionary, (lemma) => dictionaryHit(lemma, lemmaMorph.get(lemma)).z)) {
  const shard = shardOf(paradigm.lemma);
  const rec = paraShards.get(shard) ?? {};
  (rec[fold(paradigm.lemma)] ??= []).push(paradigm);
  paraShards.set(shard, rec);
}
for (const [s, rec] of paraShards) await Bun.write(join(ROOT, "public", "para", `${s}.json`), JSON.stringify(rec));

await Bun.write(
  join(ROOT, "src", "data", "lexicon.json"),
  JSON.stringify(
    [...lemmas.values()].sort((a, b) => b.count - a.count).map((l) => ({ ...l, gloss: shortGloss.get(l.lemma) ?? "" })),
  ),
);

console.log(stats.join("\n"));
console.log(`lemmas in corpus: ${usedLemmas.size}, with a dictionary entry: ${withGloss}; concordance lemmas: ${lemmas.size}`);
console.timeEnd("total");
