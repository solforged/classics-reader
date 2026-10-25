// Word analyses: per-work table of [lemma, msa, source] plus a form index for unannotated text.
import { fold } from "../../src/lib/norse";
import type { Analysis, AnalysisSource } from "./types";

/** Spelling differences between the Snorra Edda / Bugge texts and the Codex Regius edition's normalization. */
const NORMAL_STEPS: [RegExp, string][] = [
  [/^honum$/, "hánum"],
  [/^of$/, "um"],
  [/^vá(?=r)/, "vó"],
  [/lig(?=[rtar]|a$|um$)/, "leg"],
  [/(?<=[aeiouáéíóú])t$/, "ð"],
];

/** Manuscript spellings in Bugge's diplomatic texts. */
const DIPLOMATIC_STEPS: [RegExp, string][] = [
  [/ꜹ/g, "au"],
  [/ꜳ|aa/g, "á"],
  [/ꝛ/g, "r"],
  [/q/g, "k"],
  [/c/g, "k"],
  [/(?<=.)d/g, "ð"],
  [/(?<=.)þ/g, "ð"],
  [/(?<=^|[^aeiouyáéíóúýæö])i(?=[aeiouáéóúæö])/g, "j"],
  [/(?<=[hkst])u(?=[aeiáæ])/g, "v"],
  [/^v(?=[^aeiouyáéíóúýæöœ])/g, "u"],
  [/(?<=[^aeiouyáéíóúýæö])v(?=[^aeiouyáéíóúýæö]|$)/g, "u"],
  [/ei(?=ng)/g, "e"],
  [/æ(?=[ikr])/g, "e"],
  [/^æ/g, "e"],
  [/z$/g, "st"],
  [/au/g, "ö"],
];

/** Alternative lookup keys: each rule alone, then all rules applied in sequence. */
export function spellingVariants(key: string, diplomatic: boolean): string[] {
  const steps = diplomatic ? [...DIPLOMATIC_STEPS, ...NORMAL_STEPS] : NORMAL_STEPS;
  const out = new Set<string>();
  let cur = key;
  for (const [re, to] of steps) {
    const single = key.replace(re, to);
    if (single !== key) out.add(single);
    cur = cur.replace(re, to);
    if (cur !== key) out.add(cur);
  }
  return [...out];
}

const deaccent = (k: string) => k.normalize("NFD").replace(/\p{M}/gu, "").normalize("NFC");

export class FormIndex {
  private forms = new Map<string, Map<string, Analysis>>();
  /** Accent-less keys, for diplomatic text that writes Óðinn as Oðinn. */
  private bare = new Map<string, Set<string>>();

  add(form: string, a: Analysis) {
    const k = fold(form);
    if (!k) return;
    // The enclitic flag describes a particular occurrence, not the form.
    const analysis: Analysis = [a[0], a[1].replace(/\s*eE\b/, ""), a[2]];
    let m = this.forms.get(k);
    if (!m) this.forms.set(k, (m = new Map()));
    const id = `${analysis[0]}\t${analysis[1]}`;
    const prev = m.get(id);
    // Attested (edition) analyses outrank Wiktionary-derived ones.
    if (!prev || (prev[2] === "w" && analysis[2] !== "w")) m.set(id, analysis);
    const b = deaccent(k);
    if (b !== k) {
      let s = this.bare.get(b);
      if (!s) this.bare.set(b, (s = new Set()));
      s.add(k);
    }
  }

  private hit(k: string, diplomatic: boolean): Map<string, Analysis> | undefined {
    const h = this.forms.get(k);
    if (h || !diplomatic) return h;
    const keys = this.bare.get(deaccent(k));
    if (!keys) return undefined;
    const merged = new Map<string, Analysis>();
    for (const key of keys) for (const [id, a] of this.forms.get(key)!) merged.set(id, a);
    return merged;
  }

  get(surface: string, diplomatic = false): Analysis[] {
    const k = fold(surface);
    for (const key of [k, ...spellingVariants(k, diplomatic)]) {
      const h = this.hit(key, diplomatic);
      if (h) return rank([...h.values()]);
    }
    return [];
  }

  get size() {
    return this.forms.size;
  }
}

/** Attested analyses only, if there are any; otherwise Wiktionary candidates. */
function rank(list: Analysis[]): Analysis[] {
  const attested = list.filter((a) => a[2] !== "w");
  return (attested.length ? attested : list).slice(0, 8);
}

/** Per-work analysis table; ids index into Work.analyses. */
export class AnalysisTable {
  readonly list: Analysis[] = [];
  private ids = new Map<string, number>();

  constructor(
    private index: FormIndex,
    private diplomatic = false,
  ) {}

  add(a: Analysis): number {
    const k = a.join("\t");
    let id = this.ids.get(k);
    if (id === undefined) {
      id = this.list.length;
      this.list.push(a);
      this.ids.set(k, id);
    }
    return id;
  }

  /** Candidate analyses for an unannotated surface form. Attested-elsewhere entries are tagged "a". */
  lookup(surface: string): number[] {
    return this.index
      .get(surface, this.diplomatic)
      .map((a) => this.add([a[0], a[1], a[2] === "e" ? "a" : a[2]]));
  }
}
