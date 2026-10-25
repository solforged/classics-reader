import type { EnUnit } from "../../lib/types";
import { CHAPTERS } from "../sources";

const ORDINALS = [
  "first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth",
  "tenth", "eleventh", "twelfth", "thirteenth", "fourteenth", "fifteenth", "sixteenth",
  "seventeenth", "eighteenth",
] as const;

// Only numeric labels are repaired. SIC's first argument remains the English text.
// Each key is the pinned DjVu Page number; oldid links identify the exact evidence.
const MARKER_REPAIRS: Readonly<Record<number, { printed: string; number: number }>> = {
  // https://en.wikisource.org/w/index.php?oldid=9212023 : SIC|(42|(42), missing ')'.
  69: { printed: "(42", number: 42 },
  // https://en.wikisource.org/w/index.php?oldid=9439186 : SIC|(23|(23), missing ')'.
  104: { printed: "(23", number: 23 },
  // https://en.wikisource.org/w/index.php?oldid=9514507 : SIC|(20|(20), missing ')'.
  131: { printed: "(20", number: 20 },
  // https://en.wikisource.org/w/index.php?oldid=9539377 : SIC|(14|(14), missing ')'.
  140: { printed: "(14", number: 14 },
  // https://en.wikisource.org/w/index.php?oldid=9814908 : SIC|{{gap}}|(31).
  158: { printed: "", number: 31 },
  // https://en.wikisource.org/w/index.php?oldid=9818676 : SIC|{{gap}}|(8).
  165: { printed: "", number: 8 },
  // https://en.wikisource.org/w/index.php?oldid=11725890 : English '(20)' follows
  // Sanskrit १९ and precedes the genuine 20 on Page 244. This is verse 17.19.
  243: { printed: "(20)", number: 19 },
  // https://en.wikisource.org/w/index.php?oldid=11725962 : English '(15)' follows
  // Sanskrit १४; the genuine 15 starts Page 253. This is verse 18.14.
  252: { printed: "(15)", number: 14 },
  // https://en.wikisource.org/w/index.php?oldid=11726321 : English '32)' lacks '('.
  258: { printed: "32)", number: 32 },
};

/** Split only outer template arguments, retaining pipes in nested templates and links. */
function argumentsOf(template: string): string[] {
  const parts: string[] = [];
  let start = 0;
  let depth = 0;
  let links = 0;
  for (let cursor = 0; cursor < template.length; cursor++) {
    const pair = template.slice(cursor, cursor + 2);
    if (pair === "{{") { depth++; cursor++; }
    else if (pair === "}}") { depth--; cursor++; }
    else if (pair === "[[") { links++; cursor++; }
    else if (pair === "]]") { links--; cursor++; }
    else if (template[cursor] === "|" && !depth && !links) {
      parts.push(template.slice(start, cursor));
      start = cursor + 1;
    }
  }
  parts.push(template.slice(start));
  return parts;
}

/** Render the pinned templates. Unknown English markup must not silently disappear. */
function english(wiki: string, page: number): string {
  let text = "";
  for (let cursor = 0; cursor < wiki.length;) {
    if (!wiki.startsWith("{{", cursor)) {
      text += wiki[cursor++];
      continue;
    }
    const start = cursor + 2;
    let depth = 1;
    cursor = start;
    while (cursor < wiki.length && depth) {
      if (wiki.startsWith("{{", cursor)) { depth++; cursor += 2; }
      else if (wiki.startsWith("}}", cursor)) { depth--; cursor += 2; }
      else cursor++;
    }
    if (depth) throw new Error(`Unclosed Besant template on Page ${page}`);
    const [rawName, ...args] = argumentsOf(wiki.slice(start, cursor - 2));
    const name = rawName!.trim().toLowerCase();
    const one = () => {
      if (args.length !== 1) throw new Error(`Unexpected Besant ${name} arguments on Page ${page}`);
      return english(args[0]!, page);
    };
    switch (name) {
      case "lang": case "lang block":
        if (args.length !== 2 || args[0]!.trim() !== "sa") {
          throw new Error(`Unexpected Besant language block on Page ${page}`);
        }
        break;
      case "dhr": case "-": case "nop": case "rule": case "smallrefs": case "custom rule":
      case "block center/s": case "block center/e": case "larger block/s": case "larger block/e":
        break;
      case "gap": text += " "; break;
      case "c": case "center": {
        const content = one();
        const speaker = content.trim();
        text += /^(?:Dhritarâshtra|Sanjaya|Arjuna|The Blessed Lord) said:$/u.test(speaker)
          ? `\u0001${speaker}\u0002` : `\n${content}\n`;
        break;
      }
      case "block center": {
        const content = args.filter((arg) => arg.trim() !== "width=350px");
        if (content.length !== 1) throw new Error(`Unexpected Besant block center arguments on Page ${page}`);
        text += english(content[0]!, page);
        break;
      }
      case "larger": case "larger block": case "xxx-larger": case "fine block":
      case "sc": case "small-caps": case "sp":
        text += one();
        break;
      case "sic":
        if (args.length < 1 || args.length > 2) throw new Error(`Unexpected Besant SIC arguments on Page ${page}`);
        text += english(args[0]!, page);
        break;
      case "float right": {
        const printed = one().trim();
        const repair = MARKER_REPAIRS[page];
        const marker = repair?.printed === printed ? `(${repair.number})` : printed;
        const number = /^\((\d+)(?:\s*[-–,]\s*(\d+))?\)$/u.exec(marker);
        if (!number) throw new Error(`Unexpected Besant verse marker ${JSON.stringify(printed)} on Page ${page}`);
        text += `\u0004${number[1]}${number[2] ? `-${number[2]}` : ""}\u0005`;
        break;
      }
      default: throw new Error(`Unexpected Besant template ${name} on Page ${page}`);
    }
  }
  return text;
}

export interface BesantChapter {
  title: string;
  verses: Map<number, EnUnit[]>;
}

/** Keep speakers in source order, including those within verses 1.21 and 1.28. */
function verseUnits(text: string, verse: number): EnUnit[] {
  const units: EnUnit[] = [];
  let cursor = 0;
  let stanzas = 0;
  let heads = 0;
  const stanza = (translation: string) => {
    const lines = translation.split("\u0003").map((line) => line.trim()).filter(Boolean);
    if (!lines.length) return;
    stanzas++;
    units.push({
      key: stanzas === 1 ? `besant-${verse}` : `besant-${verse}-${stanzas}`,
      kind: "stanza", ...(stanzas === 1 ? { label: String(verse) } : {}), lines,
    });
  };
  for (const speaker of text.matchAll(/\u0001([^]*?)\u0002/gu)) {
    stanza(text.slice(cursor, speaker.index));
    heads++;
    units.push({
      key: heads === 1 ? `besant-head-${verse}` : `besant-head-${verse}-${heads}`,
      kind: "head", lines: [speaker[1]!],
    });
    cursor = speaker.index + speaker[0].length;
  }
  stanza(text.slice(cursor));
  if (!stanzas) throw new Error(`Empty Besant verse ${verse}`);
  return units;
}

/** Join transcluded pages before assigning verses. Translator footnotes are omitted. */
export function parseBesant(chapterWiki: string, pageWiki: readonly string[], chapterNumber: number): BesantChapter {
  const chapter = CHAPTERS.find((item) => item.chapter === chapterNumber);
  const ordinal = ORDINALS[chapterNumber - 1];
  if (!chapter || !ordinal) throw new Error(`Unknown Besant discourse ${chapterNumber}`);
  const transclusions = [...chapterWiki.matchAll(/<pages\b[^>]*\/>/gu)];
  const expected = new RegExp(
    `<pages\\s+index="Bhagavad Gita - Annie Besant 4th edition\\.djvu"\\s+from=${chapter.pages[0]![0]}\\s+to=${chapter.pages.at(-1)![0]}\\s*\\/>`, "u",
  );
  if (transclusions.length !== 1 || !expected.test(transclusions[0]![0]) || pageWiki.length !== chapter.pages.length) {
    throw new Error(`Besant Discourse ${chapterNumber} has unexpected page transclusions`);
  }
  let text = pageWiki.map((page, index) => english(page
    .replace(/<noinclude>[^]*?<\/noinclude>/gu, "")
    .replace(/<ref\b[^>]*\/\s*>/gu, "")
    .replace(/<ref\b[^>]*>[^]*?<\/ref>/gu, ""), chapter.pages[index]![0])).join("\n")
    .replace(/\[\[[^\[\]|]+\|([^\[\]|]+)\]\]/gu, "$1")
    .replace(/'{2,3}/gu, "")
    .replace(/<br\s*\/?>/gu, " ")
    .replace(/<poem>([^]*?)<\/poem>/gu, (_match, poem: string) => `${poem.trim().replace(/\n+/gu, "\u0003")}\u0003`)
    .replace(/\s+/gu, " ").trim();
  if (/[{}<>]|\[\[|\]\]|&(?:#\d+|\w+);|\p{Script=Devanagari}/u.test(text)) {
    throw new Error(`Unparsed Besant wikitext remains in Discourse ${chapterNumber}`);
  }
  const heading = chapterNumber === 1
    ? "Aum. THE BHAGAVAD-GITA THE LORD'S SONG. FIRST DISCOURSE."
    : `${ordinal.toUpperCase()} DISCOURSE.`;
  if (!text.startsWith(heading)) throw new Error(`Missing Besant Discourse ${chapterNumber} heading`);
  text = text.slice(heading.length).trim();
  if (chapterNumber === 18) {
    // Page 274, oldid 11728390: the book's closing blessing and printer imprint
    // follow the discourse colophon. They are not an additional verse or title.
    const ending = "Thus the Bhagavad-Gita hath ending. Peace be to all Worlds. Fourth Edition. 5000 Copies. November 1922. G. A. Natesan & Co., Madras.";
    if (!text.endsWith(ending)) throw new Error("Unexpected Besant book-ending furniture");
    text = text.slice(0, -ending.length).trim();
  }
  const colophon = new RegExp(
    `Thus in the glorious Upanishads of [^]*?the ${ordinal} discourse,? entitled:\\s*([^]*?)\\.\\s*$`, "u",
  ).exec(text);
  if (!colophon) throw new Error(`Missing Besant Discourse ${chapterNumber} English colophon`);
  const title = colophon[1]!.trim().toLowerCase()
    .replace(/^\p{L}/u, (letter) => letter.toUpperCase())
    .replace(/\barjuna\b/gu, "Arjuna").replace(/\bsankhya\b/gu, "Sankhya");
  text = text.slice(0, colophon.index).trim();
  const verses = new Map<number, EnUnit[]>();
  let next = 1;
  let cursor = 0;
  for (const marker of text.matchAll(/\u0004(\d+)(?:-(\d+))?\u0005/gu)) {
    const first = Number(marker[1]);
    const last = Number(marker[2] ?? marker[1]);
    if (first !== next || last < first) {
      throw new Error(`Besant Discourse ${chapterNumber}: expected verse ${next}, found ${first}-${last}`);
    }
    verses.set(first, verseUnits(text.slice(cursor, marker.index).trim(), first));
    // A combined printed label keeps its translation on the first verse only.
    // The integration alignment table must explicitly whitelist any such joins.
    for (let joined = first + 1; joined <= last; joined++) verses.set(joined, []);
    next = last + 1;
    cursor = marker.index + marker[0].length;
  }
  if (!verses.size || text.slice(cursor).replace(/\u0003/gu, "").trim()) {
    throw new Error(`Unnumbered Besant English remains in Discourse ${chapterNumber}`);
  }
  return { title, verses };
}
