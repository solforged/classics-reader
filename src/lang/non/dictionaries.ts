// The Old Norse dictionaries, in word-panel order. scripts/build-data.ts writes their entries under these ids.
import { parseMorph } from "../../lib/morph";
import type { Dictionary } from "../types";
import type { DictHit } from "../../lib/dict";

/** Suffix senses in Zoëga, separate from the ordinary words a, at, and gi. */
export function suffixEntry(lemma: string): DictHit | undefined {
  const gloss = lemma === "-a" || lemma === "-at"
    ? "Negative verbal suffix, <i>not</i>."
    : lemma === "-gi"
      ? "A suffix used especially with negative, but also with positive and indefinite force; -ki after t or s."
      : undefined;
  return gloss ? { entries: { zoega: [{ head: lemma, sections: [{ senses: [{ gloss }] }] }] } } : undefined;
}

const ZOEGA_ABBREVIATIONS: Record<string, string> = {
  "e-m": "einhverjum — someone or something (dative)",
  "e-n": "einhvern — someone (accusative)",
  "e-s": "einhvers — someone’s or something’s (genitive)",
  "e-t": "eitthvat — something",
  "e-u": "einhverju — something (dative)",
  "e-a": "einhverja — someone (feminine accusative)",
  "e-rra": "einhverra — some people or things (genitive plural)",
  "e-rri": "einhverri — someone or something (feminine dative)",
  "e-rar": "einhverrar — someone’s or something’s (feminine genitive)",
  "e-rr": "einhverr — someone or something (nominative)",
  "acc.": "accusative", "dat.": "dative", "gen.": "genitive", "nom.": "nominative",
  "pl.": "plural", "sg.": "singular", "sing.": "singular", "poet.": "poetic", "fig.": "figurative",
  "refl.": "reflexive", "impers.": "impersonal", "pret.": "preterite (past tense)", "pp.": "past participle",
  "esp.": "especially", "cf.": "compare", "e.g.": "for example", "opp.": "opposed to", "absol.": "absolute use",
  "indecl.": "indeclinable", "compar.": "comparative", "superl.": "superlative", "neut.": "neuter",
  "masc.": "masculine", "fem.": "feminine", "pron.": "pronoun", "pers.": "personal", "prep.": "preposition",
  "adv.": "adverb", "conj.": "conjunction", "interj.": "interjection", "infin.": "infinitive",
  "recipr.": "reciprocal", "pr.": "present", "pres.": "present", "part.": "participle", "ord.": "ordinal",
};

const GENDER_MARK: Record<string, string> = { Masc: "\\bm\\.", Fem: "\\bf\\.", Neut: "\\bn\\." };

/**
 * The word-class marker Zoëga prints for an analysis's class, e.g. "v." for verbs, "m." for masculine nouns, or
 * undefined for classes Zoëga does not mark consistently.
 */
export function zoegaGrammarPattern(morph: string): RegExp | undefined {
  const { upos, feats } = parseMorph(morph);
  const has = (name: string, value: string) => feats[name]?.includes(value) ?? false;
  switch (upos) {
    case "NOUN":
    case "PROPN": {
      const marks = (feats.Gender ?? []).map((g) => GENDER_MARK[g]).filter(Boolean);
      return marks.length ? new RegExp(marks.join("|")) : /\b[mfn]\./;
    }
    case "VERB": return /\bv\.( refl\.| impers\.)?/;
    case "ADJ": return has("NumType", "Ord") ? /\bord\.|\ba\./ : /\ba\./;
    case "ADV": return /\badv\./;
    case "ADP": return /\bprep\./;
    case "CCONJ":
    case "SCONJ": return /\bconj\./;
    case "PRON":
    case "DET": return /\bpron\.|\bdem\.|\bart\./;
    case "NUM": return /\bnum\./;
    case "INTJ": return /\binterj\./;
    case "PART":
      if (has("PartType", "Inf")) return /\bprep\.|\binf/;
      return has("PronType", "Rel") ? /\brel\./ : undefined;
    default: return undefined;
  }
}

/** Does a Zoëga grammar note (the start of an entry or homograph section, HTML allowed) fit this analysis? */
export function zoegaFits(morph: string, grammar: string): boolean {
  return zoegaGrammarPattern(morph)?.test(grammar.replace(/<[^>]+>/g, "").slice(0, 80)) ?? false;
}

export const DICTIONARIES: readonly Dictionary[] = [
  { id: "bellows", title: "Bellows, index of names", fullTitle: "Bellows, index of names", style: "names" },
  {
    id: "zoega",
    title: "Zoëga",
    fullTitle: "Zoëga, A Concise Dictionary of Old Icelandic (1910)",
    style: "article",
    abbreviations: ZOEGA_ABBREVIATIONS,
    grammarAbbreviations: { "m.": "masculine", "f.": "feminine", "n.": "neuter", "a.": "adjective", "v.": "verb" },
    headwordMark: "~",
    fits: zoegaFits,
  },
  { id: "wiktionary", title: "Wiktionary", fullTitle: "Wiktionary", style: "glosses", fallbackFor: "zoega" },
  {
    id: "cleasby",
    title: "Cleasby–Vigfússon",
    fullTitle: "Cleasby–Vigfússon, An Icelandic-English Dictionary (1874)",
    style: "plain",
    collapsed: true,
  },
];
