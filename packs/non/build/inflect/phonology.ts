// Old Norse sound changes used to generate inflection tables, in Zoëga's spelling (ö for both ǫ and ø, œ, æ).
// Shared by the noun, adjective and verb generators; add helpers here rather than in a generator.

export const VOWELS = "aeiouyáéíóúýæœöǫøǿ";
const VOWEL_RE = new RegExp(`[${VOWELS}]`);
export const isVowel = (ch: string | undefined): boolean => !!ch && VOWEL_RE.test(ch);

/** Index of the first letter of the last vowel group (the stem's last syllable nucleus), or -1. */
export function lastVowelGroup(stem: string): number {
  let i = stem.length - 1;
  while (i >= 0 && !isVowel(stem[i])) i--;
  if (i < 0) return -1;
  while (i > 0 && isVowel(stem[i - 1])) i--;
  return i;
}

/** Number of vowel groups (syllables) in a word. */
export function syllables(word: string): number {
  return word.match(new RegExp(`[${VOWELS}]+`, "g"))?.length ?? 0;
}

/**
 * u-umlaut of the last stressed a → ö (land → lönd, bardag → bardög), without mutating a compound's prefix.
 * For a known unstressed final syllable, pass true: its a → u and the preceding a → ö (kallað → kölluð).
 * Only single short a changes; á, au and other vowel groups are untouched.
 */
export function uUmlaut(stem: string, unstressedLast = false): string {
  const chars = [...stem];
  const groups: [number, number][] = [];
  for (let i = 0; i < chars.length; ) {
    if (!isVowel(chars[i])) {
      i++;
      continue;
    }
    let j = i;
    while (j < chars.length && isVowel(chars[j])) j++;
    groups.push([i, j]);
    i = j;
  }
  const single = (g: [number, number]) => g[1] - g[0] === 1 && chars[g[0]] === "a";
  const last = groups.at(-1);
  if (last && single(last)) {
    chars[last[0]] = unstressedLast && groups.length > 1 ? "u" : "ö";
    const previous = groups.at(-2);
    if (unstressedLast && previous && single(previous)) chars[previous[0]] = "ö";
  }
  return chars.join("");
}

const I_UMLAUT: [string, string][] = [
  ["au", "ey"],
  ["jú", "ý"],
  ["jó", "ý"],
  ["ja", "e"],
  ["a", "e"],
  ["á", "æ"],
  ["o", "ö"],
  ["ó", "œ"],
  ["u", "y"],
  ["ú", "ý"],
  ["ö", "ö"],
];

/** i-umlaut of the stem's last (stressed, for monosyllables) vowel group: a → e, á → æ, o → ö, ó → œ, u → y, ú → ý, au → ey. */
export function iUmlaut(stem: string): string {
  const at = lastVowelGroup(stem);
  if (at < 0) return stem;
  // A preceding j belongs to the diphthong for jú/jó/ja.
  const from = at > 0 && stem[at - 1] === "j" ? at - 1 : at;
  for (const [a, b] of I_UMLAUT) if (stem.startsWith(a, from)) return stem.slice(0, from) + b + stem.slice(from + a.length);
  return stem;
}

/**
 * Nominative -r: assimilated after long-vowel l/n (stóll, steinn) and after s/r (íss, bjórr).
 * Single l/n after a consonant drop the ending (jarl, forn); doubled l/n retain it (fullr, þunnr).
 */
export function withR(stem: string): string {
  const last = stem.at(-1) ?? "";
  const before = stem.at(-2) ?? "";
  if ((last === "l" || last === "n") && isVowel(before) && /[áéíóúýæœ]|ei|au|ey/.test(stem.slice(-3, -1))) {
    return stem + last;
  }
  if (last === "s" || last === "r") return isVowel(before) ? stem + last : stem;
  if ((last === "l" || last === "n") && !isVowel(before) && before !== last) return stem;
  return `${stem}r`;
}

/** Neuter -t: fríð → frítt, harð → hart, blind → blint; t merges and geminate p/g/s/r simplify. */
export function withT(stem: string): string {
  if (stem.endsWith("ð") || stem.endsWith("d")) {
    const s = stem.slice(0, -1);
    return isVowel(s.at(-1)) ? `${s}tt` : `${s}t`;
  }
  if (stem.endsWith("t")) return isVowel(stem.at(-2)) ? `${stem}t` : stem;
  if (isVowel(stem.at(-1))) return `${stem}tt`;
  if (/([pgsr])\1$/.test(stem)) return `${stem.slice(0, -1)}t`;
  return `${stem}t`;
}

const SHORT: Record<string, string> = { á: "a", é: "e", í: "i", ó: "o", ú: "u", ý: "y" };
/** Shorten a final long vowel (gó → go, as in gott). */
export function shorten(stem: string): string {
  const last = stem.at(-1) ?? "";
  return SHORT[last] ? stem.slice(0, -1) + SHORT[last] : stem;
}

/**
 * Syncope of the unstressed second-syllable vowel before a vowel ending (hamarr → hamri, mikill → miklir).
 * Pass true for a known unstressed final a/i/u before l/n, including hiatus (Dáin → Dán) and capitalized names.
 */
export function syncopate(stem: string, unstressedFinal = false): string {
  const at = unstressedFinal ? stem.search(/[aiu][ln]$/) : lastVowelGroup(stem);
  if (at <= 0 || !unstressedFinal && syllables(stem) < 2) return stem;
  return stem.slice(0, at) + stem.slice(at + 1);
}

/** Strong-past second-person -t: bað → bazt, bauð/reið → bautt/reitt, batt → bazt, brá → brátt. */
export function withPastT(stem: string): string {
  if (stem.endsWith("st")) return `${stem}t`;
  if (stem.endsWith("tt")) return `${stem.slice(0, -2)}zt`;
  if (stem.endsWith("t")) return `${stem.slice(0, -1)}zt`;
  if (stem.endsWith("ð")) {
    const ending = /(?:au|ei)ð$/.test(stem) || !/[aeiouyö]ð$/.test(stem) ? "tt" : "zt";
    return `${stem.slice(0, -1)}${ending}`;
  }
  if (isVowel(stem.at(-1))) return `${stem}tt`;
  return `${stem.replace(/rr$/, "r").replace(/rg$/, "r")}t`;
}

/** Bare strong imperative: final nd → tt (bind → bitt), ld → lt (hald → halt). */
export function imperativeStem(stem: string): string {
  return stem.replace(/nd$/, "tt").replace(/ld$/, "lt");
}

/** Middle -sk after a stem: s + sk → sk and dental + sk → zk. */
export function withSk(stem: string): string {
  if (stem.endsWith("s")) return `${stem}k`;
  if (/[ðdt]$/.test(stem)) return `${stem.replace(/[ðdt]+$/, "")}zk`.replace(/zzk$/, "zk");
  return `${stem}sk`;
}

/** Weak dental clusters: ð + d → dd; doubled g/k/p/s/r simplify before a different dental. */
export function dentalCluster(stem: string): string {
  return stem.replace(/ðdd$/, "dd").replace(/([gkpsr])\1([ðdt])$/, "$1$2");
}

/** A verbal u-ending loses v after a consonant and contracts ó/ú + u: stöðv + um → stöðum, trú + um → trúm. */
export function verbUEnding(stem: string, ending: string, unstressedLast = false): string {
  const changed = uUmlaut(stem, unstressedLast).replace(/([^aeiouyáéíóúýæœö])v(?=u|$)/, "$1");
  return changed + (/[óú]$/.test(changed) ? ending.replace(/^u/, "") : ending);
}
