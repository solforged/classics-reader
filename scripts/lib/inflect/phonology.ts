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
 * u-umlaut before an ending with u (or a lost u): stressed a → ö (land → lönd); in a second syllable a → u and the
 * stressed a → ö (hérað → héruð, kallaðr → kölluð). Only short a changes; á, au and other vowels are untouched.
 */
export function uUmlaut(stem: string): string {
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
  if (groups.length >= 2) {
    const last = groups[groups.length - 1]!;
    if (single(last)) chars[last[0]] = "u";
    const first = groups[groups.length - 2]!;
    if (single(first)) chars[first[0]] = "ö";
  } else if (groups.length === 1 && single(groups[0]!)) chars[groups[0]![0]] = "ö";
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
 * Nominative -r after a stem: assimilated after a long vowel + l/n (stóll, steinn), after s (íss, lauss) and r (bjórr),
 * dropped after a consonant + l/n/s/r is not added (fagr has no -r ending: fag-r is the stem).
 */
export function withR(stem: string): string {
  const last = stem.at(-1) ?? "";
  const before = stem.at(-2) ?? "";
  if ((last === "l" || last === "n") && isVowel(before) && /[áéíóúýæœei]|au|ey/.test(stem.slice(-3, -1))) return stem + last;
  if (last === "s" || last === "r") return isVowel(before) ? stem + last : stem;
  return `${stem}r`;
}

/** Neuter -t: ð/d/t merge (góðr → gott, harðr → hart), long vowels shorten before tt (hár → hátt). */
export function withT(stem: string): string {
  if (stem.endsWith("ð")) {
    const s = stem.slice(0, -1);
    return isVowel(s.at(-1)) ? `${shorten(s)}tt` : `${s}t`;
  }
  if (stem.endsWith("tt") || stem.endsWith("t")) return stem.endsWith("tt") ? stem : `${stem}t`;
  if (isVowel(stem.at(-1))) return `${stem}tt`;
  return `${stem}t`;
}

const SHORT: Record<string, string> = { á: "a", é: "e", í: "i", ó: "o", ú: "u", ý: "y" };
/** Shorten a final long vowel (gó → go, as in gott). */
export function shorten(stem: string): string {
  const last = stem.at(-1) ?? "";
  return SHORT[last] ? stem.slice(0, -1) + SHORT[last] : stem;
}

/** Syncope of the unstressed second-syllable vowel before a vowel ending (hamarr → hamri, mikill → miklir). */
export function syncopate(stem: string): string {
  const at = lastVowelGroup(stem);
  if (at <= 0 || syllables(stem) < 2) return stem;
  return stem.slice(0, at) + stem.slice(at + 1);
}
