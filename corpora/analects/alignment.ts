// Aligns Legge's Chinese with the Kyoto treebank's text, book by book, to give each of Legge's 499 chapters its Kyoto
// sentences and Legge's punctuation. Kyoto's text is the one shown (Legge's contains Big5 substitutions), so Legge's
// characters only supply chapter boundaries and the marks 、 。 ； ？. The build throws on any difference not listed
// here, and on any listed entry that no longer applies.
import type { KyotoBook, KyotoSentence } from "../../packs/lzh/build/conllu";
import type { LeggeBook } from "./lib/legge";
import { alignChars } from "./lib/align";

/**
 * Rare characters that Legge's digitizer wrote as a description in parentheses (Big5 has no code for them), with the
 * character Kyoto has there. Keyed by the description exactly as parsed.
 */
export const SUBSTITUTES: Readonly<Record<string, string>> = {
  "zao4 上穴，中土，下黽": "竈",
  "du2 匚＋賣、與「櫝」同": "匵",
  "guo3 木+享、與槨同": "槨",
  "ji1、迂+亦、與跡同": "迹",
  "上析、下日、與晰同": "晳",
  "kuo4, 革+享、與鞹同": "鞹",
  "上其下月, ji1": "期",
  "tao2, 上兆下鼓": "鼗",
};

/**
 * Chapters whose chapter marker is missing from Legge's Chinese (his English numbers them): the chapter starts at the
 * first occurrence of this text (Legge's characters, punctuation removed) after the previous chapter's start.
 */
export const MISSING_MARKERS: Readonly<Record<string, string>> = {
  "3.13": "王孫賈問曰",
  "5.25": "顏淵季路侍",
  "7.29": "子曰仁遠乎哉",
  "8.11": "子曰如有周公之才",
  "12.18": "李康子患盜",
  "13.11": "子曰善人為邦",
};

/**
 * Stretches where Kyoto's text and Legge's differ other than character for character: a character one text has and
 * the other lacks. `before` is the Kyoto text just before the stretch (up to three characters), `legge` and `kyoto`
 * the characters each side has there. The page shows Kyoto's text; a character Legge lacks carries no mark of his.
 */
export const DIFFERENCES: readonly { book: number; before: string; legge: string; kyoto: string }[] = [
  { book: 1, before: "貧而樂", legge: "", kyoto: "道" },
  { book: 4, before: "讓為國", legge: "", kyoto: "於從政" },
  { book: 5, before: "焉乞諸", legge: "", kyoto: "其" },
  { book: 8, before: "有文章", legge: "", kyoto: "也" },
  { book: 11, before: "能事鬼", legge: "", kyoto: "曰" },
  { book: 13, before: "既富矣", legge: "", kyoto: "曰" },
  { book: 13, before: "何加焉", legge: "曰", kyoto: "" },
  { book: 14, before: "可以為", legge: "", kyoto: "文" },
  { book: 15, before: "而不與", legge: "之", kyoto: "" },
  { book: 16, before: "聞君子", legge: "", kyoto: "之" },
  { book: 16, before: "也邦君", legge: "子", kyoto: "" },
  { book: 16, before: "人自稱", legge: "", kyoto: "曰" },
  { book: 17, before: "之也患", legge: "", kyoto: "不" },
  { book: 20, before: "之有司", legge: "", kyoto: "孔" },
];

/**
 * Text Kyoto's edition prints twice in a row (book 17: 孔子曰諾吾將仕矣). The second copy is left out of the alignment,
 * so that Legge's next chapter does not match the middle of it; it stays in the text, in the chapter before.
 */
export const REPEATED: readonly { book: number; text: string }[] = [{ book: 17, text: "孔子曰諾吾將仕矣" }];

/** A chapter of Legge's with the Kyoto sentences it covers and his punctuation after them. */
export interface AlignedChapter {
  number: number;
  sentences: KyotoSentence[];
  /** Punctuation after the character at this offset of the chapter's text (the sentences' forms joined). */
  marks: Map<number, string>;
}

export interface AlignmentStats {
  chapters: number;
  /** Characters of Kyoto's text with the same character in Legge's, and Legge's one-for-one substitutions. */
  same: number;
  substituted: number;
  /** Stretches listed in DIFFERENCES. */
  differences: number;
  /** Legge's marks carried over. */
  marks: number;
}

/** Entries of the exception tables the alignments used; the build fails if any stays unused. */
export class Used {
  readonly substitutes = new Set<string>();
  readonly markers = new Set<string>();
  readonly differences = new Set<number>();
  readonly repeated = new Set<number>();
}

const chars = (text: string): string[] => {
  if ([...text].length !== text.length) throw new Error(`Astral character in "${text}"`);
  return [...text];
};

/** Aligns one book; throws on anything not listed in the tables above. */
export function alignBook(kyoto: KyotoBook, legge: LeggeBook, used: Used): { chapters: AlignedChapter[]; stats: AlignmentStats } {
  const label = `Book ${kyoto.book}`;
  // Legge's characters (substitutes resolved), the marks after each, and where each chapter starts.
  const lChars: string[] = [];
  const lMarks = new Map<number, string>();
  const lStarts: number[] = [];
  for (const unit of legge.units) {
    if (unit.kind === "char") lChars.push(unit.char);
    else if (unit.kind === "mark") {
      if (!lChars.length) throw new Error(`${label}: punctuation before Legge's first character`);
      lMarks.set(lChars.length - 1, (lMarks.get(lChars.length - 1) ?? "") + unit.mark);
    } else if (unit.kind === "chapter") lStarts.push(lChars.length);
    else {
      const char = SUBSTITUTES[unit.text];
      if (!char) throw new Error(`${label}: Legge's description "${unit.text}" has no entry in SUBSTITUTES`);
      used.substitutes.add(unit.text);
      lChars.push(char);
    }
  }
  // Chapters whose markers Legge's Chinese lacks.
  for (let n = 1; n <= legge.english.length; n++) {
    const text = MISSING_MARKERS[`${kyoto.book}.${n}`];
    if (text === undefined) continue;
    const from = lStarts[n - 2];
    if (from === undefined) throw new Error(`${label}: chapter ${n} has no earlier chapter`);
    const at = lChars.join("").indexOf(text, from + 1);
    if (at < 0) throw new Error(`${label}: chapter ${n} should start at "${text}", which Legge's text lacks`);
    lStarts.splice(n - 1, 0, at);
    used.markers.add(`${kyoto.book}.${n}`);
  }
  if (lStarts.length !== legge.english.length) {
    throw new Error(`${label}: Legge's Chinese has ${lStarts.length} chapters, his English ${legge.english.length}`);
  }
  if (lStarts[0] !== 0 || lStarts.some((start, i) => i && start <= lStarts[i - 1]!)) throw new Error(`${label}: chapter starts out of order`);

  const kText = kyoto.sentences.map((s) => s.text).join("");
  const kChars = chars(kText);
  // Kyoto characters left out of the alignment (a repeated sentence).
  const dropped = new Set<number>();
  REPEATED.forEach((entry, n) => {
    if (entry.book !== kyoto.book) return;
    const at = kText.indexOf(entry.text + entry.text);
    if (at < 0 || kText.indexOf(entry.text + entry.text, at + 1) >= 0) {
      throw new Error(`${label}: "${entry.text}" should occur twice in a row exactly once`);
    }
    for (let i = at + entry.text.length; i < at + 2 * entry.text.length; i++) dropped.add(i);
    used.repeated.add(n);
  });
  const kept = kChars.flatMap((_, i) => (dropped.has(i) ? [] : [i]));
  const reduced = kept.map((i) => kChars[i]!);
  const aligned = alignChars(lChars, reduced);
  for (const d of aligned.differences) {
    const entry = DIFFERENCES.findIndex((e) => e.book === kyoto.book && e.legge === lChars.slice(d.l0, d.l1).join("")
      && e.kyoto === reduced.slice(d.k0, d.k1).join("") && e.before === reduced.slice(Math.max(0, d.k0 - e.before.length), d.k0).join(""));
    if (entry < 0) {
      throw new Error(`${label}: unexplained difference after "${reduced.slice(Math.max(0, d.k0 - 3), d.k0).join("")}": ` +
        `Legge "${lChars.slice(d.l0, d.l1).join("")}", Kyoto "${reduced.slice(d.k0, d.k1).join("")}"`);
    }
    used.differences.add(entry);
  }
  /** For each of Legge's characters, its character's offset in Kyoto's text; -1 when Kyoto has none. */
  const kyotoOf = Array.from(aligned.kyotoOf, (k) => (k < 0 ? -1 : kept[k]!));
  const matched = new Set(kyotoOf);

  // Kyoto offsets of each sentence, and of each token's last character.
  const sentenceStart: number[] = [];
  const tokenEnd = new Set<number>();
  let offset = 0;
  for (const sentence of kyoto.sentences) {
    sentenceStart.push(offset);
    for (const token of sentence.tokens) {
      offset += token.form.length;
      tokenEnd.add(offset - 1);
    }
  }
  // The Kyoto character a Legge character stands for; one Kyoto lacks takes the nearest earlier one (marks) or later (starts).
  const before = (i: number): number => {
    for (let at = i; at >= 0; at--) if (kyotoOf[at]! >= 0) return kyotoOf[at]!;
    throw new Error(`${label}: no Kyoto character before Legge's character ${i}`);
  };
  const after = (i: number): number => {
    for (let at = i; at < lChars.length; at++) if (kyotoOf[at]! >= 0) return kyotoOf[at]!;
    return kChars.length;
  };

  // A chapter starts at its first character's Kyoto character, or at the Kyoto characters Legge lacks just before it.
  const starts = lStarts.map((lStart) => {
    let start = after(lStart);
    while (start > 0 && start < kChars.length && !sentenceStart.includes(start) && !matched.has(start - 1) && !dropped.has(start - 1)) start--;
    if (start !== kChars.length && !sentenceStart.includes(start)) {
      throw new Error(`${label}: a chapter starts inside a Kyoto sentence, at "${kChars.slice(Math.max(0, start - 3), start + 3).join("")}"`);
    }
    return start;
  });
  const marks = new Map<number, string>();
  for (const [i, mark] of lMarks) {
    const at = before(i);
    if (!tokenEnd.has(at)) {
      throw new Error(`${label}: Legge's "${mark}" falls inside a Kyoto word, after "${kChars.slice(Math.max(0, at - 3), at + 1).join("")}"`);
    }
    marks.set(at, (marks.get(at) ?? "") + mark);
  }
  const chapters = starts.map((start, i): AlignedChapter => {
    const end = starts[i + 1] ?? kChars.length;
    const sentences = kyoto.sentences.filter((_, s) => sentenceStart[s]! >= start && sentenceStart[s]! < end);
    const inChapter = new Map<number, string>();
    for (const [at, mark] of marks) if (at >= start && at < end) inChapter.set(at - start, mark);
    return { number: i + 1, sentences, marks: inChapter };
  });
  if (chapters.some((chapter) => !chapter.sentences.length)) throw new Error(`${label}: a chapter has no Kyoto sentence`);
  return {
    chapters,
    stats: { chapters: chapters.length, same: aligned.same, substituted: aligned.substituted, differences: aligned.differences.length, marks: marks.size },
  };
}
