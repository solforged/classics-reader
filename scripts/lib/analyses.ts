// Word analyses: per-work table of [lemma, morph, source] plus a form index for unannotated text.
import { withoutFeature } from "../../src/lib/morph";
import { fold } from "../../src/lang/non/spelling";
import type { Analysis } from "./types";

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

interface IndexedAnalysis {
  analysis: Analysis;
  count: number;
}

export class FormIndex {
  private forms = new Map<string, Map<string, IndexedAnalysis>>();
  /** Accent-less keys, for diplomatic text that writes Óðinn as Oðinn. */
  private bare = new Map<string, Set<string>>();

  add(form: string, a: Analysis) {
    const k = fold(form);
    if (!k) return;
    // The clitic flag describes a particular occurrence, not the form.
    const analysis: Analysis = [a[0], withoutFeature(a[1], "Clitic"), a[2]];
    let m = this.forms.get(k);
    if (!m) this.forms.set(k, (m = new Map()));
    const id = `${analysis[0]}\t${analysis[1]}`;
    const prev = m.get(id);
    // Each edition annotation contributes one attestation of this form and reading.
    if (!prev) m.set(id, { analysis, count: analysis[2] === "e" ? 1 : 0 });
    else {
      if (analysis[2] === "e") prev.count++;
      if (prev.analysis[2] === "w" && analysis[2] !== "w") prev.analysis = analysis;
    }
    const b = deaccent(k);
    if (b !== k) {
      let s = this.bare.get(b);
      if (!s) this.bare.set(b, (s = new Set()));
      s.add(k);
    }
  }

  private hit(k: string, diplomatic: boolean): Map<string, IndexedAnalysis> | undefined {
    const h = this.forms.get(k);
    if (h || !diplomatic) return h;
    const keys = this.bare.get(deaccent(k));
    if (!keys) return undefined;
    const merged = new Map<string, IndexedAnalysis>();
    for (const key of keys) {
      for (const [id, a] of this.forms.get(key)!) {
        const prev = merged.get(id);
        if (!prev) merged.set(id, { ...a });
        else {
          prev.count += a.count;
          if (prev.analysis[2] === "w" && a.analysis[2] !== "w") prev.analysis = a.analysis;
        }
      }
    }
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

/** Most frequent attested readings first; Wiktionary candidates only when none are attested. */
function rank(list: IndexedAnalysis[]): Analysis[] {
  const attested = list.filter((a) => a.analysis[2] !== "w");
  return (attested.length ? attested.sort((a, b) => b.count - a.count) : list)
    .slice(0, 8)
    .map((a) => a.analysis);
}

/** Per-work analysis table; ids index into Work.analyses. */
export class AnalysisTable {
  readonly list: Analysis[] = [];
  private ids = new Map<string, number>();

  constructor(
    private index: FormIndex,
    private diplomatic = false,
    private names?: (surface: string) => string | undefined,
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
    const analyses = this.index.get(surface, this.diplomatic);
    if (!analyses.length && /^\p{Lu}/u.test(surface)) {
      const lemma = this.names?.(surface);
      if (lemma) return [this.add([lemma, "PROPN", "n"])];
    }
    return analyses.map((a) => this.add([a[0], a[1], a[2] === "e" ? "a" : a[2]]));
  }
}
