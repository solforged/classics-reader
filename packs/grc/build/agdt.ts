// Reads the Ancient Greek Dependency Treebank 2.1 (Perseus Digital Library) and converts its nine-position part-of-speech
// tags to Universal Dependencies. The treebank's files list one <word .../> per token, grouped in <sentence>s whose
// `subdoc` names the lines they span ("1.1-1.7": book 1, lines 1 to 7).
import { formatMorph } from "../../../src/lib/morph";

export interface AgdtWord {
  /** Sentence id and the token's id in it, for messages. */
  at: string;
  /** The token as annotated, in NFC. */
  form: string;
  /** AGDT's lemma, empty when the annotators left it out. */
  lemma: string;
  /** The nine-position tag: part of speech, person, number, tense, mood, voice, gender, case, degree. */
  postag: string;
  relation: string;
}

const ENTITY: Readonly<Record<string, string>> = { "&amp;": "&", "&quot;": "\"", "&lt;": "<", "&gt;": ">", "&apos;": "'" };
const TOKEN = /<sentence\b([^>]*)>|<\/sentence>|<word\b([^>]*?)\/>/gu;
const ATTRIBUTE = /([\w:-]+)="([^"]*)"/gu;

const attributes = (text: string): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const [, name, value] of text.matchAll(ATTRIBUTE)) {
    out[name!] = value!.replace(/&(?:amp|quot|lt|gt|apos);/gu, (entity) => ENTITY[entity]!);
  }
  return out;
};

/**
 * Every token of one book, punctuation and ellipsis nodes included, in document order. Throws when a <word> lies
 * outside a sentence or the file has words this reader did not read.
 */
export function readAgdt(xml: string, book: number): AgdtWord[] {
  const words: AgdtWord[] = [];
  let sentence: { id: string; wanted: boolean } | undefined;
  let seen = 0;
  for (const [token, sentenceAttributes, wordAttributes] of xml.matchAll(TOKEN)) {
    if (sentenceAttributes !== undefined) {
      const a = attributes(sentenceAttributes);
      if (sentence) throw new Error(`AGDT sentence ${a.id} starts inside sentence ${sentence.id}`);
      if (!a.id || !a.subdoc) throw new Error(`AGDT sentence without id or subdoc: ${token}`);
      sentence = { id: a.id, wanted: a.subdoc.startsWith(`${book}.`) };
    } else if (wordAttributes !== undefined) {
      seen++;
      if (!sentence) throw new Error(`AGDT word outside a sentence: ${token}`);
      if (!sentence.wanted) continue;
      const a = attributes(wordAttributes);
      if (a.artificial) continue; // an ellipsis node ("[0]") stands for a word the text does not print
      if (a.form === undefined || a.postag === undefined) throw new Error(`AGDT word without form or postag: ${token}`);
      words.push({
        at: `${sentence.id}.${a.id}`, form: a.form.normalize("NFC"), lemma: (a.lemma ?? "").normalize("NFC"),
        postag: a.postag, relation: a.relation ?? "",
      });
    } else {
      sentence = undefined;
    }
  }
  const declared = xml.match(/<word\b/gu)?.length ?? 0;
  if (sentence || seen !== declared) throw new Error(`AGDT: read ${seen} of ${declared} words`);
  if (!words.length) throw new Error(`AGDT has no sentences of book ${book}`);
  return words;
}

// ---------------------------------------------------------------------------------------------------------------
// AGDT tags → Universal Dependencies. UD-Perseus converted the same tags (every distinct feature set of its Iliad is a
// function of the tag), so its conventions are kept: the aorist is Tense=Past with no aspect, the imperfect
// Aspect=Imp, the perfect Aspect=Perf with Tense=Past. AGDT's "e" is the form of the middle and passive alike (the
// reading is Voice=Mid,Pass); UD-Perseus flattens it to the middle. Names (nouns whose lemma is capitalized) are PROPN.

const PERSON: Readonly<Record<string, string>> = { "1": "1", "2": "2", "3": "3" };
const NUMBER: Readonly<Record<string, string>> = { s: "Sing", p: "Plur", d: "Dual" };
const GENDER: Readonly<Record<string, string>> = { m: "Masc", f: "Fem", n: "Neut" };
const CASE: Readonly<Record<string, string>> = { n: "Nom", g: "Gen", d: "Dat", a: "Acc", v: "Voc", l: "Loc" };
const DEGREE: Readonly<Record<string, string>> = { c: "Cmp", s: "Sup" };
const VOICE: Readonly<Record<string, string[]>> = { a: ["Act"], m: ["Mid"], p: ["Pass"], e: ["Mid", "Pass"] };
const MOOD: Readonly<Record<string, string>> = { i: "Ind", s: "Sub", o: "Opt", m: "Imp" };
const VERB_FORM: Readonly<Record<string, string>> = { n: "Inf", p: "Part", d: "Ger", g: "Gdv" };
/** Tense letter → [Tense, Aspect] ("" for none). */
const TENSE: Readonly<Record<string, readonly [string, string]>> = {
  p: ["Pres", ""], i: ["Past", "Imp"], a: ["Past", ""], r: ["Past", "Perf"], l: ["Pqp", ""], f: ["Fut", ""], t: ["Fut", "Perf"],
};
const UPOS: Readonly<Record<string, string>> = {
  n: "NOUN", a: "ADJ", d: "ADV", l: "DET", g: "PART", r: "ADP", p: "PRON", m: "NUM", i: "INTJ", e: "INTJ", x: "X",
};

/** Pronoun lemmas by type; AGDT files the Homeric demonstrative ὁ and interrogative adverbs among the pronouns. */
const PRONOUN_TYPE: Readonly<Record<string, string>> = {
  "ἐγώ": "Prs", "ἐγώγε": "Prs", "σύ": "Prs", "σοί": "Prs", "ἕ": "Prs", "μιν": "Prs", "νιν": "Prs", "σφεῖς": "Prs",
  "σφωέ": "Prs", "νώ": "Prs", "σφῶϊ": "Prs", "ἡμεῖς": "Prs", "ὑμεῖς": "Prs",
  "ὁ": "Dem", "ὅδε": "Dem", "οὗτος": "Dem", "ἐκεῖνος": "Dem", "τοιόσδε": "Dem", "τοιοῦτος": "Dem", "τόσος": "Dem",
  "τοσόσδε": "Dem", "τηλίκος": "Dem",
  "ὅς": "Rel", "ὅστις": "Rel", "ὅσος": "Rel", "οἷος": "Rel", "ὅσπερ": "Rel",
  "τίς": "Int", "τίπτε": "Int", "ποῦ": "Int", "ποῖος": "Int", "πόσος": "Int",
  "τις": "Ind", "ἄλλος": "Ind", "ἕκαστος": "Ind", "ἀμφότερος": "Ind", "πᾶς": "Ind",
};
/** Subordinating conjunctions; any conjunction AGDT attaches as AuxC is one too. */
const SUBORDINATORS: Readonly<Record<string, true>> = Object.fromEntries([
  "ὅτε", "ὅτι", "ὡς", "ἵνα", "εἰ", "ἐπεί", "ἐάν", "ἐπήν", "ὄφρα", "ὅπως", "ἕως", "ἦμος", "εὖτε", "πρίν", "ὁπότε", "οὕνεκα",
  "ἤν", "αἰ", "ὥστε", "ἐπειδή", "ὅθεν", "ὅπου", "ὅπῃ",
].map((lemma) => [lemma, true]));
const NEGATIVES: Readonly<Record<string, true>> = Object.fromEntries(
  ["οὐ", "οὐκ", "οὐχ", "μή", "οὐδέ", "μηδέ", "οὔτε", "μήτε", "οὐδείς", "μηδείς"].map((lemma) => [lemma, true]),
);

/** The UD analysis of a tagged token, as src/lib/morph.ts writes it. Throws on any letter the tagset does not define. */
export function agdtMorph(word: Pick<AgdtWord, "lemma" | "postag" | "relation" | "at">): string {
  const { lemma, postag } = word;
  if (postag.length !== 9) throw new Error(`AGDT ${word.at}: tag "${postag}" is not nine positions`);
  const [pos, person, number, tense, mood, voice, gender, grammaticalCase, degree] = [...postag] as [
    string, string, string, string, string, string, string, string, string,
  ];
  const pick = <T,>(table: Readonly<Record<string, T>>, letter: string, what: string): T | undefined => {
    if (letter === "-") return undefined;
    const value = table[letter];
    if (value === undefined) throw new Error(`AGDT ${word.at}: ${what} "${letter}" in tag ${postag}`);
    return value;
  };
  const feats: Record<string, string[]> = {};
  const set = (name: string, value: string | readonly string[] | undefined) => {
    if (value === undefined || value === "") return;
    feats[name] = typeof value === "string" ? [value] : [...value];
  };

  let upos: string;
  if (pos === "v") {
    upos = lemma === "εἰμί" ? "AUX" : "VERB";
    const form = VERB_FORM[mood]; // an infinitive, participle, gerund or gerundive; the other moods are finite
    set("VerbForm", form ?? "Fin");
    if (form === undefined) set("Mood", pick(MOOD, mood, "mood"));
    const [t, aspect] = pick(TENSE, tense, "tense") ?? ["", ""];
    set("Tense", t);
    set("Aspect", aspect);
    set("Voice", pick(VOICE, voice, "voice"));
  } else if (pos === "c") {
    upos = lemma in SUBORDINATORS || word.relation.startsWith("AuxC") ? "SCONJ" : "CCONJ";
  } else if (pos === "n") {
    upos = /^\p{Lu}/u.test(lemma) ? "PROPN" : "NOUN";
  } else if (UPOS[pos] !== undefined) {
    upos = UPOS[pos]!;
  } else {
    throw new Error(`AGDT ${word.at}: part of speech "${pos}" in tag ${postag}`);
  }
  if (upos === "PRON") {
    const type = PRONOUN_TYPE[lemma];
    if (!type) throw new Error(`AGDT ${word.at}: no pronoun type for lemma ${lemma}`);
    set("PronType", type);
  }
  if (upos === "DET") set("PronType", "Art");
  if (lemma in NEGATIVES && ["ADV", "PART", "CCONJ"].includes(upos)) set("Polarity", "Neg");
  set("Person", pick(PERSON, person, "person"));
  set("Number", pick(NUMBER, number, "number"));
  set("Gender", pick(GENDER, gender, "gender"));
  set("Case", pick(CASE, grammaticalCase, "case"));
  set("Degree", pick(DEGREE, degree, "degree"));
  return formatMorph({ upos, feats });
}
