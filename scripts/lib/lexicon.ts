// Builds the form → analysis index (EAE annotations + Wiktionary tables) and dictionary gloss lookups.
import type { Element } from "@xmldom/xmldom";
import { fold } from "../../src/lib/norse";
import { FormIndex } from "./analyses";

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
      index.add(text, [lemma.normalize("NFC"), w.getAttributeNS(ME, "msa") || "", "e"]);
    }
  }
}

const POS: Record<string, string> = {
  noun: "xNC",
  name: "xNP",
  verb: "xVB",
  adj: "xAJ",
  adv: "xAV",
  prep: "xAP",
  postp: "xAP",
  pron: "xPD",
  det: "xPD",
  article: "xPD",
  num: "xNA",
  conj: "xCU",
  intj: "xIT",
  particle: "xUA",
};

const TAG: Record<string, string> = {
  nominative: "cN",
  accusative: "cA",
  dative: "cD",
  genitive: "cG",
  singular: "nS",
  plural: "nP",
  dual: "nD",
  masculine: "gM",
  feminine: "gF",
  neuter: "gN",
  "first-person": "p1",
  "second-person": "p2",
  "third-person": "p3",
  present: "tPS",
  past: "tPT",
  preterite: "tPT",
  indicative: "mIN",
  subjunctive: "mSU",
  imperative: "mIP",
  infinitive: "fI",
  participle: "fP",
  active: "vA",
  mediopassive: "vR",
  comparative: "rC",
  superlative: "rS",
  positive: "rP",
  definite: "sD",
  indefinite: "sI",
  weak: "sD",
  strong: "sI",
};

const SKIP_TAGS = new Set(["table-tags", "inflection-template", "romanization", "class", "canonical"]);

function msaFrom(pos: string, tags: string[] = []): string {
  const parts = [POS[pos] ?? ""];
  for (const t of tags) {
    const code = TAG[t];
    if (code && !parts.includes(code)) parts.push(code);
  }
  if (tags.includes("finite") || parts.some((p) => /^m(IN|SU|IP)$/.test(p))) parts.splice(1, 0, "fF");
  return parts.filter(Boolean).join(" ");
}

interface WiktEntry {
  word: string;
  pos: string;
  forms?: { form: string; tags?: string[] }[];
  senses?: { glosses?: string[]; tags?: string[]; form_of?: { word: string }[] }[];
}

export interface WiktGloss {
  pos: string;
  glosses: string[];
}

/** Adds Wiktionary forms to the index and returns lemma glosses (non form-of senses) by fold key. */
export function indexWiktionary(jsonl: string, index: FormIndex): Map<string, WiktGloss[]> {
  const glosses = new Map<string, WiktGloss[]>();
  for (const line of jsonl.split("\n")) {
    if (!line) continue;
    const e = JSON.parse(line) as WiktEntry;
    if (!e.word || e.word.includes(" ") || e.word.startsWith("-")) continue;
    const pos = e.pos;
    const own = (e.senses ?? []).filter((s) => !s.form_of?.length && s.glosses?.length);
    if (own.length) {
      index.add(e.word, [e.word, msaFrom(pos), "w"]);
      const k = fold(e.word);
      const list = glosses.get(k) ?? [];
      list.push({ pos, glosses: own.map((s) => s.glosses!.join("; ")).slice(0, 6) });
      glosses.set(k, list);
      // Pronoun tables are shared across several headwords; only trust explicit form-of senses there.
      if (pos !== "pron" && pos !== "det") {
        for (const f of e.forms ?? []) {
          const tags = f.tags ?? [];
          if (!f.form || f.form === "-" || tags.some((t) => SKIP_TAGS.has(t))) continue;
          for (const form of f.form.split(/\s*[,/]\s*/)) index.add(form, [e.word, msaFrom(pos, tags), "w"]);
        }
      }
    }
    for (const s of e.senses ?? []) {
      for (const fo of s.form_of ?? []) {
        if (fo.word && !fo.word.startsWith("-")) index.add(e.word, [fo.word, msaFrom(pos, s.tags), "w"]);
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
