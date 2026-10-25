import { CHAPTERS } from "../sources";

export interface BesantSanskritUnit {
  kind: "head" | "stanza";
  lines: string[][];
}

// Repairs are confined to their pinned DjVu pages. Each exact source string
// must occur once. SIC's corrected argument is used only in these three cases;
// an unlisted SIC or any other unexpected Sanskrit markup is an error.
const REPAIRS: Readonly<Record<number, readonly (readonly [string, string])[]>> = {
  // Page 15, 1.11: two consecutive closing double dandas before the number.
  // https://en.wikisource.org/w/index.php?oldid=9461267
  15: [["॥ ॥ ११ ॥", "॥ ११ ॥"]],
  // Page 19, 1.22: U+200C separates द् and ध in योद्‌धुकामानवस्थितान्.
  // This is a shaping control, not a Sanskrit letter or word boundary.
  // https://en.wikisource.org/w/index.php?oldid=9461359
  19: [["योद्\u200cधुकामानवस्थितान्", "योद्धुकामानवस्थितान्"]],
  // Page 29, 2.3: SIC explicitly supplies the missing aspiration, ष्ट -> ष्ठ.
  // https://en.wikisource.org/w/index.php?oldid=9209780
  29: [["{{SIC|त्यक्त्वोत्तिष्ट|त्यक्त्वोत्तिष्ठ}}", "त्यक्त्वोत्तिष्ठ"]],
  // Page 30, 2.6: जिजीविषाम: is the ONLY ASCII colon in the Sanskrit on
  // Pages 11-55. It stands before a space and तेऽवस्थिताः. There is no generic
  // colon-to-visarga rule, and any other colon is rejected by token validation.
  // https://en.wikisource.org/w/index.php?oldid=9209781
  30: [["जिजीविषाम:", "जिजीविषामः"]],
  // Page 42, 2.41: SIC explicitly corrects व्ययसायात्मिका to व्यवसायात्मिका.
  // https://en.wikisource.org/w/index.php?oldid=11728396
  42: [["{{SIC|व्ययसायात्मिका|व्यवसायात्मिका}}", "व्यवसायात्मिका"]],
  // Page 51, 2.64: SIC explicitly removes the spurious anusvara after तु.
  // https://en.wikisource.org/w/index.php?oldid=9210679
  51: [["{{SIC|रागद्वेषवियुक्तैस्तुं|रागद्वेषवियुक्तैस्तु}}", "रागद्वेषवियुक्तैस्तु"]],
};

// These exact unnumbered closing blocks are not verses. In particular, Page 55
// abbreviates the title with ॰; that sign must never become a textual token.
const COLOPHONS: Readonly<Record<number, string>> = {
  // Page 27: https://en.wikisource.org/w/index.php?oldid=9209714
  1: "इति श्रीमद्भगवद्गीतासूपनिषत्सु ब्रह्मविद्यायां योगशास्त्रे श्रीकृष्णार्जुनसंवादेऽर्जुनविषादयोगो नाम प्रथमोऽध्यायः ।",
  // Page 55: https://en.wikisource.org/w/index.php?oldid=9210703
  2: "इति श्रीमद्भगवद्गीता॰ साङ्ख्ययोगो नाम द्वितीयोऽध्यायः ॥",
};

// The pinned wikitext puts even these longer metres on two lines. Preserve any
// source line breaks rather than imposing the normal sloka's two-line shape.
const LONG_METRE_VERSES = new Set([5, 6, 7, 8, 20, 22, 29, 70]);

interface Template {
  name: string;
  args: string[];
  end: number;
}

/** Read balanced templates, splitting only their outer arguments. */
function templateAt(wiki: string, start: number, page: number): Template {
  const parts: string[] = [];
  let partStart = start + 2;
  let depth = 1;
  let links = 0;
  for (let cursor = partStart; cursor < wiki.length; cursor++) {
    const pair = wiki.slice(cursor, cursor + 2);
    if (pair === "{{") { depth++; cursor++; }
    else if (pair === "}}") {
      depth--;
      if (!depth) {
        parts.push(wiki.slice(partStart, cursor));
        return { name: parts[0]!.trim().toLowerCase(), args: parts.slice(1), end: cursor + 2 };
      }
      cursor++;
    } else if (pair === "[[") { links++; cursor++; }
    else if (pair === "]]") { links--; cursor++; }
    else if (wiki[cursor] === "|" && depth === 1 && !links) {
      parts.push(wiki.slice(partStart, cursor));
      partStart = cursor + 1;
    }
  }
  throw new Error(`Unclosed Besant Sanskrit template on Page ${page}`);
}

/** Only the observed center wrapper is allowed inside Sanskrit blocks. */
function unwrap(wiki: string, page: number): string {
  let text = "";
  let cursor = 0;
  while (cursor < wiki.length) {
    const start = wiki.indexOf("{{", cursor);
    if (start < 0) return text + wiki.slice(cursor);
    text += wiki.slice(cursor, start);
    const template = templateAt(wiki, start, page);
    if (template.name !== "c" || template.args.length !== 1) {
      throw new Error(`Unexpected Besant Sanskrit template ${template.name} on Page ${page}`);
    }
    text += `\n${unwrap(template.args[0]!, page)}\n`;
    cursor = template.end;
  }
  return text;
}

function sanskritOnPage(wiki: string, page: number): string {
  const blocks: string[] = [];
  const language = /\{\{\s*lang(?: block)?\s*\|/giu;
  let cursor = 0;
  for (let match = language.exec(wiki); match; match = language.exec(wiki)) {
    if (/\p{Script=Devanagari}/u.test(wiki.slice(cursor, match.index))) {
      throw new Error(`Sanskrit outside a Besant language template on Page ${page}`);
    }
    const template = templateAt(wiki, match.index, page);
    if (template.args.length !== 2 || template.args[0]!.trim() !== "sa") {
      throw new Error(`Unexpected Besant language template on Page ${page}`);
    }
    const body = template.args[1]!;
    // Page 11, oldid 9460956: standalone ॐ belongs to the bilingual book title.
    // Page 20, oldid 9463890: the OTHER inline lang|sa contains 1.28a, continued
    // by Page 21's lang block|sa. It must not be dropped with the title furniture.
    if (template.name === "lang" && page === 11 && body.trim() === "ॐ") {
      // Explicitly excluded invocation, not a numbered verse or speaker.
    } else {
      blocks.push(body);
    }
    cursor = template.end;
    language.lastIndex = cursor;
  }
  if (/\p{Script=Devanagari}/u.test(wiki.slice(cursor))) {
    throw new Error(`Unextracted Besant Sanskrit on Page ${page}`);
  }
  if (!blocks.length) throw new Error(`Missing Besant Sanskrit on Page ${page}`);
  let text = blocks.join("\n");
  for (const [before, after] of REPAIRS[page] ?? []) {
    const first = text.indexOf(before);
    if (first < 0 || text.indexOf(before, first + before.length) >= 0) {
      throw new Error(`Besant Sanskrit repair no longer matches Page ${page}: ${before}`);
    }
    text = text.slice(0, first) + after + text.slice(first + before.length);
  }
  return unwrap(text, page);
}

function verseUnits(text: string, chapter: number, verse: number): BesantSanskritUnit[] {
  const units: BesantSanskritUnit[] = [];
  let lines: string[][] = [];
  let stanzaLines = 0;
  const flush = () => {
    if (!lines.length) return;
    units.push({ kind: "stanza", lines });
    lines = [];
  };
  for (const sourceLine of text.split(/[।\r\n]+/u)) {
    const line = sourceLine.trim();
    if (!line) continue;
    const tokens = line.split(/\s+/u);
    for (const token of tokens) {
      // Nukta-free letters, vowel signs, virama, nasal signs, visarga, avagraha
      // and om only. No digits, dandas, markup, Latin text or shaping controls.
      if (!/^[\u0901-\u0939\u093d-\u094d\u0950\u0960-\u0963]+$/u.test(token)) {
        throw new Error(`Unclean Besant Sanskrit token in ${chapter}.${verse}: ${JSON.stringify(token)}`);
      }
    }
    // U is independent in अर्जुन उवाच, but a vowel sign in श्रीभगवानुवाच.
    if (/(?:उवाच|ुवाच)$/u.test(line)) {
      flush();
      units.push({ kind: "head", lines: [tokens] });
    } else {
      lines.push(tokens);
      stanzaLines++;
    }
  }
  flush();
  const longerMetre = chapter === 2 && LONG_METRE_VERSES.has(verse);
  if (stanzaLines < 2 || (!longerMetre && stanzaLines !== 2)) {
    throw new Error(`Unexpected Besant Sanskrit line count in ${chapter}.${verse}: ${stanzaLines}`);
  }
  return units;
}

/**
 * Parse only the pinned first two discourses. Join all Sanskrit before reading
 * verse numbers, so 1.28, 2.7, 2.54 and 2.70 survive their page boundaries.
 * Source spellings, spacing and avagrahas are retained after the repairs above.
 * In particular, heads within 1.21 and 1.28 split, rather than precede, stanzas.
 */
export function parseBesantSanskrit(chapter: number, pages: readonly string[]): Map<number, BesantSanskritUnit[]> {
  if (chapter !== 1 && chapter !== 2) throw new Error(`Unsupported Besant Sanskrit discourse ${chapter}`);
  const source = CHAPTERS.find((item) => item.chapter === chapter)!;
  if (pages.length !== source.pages.length) {
    throw new Error(`Unexpected Besant Sanskrit page count in discourse ${chapter}: ${pages.length}`);
  }
  const text = pages.map((wiki, index) => sanskritOnPage(wiki, source.pages[index]![0])).join("\n");
  const verses = new Map<number, BesantSanskritUnit[]>();
  const expectedCount = chapter === 1 ? 47 : 72;
  let cursor = 0;
  let next = 1;
  for (const marker of text.matchAll(/॥\s*([०-९]+)\s*॥/gu)) {
    let number = 0;
    for (const digit of marker[1]!) number = number * 10 + digit.charCodeAt(0) - 0x0966;
    if (number !== next || number > expectedCount) {
      throw new Error(`Besant Sanskrit ${chapter}: expected verse ${next}, found ${number}`);
    }
    verses.set(number, verseUnits(text.slice(cursor, marker.index), chapter, number));
    cursor = marker.index + marker[0].length;
    next++;
  }
  if (verses.size !== expectedCount) {
    throw new Error(`Besant Sanskrit ${chapter}: expected ${expectedCount} verses, found ${verses.size}`);
  }
  const trailing = text.slice(cursor).replace(/\s+/gu, " ").trim();
  if (trailing !== COLOPHONS[chapter]) {
    throw new Error(`Unexpected Besant Sanskrit colophon in discourse ${chapter}: ${JSON.stringify(trailing)}`);
  }
  return verses;
}
