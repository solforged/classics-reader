// Old Norse form index: candidate readings for forms the edition does not annotate, matched across the spelling
// differences between the Codex Regius normalization, the Snorra Edda and Bugge's diplomatic texts.
import { withoutFeature } from "../../../src/lib/morph";
import { fold } from "../spelling";
import type { Analysis } from "../../../scripts/core/types";
import { pronounMorph } from "./menota";

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

/** Later -st/-zt corresponds to middle -sk/-zk, including dental and geminate assimilation. */
const MIDDLE_STEPS: [RegExp, string][] = [
  [/st$/, "sk"],
  [/zt$/, "zk"],
  [/[ðdt]st$/, "zk"],
  [/([lnr])\1st$/, "$1sk"],
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
  for (const variant of [key, ...out]) {
    for (const [re, to] of MIDDLE_STEPS) {
      const middle = variant.replace(re, to);
      if (middle !== variant) out.add(middle);
    }
  }
  return [...out];
}

const deaccent = (k: string) => k.normalize("NFD").replace(/\p{M}/gu, "").normalize("NFC");
const lemmaClass = (a: Analysis) => `${a[0]}\t${a[1].split(" ", 1)[0]}`;

interface IndexedAnalysis {
  analysis: Analysis;
  count: number;
  /** Wiktionary independently lists this spelling for the lemma. */
  wiktionary?: boolean;
  /** Exceptional weak forms can be restricted to enclitic use. */
  clitic?: boolean;
  /** Dictionary candidate retained from the first matching spelling. */
  exact?: boolean;
}

export class FormIndex {
  private forms = new Map<string, Map<string, IndexedAnalysis>>();
  /** Accent-less keys, for diplomatic text that writes Óðinn as Oðinn. */
  private bare = new Map<string, Set<string>>();
  /** Edition frequency of a lemma and word class, independent of its inflected spelling. */
  private lemmaCounts = new Map<string, number>();

  add(form: string, a: Analysis) {
    const k = fold(form.replace(/ǿ/g, "œ"));
    if (!k) return;
    // The clitic flag describes a particular occurrence, not the form.
    const analysis: Analysis = [a[0], withoutFeature(pronounMorph(a[0], a[1]), "Clitic"), a[2]];
    if (analysis[2] === "e") {
      const lexeme = lemmaClass(analysis);
      this.lemmaCounts.set(lexeme, (this.lemmaCounts.get(lexeme) ?? 0) + 1);
    }
    let m = this.forms.get(k);
    if (!m) this.forms.set(k, (m = new Map()));
    const id = `${analysis[0]}\t${analysis[1]}`;
    const prev = m.get(id);
    // Each edition annotation contributes one attestation of this form and reading.
    if (!prev) m.set(id, {
      analysis, count: analysis[2] === "e" ? 1 : 0, wiktionary: analysis[2] === "w",
      clitic: /\bClitic=Yes\b/.test(a[1]),
    });
    else {
      if (analysis[2] === "e") prev.count++;
      prev.wiktionary ||= analysis[2] === "w";
      prev.clitic ||= /\bClitic=Yes\b/.test(a[1]);
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
    if (!diplomatic) return h;
    const keys = this.bare.get(deaccent(k));
    if (!keys) return h;
    const merged = new Map<string, IndexedAnalysis>();
    const keepExact = h && ![...h.values()].some((a) => a.analysis[2] !== "w");
    for (const key of new Set([k, deaccent(k), ...keys])) {
      for (const [id, a] of this.forms.get(key) ?? []) {
        const prev = merged.get(id);
        const exact = key === k && !!keepExact;
        if (!prev) merged.set(id, { ...a, exact });
        else {
          prev.count += a.count;
          prev.exact ||= exact;
          prev.wiktionary ||= a.wiktionary;
          prev.clitic ||= a.clitic;
          if (prev.analysis[2] === "w" && a.analysis[2] !== "w") prev.analysis = a.analysis;
        }
      }
    }
    return merged;
  }

  get(surface: string, diplomatic = false): Analysis[] {
    const k = fold(surface.replace(/ǿ/g, "œ"));
    const literal = this.forms.get(k);
    const dictionaryOnly = literal && [...literal.values()].every((a) => a.analysis[2] === "w");
    let candidates: IndexedAnalysis[] | undefined;
    for (const key of [k, ...spellingVariants(k, diplomatic)]) {
      const h = this.hit(key, diplomatic);
      if (!h) continue;
      // A middle spelling bridge must never create nominal readings for an unrelated -st word.
      const middle = /(?:st|zt|z)$/.test(k) && /(?:sk|zk)$/.test(key);
      const list = [...h.values()].filter((a) => !middle || /^VERB\b.*\bVoice=Mid\b/.test(a.analysis[1]));
      if (!list.length) continue;
      if (candidates) {
        candidates.push(...list.filter((a) => a.analysis[2] !== "w"));
      } else if ((key === k && dictionaryOnly) || list.every((a) => a.analysis[2] === "w")) {
        // Dictionary homographs must not hide readings attested under the edition's spelling.
        candidates = list.map((a) => ({ ...a, exact: key === k && diplomatic ? a.exact ?? true : true }));
      } else return rank(list, this.lemmaCounts);
    }
    return candidates ? rank(candidates, this.lemmaCounts) : [];
  }

  get size() {
    return this.forms.size;
  }
}

/** Attested readings lead; retained dictionary candidates follow in edition lemma-and-class frequency order. */
function rank(list: IndexedAnalysis[], lemmaCounts: ReadonlyMap<string, number>): Analysis[] {
  const counts = new Map<string, number>();
  const supported = new Set<string>();
  for (const a of list) {
    counts.set(a.analysis[0], (counts.get(a.analysis[0]) ?? 0) + a.count);
    if (a.wiktionary || a.clitic) supported.add(a.analysis[0]);
  }
  const dominant = Math.max(0, ...counts.values());
  // Keep dictionary-supported homographs and exceptional enclitics. An unsupported singleton
  // lemma loses only against at least 200 edition occurrences of a competing lemma.
  const attested = list.filter((a) => a.analysis[2] !== "w"
    && !(dominant >= 200 && counts.get(a.analysis[0]) === 1 && !supported.has(a.analysis[0])))
    .sort((a, b) => b.count - a.count);
  const wiktionary = list.filter((a) => a.analysis[2] === "w" && (!attested.length || a.exact))
    .sort((a, b) => (lemmaCounts.get(lemmaClass(b.analysis)) ?? 0) - (lemmaCounts.get(lemmaClass(a.analysis)) ?? 0));
  const candidates = [...attested, ...wiktionary];
  const seen = new Set<string>();
  return candidates.filter(({ analysis }) => {
    const id = `${analysis[0]}\t${withoutFeature(analysis[1], "InflClass")}`;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  }).slice(0, 8).map((a) => a.analysis);
}
