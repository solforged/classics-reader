// Extracts Wiktionary tables and joins the reader's edition-annotated forms without changing its analyses.
import { fold } from "../spelling";
import { morphCells, paradigmKind, type NorseParadigm as Paradigm, type ParadigmKind } from "../paradigm";
import { parseMorph } from "../../../src/lib/morph";
import { looseDictionaryKey } from "./lexicon";
import type { Analysis } from "../../../scripts/core/types";
import type { DictEntry } from "../../../src/lib/dict";
import { inflectAdjective } from "./inflect/adjectives";
import { CompoundAdjectives, CompoundNouns } from "./inflect/compounds";
import { inflectNoun, respellNoun } from "./inflect/nouns";
import { inflectName } from "./inflect/names";
import { inflectPronoun } from "./inflect/pronouns";
import { inflectVerb } from "./inflect/verbs";
import { grammarNotes, type Generated } from "./inflect/zoega";
import { pronounLabel } from "./menota";

const GENERATORS: Partial<Record<ParadigmKind, typeof inflectNoun>> = {
  noun: inflectNoun,
  adj: inflectAdjective,
  pron: inflectPronoun,
  verb: inflectVerb,
};

/** A table generated from the first Zoëga entry whose grammar note a generator can use without contradiction. */
function generate(
  lemma: string,
  kind: ParadigmKind,
  attested: Paradigm["attested"],
  zoegaFor: (lemma: string) => DictEntry[] | undefined,
  gender?: "m" | "f" | "n",
): Generated | undefined {
  const inflect = GENERATORS[kind];
  if (!inflect) return undefined;
  for (const entry of zoegaFor(lemma) ?? []) {
    const spelling = kind === "noun" && /^[\p{Ll}]+$/u.test(entry.w)
      && looseDictionaryKey(entry.w) === looseDictionaryKey(lemma) ? lemma : entry.w;
    const generated = inflect(entry.w, entry, attested, kind === "noun" ? gender : undefined, spelling);
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
  tags?: string[];
  senses?: { tags?: string[]; alt_of?: { word: string }[]; form_of?: { word: string }[] }[];
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
    if (cases.length) {
      if (!tags.includes("participle") || !tags.includes("past") || tags.includes("mediopassive")) return [];
      const mode = tags.includes("weak") || tags.includes("definite") ? "pp_wk" : "pp_str";
      for (const c of cases) for (const n of numbers) {
        const ending = n === "p" && /[dg]/.test(c) ? [""] : genders;
        for (const g of ending) keys.add(`${mode}|${c}${n}${g}`);
      }
      return [...keys];
    }
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
  return pronounLabel(entry.word) ?? (kind === "personal" ? "personal pronoun" : "pronoun");
}

/** Wiktionary table or explicit indeclinability of one entry, or undefined when it has neither. */
export function extract(entry: WiktEntry): Candidate | undefined {
  const kind: ParadigmKind | undefined = entry.pos === "noun" || entry.pos === "name" ? "noun"
    : entry.pos === "adj" ? "adj" : entry.pos === "verb" ? "verb"
    : entry.pos === "pron" || entry.pos === "det" || entry.pos === "article" || entry.pos === "num"
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
      if (name === "non-decl-cell" && (mode === "str" || mode === "wk") && /^[nadg][sp][mfn]?$/.test(code)) {
        const nominal = /^[dg]p/.test(code) ? code.slice(0, 2) : code;
        addForms(cells, `pp_${mode}|${nominal}`, args["1"] ?? "");
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
    // Explicit conjugation tables preserve voice; case-tagged participles add their own declension cells.
    if (kind === "adj" && adjectiveTables) break;
    let tags = form.tags ?? [];
    // These neuter singular compounds have case-only rows in Wiktionary; Zoëga confirms their gender.
    if (kind === "pron" && /^(?:hvatki|hvatvetna)$/.test(entry.word) && form.source === "declension"
      && CASES.some(([tag]) => tags.includes(tag)) && !NUMBERS.some(([tag]) => tags.includes(tag))) {
      tags = [...tags, "singular", "neuter"];
    }
    const declined = kind === "verb" && tags.includes("participle") && tags.includes("past")
      && CASES.some(([tag]) => tags.includes(tag));
    if ((kind === "adj" || kind === "verb" && form.source === "declension") && tags.includes("table-tags")) {
      formStrength = form.form === "weak" ? "weak" : "strong";
    }
    if (kind === "verb" && verbTables && !declined) continue;
    if ((kind === "adj" || declined) && formStrength && !tags.includes("weak") && !tags.includes("strong")) {
      tags = [...tags, formStrength];
    }
    if (kind === "verb" && form.source === "conjugation" && tags.includes("infinitive")) formTables++;
    if (kind === "verb" && formTables > 1 && !declined) tags = [...tags, "mediopassive"];
    for (const key of taggedCells(kind, tags)) addForms(cells, key, form.form);
  }
  if (!Object.keys(cells).length) {
    const indeclinable = kind === "adj" && (entry.tags?.includes("indeclinable")
      || entry.head_templates?.some((t) => t.name === "head" && t.args["3"] === "indeclinable")
      || Boolean(entry.senses?.length && entry.senses.every((sense) => sense.tags?.includes("indeclinable"))));
    return indeclinable ? { word: entry.word, kind, label: "indeclinable adjective", cells } : undefined;
  }
  return { word: entry.word, kind, label: inflectionLabel(entry, kind, cells), cells };
}

/** Follow only noun entries whose every sense explicitly names the same alternative spelling. */
function nounAlternative(entry: WiktEntry): string | undefined {
  if (entry.pos !== "noun" || /^\p{Lu}/u.test(entry.word)) return undefined;
  const targets = entry.senses?.map((sense) => {
    const alternatives = sense.alt_of ?? (sense.tags?.some((tag) => tag === "alt-of" || tag === "alternative")
      ? sense.form_of : undefined);
    return alternatives?.length === 1 ? alternatives[0]!.word : undefined;
  });
  return targets?.length && targets.every((target) => target && target === targets[0]) ? targets[0] : undefined;
}


interface NameUsage {
  gender?: "m" | "f" | "n";
  ambiguous: boolean;
  singular: boolean;
  plural: boolean;
}

/** Collects only lemmas used by the reader; attestation counts each grammatical word, without attached clitics. */
export class ParadigmBuilder {
  private readonly readings = new Map<string, Map<ParadigmKind, Paradigm["attested"]>>();
  private readonly nounGenders = new Map<string, Set<"m" | "f" | "n">>();
  private readonly personalAttested: Paradigm["attested"] = {};
  private readonly names = new Map<string, NameUsage>();

  use([lemma, morph, source]: Analysis): void {
    const kind = paradigmKind(morph, lemma);
    if (!kind || !fold(lemma)) return;
    let kinds = this.readings.get(lemma);
    if (!kinds) this.readings.set(lemma, kinds = new Map());
    if (!kinds.has(kind)) kinds.set(kind, {});
    if (morph.startsWith("NOUN") && (source === "e" || source === "a")) {
      let genders = this.nounGenders.get(lemma);
      if (!genders) this.nounGenders.set(lemma, genders = new Set());
      for (const value of parseMorph(morph).feats.Gender ?? []) {
        const gender = value === "Masc" ? "m" : value === "Fem" ? "f" : value === "Neut" ? "n" : undefined;
        if (gender) genders.add(gender);
      }
    }
    if (morph.startsWith("PROPN")) {
      const { feats } = parseMorph(morph);
      let name = this.names.get(lemma);
      if (!name) this.names.set(lemma, name = { ambiguous: false, singular: false, plural: false });
      const genders = feats.Gender ?? [];
      for (const value of genders) {
        const gender = value === "Masc" ? "m" : value === "Fem" ? "f" : value === "Neut" ? "n" : undefined;
        if (!gender) continue;
        if (name.gender && name.gender !== gender) name.ambiguous = true;
        else name.gender = gender;
      }
      // Wiktionary candidates are not evidence that the edition uses a name in either number.
      if (source === "e" || source === "a") {
        if (feats.Number?.includes("Sing")) name.singular = true;
        if (feats.Number?.includes("Plur")) name.plural = true;
      }
    }
  }

  attest(surface: string, analyses: Analysis[]): void {
    const seen = new Set<string>();
    for (const [lemma, morph, source, word] of analyses) {
      if (source !== "e") continue;
      // Some clitic annotations supply no independent surface; the graphic word is not a safe substitute.
      if (word === "" || (word === undefined && morph.includes("Clitic=Yes"))) continue;
      const kind = paradigmKind(morph, lemma);
      const attested = kind && this.readings.get(lemma)?.get(kind);
      if (!attested) continue;
      // Capitals at the start of a line or sentence are not part of a common word's form.
      const own = word ?? surface;
      const form = /^\p{Lu}/u.test(lemma) ? own : own.toLowerCase();
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
    const nameEntries = new Map<string, WiktEntry[]>();
    const nounAliases = new Map<string, string>();
    const bridgedNouns = new Set<Candidate>();
    for (const line of jsonl.split("\n")) {
      if (!line) continue;
      const entry = JSON.parse(line) as WiktEntry;
      if (!entry.word || entry.word.includes(" ") || entry.word.startsWith("-")) continue;
      const alternative = nounAlternative(entry);
      if (alternative) nounAliases.set(entry.word, alternative);
      if (/^\p{Lu}/u.test(entry.word) && (entry.pos === "name" || entry.pos === "noun")) {
        const key = fold(entry.word);
        const entries = nameEntries.get(key) ?? [];
        entries.push(entry);
        nameEntries.set(key, entries);
      }
      const candidate = extract(entry);
      if (!candidate) continue;
      const aliases = new Set([entry.word]);
      // Zoëga's einhverr entry redirects to einnhverr, whose table uses both spellings in its forms.
      if (candidate.kind === "pron" && entry.word === "einnhverr") aliases.add("einhverr");
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
    for (const [word, target] of nounAliases) {
      let head = target;
      const seen = new Set([word]);
      while (nounAliases.has(head) && !seen.has(head)) {
        seen.add(head);
        head = nounAliases.get(head)!;
      }
      for (const candidate of [...exact.get(fold(head)) ?? []]) {
        if (candidate.kind !== "noun" || /^\p{Lu}/u.test(candidate.word)) continue;
        const cells = respellNoun(candidate.cells, candidate.word, word);
        if (!cells) continue;
        const bridged = { ...candidate, word, cells };
        bridgedNouns.add(bridged);
        for (const [index, key] of [[exact, fold(word)], [loose, looseDictionaryKey(word)]] as const) {
          const entries = index.get(key) ?? [];
          entries.push(bridged);
          index.set(key, entries);
        }
      }
    }
    // The dump keeps many participle declensions under their own headword (koma → kominn).
    for (const candidates of exact.values()) for (const candidate of candidates) {
      if (candidate.kind !== "verb") continue;
      for (const form of candidate.cells["act|past_part"] ?? []) {
        for (const participle of exact.get(fold(form)) ?? []) {
          if (participle.kind !== "verb") continue;
          for (const [key, forms] of Object.entries(participle.cells)) {
            if (!/^pp_(?:str|wk)\|/.test(key)) continue;
            for (const value of forms) addForms(candidate.cells, key, value);
          }
        }
      }
    }
    const compounds = new CompoundAdjectives(new Set([...exact.values()].flat()), (word) => zoegaFor?.(word));
    const nounCompounds = new CompoundNouns(new Set([...exact.values()].flat()), (word) => zoegaFor?.(word));
    const comparisons = new Map<string, Candidate[]>();
    const formKey = (form: string) => fold(form.replace(/ǿ/g, "œ"));
    const nounSpellings = new Map<string, Candidate[]>();
    for (const candidates of exact.values()) for (const candidate of candidates) {
      if (candidate.kind === "noun" && !/^\p{Lu}/u.test(candidate.word)) {
        // The edition's ð and long-ø spellings also occur as d and æ/œ in dictionary headwords.
        const key = formKey(candidate.word).replace(/(?<=.)d/g, "ð");
        const entries = nounSpellings.get(key) ?? [];
        if (!entries.includes(candidate)) entries.push(candidate);
        nounSpellings.set(key, entries);
      }
      if (candidate.kind !== "adj" || !candidate.cells["str|nsm"]?.length
        || !candidate.cells["str_sup|nsm"]?.length) continue;
      for (const form of candidate.cells["comp|nsm"] ?? []) {
        if (formKey(form) === formKey(candidate.word)) continue;
        const parents = comparisons.get(formKey(form)) ?? [];
        if (!parents.includes(candidate)) parents.push(candidate);
        comparisons.set(formKey(form), parents);
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
      if (kind === "noun" && !proper && !candidates.length) {
        for (const candidate of nounSpellings.get(formKey(lemma).replace(/(?<=.)d/g, "ð")) ?? []) {
          const cells = respellNoun(candidate.cells, candidate.word, lemma);
          if (!cells) continue;
          const bridged = { ...candidate, word: lemma, cells };
          candidates.push(bridged);
          bridgedNouns.add(bridged);
        }
      }
      if (kind === "pron" && !proper && !candidates.length) {
        // The edition uses pronominal readings of adjective/numeral lemmas such as einn and annarr.
        const nominal = exact.get(fold(lemma)) ?? loose.get(looseDictionaryKey(lemma)) ?? [];
        candidates = nominal.filter((candidate) => candidate.kind === "adj" && candidate.cells["str|nsm"]?.length)
          .map((candidate) => ({
            word: candidate.word, kind: "pron", label: "pronominal declension",
            cells: Object.fromEntries(Object.entries(candidate.cells)
              .filter(([cell]) => cell.startsWith("str|")).map(([cell, forms]) => [cell.slice(3), forms])),
          }));
      }
      if (kind === "adj") {
        let parent: Candidate | undefined;
        let parentMatches = -1;
        let parentFrequency = -1;
        for (const candidate of comparisons.get(formKey(lemma)) ?? []) {
          let matches = 0;
          for (const [cell, forms] of Object.entries(attested)) {
            if (!/^(?:str|wk)_sup\|/.test(cell)) continue;
            const expected = new Set(candidate.cells[cell]?.map(formKey));
            for (const [form, count] of Object.entries(forms)) if (expected.has(formKey(form))) matches += count;
          }
          const own = this.readings.get(candidate.word)?.get("adj") ?? {};
          const frequency = Object.values(own).reduce((sum, forms) =>
            sum + Object.values(forms).reduce((n, count) => n + count, 0), 0);
          if (matches > parentMatches || matches === parentMatches && (frequency > parentFrequency
            || frequency === parentFrequency && (!parent || candidate.word < parent.word))) {
            parent = candidate;
            parentMatches = matches;
            parentFrequency = frequency;
          }
        }
        if (parent) candidates = [parent];
      }
      let best: Candidate | undefined;
      let bestScore = -1;
      for (const candidate of candidates) {
        if (bridgedNouns.has(candidate) && Object.entries(attested).some(([cell, forms]) =>
          Object.keys(forms).some((form) => !candidate.cells[cell]?.some((value) => formKey(value) === formKey(form))))) {
          continue;
        }
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
      if (proper && kind === "noun") {
        // Names don't take the article; the edition's two definite tags on names (Hrímfaxi, Ving-Þórr) are plain forms.
        for (const key of Object.keys(attested).filter((k) => /^\|[nadg][sp]d$/.test(k))) {
          const plain = attested[`${key.slice(0, -1)}i`] ??= {};
          for (const [form, count] of Object.entries(attested[key]!)) plain[form] = (plain[form] ?? 0) + count;
          delete attested[key];
        }
      }
      const marks = kind === "personal" ? this.personalAttested : attested;
      if (best) {
        // Wiktionary's noun template fills article forms for names too (Svíþjóðin, Mjǫllnirinn); names don't take them.
        const cells = proper && kind === "noun"
          ? Object.fromEntries(Object.entries(best.cells).filter(([key]) => !/^\|[nadg][sp]d$/.test(key)))
          : best.cells;
        out.push({ lemma, kind, label: best.label, cells, attested: marks, source: "wiktionary" });
      } else {
        const name = proper && kind === "noun" ? this.names.get(lemma) : undefined;
        const entries = name ? nameEntries.get(fold(lemma)) ?? [] : [];
        const genders = new Set<"m" | "f" | "n">();
        for (const entry of entries) for (const template of entry.head_templates ?? []) {
          for (const [key, value] of Object.entries(template.args)) {
            if (!/^g\d*$/.test(key)) continue;
            const gender = value[0];
            if (gender === "m" || gender === "f" || gender === "n") genders.add(gender);
          }
        }
        if (!genders.size && name) for (const note of zoegaFor?.(lemma)?.flatMap(grammarNotes) ?? []) {
          const gender = note.pos[0];
          if (gender === "m" || gender === "f" || gender === "n") genders.add(gender);
        }
        const gender = name?.gender ?? (genders.size === 1 ? [...genders][0] : undefined);
        const genitives = entries.flatMap((entry) => [
          ...(entry.forms ?? []).filter((form) => form.tags?.includes("genitive")
            && !form.tags.some((tag) => tag === "plural" || tag === "definite")).map((form) => form.form),
          ...(entry.head_templates ?? []).map((template) => template.args["3"] === "genitive"
            ? template.args["4"] : /^(?:non-noun|non-proper noun)$/.test(template.name) ? template.args["2"] : ""),
        ]).filter((form): form is string => !!form && /^\p{Lu}\p{L}*$/u.test(form));
        const named = name && gender && !name.ambiguous
          ? inflectName(lemma, gender, name.plural && !name.singular, attested, genitives) : undefined;
        if (named) out.push({ lemma, kind, ...named, attested: marks, source: "name" });
        else {
          const indeclinable = kind === "adj" && !proper ? zoegaFor?.(lemma)?.flatMap(grammarNotes)
            .find((note) => note.pos === "a." && /\bindecl\./.test(note.text)) : undefined;
          if (indeclinable) {
            out.push({ lemma, kind, label: "indeclinable adjective", cells: {}, attested: marks,
              source: "zoega", note: indeclinable.text });
            continue;
          }
          const genders = this.nounGenders.get(lemma);
          const gender = genders?.size === 1 ? genders.values().next().value : undefined;
          const generated = zoegaFor && !proper ? generate(lemma, kind, attested, zoegaFor, gender) : undefined;
          const compound = !generated && !proper ? kind === "adj" ? compounds.inflect(lemma, attested)
            : kind === "noun" && (!genders || genders.size <= 1)
              ? nounCompounds.inflect(lemma, attested, genders?.values().next().value) : undefined : undefined;
          // The citation-form marker duplicates a declined participle's nominal cell, not a second attestation.
          const cells = Object.keys(attested);
          const distinct = cells.filter((cell) => cell !== "act|past_part" || !cells.some((key) => key.startsWith("pp_")));
          if (generated) out.push({ lemma, kind, ...generated, attested: marks, source: "zoega" });
          else if (compound) out.push({ lemma, kind, ...compound, attested: marks,
            source: kind === "noun" || !zoegaFor?.(lemma)?.length ? "compound" : "zoega" });
          else if (distinct.length >= 2) {
            out.push({ lemma, kind, cells: {}, attested: marks, source: "edition" });
          }
        }
      }
    }
    for (const record of out) {
      if (record.kind !== "pron" && record.kind !== "personal") continue;
      const label = pronounLabel(record.lemma);
      if (label) record.label = `${record.label?.startsWith("partial ") ? "partial " : ""}${label}`;
    }
    return out;
  }
}
