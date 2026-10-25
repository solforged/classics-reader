import { devanagariToIast } from "../../packs/san/script";
import type { BesantSanskritUnit } from "./lib/besant-sanskrit";
import type { DcsSentence, DcsToken } from "../../packs/san/build/conllu";

interface SourceVerse {
  heads: readonly DcsSentence[];
  lines: readonly DcsSentence[];
}

export interface AlignedBesantUnit {
  kind: "head" | "stanza";
  lines: DcsToken[][];
}

// Besant supplies these speaker captions where the pinned DCS has no corresponding word rows.
// The Page revision pins are in sources.ts. Captions remain visible, explicitly unanalysed.
const EXTRA_HEADS = [
  { chapter: 1, verse: 21, words: ["arjuna", "uvāca"], page: 18 },
  { chapter: 1, verse: 24, words: ["sañjaya", "uvāca"], page: 19 },
  { chapter: 1, verse: 28, words: ["arjuna", "uvāca"], page: 21 },
  { chapter: 1, verse: 47, words: ["sañjaya", "uvāca"], page: 27 },
] as const;

interface ReadingException {
  chapter: number;
  verse: number;
  surface: string;
  words: readonly string[] | null;
  reason: string;
}

// These are edition differences, not generated alternative analyses. Display Besant's form with the listed
// DCS words, in source order. A null word list means that the displayed token has no DCS analysis.
export const BESANT_DCS_READINGS: readonly ReadingException[] = [
  // Page 21, oldid 9464770: singular इमं/स्वजनं/युयुत्सुं/समुपस्थितम्; DCS 230638 has plural forms and samavasthā.
  { chapter: 1, verse: 28, surface: "dṛṣṭvemaṃ", words: ["dṛṣṭvā", "imān"], reason: "Besant singular imam, DCS plural imān" },
  { chapter: 1, verse: 28, surface: "svajanaṃ", words: ["sva", "janān"], reason: "Besant singular svajanam, DCS plural svajanān" },
  { chapter: 1, verse: 28, surface: "yuyutsuṃ", words: ["yuyutsūn"], reason: "Besant singular yuyutsum, DCS plural yuyutsūn" },
  { chapter: 1, verse: 28, surface: "samupasthitam", words: ["samavasthitān"], reason: "Besant samupasthitam, DCS samavasthitān" },
  // Page 22, oldid 9464805: श्यालाः; DCS 230650 has syālāḥ.
  { chapter: 1, verse: 34, surface: "śyālāḥ", words: ["syālāḥ"], reason: "Besant śyāla, DCS syāla" },
  // Page 23, oldid 16058924: स्वबान्धवान्; DCS 230655 has sa + bāndhavān.
  { chapter: 1, verse: 37, surface: "dhārtarāṣṭrānsvabāndhavān", words: ["dhārtarāṣṭrān", "sa", "bāndhavān"], reason: "Besant sva, DCS sa" },
  // Page 29, oldid 9209780: क्लैव्यं; revised DCS 230683_1 has klaibyam.
  { chapter: 2, verse: 3, surface: "klaivyaṃ", words: ["klaibyam"], reason: "Besant klaivyam, DCS klaibyam" },
  // Page 29, oldid 9209780: भैक्ष्यमपीह; DCS 230688 has bhaikṣam + api + iha.
  { chapter: 2, verse: 5, surface: "bhaikṣyamapīha", words: ["bhaikṣam", "api", "iha"], reason: "Besant bhaikṣyam, DCS bhaikṣam" },
  // Page 32, oldid 9209756: परन्तपः; revised DCS 230698_1 has vocative paraṃtapa without visarga.
  { chapter: 2, verse: 9, surface: "parantapaḥ", words: ["paraṃtapa"], reason: "Besant nominative, DCS vocative" },
  // Page 52, oldid 9210682: यन्मनोऽनु विधीयते splits DCS anuvidhīyate (230816, OccId 3609172).
  // The first-letter rule assigns that whole analysis to yanmano'nu. The remaining printed vidhīyate is unanalysed.
  { chapter: 2, verse: 67, surface: "yanmano'nu", words: ["yat", "manaḥ", "anuvidhīyate"], reason: "Besant splits DCS anuvidhīyate across two written tokens" },
  { chapter: 2, verse: 67, surface: "vidhīyate", words: null, reason: "The one DCS anuvidhīyate analysis belongs to the preceding written token" },
];

// Anusvāra and a homorganic nasal before a stop or nasal are alternative spellings, even inside a word.
const HOMORGANIC: Readonly<Record<string, string>> = {
  k: "ṅ", kh: "ṅ", g: "ṅ", gh: "ṅ", c: "ñ", ch: "ñ", j: "ñ", jh: "ñ",
  ṭ: "ṇ", ṭh: "ṇ", ḍ: "ṇ", ḍh: "ṇ", t: "n", th: "n", d: "n", dh: "n",
  p: "m", ph: "m", b: "m", bh: "m",
  ṅ: "ṅ", ñ: "ñ", ṇ: "ṇ", n: "n", m: "m",
};

/** IAST letters, with aspirates and vowel digraphs treated as single units. */
function iastLetters(text: string): string[] {
  return text.normalize("NFC").toLowerCase().match(/ai|au|kh|gh|ch|jh|ṭh|ḍh|th|dh|ph|bh|m\u0310|./gu) ?? [];
}

interface LetterAlignment {
  distance: number;
  sourceToTarget: Int32Array;
}

/** Unit-cost global Levenshtein alignment. Equal-cost traces prefer a diagonal, then source deletion. */
function alignLetters(source: readonly string[], target: readonly string[]): LetterAlignment {
  const width = target.length + 1;
  const matrix = new Uint16Array((source.length + 1) * width);
  for (let i = 0; i <= source.length; i++) matrix[i * width] = i;
  for (let j = 0; j <= target.length; j++) matrix[j] = j;
  for (let i = 1; i <= source.length; i++) {
    for (let j = 1; j <= target.length; j++) {
      matrix[i * width + j] = Math.min(
        matrix[(i - 1) * width + j - 1]! + Number(source[i - 1] !== target[j - 1]),
        matrix[(i - 1) * width + j]! + 1,
        matrix[i * width + j - 1]! + 1,
      );
    }
  }
  const sourceToTarget = new Int32Array(source.length).fill(-1);
  let i = source.length;
  let j = target.length;
  while (i || j) {
    const value = matrix[i * width + j]!;
    if (i && j && value === matrix[(i - 1) * width + j - 1]! + Number(source[i - 1] !== target[j - 1])) {
      sourceToTarget[--i] = --j;
    } else if (i && value === matrix[(i - 1) * width + j]! + 1) i--;
    else j--;
  }
  return { distance: matrix[source.length * width + target.length]!, sourceToTarget };
}

export function alignBesantSanskrit(chapter: number, verse: number, source: SourceVerse, besant: readonly BesantSanskritUnit[]): AlignedBesantUnit[] {
  const units = besant.map((unit): AlignedBesantUnit => ({
    kind: unit.kind,
    lines: unit.lines.map((line) => line.map((form) => ({ form: devanagariToIast(form), words: [] }))),
  }));
  const tokens = units.flatMap((unit) => unit.lines.flat());
  const readings = BESANT_DCS_READINGS.filter((entry) => entry.chapter === chapter && entry.verse === verse);
  for (const exception of readings) {
    const matches = tokens.filter((token) => token.form === exception.surface);
    if (matches.length !== 1) throw new Error(`Changed Besant reading exception ${chapter}.${verse}: ${exception.surface}`);
    if (exception.words === null) matches[0]!.unanalysed = true;
  }
  for (const exception of EXTRA_HEADS.filter((entry) => entry.chapter === chapter && entry.verse === verse)) {
    const heads = units.filter((unit) => unit.kind === "head");
    const matches = heads.filter((unit) => unit.lines.flat().map((token) => token.form).join(" ") === exception.words.join(" "));
    if (matches.length !== 1) throw new Error(`Changed Besant speaker exception ${chapter}.${verse}, Page ${exception.page}`);
    for (const token of matches[0]!.lines.flat()) token.unanalysed = true;
  }
  const words = [...source.heads, ...source.lines].flatMap((sentence) => sentence.tokens.flatMap((token) => token.words));
  const forms = words.map((word) => word.misc.Unsandhied || word.form);
  const sourceLetters: string[] = [];
  const wordStarts = forms.map((form) => {
    const start = sourceLetters.length;
    sourceLetters.push(...iastLetters(form));
    return start;
  });
  const targetLetters: string[] = [];
  const targetOwners: number[] = [];
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index]!;
    if (token.unanalysed) continue;
    const letters = iastLetters(token.form);
    targetLetters.push(...letters);
    targetOwners.push(...letters.map(() => index));
  }
  const alignment = alignLetters(sourceLetters, targetLetters);
  let previous = -1;
  for (let index = 0; index < words.length; index++) {
    let letter = wordStarts[index]!;
    while (letter < sourceLetters.length && alignment.sourceToTarget[letter] === -1) letter++;
    const target = alignment.sourceToTarget[letter];
    if (target === undefined || target < 0) throw new Error(`No aligned letter for DCS word ${chapter}.${verse}: ${forms[index]}`);
    const owner = targetOwners[target]!;
    if (owner < previous) throw new Error(`Out-of-order DCS word ${chapter}.${verse}: ${forms[index]}`);
    tokens[owner]!.words.push(words[index]!);
    previous = owner;
  }
  const errors: string[] = [];
  for (const token of tokens) {
    const assigned = token.words.map((word) => word.misc.Unsandhied || word.form);
    const exception = readings.find((entry) => entry.surface === token.form);
    if (exception) {
      if (exception.words === null ? assigned.length !== 0 : assigned.join("\t") !== exception.words.join("\t")) {
        errors.push(`changed reading exception ${JSON.stringify(token.form)}: [${assigned.join(", ")}]`);
      }
      continue;
    }
    if (token.unanalysed) continue;
    const wordLetters = assigned.map(iastLetters);
    const source = wordLetters.flat();
    const edges = wordLetters.flatMap((letters) => letters.map((_, index) => index < 2 || index >= letters.length - 2));
    const target = iastLetters(token.form);
    const local = alignLetters(source, target);
    const targetSources = new Int32Array(target.length).fill(-1);
    let nasalSpellings = 0;
    let interiorEdits = 0;
    for (let index = 0; index < source.length; index++) {
      const at = local.sourceToTarget[index]!;
      if (at < 0) {
        if (!edges[index]) interiorEdits++;
        continue;
      }
      targetSources[at] = index;
      if (source[index] === target[at]) continue;
      const nasal = (source[index] === "ṃ" && target[at] === HOMORGANIC[target[at + 1] ?? ""])
        || (target[at] === "ṃ" && source[index] === HOMORGANIC[source[index + 1] ?? ""]);
      if (nasal) nasalSpellings++;
      else if (!edges[index]) interiorEdits++;
    }
    for (let index = 0; index < target.length; index++) {
      if (targetSources[index] !== -1) continue;
      let left = index - 1;
      let right = index + 1;
      while (left >= 0 && targetSources[left] === -1) left--;
      while (right < target.length && targetSources[right] === -1) right++;
      if (left >= 0 && right < target.length && !edges[targetSources[left]!] && !edges[targetSources[right]!]) interiorEdits++;
    }
    const distance = local.distance;
    // Two edge edits per word cover vowel fusion and consonant/visarga sandhi. Homorganic nasal spellings
    // receive their own exact allowance because they are orthographic changes, not edits to a word's root.
    const threshold = 2 * assigned.length + nasalSpellings;
    if (!assigned.length || distance > threshold || interiorEdits) {
      errors.push(`token ${JSON.stringify(token.form)}, words [${assigned.join(", ")}], distance ${distance}, threshold ${threshold}, interior edits ${interiorEdits}`);
    }
  }
  if (errors.length) throw new Error(`Besant/DCS alignment ${chapter}.${verse}:\n${errors.join("\n")}`);
  return units;
}
