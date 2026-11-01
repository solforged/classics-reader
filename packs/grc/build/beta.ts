// Perseus's lexica write Greek in Beta Code ("mh=nis" for μῆνις, "*)axilleu/s" for Ἀχιλλεύς). This converts it to NFC
// Unicode: breathings, accents, diaeresis and iota subscript are kept; the length marks _ and ^ are dropped, because
// no font in the reader stacks a macron over a polytonic vowel legibly. A word-final sigma is written ς.
const LETTER: Readonly<Record<string, string>> = {
  a: "α", b: "β", g: "γ", d: "δ", e: "ε", z: "ζ", h: "η", q: "θ", i: "ι", k: "κ", l: "λ", m: "μ", n: "ν", c: "ξ",
  o: "ο", p: "π", r: "ρ", s: "σ", t: "τ", u: "υ", f: "φ", x: "χ", y: "ψ", w: "ω", v: "ϝ",
};
const MARK: Readonly<Record<string, string>> = {
  ")": "\u0313", "(": "\u0314", "/": "\u0301", "\\": "\u0300", "=": "\u0342", "+": "\u0308", "|": "\u0345",
};
const LENGTH = "_^";
const LATIN = /[A-Za-z]/u;

/** Greek letters and combining marks, for finding where a word ends. */
const GREEK = "\\u0370-\\u03ff\\u1f00-\\u1fff\\u0300-\\u036f";
const FINAL_SIGMA = new RegExp(`σ(?![${GREEK}])`, "gu");

/** Beta Code → NFC Unicode. Text that is not Beta Code letters (digits, punctuation, spaces) passes through. */
export function betaToUnicode(beta: string): string {
  let out = "";
  let i = 0;
  /** The diacritics at the cursor, as combining marks; length marks are skipped. */
  const marks = (): string => {
    let m = "";
    while (i < beta.length && (beta[i]! in MARK || LENGTH.includes(beta[i]!))) {
      if (beta[i]! in MARK) m += MARK[beta[i]!];
      i++;
    }
    return m;
  };
  while (i < beta.length) {
    const c = beta[i]!;
    if (c === "*") {
      i++;
      const before = marks();
      const letter = LATIN.test(beta[i] ?? "") ? LETTER[beta[i]!.toLowerCase()] : undefined;
      if (letter === undefined) continue; // a stray asterisk
      i++;
      out += letter.toUpperCase() + before + marks();
    } else if (LATIN.test(c) && LETTER[c.toLowerCase()] !== undefined) {
      i++;
      out += LETTER[c.toLowerCase()]! + marks();
    } else {
      out += c === "'" ? "ʼ" : c;
      i++;
    }
  }
  return out.replace(FINAL_SIGMA, "ς").normalize("NFC");
}
