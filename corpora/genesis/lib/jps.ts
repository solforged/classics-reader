// Parses the JPS 1917 translation as eBible.org publishes it in USFM: `\c 1` opens a chapter, `\v 1 text` a verse (the
// translation has no paragraphs, poetry or notes inside the verses).

export interface JpsVerse {
  chapter: number;
  verse: number;
  text: string;
}

/** Marker lines that carry no verse text. */
const HEADER = new Set(["id", "h", "toc1", "toc2", "toc3", "mt1", "p"]);

/** The printed book's single quotes: ASCII ' opens a quotation after a space or a dash, and closes it or apostrophizes elsewhere. */
const typographic = (text: string): string => text.replace(/(^|[\s(—-])'/gu, "$1‘").replace(/'/gu, "’");

/**
 * The verses that open with the print's small capitals (eBible copies them as capitals): "IN THE beginning". Two
 * capital words or more at the start of a verse; the single capital words of LORD and GOD (the Tetragrammaton) are not
 * touched. The parser throws when another verse opens that way or when one of these stops doing so.
 */
const CAPITAL_OPENINGS: readonly string[] = ["1.1"];
const CAPITALS = /^[A-Z]{2,}(?: [A-Z]{2,})+(?= [a-z])/u;

/** "IN THE" → "In the". */
const sentenceCase = (run: string): string => run.charAt(0) + run.slice(1).toLowerCase();

/** Every verse of the book, in order; throws on a marker it does not know or on a verse that is not the next one. */
export function parseJps(usfm: string): JpsVerse[] {
  const verses: JpsVerse[] = [];
  let chapter = 0;
  let verse = 0;
  let text: string[] = [];
  const close = () => {
    if (!verse) return;
    let joined = text.join(" ").replace(/\s+/gu, " ").trim();
    const run = CAPITALS.exec(joined)?.[0];
    const id = `${chapter}.${verse}`;
    if (Boolean(run) !== CAPITAL_OPENINGS.includes(id)) {
      throw new Error(`JPS ${id}: ${run ? "opens with capitals" : "no longer opens with capitals"} (${joined.slice(0, 30)})`);
    }
    if (run) joined = sentenceCase(run) + joined.slice(run.length);
    verses.push({ chapter, verse, text: typographic(joined) });
    verse = 0;
    text = [];
  };
  for (const line of usfm.replace(/^\uFEFF/u, "").split("\n")) {
    const marker = /^\\(\w+)\s*(.*)$/u.exec(line.trimEnd());
    if (!marker) {
      if (line.trim()) {
        if (!verse) throw new Error(`JPS text outside a verse: ${line}`);
        text.push(line.trim());
      }
      continue;
    }
    const [, name, rest] = marker;
    if (name === "c") {
      close();
      if (Number(rest) !== chapter + 1) throw new Error(`JPS chapter ${rest} follows ${chapter}`);
      chapter = Number(rest);
      verse = 0;
      continue;
    }
    if (name === "v") {
      close();
      const number = /^(\d+)\s+(.*)$/u.exec(rest!);
      if (!number) throw new Error(`JPS verse without a number: ${line}`);
      const previous = verses.at(-1);
      const expected = previous && previous.chapter === chapter ? previous.verse + 1 : 1;
      if (Number(number[1]) !== expected) throw new Error(`JPS verse ${chapter}:${number[1]} follows ${previous?.chapter}:${previous?.verse}`);
      verse = Number(number[1]);
      text = [number[2]!];
      continue;
    }
    if (!HEADER.has(name!)) throw new Error(`JPS: unknown marker \\${name}`);
    close();
  }
  close();
  return verses;
}
