// Perseus's Buckwalter transliteration of Arabic, in which Lane's lexicon is encoded (the Arabic of every <foreign
// lang="ar"> and <orth lang="ar"> element) → Arabic script, vowel signs included.
//
// It is Buckwalter's scheme with Perseus's way of writing the hamza and alef forms as a letter plus a mark character:
//   A^ أ   A_ إ   A= آ   A@ ٱ   w^ ؤ   y^ ئ          (Buckwalter's own > < | { } & also occur and are read as such)
// and Perseus's additions for Persian letters: P پ, J چ, G گ (V is a typing error in the source and is refused). A
// literal Perl escape \x{698} (ژ) stands in four places for the letter itself. About nine hundred verb forms in the
// letter files write ʻayn as the digit 3 ($abu3a for شَبُعَ, root شبع), as the Arabic chat alphabet does: inside a word
// 3 is read as ع (a span of numerals only stays numerals).
//
// The source is hand-keyed and has errors; the conversion is strict. A span with a character or a mark sequence the
// scheme does not give a letter (a stray ^ or =, the capital O, the pattern 1a2u3a) is refused with an error that
// names it, and packs/ara/build/lane.ts decides what to do with the span.

const LETTERS: Readonly<Record<string, string>> = {
  "'": "ء", A: "ا", b: "ب", p: "ة", t: "ت", v: "ث", j: "ج", H: "ح", x: "خ", d: "د", "*": "ذ", r: "ر", z: "ز", s: "س",
  $: "ش", S: "ص", D: "ض", T: "ط", Z: "ظ", E: "ع", g: "غ", f: "ف", q: "ق", k: "ك", l: "ل", m: "م", n: "ن", h: "ه",
  w: "و", y: "ي", Y: "ى", P: "پ", J: "چ", G: "گ",
  // Buckwalter's own symbols for the hamza and alef forms.
  "|": "آ", ">": "أ", "<": "إ", "&": "ؤ", "}": "ئ", "{": "ٱ",
  // Vowel signs and the like: tanwin (F N K), short vowels, shadda, sukun, dagger alef.
  F: "\u064B", N: "\u064C", K: "\u064D", a: "\u064E", u: "\u064F", i: "\u0650", "~": "\u0651", o: "\u0652", "`": "\u0670",
};

/** Perseus's letter plus mark pairs; the mark never stands alone. */
const PAIRS: Readonly<Record<string, string>> = { "A^": "أ", "A_": "إ", "A=": "آ", "A@": "ٱ", "w^": "ؤ", "y^": "ئ" };

/** Punctuation and spaces pass through; so do Arabic characters, which numeric references (&#x661;) put in the text. */
const PASSES = /^[\s.,;:?!()[\]/"-]$|^[\u0600-\u06FF]$/u;
/** A span of numerals ("10") is read as numerals; any other digit than 3 inside a word is a typing error (1a2u3a, a pattern). */
const NUMERALS = /^[\d\s.,;:?!()[\]/-]*$/u;

export class UnconvertibleError extends Error {
  constructor(readonly text: string, readonly at: number, why: string) {
    super(`Buckwalter text "${text}" is not Arabic at ${at} ("${text.slice(at, at + 3)}"): ${why}`);
  }
}

/** The Arabic for a Perseus-Buckwalter text; throws UnconvertibleError on anything the scheme does not define. */
export function toArabic(text: string): string {
  const source = text.replace(/\\x\{([0-9A-Fa-f]+)\}/gu, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)));
  const numeric = NUMERALS.test(source);
  let out = "";
  for (let i = 0; i < source.length; i++) {
    const pair = PAIRS[source.slice(i, i + 2)];
    if (pair) {
      out += pair;
      i++;
      continue;
    }
    const c = source[i]!;
    const letter = LETTERS[c];
    if (letter) out += letter;
    else if (c === "3" && !numeric) out += "ع";
    else if (PASSES.test(c) || (numeric && /\d/u.test(c))) out += c;
    else throw new UnconvertibleError(text, i, /[\^=@_]/u.test(c) ? `${c} marks only a hamza or madda on A, w or y` : "no such letter");
  }
  return out;
}

/** The Arabic for a text, or undefined when the scheme does not define all of it. */
export function tryToArabic(text: string): string | undefined {
  try {
    return toArabic(text);
  } catch (error) {
    if (error instanceof UnconvertibleError) return undefined;
    throw error;
  }
}

const KNOWN: ReadonlyArray<readonly [string, string]> = [
  ["kitaAbN", "كِتَابٌ"],
  ["katabahu", "كَتَبَهُ"],
  ["kat~aba", "كَتَّبَ"],
  ["A^aHomadu", "أَحْمَدُ"],
  ["A_isotiqoraAr", "إِسْتِقْرَار"],
  ["A=baAluhumo", "آبَالُهُمْ"],
  ["suw^aAlN", "سُؤَالٌ"],
  ["miy^apN", "مِئَةٌ"],
  ["A@ll~`hu", "ٱللّٰهُ"],
  ["$ayo'K", "شَيْءٍ"],
  ["maEaAniY", "مَعَانِى"],
  ["10", "10"],
  ["$abu3a", "شَبُعَ"],
  ["\\x{698}iy", "ژِي"],
];

/** Throws unless the converter gives the Arabic for known texts and refuses the source's typical errors. */
export function checkBuckwalter(): void {
  // Marks are compared in canonical order: the Buckwalter text and a literal may order a shadda and a vowel differently.
  for (const [buckwalter, arabic] of KNOWN) {
    const got = toArabic(buckwalter);
    if (got.normalize("NFC") !== arabic.normalize("NFC")) throw new Error(`Buckwalter ${buckwalter}: got ${got}, expected ${arabic}`);
  }
  for (const typo of ["Oa", "$aAa^a", "H`m=", "1a2u3a", "$abVva"]) {
    if (tryToArabic(typo) !== undefined) throw new Error(`Buckwalter ${typo} should have been refused`);
  }
}
