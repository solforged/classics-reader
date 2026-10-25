// Menota morphosyntactic tags (the EAE edition's me:msa, e.g. "xVB fF tPS mIN p1 nS vA iST") → UD morphology
// (src/lib/morph.ts). Tag values follow Haugen & Øverland, Guidelines for Morphological and Syntactic Annotation of
// Old Norwegian Texts (Menotec, BeLLS 4.2, 2014), ch. 1.1 and 1.5.
//
// Old Norse pack features beyond UD's universal set:
//   ConjType=Unsp  xCU, a conjunction the edition does not class as coordinating or subordinating
//   PartType=Inf   xIM, the infinitive marker "at"
//   Govern=Acc|Dat|Gen  case a preposition governs (y)
//   InflClass=Strong|Weak|Redup|PretPres  verb class (i)
// Unspecified values (gU, cU, …) are dropped. Syncretic values (cAD, cO) and a feature repeated with different values
// ("cA cD cG") become comma-joined alternatives.
import { formatMorph } from "../../src/lib/morph";

/** Numeric headwords in the edition stand for different cardinal and ordinal words. */
const NUMERAL_LEMMAS: Record<string, readonly [cardinal: string, ordinal?: string]> = {
  "2": ["tveir", "annarr"],
  "3": ["þrír", "þriði"],
  "4": ["fjórir", "fjórði"],
  "5": ["fimm", "fimmti"],
  "6": ["sex", "sétti"],
  "7": ["sjau", "sjaundi"],
  "8": ["átta", "átti"],
  "9": ["níu", "níundi"],
  "10": ["tíu", "tíundi"],
  "11": ["ellifu", "ellifti"],
  "12": ["tólf", "tólfti"],
  "13": ["þrettán", "þrettándi"],
  "14": ["fjórtán", "fjórtándi"],
  "15": ["fimmtán", "fimmtándi"],
  "16": ["sextán", "sextándi"],
  "17": ["sjautján", "sjautjándi"],
  "18": ["átján", "átjándi"],
  "30": ["þrír tigir"],
  "100": ["hundrað"],
};

export function menotaLemma(lemma: string, msa: string): string {
  const numeral = NUMERAL_LEMMAS[lemma];
  return (numeral?.[/\bxNO\b/.test(msa) ? 1 : 0] ?? lemma).normalize("NFC");
}

const WORD_CLASS: Record<string, [upos: string, feats?: Record<string, string>]> = {
  NC: ["NOUN"],
  NP: ["PROPN"],
  AJ: ["ADJ"],
  NO: ["ADJ", { NumType: "Ord" }],
  NA: ["NUM", { NumType: "Card" }],
  AV: ["ADV"],
  AQ: ["ADV", { PronType: "Int" }],
  AP: ["ADP"],
  CC: ["CCONJ"],
  CS: ["SCONJ"],
  CU: ["CCONJ", { ConjType: "Unsp" }],
  IT: ["INTJ"],
  IM: ["PART", { PartType: "Inf" }],
  RP: ["PART", { PronType: "Rel" }],
  UA: ["X"],
  FW: ["X", { Foreign: "Yes" }],
  // The edition tags personal and demonstrative pronouns alike as xPD; a person feature marks the personal ones.
  PD: ["PRON"],
  PE: ["PRON", { PronType: "Prs" }],
  PR: ["PRON", { PronType: "Prs", Reflex: "Yes" }],
  PI: ["PRON", { PronType: "Ind" }],
  PQ: ["PRON", { PronType: "Int" }],
  PP: ["PRON", { PronType: "Prs", Poss: "Yes" }],
  DD: ["DET", { PronType: "Dem" }],
  DQ: ["DET"],
  DP: ["DET", { Poss: "Yes" }],
  AT: ["DET", { PronType: "Art" }],
  VB: ["VERB"],
};

/** Menota category letter → UD feature, and each single-letter (or two-letter) value → UD value. */
const FEATURE: Record<string, [name: string, values: Record<string, string>]> = {
  g: ["Gender", { M: "Masc", F: "Fem", N: "Neut" }],
  n: ["Number", { S: "Sing", D: "Dual", P: "Plur" }],
  c: ["Case", { N: "Nom", A: "Acc", D: "Dat", G: "Gen" }],
  r: ["Degree", { P: "Pos", C: "Cmp", S: "Sup" }],
  t: ["Tense", { PS: "Pres", PT: "Past" }],
  m: ["Mood", { IN: "Ind", SU: "Sub", IP: "Imp", IM: "Imp" }],
  p: ["Person", { 1: "1", 2: "2", 3: "3" }],
  f: ["VerbForm", { F: "Fin", I: "Inf", P: "Part" }],
  v: ["Voice", { A: "Act", R: "Mid" }],
  s: ["Definite", { I: "Ind", D: "Def" }],
  i: ["InflClass", { ST: "Strong", WK: "Weak", RD: "Redup", PP: "PretPres" }],
  y: ["Govern", { A: "Acc", D: "Dat", G: "Gen" }],
  e: ["Clitic", { E: "Yes" }],
};

/** Syncretic case values from the guidelines (ch. 1.5); other combined values split into letters or letter pairs. */
const CASE_GROUPS: Record<string, string[]> = { O: ["A", "D", "G"] };

function values(letter: string, raw: string): string[] {
  const table = FEATURE[letter]![1];
  if (raw in table) return [table[raw]!];
  if (letter === "c" && CASE_GROUPS[raw]) return CASE_GROUPS[raw]!.map((c) => table[c]!);
  // Combined values: gMF, cAD, mINSU (two-letter codes for tense and mood, one letter elsewhere).
  const width = Object.keys(table)[0]!.length;
  const out: string[] = [];
  for (let i = 0; i < raw.length; i += width) {
    const value = table[raw.slice(i, i + width)];
    if (!value) return [];
    out.push(value);
  }
  return out;
}

export function menotaToUd(msa: string): string {
  let upos = "";
  const feats: Record<string, string[]> = {};
  for (const token of msa.split(/\s+/)) {
    if (!token) continue;
    const letter = token[0]!;
    const raw = token.slice(1);
    if (letter === "x") {
      const cls = WORD_CLASS[raw];
      if (!cls) throw new Error(`unknown Menota word class in "${msa}"`);
      upos = cls[0];
      for (const [name, value] of Object.entries(cls[1] ?? {})) (feats[name] ??= []).push(value);
      continue;
    }
    // "inY"/"inN" (inflected or not) follows from the word class.
    if (token === "inY" || token === "inN") continue;
    if (!FEATURE[letter]) throw new Error(`unknown Menota category in "${msa}"`);
    if (raw === "U") continue;
    const found = values(letter, raw);
    if (!found.length) throw new Error(`unknown Menota value ${token} in "${msa}"`);
    (feats[FEATURE[letter]![0]] ??= []).push(...found);
  }
  return formatMorph({ upos, feats });
}
