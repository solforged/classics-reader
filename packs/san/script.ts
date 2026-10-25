// IAST ↔ Devanagari. Text is stored and searched in IAST; each written token is converted on its own for the
// reader's script toggle, so a token ending in a consonant keeps its virāma.

const CONSONANTS: Readonly<Record<string, string>> = {
  kh: "ख", gh: "घ", ch: "छ", jh: "झ", ṭh: "ठ", ḍh: "ढ", th: "थ", dh: "ध", ph: "फ", bh: "भ",
  k: "क", g: "ग", ṅ: "ङ", c: "च", j: "ज", ñ: "ञ", ṭ: "ट", ḍ: "ड", ṇ: "ण", t: "त", d: "द", n: "न",
  p: "प", b: "ब", m: "म", y: "य", r: "र", l: "ल", ḻ: "ळ", v: "व", ś: "श", ṣ: "ष", s: "स", h: "ह",
};

/** Vowel → [independent letter, sign after a consonant ("" for the inherent a)]. */
const VOWELS: Readonly<Record<string, readonly [string, string]>> = {
  ai: ["ऐ", "ै"], au: ["औ", "ौ"],
  a: ["अ", ""], ā: ["आ", "ा"], i: ["इ", "ि"], ī: ["ई", "ी"], u: ["उ", "ु"], ū: ["ऊ", "ू"],
  ṛ: ["ऋ", "ृ"], ṝ: ["ॠ", "ॄ"], ḷ: ["ऌ", "ॢ"], ḹ: ["ॡ", "ॣ"], e: ["ए", "े"], o: ["ओ", "ो"],
};

const OTHERS: Readonly<Record<string, string>> = {
  "m̐": "ँ", ṃ: "ं", ṁ: "ं", ḥ: "ः", "'": "ऽ", "’": "ऽ", "||": "॥", "|": "।",
  0: "०", 1: "१", 2: "२", 3: "३", 4: "४", 5: "५", 6: "६", 7: "७", 8: "८", 9: "९",
};

const VIRAMA = "्";

const DEVANAGARI_CONSONANTS = new Map<string, string>();
const DEVANAGARI_VOWELS = new Map<string, string>();
const DEVANAGARI_VOWEL_SIGNS = new Map<string, string>();
const DEVANAGARI_OTHERS = new Map<string, string>();
for (const [iast, letter] of Object.entries(CONSONANTS)) DEVANAGARI_CONSONANTS.set(letter, iast);
for (const [iast, [letter, sign]] of Object.entries(VOWELS)) {
  DEVANAGARI_VOWELS.set(letter, iast);
  if (sign) DEVANAGARI_VOWEL_SIGNS.set(sign, iast);
}
for (const [iast, sign] of Object.entries(OTHERS)) {
  // Prefer the first spelling of an alias: ṃ rather than ṁ, and the straight apostrophe.
  if (!DEVANAGARI_OTHERS.has(sign)) DEVANAGARI_OTHERS.set(sign, iast);
}

function startsWord(text: string, at: number): boolean {
  return at === 0 || !/\p{L}/u.test(text[at - 1]!);
}

/** The longest key of `table` at `at`, if any (keys are at most two characters). */
function match(text: string, at: number, table: Readonly<Record<string, unknown>>): string | undefined {
  const two = text.slice(at, at + 2);
  if (two.length === 2 && two in table) return two;
  const one = text[at]!;
  return one in table ? one : undefined;
}

export function iastToDevanagari(input: string): string {
  const text = input.normalize("NFC").toLowerCase();
  let out = "";
  for (let i = 0; i < text.length;) {
    // The sacred syllable is written ॐ at the start of a word (oṃ, oṃkāra), as a vowel and anusvāra elsewhere.
    if (text.startsWith("oṃ", i) && startsWord(text, i)) {
      out += "ॐ";
      i += 2;
      continue;
    }
    // NFC leaves m + combining candrabindu as two code points. Consume it before the consonant m.
    const other = match(text, i, OTHERS);
    if (other) {
      out += OTHERS[other];
      i += other.length;
      continue;
    }
    const consonant = match(text, i, CONSONANTS);
    if (consonant) {
      out += CONSONANTS[consonant];
      i += consonant.length;
      const vowel = match(text, i, VOWELS);
      if (vowel) {
        out += VOWELS[vowel]![1];
        i += vowel.length;
      } else {
        out += VIRAMA;
      }
      continue;
    }
    const vowel = match(text, i, VOWELS);
    if (vowel) {
      out += VOWELS[vowel]![0];
      i += vowel.length;
      continue;
    }
    out += text[i];
    i++;
  }
  return out;
}

/**
 * Transliterate the supported Sanskrit letters using the forward converter's spellings.
 * Canonical IAST cannot retain every orthographic distinction: अइ/ऐ both give ai, क्ह/ख both give kh,
 * and क्अ/क both give ka. The word-initial ॐ convention also cannot represent a medial ॐ.
 * Well-formed canonical spellings round-trip; unsupported characters and standalone signs pass through.
 */
export function devanagariToIast(input: string): string {
  const text = input.normalize("NFC");
  let out = "";
  for (let i = 0; i < text.length;) {
    const letter = text[i]!;
    const consonant = DEVANAGARI_CONSONANTS.get(letter);
    if (consonant !== undefined) {
      out += consonant;
      i++;
      if (text[i] === VIRAMA) {
        i++;
      } else {
        const vowel = DEVANAGARI_VOWEL_SIGNS.get(text[i] ?? "");
        out += vowel ?? "a";
        if (vowel !== undefined) i++;
      }
      continue;
    }
    if (letter === "ॐ") {
      out += "oṃ";
      i++;
      continue;
    }
    const vowel = DEVANAGARI_VOWELS.get(letter);
    if (vowel !== undefined) {
      // Keep literal ओं distinct from ॐ by using the existing anusvāra alias that bypasses the oṃ rule.
      if (vowel === "o" && text[i + 1] === OTHERS["ṃ"] && startsWord(out, out.length)) {
        out += "oṁ";
        i += 2;
      } else {
        out += vowel;
        i++;
      }
      continue;
    }
    out += DEVANAGARI_OTHERS.get(letter) ?? letter;
    i++;
  }
  return out;
}
