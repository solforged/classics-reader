// Builds the form → analysis index (EAE annotations + Wiktionary tables) and dictionary gloss lookups.
import type { Element } from "@xmldom/xmldom";
import { formatMorph } from "../../src/lib/morph";
import { fold } from "../../src/lang/non/spelling";
import { FormIndex } from "./analyses";
import { menotaToUd } from "./menota";

const TEI = "http://www.tei-c.org/ns/1.0";
const ME = "http://www.menota.org/ns/1.0";

/** Every annotated EAE word, indexed by its normalized spelling. */
export function indexEae(divs: Map<string, Element>, index: FormIndex) {
  for (const div of divs.values()) {
    for (const w of Array.from(div.getElementsByTagNameNS(TEI, "w")) as Element[]) {
      const lemma = w.getAttribute("lemma");
      if (!lemma) continue;
      const norm = w.getElementsByTagNameNS(ME, "norm")[0];
      const text = norm?.textContent?.replace(/\s+/g, " ").trim();
      if (!text) continue;
      // A suffix inside an enclitic group is a fragment, not an independent-word candidate.
      const parent = w.parentNode;
      const fragment = parent?.nodeType === 1
        && (parent as Element).localName === "seg"
        && (parent as Element).getAttribute("type") === "enc";
      if (lemma.startsWith("-") && (fragment || fold(text) === fold(lemma.slice(1)))) continue;
      index.add(text, [lemma.normalize("NFC"), menotaToUd(w.getAttributeNS(ME, "msa") || ""), "e"]);
    }
  }
}

/** Wiktionary part of speech → UPOS and features, matching the classes the edition's tags convert to. */
const POS: Record<string, [upos: string, feats?: Record<string, string>]> = {
  noun: ["NOUN"],
  name: ["PROPN"],
  verb: ["VERB"],
  adj: ["ADJ"],
  adv: ["ADV"],
  prep: ["ADP"],
  postp: ["ADP"],
  pron: ["PRON"],
  det: ["PRON"],
  article: ["PRON"],
  num: ["NUM", { NumType: "Card" }],
  conj: ["CCONJ", { ConjType: "Unsp" }],
  intj: ["INTJ"],
  particle: ["PART"],
};

const TAG: Record<string, [name: string, value: string]> = {
  nominative: ["Case", "Nom"],
  accusative: ["Case", "Acc"],
  dative: ["Case", "Dat"],
  genitive: ["Case", "Gen"],
  singular: ["Number", "Sing"],
  plural: ["Number", "Plur"],
  dual: ["Number", "Dual"],
  masculine: ["Gender", "Masc"],
  feminine: ["Gender", "Fem"],
  neuter: ["Gender", "Neut"],
  "first-person": ["Person", "1"],
  "second-person": ["Person", "2"],
  "third-person": ["Person", "3"],
  present: ["Tense", "Pres"],
  past: ["Tense", "Past"],
  preterite: ["Tense", "Past"],
  indicative: ["Mood", "Ind"],
  subjunctive: ["Mood", "Sub"],
  imperative: ["Mood", "Imp"],
  finite: ["VerbForm", "Fin"],
  infinitive: ["VerbForm", "Inf"],
  participle: ["VerbForm", "Part"],
  active: ["Voice", "Act"],
  mediopassive: ["Voice", "Mid"],
  comparative: ["Degree", "Cmp"],
  superlative: ["Degree", "Sup"],
  positive: ["Degree", "Pos"],
  definite: ["Definite", "Def"],
  indefinite: ["Definite", "Ind"],
  weak: ["Definite", "Def"],
  strong: ["Definite", "Ind"],
};

const SKIP_TAGS = new Set(["table-tags", "inflection-template", "romanization", "class", "canonical"]);

function morphFrom(pos: string, tags: string[] = []): string {
  const [upos = "", lexical = {}] = POS[pos] ?? [];
  const feats: Record<string, string[]> = {};
  for (const [name, value] of Object.entries(lexical)) feats[name] = [value];
  for (const t of tags) {
    const tag = TAG[t];
    if (tag) (feats[tag[0]] ??= []).push(tag[1]);
  }
  if (feats.Mood && !feats.VerbForm) feats.VerbForm = ["Fin"];
  return formatMorph({ upos, feats });
}

interface WiktEntry {
  word: string;
  pos: string;
  forms?: { form: string; tags?: string[] }[];
  senses?: { glosses?: string[]; tags?: string[]; form_of?: { word: string }[]; alt_of?: { word: string }[] }[];
  inflection_templates?: { name: string; args: Record<string, string> }[];
}

export interface WiktGloss {
  pos: string;
  glosses: string[];
}

// Wiktionary uses these headwords for words the edition lemmatizes under their other spelling.
const EDITION_LEMMAS: Record<string, string> = {
  mínn: "minn", sínn: "sinn", einnhverr: "einhverr", þit: "it",
};

function alternativeTarget(s: NonNullable<WiktEntry["senses"]>[number]): string | undefined {
  if (s.alt_of?.length === 1) return s.alt_of[0]!.word;
  if (s.form_of?.length === 1 && s.tags?.some((t) => t === "alt-of" || t === "alternative")) return s.form_of[0]!.word;
  const gloss = s.glosses?.join("; ") ?? "";
  const spelling = /^(?:(?:alternative|alternate|variant|manuscript|obsolete|archaic|old|older|later|nonstandard)\s+)+(?:form|spelling|orthography) of ([^\s,;()“”]+)/i.exec(gloss);
  return spelling ? s.form_of?.[0]?.word ?? spelling[1]!.replace(/[.:]+$/, "") : undefined;
}

function tableForms(e: WiktEntry) {
  return (e.forms ?? []).filter((f) => f.form && !/^[-–—]$/.test(f.form)
    && !(f.tags ?? []).some((t) => SKIP_TAGS.has(t)) && morphFrom(e.pos, f.tags).includes(" "));
}

/** Adds Wiktionary forms to the index and returns lemma glosses (non form-of senses) by fold key. */
export function indexWiktionary(jsonl: string, index: FormIndex): Map<string, WiktGloss[]> {
  const glosses = new Map<string, WiktGloss[]>();
  const entries = jsonl.split("\n").filter(Boolean).map((line) => JSON.parse(line) as WiktEntry)
    .filter((e) => e.word && !e.word.includes(" ") && !e.word.startsWith("-"));
  const byWord = new Map<string, WiktEntry[]>();
  const aliases = new Map<WiktEntry, string>();
  for (const e of entries) {
    const list = byWord.get(e.word) ?? [];
    list.push(e);
    byWord.set(e.word, list);
    const targets = (e.senses ?? []).map(alternativeTarget);
    if (targets.length && targets.every((t) => t && t === targets[0])) aliases.set(e, targets[0]!);
  }
  const canonical = (word: string, pos: string): string => {
    const seen = new Set<string>();
    while (!seen.has(word)) {
      seen.add(word);
      if (EDITION_LEMMAS[word]) return EDITION_LEMMAS[word]!;
      const variants = (byWord.get(word) ?? []).filter((e) => POS[e.pos]?.[0] === POS[pos]?.[0]);
      const targets = variants.map((e) => aliases.get(e));
      if (!targets.length || !targets.every((t) => t && t === targets[0])) break;
      word = targets[0]!;
    }
    return word;
  };
  for (const e of entries) {
    const pos = e.pos;
    const target = aliases.get(e);
    const lemma = canonical(target ?? e.word, pos);
    if (target) {
      const targets = (byWord.get(target) ?? []).filter((e) => POS[e.pos]?.[0] === POS[pos]?.[0]);
      const forms = targets.flatMap(tableForms);
      const ownForms = tableForms(e);
      const layout = (fs: typeof ownForms) => [...new Set(fs.map((f) => morphFrom(pos, f.tags)))];
      const ownLayout = layout(ownForms);
      const matching = targets.find((t) => JSON.stringify(layout(tableForms(t))) === JSON.stringify(ownLayout));
      // Cell order is usable only when both tables expose the same sequence of grammatical cells.
      if (ownLayout.length && matching && !ownForms.some((f) => f.tags?.includes("personal"))) {
        for (const f of ownForms) for (const form of f.form.split(/\s*[,/]\s*/)) {
          index.add(form, [lemma, morphFrom(pos, f.tags), "w"]);
        }
      }
      let readings = forms.filter((f) => f.form.split(/\s*[,/]\s*/).includes(e.word));
      if (!readings.length) readings = ownForms.filter((f) => f.form.split(/\s*[,/]\s*/).includes(e.word));
      if (!readings.length) {
        const head = forms.filter((f) => f.form.split(/\s*[,/]\s*/).includes(target));
        // An untagged spelling alias cannot disambiguate a syncretic headword.
        if (new Set(head.map((f) => morphFrom(pos, f.tags))).size === 1) readings = head;
      }
      if (readings.length) for (const f of readings) index.add(e.word, [lemma, morphFrom(pos, f.tags), "w"]);
      else for (const s of e.senses ?? []) index.add(e.word, [lemma, morphFrom(pos, s.tags), "w"]);
    }
    const own = target ? [] : (e.senses ?? []).filter((s) => !s.form_of?.length && !s.alt_of?.length && s.glosses?.length);
    if (own.length || target) {
      if (own.length) {
        const head = tableForms(e).filter((f) => f.form.split(/\s*[,/]\s*/).includes(e.word));
        if ((pos === "pron" || pos === "det") && head.length) {
          for (const f of head) index.add(e.word, [lemma, morphFrom(pos, f.tags), "w"]);
        } else index.add(e.word, [lemma, morphFrom(pos), "w"]);
        const k = fold(lemma);
        const list = glosses.get(k) ?? [];
        list.push({ pos, glosses: own.map((s) => s.glosses!.join("; ")).slice(0, 6) });
        glosses.set(k, list);
      }
      // Kaikki can omit voice headings, or every form, while retaining the explicit conjugation cells.
      const middle = new Set<string>();
      let blocks = 0;
      for (const template of pos === "verb" ? e.inflection_templates ?? [] : []) {
        if (template.name !== "non-conj-cell") continue;
        const code = template.args["2"] ?? "";
        if (code === "infinitive") blocks++;
        const rawMode = template.args["3"] ?? "";
        const mode = rawMode.includes("{{{") ? "" : rawMode;
        if (mode ? mode !== "mpass" : blocks < 2) continue;
        const tags = ["mediopassive"];
        if (code === "infinitive") tags.push("infinitive");
        else if (code === "pres_part" || code === "past_part") tags.push("participle", code === "past_part" ? "past" : "present");
        else {
          const finite = code.match(/^(pres|past)_(ind|sub)_([123])(sg|pl)$/);
          const imperative = code.match(/^impr_([123])(sg|pl)$/);
          if (finite) tags.push(finite[1] === "past" ? "past" : "present", finite[2] === "sub" ? "subjunctive" : "indicative");
          else if (imperative) tags.push("imperative");
          else continue;
          const person = finite?.[3] ?? imperative![1]!;
          const number = finite?.[4] ?? imperative![2]!;
          tags.push(["first-person", "second-person", "third-person"][Number(person) - 1]!, number === "pl" ? "plural" : "singular");
        }
        for (const form of (template.args["1"] ?? "").split(/\s*[,/]\s*/)) {
          if (!form || /^[-–—]$/.test(form) || form.includes("{{{")) continue;
          middle.add(fold(form.replace(/ǿ/g, "œ")));
          index.add(form, [lemma, morphFrom(pos, tags), "w"]);
        }
      }
      // Pronoun tables are shared across several headwords; only trust explicit form-of senses there.
      if (pos !== "pron" && pos !== "det") {
        for (const f of e.forms ?? []) {
          const tags = f.tags ?? [];
          if (!f.form || f.form === "-" || tags.some((t) => SKIP_TAGS.has(t))) continue;
          for (const form of f.form.split(/\s*[,/]\s*/)) {
            const voice = middle.has(fold(form.replace(/ǿ/g, "œ"))) ? [...tags, "mediopassive"] : tags;
            index.add(form, [lemma, morphFrom(pos, voice), "w"]);
          }
        }
      }
    }
    for (const s of target ? [] : e.senses ?? []) {
      for (const fo of [...s.form_of ?? [], ...s.alt_of ?? []]) {
        if (fo.word && !fo.word.startsWith("-")) index.add(e.word, [canonical(fo.word, pos), morphFrom(pos, s.tags), "w"]);
      }
    }
  }
  return glosses;
}

export interface DictEntry {
  word: string;
  definitions: string[];
}

/** A printed headword without homograph labels or compound separators. */
export function dictionaryHeadword(word: string): string {
  return word.replace(/\s*\(.*?\)\s*/g, "").replace(/\d+$/, "").replace(/[-‑·.]/g, "").trim();
}

/** Dictionary orthography only: keep long ø (ǿ/œ) distinct from o, and ö/ǫ distinct from both. */
export function looseDictionaryKey(word: string): string {
  return dictionaryHeadword(word)
    .normalize("NFC")
    .toLowerCase()
    .replace(/[ǿœ]/g, "œ")
    .replace(/[ǫøö]/g, "ø")
    .replace(/[ǽę]/g, "æ")
    .replace(/^ú/, "ó")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .normalize("NFC")
    .replace(/ft/g, "pt")
    .replace(/endi$/, "indi")
    .replace(/usta$/, "osta");
}

/** Headword → entries; the default key drops CV compound hyphens, as corpus lookups do. */
export function indexDictionary(
  entries: DictEntry[],
  key: (word: string) => string = fold,
): Map<string, DictEntry[]> {
  const map = new Map<string, DictEntry[]>();
  for (const e of entries) {
    const k = key(dictionaryHeadword(e.word));
    if (!k) continue;
    const list = map.get(k) ?? [];
    list.push(e);
    map.set(k, list);
  }
  return map;
}

/** Keep only <i>/<b>/<strong>/<em> markup from dictionary HTML. */
export function sanitizeDef(html: string): string {
  return html
    .replace(/<(\/?)(strong|em)>/g, "<$1$2>")
    .replace(/<(?!\/?(?:i|b|strong|em)>)[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
