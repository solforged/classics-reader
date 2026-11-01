// ISWOC's PROIEL morphology → Universal Dependencies (src/lib/morph.ts). A PROIEL tag is a part of speech ("Nb") and
// ten morphology characters: person, number, tense, mood, voice, gender, case, degree, strength, inflection.
// The conversion throws on any tag or value it has no rule for, so a new text cannot slip through unlabelled.
//
// Underspecified values (about one token in ten has one):
//  - A combined value becomes a multi-valued feature: case e (accusative or dative) is Case=Acc,Dat, c is Dat,Gen,
//    o (oblique: any case but the nominative) is Acc,Dat,Gen,Ins; gender p, o, r are Masc,Fem / Masc,Neut / Fem,Neut.
//  - An uncertain value (x) and a value that says nothing (z "no case", q "any gender", t "weak or strong", PROIEL's
//    "-" for a feature the word class lacks) leave the feature out.
import { formatMorph } from "../../../src/lib/morph";

export interface IswocForm {
  /** PROIEL part-of-speech tag, e.g. "Nb". */
  pos: string;
  /** PROIEL's ten-character morphology string. */
  morphology: string;
  /** The treebank's own lemma (before packs/ang/build/lemmas.ts corrects it); possessives read their possessor from it. */
  lemma: string;
  /** The word's dependency relation; a demonstrative or verb is an attribute or auxiliary by it. */
  relation: string;
}

const CASE: Record<string, string[]> = {
  n: ["Nom"], a: ["Acc"], g: ["Gen"], d: ["Dat"], i: ["Ins"], b: ["Abl"], l: ["Loc"], v: ["Voc"],
  e: ["Acc", "Dat"], c: ["Dat", "Gen"], o: ["Acc", "Dat", "Gen", "Ins"], x: [], z: [], "-": [],
};
const GENDER: Record<string, string[]> = {
  m: ["Masc"], f: ["Fem"], n: ["Neut"], p: ["Masc", "Fem"], o: ["Masc", "Neut"], r: ["Fem", "Neut"], q: [], x: [], "-": [],
};
const NUMBER: Record<string, string[]> = { s: ["Sing"], p: ["Plur"], d: ["Dual"], x: [], "-": [] };
const PERSON: Record<string, string[]> = { "1": ["1"], "2": ["2"], "3": ["3"], x: [], "-": [] };
const DEGREE: Record<string, string[]> = { p: ["Pos"], c: ["Cmp"], s: ["Sup"], x: [], z: [], "-": [] };
const STRENGTH: Record<string, string[]> = { s: ["Strong"], w: ["Weak"], t: [], "-": [] };
const TENSE: Record<string, string[]> = { p: ["Pres"], u: ["Past"], "-": [] };
const MOOD: Record<string, string[]> = {
  i: ["Ind"], s: ["Sub"], m: ["Imp"], e: ["Ind", "Sub"], f: ["Ind", "Imp"], h: ["Sub", "Imp"], x: [], t: [],
};
/** PROIEL mood → VerbForm: participles and infinitives are named by their mood letter, every other mood is finite. */
const MOOD_FORM: Record<string, string> = {
  i: "Fin", s: "Fin", m: "Fin", e: "Fin", f: "Fin", h: "Fin", x: "Fin", t: "Fin", n: "Inf", p: "Part",
};
/** Characters that must have this value: ISWOC's Old English never marks voice, and every word has its inflection. */
const VOICE: Record<string, true> = { "-": true, x: true };
const INFLECTION: Record<string, true> = { n: true, i: true };

/** Lemmas ISWOC gives the wrong one of its two noun tags: heaf “wail” is tagged a name (Ne), Herodias a common noun (Nb). */
const NOUN_CLASS: Record<string, "NOUN" | "PROPN"> = { heaf: "NOUN", Herodias: "PROPN" };

/** Auxiliaries and modals: verbs that are auxiliary or copular whenever they occur. */
const AUX: Record<string, true> = {
  wesan: true, beon: true, magan: true, willan: true, sculan: true, motan: true, durran: true, þurfan: true,
};

/** Possessives by the treebank's lemma: the possessor's person and number (his and hire are both "3rd singular"). */
const POSSESSOR: Record<string, [person: string, number: string]> = {
  min: ["1", "Sing"], mynre: ["1", "Sing"], minre: ["1", "Sing"], minum: ["1", "Sing"], þin: ["2", "Sing"],
  ure: ["1", "Plur"], eower: ["2", "Plur"], his: ["3", "Sing"], hire: ["3", "Sing"], hyre: ["3", "Sing"],
  hira: ["3", "Plur"], hyra: ["3", "Plur"],
};

/** Adverbs that negate. */
const NEGATIVE_ADVERB: Record<string, true> = { ne: true, na: true, næfre: true, nahwar: true, næs: true };

interface Quantifier {
  upos: "NUM" | "ADJ" | "ADV" | "DET";
  feats?: Record<string, string>;
}
const TOTAL: Quantifier = { upos: "DET", feats: { PronType: "Tot" } };
const INDEFINITE: Quantifier = { upos: "DET", feats: { PronType: "Ind" } };
const NEGATIVE: Quantifier = { upos: "DET", feats: { PronType: "Neg" } };
const CARDINAL: Quantifier = { upos: "NUM", feats: { NumType: "Card" } };

/**
 * Quantifiers (PROIEL "Py") by lemma. A numeral is a NUM; eal, sum and the like are determiners when they modify a
 * noun and pronouns otherwise (see `attributive`); micel and lytel are adjectives; hwon "a little" is an adverb.
 */
const QUANTIFIER: Record<string, Quantifier> = {
  eal: TOTAL, ælc: TOTAL, gehwylc: TOTAL, gehwilc: TOTAL,
  sum: INDEFINITE, ænig: INDEFINITE, manig: INDEFINITE, manega: INDEFINITE, fela: INDEFINITE, feawa: INDEFINITE,
  hwa: INDEFINITE, hwæt: INDEFINITE, hwilc: INDEFINITE,
  nan: NEGATIVE, nænig: NEGATIVE, nanum: NEGATIVE, nawiht: NEGATIVE,
  micel: { upos: "ADJ" }, lytel: { upos: "ADJ" }, healf: { upos: "ADJ" }, hwon: { upos: "ADV" },
  an: CARDINAL, twegen: CARDINAL, Twa: CARDINAL, þri: CARDINAL, feower: CARDINAL, fif: CARDINAL, six: CARDINAL,
  seofon: CARDINAL, tin: CARDINAL, twelf: CARDINAL, twelfe: CARDINAL, twentig: CARDINAL, þritig: CARDINAL,
  feowertig: CARDINAL, fiftig: CARDINAL, hund: CARDINAL, hundteontig: CARDINAL, hundred: CARDINAL, þusend: CARDINAL,
  þusendum: CARDINAL, begen: CARDINAL, butu: CARDINAL,
};

function lookup<T>(table: Record<string, T>, value: string, field: string, pos: string): T {
  const out = Object.hasOwn(table, value) ? table[value] : undefined;
  if (out === undefined) throw new Error(`Unknown PROIEL ${field} value "${value}" on a ${pos} word`);
  return out;
}

/** The UD morphology string ("NOUN Case=Nom|Gender=Masc|Number=Sing") of one ISWOC token. */
export function iswocMorph({ pos, morphology, lemma, relation }: IswocForm): string {
  if (morphology.length !== 10) throw new Error(`PROIEL morphology "${morphology}" is not ten characters`);
  const [person, number, tense, mood, voice, gender, kase, degree, strength, inflection] = [...morphology] as [
    string, string, string, string, string, string, string, string, string, string,
  ];
  if (!Object.hasOwn(VOICE, voice)) throw new Error(`Unexpected PROIEL voice "${voice}" on ${pos} ${lemma}`);
  if (!Object.hasOwn(INFLECTION, inflection)) throw new Error(`Unexpected PROIEL inflection "${inflection}" on ${pos} ${lemma}`);
  const feats: Record<string, string[]> = {};
  const set = (name: string, values: readonly string[]) => {
    if (values.length) feats[name] = [...values];
  };
  const agreement = () => {
    set("Gender", lookup(GENDER, gender, "gender", pos));
    set("Case", lookup(CASE, kase, "case", pos));
    set("Number", lookup(NUMBER, number, "number", pos));
  };
  /** A pronoun that modifies a noun is a determiner. */
  const attributive = relation === "atr" || relation === "aux";
  let upos: string;
  switch (pos) {
    case "V-": {
      upos = Object.hasOwn(AUX, lemma) || (lemma === "habban" && relation === "aux") ? "AUX" : "VERB";
      const form = lookup(MOOD_FORM, mood, "mood", pos);
      set("VerbForm", [form]);
      set("Tense", lookup(TENSE, tense, "tense", pos));
      if (form === "Fin") {
        set("Mood", lookup(MOOD, mood, "mood", pos));
        set("Person", lookup(PERSON, person, "person", pos));
        set("Number", lookup(NUMBER, number, "number", pos));
      } else if (form === "Part") {
        agreement();
        set("Strength", lookup(STRENGTH, strength, "strength", pos));
      }
      break;
    }
    case "Nb": case "Ne":
      upos = Object.hasOwn(NOUN_CLASS, lemma) ? NOUN_CLASS[lemma]! : pos === "Nb" ? "NOUN" : "PROPN";
      agreement();
      break;
    case "A-":
      upos = "ADJ";
      agreement();
      set("Degree", lookup(DEGREE, degree, "degree", pos));
      set("Strength", lookup(STRENGTH, strength, "strength", pos));
      break;
    case "Pp":
      upos = "PRON";
      feats.PronType = ["Prs"];
      set("Person", lookup(PERSON, person, "person", pos));
      agreement();
      break;
    case "Ps": {
      upos = "DET";
      const possessor = lookup(POSSESSOR, lemma, "possessive", pos);
      feats.PronType = ["Prs"];
      feats.Poss = ["Yes"];
      feats["Person[psor]"] = [possessor[0]];
      feats["Number[psor]"] = [possessor[1]];
      agreement();
      break;
    }
    case "Pd": case "Pi": case "Px":
      upos = attributive ? "DET" : "PRON";
      feats.PronType = [pos === "Pd" ? "Dem" : pos === "Pi" ? "Int" : "Ind"];
      agreement();
      break;
    case "Py": {
      const kind = lookup(QUANTIFIER, lemma, "quantifier", pos);
      upos = kind.upos === "DET" && !attributive ? "PRON" : kind.upos;
      for (const [name, value] of Object.entries(kind.feats ?? {})) feats[name] = [value];
      if (kind.upos !== "ADV") agreement();
      if (kind.upos === "ADJ") {
        set("Degree", lookup(DEGREE, degree, "degree", pos));
        set("Strength", lookup(STRENGTH, strength, "strength", pos));
      }
      break;
    }
    case "Df": case "Du":
      upos = "ADV";
      if (pos === "Du") feats.PronType = ["Int"];
      if (Object.hasOwn(NEGATIVE_ADVERB, lemma)) feats.Polarity = ["Neg"];
      set("Degree", lookup(DEGREE, degree, "degree", pos).filter((value) => value !== "Pos"));
      break;
    case "R-": upos = "ADP"; break;
    case "C-": upos = "CCONJ"; break;
    case "G-": upos = "SCONJ"; break;
    case "N-": upos = "PART"; feats.PartType = ["Inf"]; break;
    case "I-": upos = "INTJ"; break;
    case "F-": upos = "X"; feats.Foreign = ["Yes"]; break;
    default:
      throw new Error(`Unknown PROIEL part of speech "${pos}"`);
  }
  return formatMorph({ upos, feats });
}
