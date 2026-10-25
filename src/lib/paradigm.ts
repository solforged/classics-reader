// Inflection tables (public/para/<shard>.json), written by scripts/build-data.ts and drawn by the word panel and the
// lemma pages. Each shard maps fold(lemma) to Paradigm[] (several when one spelling is several words: vit the noun and
// vit the pronoun, Askr and askr).
//
// Cell keys are `${mode}|${code}`, following Wiktionary's Old Norse table templates:
//   nominal code  `${case}${number}${gender|definiteness}`: case n a d g, number s p (d = dual, personal pronouns),
//                 third letter m f n for adjectives, pronouns and determiners, i d (indefinite, definite) for nouns;
//                 plural dative and genitive of adjectives have no gender letter ("dp", "gp").
//   adjective mode  str, wk, comp, str_sup, wk_sup
//   verb code     infinitive, pres_part, past_part, `${tense}_${mood}_${person}${number}` with tense pres past,
//                 mood ind sub, number sg pl (e.g. "past_ind_3sg"), imperative `impr_${person}${number}`
//   verb mode     act, mpass
//   personal pronoun code  `${person}${case}${number}${gender?}` with person 1 2 3 r (reflexive), e.g. "1ns", "3asm"
//   nouns and pronouns have mode "" (key "|nsi", "|dpm").

export type ParadigmKind = "noun" | "adj" | "verb" | "pron" | "personal";

export interface Paradigm {
  /** The lemma as spelled in the reader (records are keyed by fold(), which merges Askr and askr). */
  lemma: string;
  kind: ParadigmKind;
  /** Inflection class as Wiktionary gives it, e.g. "strong a-stem", "strong verb, class 5". */
  label?: string;
  /** Cell key → forms, alternative spellings in Wiktionary's order. Empty for edition-only tables. */
  cells: Record<string, string[]>;
  /** Cell key → { form → count } for forms the Codex Regius edition annotates in this reader. */
  attested: Record<string, Record<string, number>>;
  /** "wiktionary": full table from Wiktionary; "edition": only the forms attested in the edition. */
  source: "wiktionary" | "edition";
}

/** Reflexive pronoun lemmas; the edition tags them xPD without a person. */
const REFLEXIVE = new Set(["sik", "sín"]);

/**
 * Paradigm kind for a Menota msa word class, or undefined for uninflected classes. The edition tags personal pronouns
 * xPD with a person (ek "xPD p1 nS cN"), so a person, or a reflexive lemma, marks a personal pronoun.
 */
export function paradigmKind(msa: string, lemma = ""): ParadigmKind | undefined {
  const x = msa.match(/\bx(\w\w)/)?.[1] ?? "";
  if (x === "PD" && (/\bp[123]\b/.test(msa) || REFLEXIVE.has(lemma.toLowerCase()))) return "personal";
  if (x === "NC" || x === "NP") return "noun";
  if (x === "AJ" || x === "NO") return "adj";
  if (x === "VB") return "verb";
  if (x === "PE") return "personal";
  if (x === "PD" || x === "PI" || x === "PQ" || x === "PP" || x === "DD" || x === "DQ" || x === "DP" || x === "AT") return "pron";
  return undefined;
}

/** Table cell for a Menota msa string, e.g. "xNC gM nS cA sI" → "|asi", "xVB fF tPT mIN p3 nS vA" → "act|past_ind_3sg". */
export function msaCell(msa: string, lemma = ""): string | undefined {
  const f: Record<string, string> = {};
  for (const tok of msa.split(/\s+/)) if (tok) f[tok[0]!] = tok.slice(1);
  const kind = paradigmKind(msa, lemma);
  const c = f.c?.toLowerCase();
  const n = f.n?.toLowerCase();
  const g = f.g?.toLowerCase();
  if (kind === "noun") return c && n ? `|${c}${n}${f.s === "D" ? "d" : "i"}` : undefined;
  if (kind === "adj") {
    if (!c || !n) return undefined;
    const weak = f.s === "D";
    const mode = f.r === "C" ? "comp" : f.r === "S" ? (weak ? "wk_sup" : "str_sup") : weak ? "wk" : "str";
    return `${mode}|${c}${n}${n === "p" && (c === "d" || c === "g") ? "" : (g ?? "")}`;
  }
  if (kind === "pron") return c && n ? `|${c}${n}${n === "p" && (c === "d" || c === "g") ? "" : (g ?? "")}` : undefined;
  if (kind === "personal") {
    const person = f.p ?? "r";
    return c && n ? `|${person}${c}${n}${person === "3" ? (g ?? "") : ""}` : undefined;
  }
  if (kind === "verb") {
    const mode = f.v === "R" ? "mpass" : "act";
    if (f.f === "I") return `${mode}|infinitive`;
    if (f.f === "P") return `${mode}|${f.t === "PT" ? "past" : "pres"}_part`;
    const number = f.n === "P" ? "pl" : "sg";
    if (f.m === "IP") return `${mode}|impr_${f.p ?? "2"}${number}`;
    const tense = f.t === "PT" ? "past" : "pres";
    const mood = f.m === "SU" ? "sub" : "ind";
    return f.p ? `${mode}|${tense}_${mood}_${f.p}${number}` : undefined;
  }
  return undefined;
}
