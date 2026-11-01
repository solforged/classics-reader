// OSHB morphology codes (https://hb.openscriptures.org/parsing/HebrewMorphologyCodes.html) to this reader's Universal
// Dependencies morphology (src/lib/morph.ts). A written word is several morphemes ("וַ/יֹּאמֶר": conjunction + verb),
// each coded on its own; the language letter (H, Hebrew) precedes the first code. packs/hbo/morph.ts labels the result.
import { formatMorph } from "../../../src/lib/morph";
import type { OshbWord } from "./oshb";

export interface Morpheme {
  /** The morpheme's text: the written word's letters between two "/" (accents not removed). */
  text: string;
  /** Lexicon key: the OSHB lemma number ("1254a"), a prefix letter ("c", "b" …) or a suffix morpheme's key ("S:he"). */
  lemma: string;
  /** Universal Dependencies morphology. */
  morph: string;
}

/** Pronominal suffixes and the like that stand in the text without a lemma of their own. */
export interface Exceptions {
  /** Person, gender and number of a pronominal suffix ("3ms") → the lemma key of the independent pronoun. */
  suffixLemmas: Readonly<Record<string, string>>;
  /** Lemma keys of stand-alone conjunctions that introduce a clause (SCONJ); the others coordinate (CCONJ). */
  subordinators: readonly string[];
}

/** Suffix codes that are not pronouns (directional he, paragogic he, paragogic nun), by lexicon key. */
export const SUFFIX_MORPHEMES: Readonly<Record<string, { lemma: string; gloss: string; note: string }>> = {
  "S:he": {
    lemma: "־ָה", gloss: "directional or paragogic he",
    note: "A he added at the end of a word. On a noun or adverb of place it marks motion toward it (“to Sodom”): the " +
      "directional he. On a verb, most often an imperative, it is an emphatic or urging ending: the paragogic he.",
  },
  "S:nun": {
    lemma: "־ן", gloss: "paragogic nun",
    note: "A nun added to a 2nd or 3rd person masculine plural imperfect after its ending (“you shall die”, Gen 3:3).",
  },
};
const SUFFIX_KEYS: Readonly<Record<string, string>> = { d: "S:he", h: "S:he", n: "S:nun" };

const STEMS: Readonly<Record<string, string>> = {
  q: "PAAL", N: "NIFAL", p: "PIEL", P: "PUAL", h: "HIFIL", H: "HUFAL", t: "HITPAEL", o: "POLEL", O: "POLAL",
  r: "HITPOLEL", m: "POEL", M: "POAL", k: "PALEL", K: "PULAL", Q: "PAALPASS", l: "PILPEL", L: "POLPAL",
  f: "HITPALPEL", D: "NITPAEL", j: "PEALAL", i: "PILEL", u: "HOTPAAL", c: "TIFIL", v: "HISHTAFEL", w: "NITPALEL",
  y: "NITPOEL", z: "HITPOEL",
};

const CONJUGATIONS: Readonly<Record<string, Record<string, string>>> = {
  p: { Aspect: "Perf", VerbForm: "Fin" },
  q: { Aspect: "Perf", HebConj: "Weqatal", VerbForm: "Fin" },
  i: { Aspect: "Imp", VerbForm: "Fin" },
  w: { Aspect: "Imp", HebConj: "Wayyiqtol", VerbForm: "Fin" },
  h: { Mood: "Des", VerbForm: "Fin" },
  j: { Mood: "Jus", VerbForm: "Fin" },
  v: { Mood: "Imp", VerbForm: "Fin" },
  r: { VerbForm: "Part", Voice: "Act" },
  s: { VerbForm: "Part", Voice: "Pass" },
  a: { VerbForm: "Inf" },
  c: { VerbForm: "Inf", Definite: "Cons" },
};

const GENDER: Readonly<Record<string, string | undefined>> = { m: "Masc", f: "Fem", b: undefined, c: undefined, x: undefined };
const NUMBER: Readonly<Record<string, string>> = { s: "Sing", p: "Plur", d: "Dual" };
const STATE: Readonly<Record<string, string | undefined>> = { a: undefined, c: "Cons", d: "Def" };
const PERSON: Readonly<Record<string, string | undefined>> = { "1": "1", "2": "2", "3": "3", x: undefined };

type Feats = Record<string, string>;

/** Gender, number and state letters (in that order) as features. */
function nominal(code: string, letters: string): Feats {
  if (letters.length !== 3 || !(letters[0]! in GENDER) || !(letters[1]! in NUMBER) || !(letters[2]! in STATE)) {
    throw new Error(`Unreadable OSHB code ${code}`);
  }
  const feats: Feats = { Number: NUMBER[letters[1]!]! };
  if (GENDER[letters[0]!]) feats.Gender = GENDER[letters[0]!]!;
  if (STATE[letters[2]!]) feats.Definite = STATE[letters[2]!]!;
  return feats;
}

/** Person, gender and number letters as features. */
function personal(code: string, letters: string): Feats {
  if (letters.length !== 3 || !(letters[0]! in PERSON) || !(letters[1]! in GENDER) || !(letters[2]! in NUMBER)) {
    throw new Error(`Unreadable OSHB code ${code}`);
  }
  const feats: Feats = { Number: NUMBER[letters[2]!]! };
  if (PERSON[letters[0]!]) feats.Person = PERSON[letters[0]!]!;
  if (GENDER[letters[1]!]) feats.Gender = GENDER[letters[1]!]!;
  return feats;
}

const PRONOUNS: Readonly<Record<string, string>> = { d: "Dem", f: "Ind", i: "Int", p: "Prs", r: "Rel" };
const PARTICLES: Readonly<Record<string, [string, Feats]>> = {
  a: ["PART", { PartType: "Aff" }], d: ["DET", { Definite: "Def", PronType: "Art" }], e: ["PART", { PartType: "Exh" }],
  i: ["PART", { PartType: "Int" }], j: ["INTJ", {}], m: ["PART", { PartType: "Dem" }], n: ["PART", { Polarity: "Neg" }],
  o: ["ADP", { Case: "Acc" }], r: ["SCONJ", { PronType: "Rel" }],
};
const SUFFIXES: Readonly<Record<string, Feats>> = {
  d: { PartType: "Dir", Clitic: "Yes" }, h: { PartType: "ParH", Clitic: "Yes" }, n: { PartType: "ParN", Clitic: "Yes" },
};

const udMorph = (upos: string, feats: Feats): string =>
  formatMorph({ upos, feats: Object.fromEntries(Object.entries(feats).map(([name, value]) => [name, [value]])) });

/**
 * One morpheme's UD morphology; `lemma` is its OSHB lemma key (the prefix letter or the Strong's number) and `host`
 * the UD word class and form of the morpheme before it, which tells what a pronominal suffix is (possessive on a noun,
 * object on a finite verb). A preposition with the article fused into its vowels (Rd) gives two: the preposition and
 * the article.
 */
function morphemeUd(code: string, lemma: string, host: { upos: string; verbForm?: string } | undefined, ex: Exceptions, used: Set<string>): { upos: string; feats: Feats }[] {
  const [pos, type = "", ...rest] = code;
  const letters = rest.join("");
  switch (pos) {
    case "A": {
      const feats = nominal(code, letters);
      if (type === "a") return [{ upos: "ADJ", feats }];
      if (type === "c") return [{ upos: "NUM", feats: { ...feats, NumType: "Card" } }];
      if (type === "g") return [{ upos: "ADJ", feats: { ...feats, NameType: "Nat" } }];
      if (type === "o") return [{ upos: "ADJ", feats: { ...feats, NumType: "Ord" } }];
      break;
    }
    case "C":
      if (code !== "C") break;
      if (lemma.length > 1 && ex.subordinators.includes(lemma)) {
        used.add(`sconj:${lemma}`);
        return [{ upos: "SCONJ", feats: {} }];
      }
      return [{ upos: "CCONJ", feats: {} }];
    case "D":
      if (code === "D") return [{ upos: "ADV", feats: {} }];
      break;
    case "N":
      if (type === "p" && !letters) return [{ upos: "PROPN", feats: {} }];
      if (type === "c") return [{ upos: "NOUN", feats: nominal(code, letters) }];
      if (type === "g") return [{ upos: "NOUN", feats: { ...nominal(code, letters), NameType: "Nat" } }];
      break;
    case "P":
      if (type in PRONOUNS) return [{ upos: "PRON", feats: { ...personal(code, letters), PronType: PRONOUNS[type]! } }];
      break;
    case "R":
      if (code === "R") return [{ upos: "ADP", feats: {} }];
      if (code === "Rd") return [{ upos: "ADP", feats: {} }, { upos: "DET", feats: { Definite: "Def", PronType: "Art" } }];
      break;
    case "S":
      if (type === "p") {
        const feats: Feats = { ...personal(code, letters), PronType: "Prs", Clitic: "Yes" };
        if (host && ["NOUN", "PROPN", "ADJ", "NUM"].includes(host.upos)) feats.Poss = "Yes";
        if (host?.upos === "VERB" && host.verbForm === "Fin") feats.Case = "Acc";
        return [{ upos: "PRON", feats }];
      }
      if (type in SUFFIXES && !letters) return [{ upos: "PART", feats: SUFFIXES[type]! }];
      break;
    case "T":
      if (type in PARTICLES && !letters) {
        const [upos, feats] = PARTICLES[type]!;
        return [{ upos, feats }];
      }
      break;
    case "V": {
      const stem = STEMS[type];
      const conj = letters[0] ?? "";
      const forms = CONJUGATIONS[conj];
      if (!stem || !forms) break;
      const tail = letters.slice(1);
      // Participles have gender, number and state; infinitives nothing; the finite forms person, gender and number.
      const agreement = conj === "r" || conj === "s" ? nominal(code, tail) : conj === "a" || conj === "c" ? (tail ? undefined : {}) : personal(code, tail);
      if (!agreement) break;
      return [{ upos: "VERB", feats: { ...agreement, ...forms, HebBinyan: stem } }];
    }
  }
  throw new Error(`Unmapped OSHB morphology code ${code}`);
}

/** The lexicon key of an OSHB lemma part: "1254 a" → "1254a", "1008+" → "1008". */
export const lemmaKey = (part: string): string => part.replace(/\+$/u, "").replace(/ /gu, "");

/**
 * A written word's morphemes with their lexicon keys and UD morphology. OSHB gives a lemma to every morpheme but
 * the suffixes: a pronominal suffix takes the independent pronoun's lemma for its person, gender and number (`ex`),
 * the directional he and the paragogic he and nun their own entries (SUFFIX_MORPHEMES).
 */
export function oshbMorphemes(word: OshbWord, ex: Exceptions, used: Set<string>): Morpheme[] {
  if (!word.morph.startsWith("H")) throw new Error(`Only Hebrew is read, not ${word.morph} (${word.text})`);
  const texts = word.text.split("/");
  const codes = word.morph.slice(1).split("/");
  const parts = word.lemma.split("/");
  const suffixes = codes.filter((code) => code.startsWith("S")).length;
  if (parts.length !== codes.length - suffixes) throw new Error(`OSHB ${word.text}: ${parts.length} lemma parts for ${codes.join("/")}`);
  const out: Morpheme[] = [];
  let next = 0;
  let host: { upos: string; verbForm?: string } | undefined;
  codes.forEach((code, i) => {
    let lemma: string;
    if (code.startsWith("S")) {
      if (code.startsWith("Sp")) {
        const key = code.slice(2);
        lemma = ex.suffixLemmas[key] ?? "";
        if (!lemma) throw new Error(`OSHB ${word.text}: no pronoun lemma for the suffix ${code}`);
        used.add(`suffix:${key}`);
      } else lemma = SUFFIX_KEYS[code.slice(1)] ?? "";
    } else lemma = lemmaKey(parts[next++]!);
    const readings = morphemeUd(code, lemma, host, ex, used);
    for (const [r, reading] of readings.entries()) {
      // An article fused into a preposition is the lexicon's article.
      const key = code === "Rd" && r === 1 ? "d" : lemma;
      out.push({ text: texts[i]!, lemma: key, morph: udMorph(reading.upos, reading.feats) });
    }
    const last = readings.at(-1)!;
    host = { upos: last.upos, verbForm: last.feats.VerbForm };
  });
  return out;
}
