import type { EnUnit } from "../../lib/types";

/** Render only the templates present in the pinned Page: transclusions, without their Sanskrit or page furniture. */
function english(wiki: string): string {
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
    if (depth) throw new Error("Unclosed Besant wikitext template");
    const template = wiki.slice(start, cursor - 2);
    const pipe = template.indexOf("|");
    const name = (pipe < 0 ? template : template.slice(0, pipe)).trim().toLowerCase();
    const content = pipe < 0 ? "" : template.slice(pipe + 1);
    switch (name) {
      case "block center": case "dhr": case "-": case "nop": case "rule": case "smallrefs": break;
      case "c": text += `\n${english(content)}\n`; break;
      case "larger": case "fine block": case "sc": text += english(content); break;
      case "float right": text += ` ${english(content)} `; break;
      case "sic": text += content.split("|")[0]; break;
      default: throw new Error(`Unexpected Besant template: ${name}`);
    }
  }
  return text;
}

export interface BesantChapter {
  title: string;
  verses: Map<number, EnUnit[]>;
}

/** Join pages before finding verse numbers: English verses 9 and 12 cross a page boundary. Footnotes are omitted. */
export function parseBesant(chapter: string, pages: readonly string[]): BesantChapter {
  if (!/<pages\s+index="Bhagavad Gita - Annie Besant 4th edition\.djvu"\s+from=188\s+to=195\s*\/>/u.test(chapter)) {
    throw new Error("Besant Discourse 12 has an unexpected page transclusion");
  }
  if (pages.length !== 8) throw new Error("Besant Discourse 12 requires eight source pages");
  const body = pages.map((page) => page.replace(/<noinclude>[^]*?<\/noinclude>/gu, "")).join("\n")
    .replace(/<ref\b[^>]*>[^]*?<\/ref>/gu, "");
  const text = english(body).replace(/^\s*TWELFTH DISCOURSE\.\s*/u, "").replace(/\s+/gu, " ").trim();
  if (/[{}<>]/u.test(text)) throw new Error("Unparsed Besant wikitext remains in the English");
  const titleMatch = /the twelfth discourse, entitled:\s*([^]*?)\.$/iu.exec(text);
  if (!titleMatch) throw new Error("Missing Besant Discourse 12 English colophon");
  const title = titleMatch[1]!.trim().toLowerCase().replace(/^\p{L}/u, (letter) => letter.toUpperCase());
  const verses = new Map<number, EnUnit[]>();
  for (const match of text.matchAll(/([^]*?)\((\d+)\)/gu)) {
    const verse = Number(match[2]);
    if (verses.has(verse)) throw new Error(`Duplicate Besant verse ${verse}`);
    let translation = match[1]!.trim();
    const units: EnUnit[] = [];
    const speaker = /^(Arjuna said:|The Blessed Lord said:)\s*/u.exec(translation);
    if (speaker) {
      units.push({ key: `besant-head-${verse}`, kind: "head", lines: [speaker[1]!] });
      translation = translation.slice(speaker[0].length);
    }
    if (!translation) throw new Error(`Empty Besant verse ${verse}`);
    units.push({ key: `besant-${verse}`, kind: "stanza", label: String(verse), lines: [translation] });
    verses.set(verse, units);
  }
  return { title, verses };
}
