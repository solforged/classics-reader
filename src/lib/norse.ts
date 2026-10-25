// Shared by the build scripts and the browser: spelling fold and Menota morphosyntax decoding.

/** Lookup key for Old Norse spellings: case-folded, with ǫ/ø/ǿ → ö, œ/ǽ/ę → æ, hyphens and dots dropped. */
export function fold(s: string): string {
  return s
    .normalize("NFC")
    .toLowerCase()
    .replace(/[ǫøǿ]/g, "ö")
    .replace(/[œǽę]/g, "æ")
    .replace(/[-‑·.]/g, "")
    .trim();
}

/** Search key: fold() plus accents and Old Norse letters reduced to plain Latin, so "voluspa" finds "Völuspá". */
export function searchKey(s: string): string {
  return fold(s)
    .replace(/þ/g, "th")
    .replace(/ð/g, "d")
    .replace(/æ/g, "ae")
    .replace(/ö/g, "o")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

/** Dictionary shard file name for a lemma (first character of its fold key, as hex). */
export const shardOf = (lemma: string) => fold(lemma).codePointAt(0)?.toString(16) ?? "0";

const ZOEGA_POS: Record<string, RegExp> = {
  VB: /\bv\.( refl\.| impers\.)?/,
  AJ: /\ba\./,
  NO: /\bord\.|\ba\./,
  AV: /\badv\./,
  AQ: /\badv\./,
  AP: /\bprep\./,
  CC: /\bconj\./,
  CS: /\bconj\./,
  CU: /\bconj\./,
  PD: /\bpron\.|\bdem\.|\bart\./,
  NA: /\bnum\./,
  RP: /\brel\./,
  IT: /\binterj\./,
  IM: /\bprep\.|\binf/,
};
const GENDER_MARK: Record<string, RegExp> = { M: /\bm\./, F: /\bf\./, N: /\bn\./ };

/** Does a dictionary entry's opening grammar note fit this analysis? Used to rank homographs. */
export function entryFits(msa: string, definitionStart: string): boolean {
  const x = msa.match(/\bx(\w\w)/)?.[1] ?? "";
  const g = msa.match(/\bg([MFN])/)?.[1] ?? "";
  const head = definitionStart.replace(/<[^>]+>/g, "").slice(0, 80);
  const re = x === "NC" || x === "NP" ? (GENDER_MARK[g] ?? /\b[mfn]\./) : ZOEGA_POS[x];
  return re ? re.test(head) : false;
}

const WORD_CLASS: Record<string, string> = {
  NC: "noun",
  NP: "proper noun",
  AJ: "adjective",
  AV: "adverb",
  AQ: "interrogative adverb",
  AP: "preposition",
  CC: "coordinating conjunction",
  CS: "subordinating conjunction",
  CU: "conjunction",
  IT: "interjection",
  IM: "infinitive marker",
  NA: "numeral",
  NO: "ordinal numeral",
  PD: "pronoun",
  PE: "personal pronoun",
  PI: "indefinite pronoun",
  PQ: "interrogative pronoun",
  PP: "possessive pronoun",
  DD: "demonstrative",
  DQ: "quantifier",
  DP: "possessive",
  AT: "article",
  RP: "relative particle",
  VB: "verb",
  UA: "particle",
};

const VALUE: Record<string, Record<string, string>> = {
  g: { M: "masculine", F: "feminine", N: "neuter" },
  n: { S: "singular", D: "dual", P: "plural" },
  c: { N: "nominative", A: "accusative", D: "dative", G: "genitive" },
  r: { P: "", C: "comparative", S: "superlative" },
  t: { PS: "present", PT: "past" },
  m: { IN: "indicative", SU: "subjunctive", IP: "imperative" },
  p: { "1": "1st person", "2": "2nd person", "3": "3rd person" },
  v: { A: "active", R: "middle" },
  i: { ST: "strong", WK: "weak", RD: "reduplicating", PP: "preterite-present" },
  y: { A: "takes accusative", D: "takes dative", G: "takes genitive" },
};

export interface Morph {
  pos: string;
  /** Inflection, in reading order, e.g. "accusative plural" or "1st person singular present indicative active". */
  form: string;
  /** Lexical properties: gender of nouns, verb class, case government. */
  props: string[];
}

/** Decode a Menota msa string such as "xVB fF tPS mIN p1 nS vA iST". */
export function decodeMsa(msa: string): Morph {
  const f: Record<string, string> = {};
  for (const tok of msa.split(/\s+/)) if (tok) f[tok[0]!] = tok.slice(1);
  const pos = WORD_CLASS[f.x ?? ""] ?? "";
  const v = (k: string) => (f[k] ? (VALUE[k]?.[f[k]!] ?? "") : "");
  const noun = f.x === "NC" || f.x === "NP";
  const adj = f.x === "AJ" || f.x === "NO";
  const verb = f.x === "VB";
  const props: string[] = [];
  const form: string[] = [];
  if (verb) {
    if (f.f === "I") form.push("infinitive");
    if (f.f === "P") form.push(v("t") === "past" ? "past participle" : "present participle");
    if (f.f !== "P") form.push(v("p"), v("n"), v("t"), v("m"));
    else form.push(v("g"), v("c"), v("n"));
    form.push(v("v"));
    if (f.i) props.push(`${v("i")} verb`);
  } else {
    if (noun && f.g) props.push(v("g"));
    if (!noun) form.push(v("r"), v("g"));
    if (f.x === "PD" && f.p) form.unshift(v("p"));
    form.push(v("c"), v("n"));
    if (adj && f.s) form.push(f.s === "D" ? "weak" : f.s === "I" ? "strong" : "");
    if (noun && f.s === "D") form.push("with suffixed article");
    if (f.y) props.push(v("y"));
  }
  if (f.e === "E") props.push("enclitic");
  return { pos, form: form.filter(Boolean).join(" "), props: props.filter(Boolean) };
}
