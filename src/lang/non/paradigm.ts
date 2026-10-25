// Old Norse inflection tables: table kinds, the cells an analysis occupies, and the Paradigm records the build writes
// (src/lib/paradigm.ts).
//
// Cell keys are `${mode}|${code}`, following Wiktionary's Old Norse table templates:
//   nominal code  `${case}${number}${gender|definiteness}`: case n a d g, number s p (d = dual, personal pronouns),
//                 third letter m f n for adjectives, pronouns and determiners, i d (indefinite, definite) for nouns;
//                 plural dative and genitive of adjectives have no gender letter ("dp", "gp").
//   adjective mode  str, wk, comp, str_sup, wk_sup
//   verb code     infinitive, pres_part, past_part, `${tense}_${mood}_${person}${number}` with tense pres past,
//                 mood ind sub, number sg pl (e.g. "past_ind_3sg"), imperative `impr_${person}${number}`
//   verb mode     act, mpass
//   past participle declension mode pp_str, pp_wk; nominal adjective codes (e.g. "pp_str|nsm", "pp_wk|dp").
//                 These cells describe the active past participle.
//   personal pronoun code  `${person}${case}${number}${gender?}` with person 1 2 3 r (reflexive), e.g. "1ns", "3asm"
//   nouns and pronouns have mode "" (key "|nsi", "|dpm").

import { parseMorph } from "../../lib/morph";
import type { Paradigm } from "../../lib/paradigm";

export type ParadigmKind = "noun" | "adj" | "verb" | "pron" | "personal";

export interface NorseParadigm extends Paradigm {
  kind: ParadigmKind;
  /** Inflection class as Wiktionary gives it, e.g. "strong a-stem", "strong verb, class 5". */
  label?: string;
  /**
   * "wiktionary": full table from Wiktionary; "zoega": generated from Zoëga's headword and grammar note;
   * "name": generated from a proper name's ending and gender; "edition": only forms attested in the edition.
   */
  source: "wiktionary" | "zoega" | "name" | "edition";
  /** For generated tables, the Zoëga grammar note or the proper-name inflection rule used. */
  note?: string;
}

/** Reflexive pronoun lemmas; the edition tags them as pronouns without a person. */
const REFLEXIVE = new Set(["sik", "sín"]);

/**
 * Paradigm kind for a UD analysis (src/lib/morph.ts), or undefined for uninflected classes. The edition tags personal
 * and demonstrative pronouns alike (ek "PRON Case=Nom|Number=Sing|Person=1"), so a person, or a reflexive lemma,
 * marks a personal pronoun.
 */
export function paradigmKind(morph: string, lemma = ""): ParadigmKind | undefined {
  const { upos, feats } = parseMorph(morph);
  if (upos === "NOUN" || upos === "PROPN") return "noun";
  if (upos === "ADJ") return "adj";
  if (upos === "VERB") {
    // Some edition participles use an adjective headword rather than a verbal infinitive.
    return feats.VerbForm?.includes("Part") && /(?:r|inn)$/.test(lemma) ? "adj" : "verb";
  }
  if (upos === "PRON" && !feats.Poss) {
    if (feats.PronType?.includes("Prs") || feats.Person || REFLEXIVE.has(lemma.toLowerCase())) return "personal";
  }
  if (upos === "PRON" || upos === "DET") return "pron";
  return undefined;
}

const CASE: Record<string, string> = { Nom: "n", Acc: "a", Dat: "d", Gen: "g" };
const NUMBER: Record<string, string> = { Sing: "s", Plur: "p", Dual: "d" };
const GENDER: Record<string, string> = { Masc: "m", Fem: "f", Neut: "n" };

/** Every combination of one value from each list, joined. */
function combine(...lists: string[][]): string[] {
  return lists.reduce<string[]>((acc, list) => acc.flatMap((prefix) => list.map((v) => prefix + v)), [""]);
}

/**
 * Table cells for a UD analysis, e.g. "NOUN Case=Acc|Definite=Ind|Gender=Masc|Number=Sing" → ["|asi"],
 * "VERB Mood=Ind|Number=Sing|Person=3|Tense=Past|VerbForm=Fin|Voice=Act" → ["act|past_ind_3sg"]. An ambiguous
 * analysis ("Case=Acc,Dat") gives one cell per reading; an incomplete one gives none.
 */
export function morphCells(morph: string, lemma = ""): string[] {
  const { feats } = parseMorph(morph);
  const kind = paradigmKind(morph, lemma);
  const codes = (name: string, table: Record<string, string>) =>
    (feats[name] ?? []).map((value) => table[value]).filter((code): code is string => code !== undefined);
  const cases = codes("Case", CASE);
  const numbers = codes("Number", NUMBER);
  const genders = codes("Gender", GENDER);
  const has = (name: string, value: string) => feats[name]?.includes(value) ?? false;
  /** Plural dative and genitive have no gender letter in adjective and pronoun tables. */
  const nominal = (mode: string) => combine(cases, numbers).flatMap((cn) =>
    cn[1] === "p" && (cn[0] === "d" || cn[0] === "g") ? [`${mode}|${cn}`] : combine([`${mode}|${cn}`], genders));
  if (kind === "noun") return combine(["|"], cases, numbers, [has("Definite", "Def") ? "d" : "i"]);
  if (kind === "adj") {
    const weak = has("Definite", "Def");
    const mode = has("Degree", "Cmp") ? "comp" : has("Degree", "Sup") ? (weak ? "wk_sup" : "str_sup") : weak ? "wk" : "str";
    return nominal(mode);
  }
  if (kind === "pron") return nominal("");
  if (kind === "personal") {
    const persons = feats.Person ?? ["r"];
    return persons.flatMap((p) => combine([`|${p}`], cases, numbers, p === "3" ? genders : [""]));
  }
  if (kind === "verb") {
    const mode = has("Voice", "Mid") ? "mpass" : "act";
    if (has("VerbForm", "Inf")) return [`${mode}|infinitive`];
    if (has("VerbForm", "Part")) {
      if (!has("Tense", "Past")) return [`${mode}|pres_part`];
      return [`${mode}|past_part`, ...(mode === "act" ? nominal(has("Definite", "Def") ? "pp_wk" : "pp_str") : [])];
    }
    const number = has("Number", "Plur") ? "pl" : "sg";
    const persons = feats.Person ?? [];
    if (has("Mood", "Imp")) return (persons.length ? persons : ["2"]).map((p) => `${mode}|impr_${p}${number}`);
    const tense = has("Tense", "Past") ? "past" : "pres";
    const moods = (feats.Mood ?? ["Ind"]).map((m) => (m === "Sub" ? "sub" : "ind"));
    return combine([`${mode}|${tense}_`], moods, ["_"], persons, [number]);
  }
  return [];
}
