// Reads Benjamin Thorpe's translation of Apollonius of Tyre (1834) from Wikisource's proofread pages (the MediaWiki
// API's JSON for the pinned revisions in sources.ts). The text is the pages' wikitext: running prose with the printed
// page numbers of Thorpe's Old English text in brackets ("[2]"), footnotes as <ref>, and a few templates. Result:
// plain paragraphs (separated by a blank line) and the footnotes with their offsets in that text.
import { THORPE_REVISIONS } from "../sources";

export interface ThorpeNote {
  /** Offset in the text where the footnote is attached. */
  offset: number;
  /** The note as plain text. */
  text: string;
}

export interface Thorpe {
  text: string;
  notes: ThorpeNote[];
}

interface ApiPage {
  number: number;
  revid: number;
  content: string;
}

/** The pages of a MediaWiki API reply (formatversion 2, rvslots=main), checked as they are read. */
function apiPages(json: string): ApiPage[] {
  const reply: unknown = JSON.parse(json);
  const bad = (): never => { throw new Error("Thorpe: unexpected MediaWiki API reply"); };
  if (!reply || typeof reply !== "object" || !("query" in reply)) return bad();
  const { query } = reply;
  if (!query || typeof query !== "object" || !("pages" in query) || !Array.isArray(query.pages)) return bad();
  return query.pages.map((page: unknown): ApiPage => {
    if (!page || typeof page !== "object" || !("title" in page) || typeof page.title !== "string") return bad();
    if (!("revisions" in page) || !Array.isArray(page.revisions)) return bad();
    const revision: unknown = page.revisions[0];
    if (!revision || typeof revision !== "object" || !("revid" in revision) || typeof revision.revid !== "number") return bad();
    if (!("slots" in revision) || !revision.slots || typeof revision.slots !== "object" || !("main" in revision.slots)) return bad();
    const { main } = revision.slots;
    if (!main || typeof main !== "object" || !("content" in main) || typeof main.content !== "string") return bad();
    return { number: Number(page.title.split("/").at(-1)), revid: revision.revid, content: main.content };
  });
}

/** Where the Old English breaks off: Thorpe's note at "…thy command and my will," and the Latin that follows it. */
const BREAK = /<ref>Here the Saxon breaks off\./u;

/** The one page of those used that opens a new paragraph. */
const PARAGRAPH_PAGE = 54;

const MARK_START = "\uE000";
const MARK_END = "\uE001";

/** A template's last argument ({{sc|n}} → n), for the drop capitals and small capitals of the page. */
const lastArgument = (template: string): string => template.slice(2, -2).split("|").slice(-1)[0] ?? "";

/** One page's running text: page furniture (<noinclude>) removed. */
function pageText(wikitext: string): string {
  return wikitext
    .replace(/<noinclude>[^]*?<\/noinclude>/gu, "")
    .replace(/\[\[File:[^\]]*\]\]/gu, "")
    .trim();
}

/**
 * Misreadings in Wikisource's transcription of the scan (b for h, ia for ie …): each occurs once, and the build fails
 * if one is gone (the page was corrected upstream) or twice.
 */
const CORRECTIONS: readonly (readonly [wrong: string, right: string])[] = [
  ["for, hut he was nowhere", "for, but he was nowhere"],
  ["since he came hack from", "since he came back from"],
  ["famine, und restored", "famine, and restored"],
  ["city gate, und there", "city gate, and there"],
  ["of whom lie might beg", "of whom he might beg"],
  ["and now I hare my father", "and now I have my father"],
  ["nuptials, end not dread", "nuptials, and not dread"],
];

function correct(text: string): string {
  let out = text;
  for (const [wrong, right] of CORRECTIONS) {
    const parts = out.split(wrong);
    if (parts.length !== 2) throw new Error(`Thorpe: correction "${wrong}" matches ${parts.length - 1} times, expected once`);
    out = parts.join(right);
  }
  return out;
}

export function parseThorpe(json: string): Thorpe {
  const pages = new Map<number, string>();
  for (const page of apiPages(json)) {
    if (THORPE_REVISIONS[page.number] !== page.revid) throw new Error(`Unexpected Wikisource page ${page.number} revision ${page.revid}`);
    pages.set(page.number, pageText(page.content));
  }
  const numbers = Object.keys(THORPE_REVISIONS).map(Number);
  if (numbers.some((n) => !pages.has(n))) throw new Error("Thorpe: missing pages");

  // A sentence, or a paragraph, continues over a page break. Of the pages that follow a full stop and open with a capital
  // only page 54 begins a paragraph (page 59 opens with the vocative of a speech that page 58 has begun).
  let joined = "";
  for (const n of numbers) {
    if (joined) joined += n === PARAGRAPH_PAGE ? "\n\n" : " ";
    joined += pages.get(n)!;
  }

  const cut = BREAK.exec(joined);
  if (!cut) throw new Error("Thorpe: the note where the Saxon breaks off is missing");
  const note = /<ref>Here the Saxon breaks off\.[^]*?<\/ref>/u.exec(joined)!;
  // Everything after the note is Thorpe's translation of the Latin and of the Old English that ISWOC does not have.
  joined = joined.slice(0, note.index + note[0].length);

  let text = joined
    // A word split over a page break: {{hws|there|therefore}} … {{hwe|fore|therefore}}.
    .replace(/\{\{hws\|[^|}]*\|([^}]*)\}\}\s*\{\{hwe\|[^|}]*\|\1\}\}/gu, "$1")
    .replace(/\{\{SIC\|[^|}]*\|([^}]*)\}\}/gu, "$1")
    .replace(/\{\{hi\|([^]*?)\}\}\s*(?=\n|$)/gu, (_, inner: string) => inner)
    .replace(/\{\{(?:larger|x-larger|sc|nop)\|?[^{}]*\}\}/gu, (t) => lastArgument(t).replace(/^'''|'''$/gu, ""));
  // Templates left over (nested ones above resolve from the inside out).
  for (let i = 0; i < 4 && /\{\{/u.test(text); i++) text = text.replace(/\{\{[^{}]*\}\}/gu, (t) => lastArgument(t));
  if (/\{\{|\}\}/u.test(text)) throw new Error(`Thorpe: unresolved template in ${/.{30}\{\{.{30}/su.exec(text)?.[0]}`);

  // Footnotes become markers, taken out below with their offsets.
  text = text.replace(/<ref>([^]*?)<\/ref>/gu, (_, note: string) => `${MARK_START}${note.replace(/''+/gu, "").replace(/\s+/gu, " ").trim()}${MARK_END}`)
    .replace(/''+/gu, "")
    // The printed page numbers of the Old English text, "[2]" or "[12-14]".
    .replace(/[ \t]*\[\d+(?:[-–]\d+)?\][ \t]*/gu, " ");
  if (/<[a-z]/iu.test(text)) throw new Error(`Thorpe: markup left in ${/.{30}<[a-z].{30}/isu.exec(text)?.[0]}`);

  const normalised = text
    .split(/\n[ \t]*\n/u)
    .map((paragraph) => paragraph.replace(/\s+/gu, " ").replace(/ +([,.;:!?])/gu, "$1").trim())
    .filter(Boolean)
    .join("\n\n");
  const paragraphs = correct(normalised).split("\n\n");
  const notes: ThorpeNote[] = [];
  let out = "";
  paragraphs.forEach((paragraph, i) => {
    if (i) out += "\n\n";
    let rest = paragraph;
    for (let start = rest.indexOf(MARK_START); start >= 0; start = rest.indexOf(MARK_START)) {
      const end = rest.indexOf(MARK_END, start);
      out += rest.slice(0, start);
      notes.push({ offset: out.length, text: rest.slice(start + 1, end) });
      rest = rest.slice(end + 1);
    }
    out += rest;
  });
  return { text: out, notes };
}
