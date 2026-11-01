// Reads the Gospel of Mark from Project Gutenberg's King James Bible (ebook #10): running text with "c:v " before each
// verse, several verses to a line.
export const MARK_CHAPTER_VERSES: readonly number[] = [45, 28, 35, 41, 43, 56, 37, 38, 50, 52, 33, 44, 37, 72, 47, 20];

export interface KjvVerse {
  chapter: number;
  verse: number;
  text: string;
}

/** The 678 verses of Mark in order; throws if the text is not exactly chapters 1:1 … 16:20 in sequence. */
export function parseKjvMark(source: string): KjvVerse[] {
  const lines = source.split(/\r?\n/u);
  // The book's heading occurs once in the table of contents and once before the text itself.
  const starts = lines.flatMap((line, i) => (line === "The Gospel According to Saint Mark" ? [i] : []));
  const start = starts[1];
  const end = lines.findIndex((line, i) => i > (start ?? Infinity) && line === "The Gospel According to Saint Luke");
  if (start === undefined || end < 0) throw new Error("KJV: Mark not found");
  const body = lines.slice(start + 1, end).join(" ").replace(/\s+/gu, " ").trim();

  const markers = [...body.matchAll(/(?<![\d:])(\d+):(\d+) /gu)];
  const verses: KjvVerse[] = [];
  let chapter = 1;
  let verse = 0;
  markers.forEach((marker, i) => {
    verse += 1;
    if (verse > (MARK_CHAPTER_VERSES[chapter - 1] ?? 0)) { chapter += 1; verse = 1; }
    if (Number(marker[1]) !== chapter || Number(marker[2]) !== verse) {
      throw new Error(`KJV: expected Mark ${chapter}:${verse}, found ${marker[1]}:${marker[2]}`);
    }
    const next = markers[i + 1]?.index ?? body.length;
    verses.push({ chapter, verse, text: body.slice(marker.index + marker[0].length, next).trim() });
  });
  const expected = MARK_CHAPTER_VERSES.reduce((a, b) => a + b, 0);
  if (verses.length !== expected || chapter !== MARK_CHAPTER_VERSES.length || verses.some((v) => !v.text)) {
    throw new Error(`KJV: Mark has ${verses.length} verses, expected ${expected}`);
  }
  return verses;
}
