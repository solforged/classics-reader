// How the two translations meet the Old English.
//
// Apollonius: ISWOC divides the text into chapters (and a title sentence); Thorpe's translation has no chapters. Each
// chapter's English is Thorpe's text from the words that translate the chapter's first words up to the next chapter's,
// found by hand and listed in CHAPTER_STARTS. A chapter may begin inside one of Thorpe's sentences, where Old English
// and English order a clause differently; the cut is then made before the clause and the previous chapter's English
// ends with its comma or semicolon.
//
// Mark: ISWOC cites every word by chapter and verse, the King James Version numbers its verses likewise, so a verse
// pairs with its namesake. Seven verses are not in the Old English text (MISSING_VERSES).
import type { Thorpe, ThorpeNote } from "./lib/thorpe";

/**
 * The words of Thorpe's translation that open ISWOC's chapters 1 to 22: the English of each chapter's first clause.
 * Each occurs once in the text, in order; the title sentence ("Here begins the Narrative…") precedes the first.
 */
export const CHAPTER_STARTS: readonly string[] = [
  "In the city of Antioch was a king",
  "Then it happened that the maiden's foster-mother",
  "In this state of things, truly, continued",
  "Now while Antiochus the cruel king",
  "When the king heard that Apollonius read the riddle so rightly",
  "Verily after that, when Apollonius was gone",
  "On the following day, Apollonius was sought",
  "Then the king commanded ships to be prepared",
  "and Apollonius immediately met another",
  "Then Apollonius mounted on the tribunal",
  "After these things, it happened, within a few months",
  "in this terrible tempest",
  "After these words, he went on the way",
  "Then said the king to his men, after Apollonius",
  "While the king was saying these words",
  "Apollonius then truly related",
  "Verily when the king's daughter saw",
  "But the maiden had an unquiet night",
  "It happened then, after this, within a few hours",
  "Then Apollonius took the letters, and went",
  "When the king had read over the letter",
  "and Arcestrates the king continued holding",
];

/** Verses that ISWOC's Old English lacks (the verse is not in the edition), as row ids. */
export const MISSING_VERSES: readonly string[] = ["1.33", "2.16", "2.26", "4.36", "5.26", "6.9", "7.22"];

export interface Paragraph {
  text: string;
  notes: ThorpeNote[];
}

export interface ThorpeChapters {
  /** The title sentence. */
  title: Paragraph[];
  /** Chapters 1 to 22. */
  chapters: Paragraph[][];
}

/** The paragraphs of text[start, end): trimmed, with the notes attached after their words. */
function paragraphsOf(thorpe: Thorpe, start: number, end: number, claimed: Set<ThorpeNote>): Paragraph[] {
  const out: Paragraph[] = [];
  let offset = start;
  for (const piece of thorpe.text.slice(start, end).split("\n\n")) {
    const from = offset + piece.length - piece.trimStart().length;
    const to = offset + piece.trimEnd().length;
    offset += piece.length + 2;
    if (to <= from) continue;
    const notes = thorpe.notes.filter((note) => note.offset > from && note.offset <= to);
    for (const note of notes) {
      if (claimed.has(note)) throw new Error("Thorpe: a note falls in two paragraphs");
      claimed.add(note);
    }
    out.push({ text: thorpe.text.slice(from, to), notes });
  }
  return out;
}

/** Thorpe's text cut at CHAPTER_STARTS; throws when a start is missing, repeated or out of order. */
export function splitThorpe(thorpe: Thorpe): ThorpeChapters {
  const starts = CHAPTER_STARTS.map((phrase) => {
    const first = thorpe.text.indexOf(phrase);
    if (first < 0 || thorpe.text.indexOf(phrase, first + 1) >= 0) {
      throw new Error(`Thorpe: "${phrase}" occurs ${first < 0 ? "nowhere" : "more than once"}`);
    }
    return first;
  });
  starts.forEach((start, i) => {
    if (i && start <= starts[i - 1]!) throw new Error(`Thorpe: chapter start "${CHAPTER_STARTS[i]}" is out of order`);
  });
  const claimed = new Set<ThorpeNote>();
  const title = paragraphsOf(thorpe, 0, starts[0]!, claimed);
  const chapters = starts.map((start, i) => paragraphsOf(thorpe, start, starts[i + 1] ?? thorpe.text.length, claimed));
  if (claimed.size !== thorpe.notes.length) throw new Error("Thorpe: a note belongs to no paragraph");
  return { title, chapters };
}
