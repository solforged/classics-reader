// IAST → Devanagari, for the reader's script toggle. Text is stored and searched in IAST; each written token is
// converted on its own, so a token ending in a consonant keeps its virāma.

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
    if (text.startsWith("oṃ", i) && (i === 0 || !/\p{L}/u.test(text[i - 1]!))) {
      out += "ॐ";
      i += 2;
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
    const other = match(text, i, OTHERS);
    if (other) {
      out += OTHERS[other];
      i += other.length;
      continue;
    }
    out += text[i];
    i++;
  }
  return out;
}
