// Extracts Wiktionary tables and joins the reader's edition-annotated forms without changing its analyses.
import { fold } from "../../src/lang/non/spelling";
import { morphCells, paradigmKind, type Paradigm, type ParadigmKind } from "../../src/lib/paradigm";
import { looseDictionaryKey } from "./lexicon";
import type { Analysis } from "./types";
import type { DictEntry } from "../../src/lib/dict";
import { inflectAdjective } from "./inflect/adjectives";
import { inflectNoun } from "./inflect/nouns";
import { inflectVerb } from "./inflect/verbs";
import type { Generated } from "./inflect/zoega";

const GENERATORS: Partial<Record<ParadigmKind, typeof inflectNoun>> = {
  noun: inflectNoun,
  adj: inflectAdjective,
  verb: inflectVerb,
};

/** A table generated from the first Zoëga entry whose grammar note a generator can use without contradiction. */
function generate(
  lemma: string,
  kind: ParadigmKind,
  attested: Paradigm["attested"],
  zoegaFor: (lemma: string) => DictEntry[] | undefined,
): Generated | undefined {
  const inflect = GENERATORS[kind];
  if (!inflect) return undefined;
  for (const entry of zoegaFor(lemma) ?? []) {
    const generated = inflect(entry.w, entry, attested);
    if (generated) return generated;
  }
  return undefined;
}

interface WiktForm {
  form: string;
  tags?: string[];
  source?: string;
}

interface WiktTemplate {
  name: string;
  args: Record<string, string>;
}

export interface WiktEntry {
  word: string;
  pos: string;
  forms?: WiktForm[];
  inflection_templates?: WiktTemplate[];
  head_templates?: WiktTemplate[];
}

export interface Candidate {
  word: string;
  kind: ParadigmKind;
  label?: string;
  cells: Paradigm["cells"];
}

const CASES = [["nominative", "n"], ["accusative", "a"], ["dative", "d"], ["genitive", "g"]] as const;
const NUMBERS = [["singular", "s"], ["dual", "d"], ["plural", "p"]] as const;
const GENDERS = [["masculine", "m"], ["feminine", "f"], ["neuter", "n"]] as const;
const PERSONS = [["first-person", "1"], ["second-person", "2"], ["third-person", "3"], ["reflexive", "r"]] as const;
const ADJ_MODES: Record<string, true> = { str: true, wk: true, comp: true, str_sup: true, wk_sup: true };
const VERB_CODE = /^(?:infinitive|(?:pres|past)_part|(?:pres|past)_(?:ind|sub)_[123](?:sg|pl)|impr_[123](?:sg|pl))$/;
const META_TAGS: Record<string, true> = {
  "table-tags": true,
  "inflection-template": true,
  class: true,
  canonical: true,
  romanization: true,
};

function addForms(cells: Paradigm["cells"], key: string, value: string): void {
  for (const piece of value.split(/\s*[,/]\s*/)) {
    const form = piece.trim().normalize("NFC");
    if (!form || /^[-–—]$/.test(form) || form.includes("{{{")) continue;
    const forms = cells[key] ??= [];
    if (!forms.includes(form)) forms.push(form);
  }
}

/** Tagged forms supply hand-written tables, notably personal and demonstrative pronouns. */
function taggedCells(kind: ParadigmKind, tags: string[]): string[] {
  if (tags.some((tag) => META_TAGS[tag])) return [];
  const cases = CASES.filter(([tag]) => tags.includes(tag)).map(([, code]) => code);
  const numbers = NUMBERS.filter(([tag]) => tags.includes(tag)).map(([, code]) => code);
  const genders: string[] = GENDERS.filter(([tag]) => tags.includes(tag)).map(([, code]) => code);
  const persons: string[] = PERSONS.filter(([tag]) => tags.includes(tag)).map(([, code]) => code);
  const keys = new Set<string>();
  if (kind === "verb") {
    // A verb entry can also contain the adjective declension of its past participle.
    if (cases.length) return [];
    const modes = tags.includes("mediopassive") ? ["mpass"] : ["act"];
    for (const mode of modes) {
      if (tags.includes("infinitive")) keys.add(`${mode}|infinitive`);
      else if (tags.includes("participle")) {
        if (tags.includes("past")) keys.add(`${mode}|past_part`);
        if (tags.includes("present")) keys.add(`${mode}|pres_part`);
      } else {
        for (const person of persons) for (const number of numbers) {
          if (person === "r" || number === "d") continue;
          const end = `${person}${number === "s" ? "sg" : "pl"}`;
          if (tags.includes("imperative")) keys.add(`${mode}|impr_${end}`);
          for (const tense of ["present", "past"] as const) {
            if (!tags.includes(tense)) continue;
            for (const mood of ["indicative", "subjunctive"] as const) {
              if (tags.includes(mood)) {
                keys.add(`${mode}|${tense === "past" ? "past" : "pres"}_${mood.slice(0, 3)}_${end}`);
              }
            }
          }
        }
      }
    }
    return [...keys];
  }
  if (!cases.length || !numbers.length) return [];
  if (!genders.length) genders.push("");
  const weak = tags.includes("weak") || tags.includes("definite");
  const mode = tags.includes("comparative") ? "comp"
    : tags.includes("superlative") ? (weak ? "wk_sup" : "str_sup") : weak ? "wk" : "str";
  for (const c of cases) for (const n of numbers) {
    if (kind === "noun") keys.add(`|${c}${n}${tags.includes("definite") ? "d" : "i"}`);
    else if (kind === "personal") {
      for (const p of persons) for (const g of genders) keys.add(`|${p}${c}${n}${p === "3" ? g : ""}`);
    } else {
      const ending = n === "p" && /[dg]/.test(c) ? [""] : genders;
      for (const g of ending) keys.add(`${kind === "adj" ? mode : ""}|${c}${n}${g}`);
    }
  }
  return [...keys];
}

function inflectionLabel(entry: WiktEntry, kind: ParadigmKind, cells: Paradigm["cells"]): string | undefined {
  const forms = entry.forms ?? [];
  const templates = entry.inflection_templates ?? [];
  const tableTags = forms.filter((f) => f.tags?.includes("table-tags") && f.form !== "no-table-tags")
    .map((f) => f.form);
  const classes = [...new Set(forms.filter((f) => f.tags?.includes("class")).map((f) => f.form))];
  if (kind === "verb") {
    if (tableTags.includes("present")) return "preterite-present verb";
    const template = templates.find((t) => /^non-conj-(?:strong|weak)/.test(t.name));
    const strength = tableTags.find((tag) => /strong|weak|irregular/.test(tag))
      ?? (template?.name.includes("strong") ? "strong" : template?.name.includes("weak") ? "weak" : "");
    const cls = classes.find((c) => /^\d+$/.test(c)) ?? template?.args.class
      ?? template?.name.match(/weak(\d)/)?.[1];
    return strength ? `${strength} verb${cls ? `, class ${cls}` : ""}` : undefined;
  }
  if (kind === "noun") {
    const full = templates.find((t) => t.name === "non-decl-blank-full");
    const code = templates.map((t) => t.name.match(/^non-decl-([mfn])-/)?.[1]).find(Boolean)
      ?? entry.head_templates?.map((t) => t.args.g?.[0]).find((g) => g && "mfn".includes(g));
    const gender = full?.args.g ?? GENDERS.find(([, g]) => g === code)?.[0];
    const strength = tableTags.find((tag) => /^(?:strong|weak)$/.test(tag));
    const stem = full?.args.stem ?? [strength, classes.join(", ")].filter(Boolean).join(" ");
    if (stem) return stem.replace(/^(strong|weak)\b/, `$1${gender ? ` ${gender}` : ""}`);
    return gender ? `${gender} noun` : undefined;
  }
  if (kind === "adj") {
    const strong = Object.keys(cells).some((key) => key.startsWith("str|"));
    const weak = Object.keys(cells).some((key) => key.startsWith("wk|"));
    if (strong && weak) return "strong and weak adjective";
    if (strong || weak) return strong ? "strong adjective" : "weak adjective";
    if (Object.keys(cells).some((key) => key.startsWith("comp|"))) return "comparative adjective";
    if (Object.keys(cells).some((key) => /^(str|wk)_sup\|/.test(key))) return "superlative adjective";
    return undefined;
  }
  return kind === "personal" ? "personal pronouns" : "pronominal declension";
}

/** Wiktionary table of one entry, or undefined when it has none. */
export function extract(entry: WiktEntry): Candidate | undefined {
  const kind: ParadigmKind | undefined = entry.pos === "noun" || entry.pos === "name" ? "noun"
    : entry.pos === "adj" ? "adj" : entry.pos === "verb" ? "verb"
    : entry.pos === "pron" || entry.pos === "det" || entry.pos === "article"
      ? entry.forms?.some((f) => f.tags?.includes("personal")) ? "personal" : "pron" : undefined;
  if (!kind) return undefined;
  const cells: Paradigm["cells"] = {};
  let verbTables = 0;
  let adjectiveTables = 0;
  let adjectiveMode = "str";
  const adjectiveHeads = new Map<string, string>();
  if (kind === "adj") {
    let strength = "str";
    for (const form of entry.forms ?? []) {
      const tags = form.tags ?? [];
      if (tags.includes("table-tags")) strength = form.form === "weak" ? "wk" : "str";
      if (!form.source || !["nominative", "singular", "masculine"].every((tag) => tags.includes(tag))) continue;
      const mode = tags.includes("comparative") ? "comp"
        : tags.includes("superlative") ? `${strength}_sup` : strength;
      adjectiveHeads.set(fold(form.form), mode);
    }
  }
  for (const template of entry.inflection_templates ?? []) {
    const { name, args } = template;
    const code = args["2"] ?? "";
    const rawMode = args["3"] ?? "";
    const mode = rawMode.includes("{{{") ? "" : rawMode;
    if (kind === "verb") {
      if (name === "non-conj-cell" && VERB_CODE.test(code) && (!mode || mode === "act" || mode === "mpass")) {
        // Hand-written tables leave mode unexpanded; their active block precedes their middle block.
        if (code === "infinitive") verbTables++;
        const voice = mode || (verbTables > 1 ? "mpass" : "act");
        addForms(cells, `${voice}|${code}`, args["1"] ?? "");
      }
    } else if (kind !== "personal" && name === "non-decl-cell") {
      if (kind === "noun" && /^[nadg][sp][id]$/.test(code)) addForms(cells, `|${code}`, args["1"] ?? "");
      else if ((kind === "adj" || kind === "pron") && /^[nadg][sp][mfn]?$/.test(code)) {
        if (kind === "adj" && mode && !ADJ_MODES[mode]) continue;
        const nominal = /^[dg]p/.test(code) ? code.slice(0, 2) : code;
        if (code === "nsm") {
          adjectiveTables++;
          const headMode = (args["1"] ?? "").split(/\s*,\s*/).map((f) => adjectiveHeads.get(fold(f))).find(Boolean);
          adjectiveMode = headMode ?? (adjectiveTables > 1 ? "wk" : "str");
        }
        addForms(cells, `${kind === "adj" ? mode || adjectiveMode : ""}|${nominal}`, args["1"] ?? "");
      }
    }
  }
  let formTables = 0;
  let formStrength = "";
  for (const form of entry.forms ?? []) {
    // Tagged forms lose voice and adjective strength; explicit tables preserve those distinctions.
    if (kind === "verb" && verbTables || kind === "adj" && adjectiveTables) break;
    let tags = form.tags ?? [];
    if (kind === "adj" && tags.includes("table-tags")) formStrength = form.form === "weak" ? "weak" : "strong";
    if (kind === "adj" && formStrength && !tags.includes("weak") && !tags.includes("strong")) {
      tags = [...tags, formStrength];
    }
    if (kind === "verb" && form.source === "conjugation" && tags.includes("infinitive")) formTables++;
    if (kind === "verb" && formTables > 1) tags = [...tags, "mediopassive"];
    for (const key of taggedCells(kind, tags)) addForms(cells, key, form.form);
  }
  if (!Object.keys(cells).length) return undefined;
  return { word: entry.word, kind, label: inflectionLabel(entry, kind, cells), cells };
}

/** Collects only lemmas used by the reader; attestation is counted once per reading and displayed word piece. */
export class ParadigmBuilder {
  private readonly readings = new Map<string, Map<ParadigmKind, Paradigm["attested"]>>();
  private readonly personalAttested: Paradigm["attested"] = {};

  use([lemma, morph]: Analysis): void {
    const kind = paradigmKind(morph, lemma);
    if (!kind || !fold(lemma)) return;
    let kinds = this.readings.get(lemma);
    if (!kinds) this.readings.set(lemma, kinds = new Map());
    if (!kinds.has(kind)) kinds.set(kind, {});
  }

  attest(surface: string, analyses: Analysis[]): void {
    const seen = new Set<string>();
    for (const [lemma, morph, source] of analyses) {
      if (source !== "e") continue;
      const kind = paradigmKind(morph, lemma);
      const attested = kind && this.readings.get(lemma)?.get(kind);
      if (!attested) continue;
      // Capitals at the start of a line or sentence are not part of a common word's form.
      const form = /^\p{Lu}/u.test(lemma) ? surface : surface.toLowerCase();
      // A syncretic annotation ("Case=Acc,Dat") attests the form in each of its cells.
      for (const cell of morphCells(morph, lemma)) {
        const key = `${lemma}\t${kind}\t${cell}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const forms = attested[cell] ??= {};
        forms[form] = (forms[form] ?? 0) + 1;
        // Every personal table displays all persons, so its markers share one corpus-wide count.
        if (kind === "personal" && !seen.has(`personal\t${cell}`)) {
          seen.add(`personal\t${cell}`);
          const shared = this.personalAttested[cell] ??= {};
          shared[form] = (shared[form] ?? 0) + 1;
        }
      }
    }
  }

  /** `zoegaFor` gives a lemma's Zoëga entries (best-fitting homograph first) for tables Wiktionary lacks. */
  build(jsonl: string, zoegaFor?: (lemma: string) => DictEntry[] | undefined): Paradigm[] {
    const exact = new Map<string, Candidate[]>();
    const loose = new Map<string, Candidate[]>();
    for (const line of jsonl.split("\n")) {
      if (!line) continue;
      const entry = JSON.parse(line) as WiktEntry;
      if (!entry.word || entry.word.includes(" ") || entry.word.startsWith("-")) continue;
      const candidate = extract(entry);
      if (!candidate) continue;
      const aliases = new Set([entry.word]);
      // The shared personal table also serves headwords such as hon, absent as standalone entries.
      if (candidate.kind === "personal") {
        for (const [cell, forms] of Object.entries(candidate.cells)) {
          if (/^\|[123]n/.test(cell)) for (const form of forms) aliases.add(form);
        }
      }
      for (const alias of aliases) {
        for (const [index, key] of [[exact, fold(alias)], [loose, looseDictionaryKey(alias)]] as const) {
          const entries = index.get(key) ?? [];
          if (!entries.includes(candidate)) entries.push(candidate);
          index.set(key, entries);
        }
      }
    }
    const out: Paradigm[] = [];
    for (const [lemma, kinds] of this.readings) for (const [kind, attested] of kinds) {
      // As in dictionary lookup, a common noun is not a table for a capitalized proper name.
      const proper = /^\p{Lu}/u.test(lemma);
      let candidates = exact.get(fold(lemma))
        ?.filter((c) => c.kind === kind && (!proper || /^\p{Lu}/u.test(c.word))) ?? [];
      if (!candidates.length) {
        candidates = loose.get(looseDictionaryKey(lemma))
          ?.filter((c) => c.kind === kind && (!proper || /^\p{Lu}/u.test(c.word))) ?? [];
      }
      let best: Candidate | undefined;
      let bestScore = -1;
      for (const candidate of candidates) {
        let score = 0;
        for (const [cell, forms] of Object.entries(attested)) {
          const expected = new Set(candidate.cells[cell]?.map(fold));
          for (const form of Object.keys(forms)) if (expected.has(fold(form))) score++;
        }
        const sameCase = candidate.word === lemma;
        const bestCase = best?.word === lemma;
        if (score > bestScore || (score === bestScore && (sameCase && !bestCase
          || sameCase === bestCase && Object.keys(candidate.cells).length > Object.keys(best?.cells ?? {}).length))) {
          best = candidate;
          bestScore = score;
        }
      }
      const marks = kind === "personal" ? this.personalAttested : attested;
      if (best) out.push({ lemma, kind, label: best.label, cells: best.cells, attested: marks, source: "wiktionary" });
      else {
        const generated = zoegaFor && !proper ? generate(lemma, kind, attested, zoegaFor) : undefined;
        if (generated) out.push({ lemma, kind, ...generated, attested: marks, source: "zoega" });
        else if (Object.keys(attested).length >= 2) out.push({ lemma, kind, cells: {}, attested: marks, source: "edition" });
      }
    }
    return out;
  }
}
