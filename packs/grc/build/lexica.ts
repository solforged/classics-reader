// Reads the three dictionaries Perseus publishes as TEI P4: Autenrieth's Homeric Dictionary, the Middle Liddell and the
// LSJ. Only the entries whose headwords the reader needs are parsed (`wanted`): the LSJ alone is 300 MB.
// Autenrieth and the LSJ write Greek in Beta Code inside elements marked lang="greek"; the Middle Liddell writes
// Unicode. An entry becomes an Article (src/lib/dict.ts): headword, a grammar line (inflection, etymology), senses.
import { DOMParser, type Element, type Node } from "@xmldom/xmldom";
import type { Article, Sense } from "../../../src/lib/dict";
import { headwordKey } from "../spelling";
import { betaToUnicode } from "./beta";

/** An article and the keys (spelling.ts headwordKey) of the headwords that name it. */
export interface LexiconEntry {
  keys: string[];
  article: Article;
}

const children = (node: Node): Node[] => Array.from(node.childNodes as unknown as ArrayLike<Node>);
const elements = (node: Node): Element[] => children(node).filter((child): child is Element => child.nodeType === 1);

const parser = new DOMParser({
  onError: (level, message) => {
    if (level !== "warning") throw new Error(`dictionary XML: ${message}`);
  },
});

/** Entities the Middle Liddell uses without declaring them (its DTD does). */
const MIDDLE_LIDDELL_ENTITIES: Readonly<Record<string, string>> = {
  "&mdash;": "—", "&equals;": "=", "&ast;": "*", "&colon;": ":", "&quest;": "?", "&dagger;": "†", "&breve;": "˘",
  "&agrave;": "à", "&macr;": "¯", "&eacute;": "é", "&lpar;": "(", "&rpar;": ")", "&plus;": "+",
};

function parseFragment(xml: string, what: string): Element {
  const text = xml.replace(/&[a-z]+;/gu, (entity) => MIDDLE_LIDDELL_ENTITIES[entity] ?? entity);
  try {
    return parser.parseFromString(`<r>${text}</r>`, "text/xml").documentElement!;
  } catch (error) {
    throw new Error(`${what}: ${(error as Error).message}`);
  }
}

const escapeHtml = (text: string) => text.replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;");

/** Elements shown in italics: the translations (the gloss a reader scans for), and the dictionaries' own italics. */
const ITALIC: Readonly<Record<string, true>> = { tr: true, gloss: true };
/** Elements dropped with their content: page breaks and figures. */
const DROPPED: Readonly<Record<string, true>> = { pb: true, figure: true };

interface Rendering {
  /** Greek inside lang="greek" elements is Beta Code (Autenrieth, LSJ) rather than Unicode (Middle Liddell). */
  beta: boolean;
}

/** The HTML of a node's content: italics for translations, Greek converted, everything else as text. */
function render(node: Node, how: Rendering, greek = false): string {
  if (node.nodeType === 3) {
    const text = (node.nodeValue ?? "").replace(/\s+/gu, " ");
    return escapeHtml(greek && how.beta ? betaToUnicode(text) : text);
  }
  if (node.nodeType !== 1) return "";
  const el = node as Element;
  const name = el.localName ?? "";
  if (name in DROPPED) return "";
  const lang = el.getAttribute("lang");
  const inner = children(el).map((child) => render(child, how, lang ? lang === "greek" : greek)).join("");
  if (name in ITALIC || (name === "hi" && el.getAttribute("rend") === "ital")) return `<i>${inner}</i>`;
  return inner;
}

const tidy = (html: string): string =>
  html.replace(/\s+/gu, " ").replace(/\s+([,;:.)\]])/gu, "$1").replace(/([([])\s+/gu, "$1").trim();

/** Plain text of rendered HTML. */
const plain = (html: string): string =>
  html.replace(/<[^>]+>/gu, "").replace(/&lt;/gu, "<").replace(/&gt;/gu, ">").replace(/&amp;/gu, "&").replace(/\s+/gu, " ").trim();

const unescapeXml = (text: string): string => text.replace(/&lt;/gu, "<").replace(/&gt;/gu, ">").replace(/&amp;/gu, "&");

/** A headword as printed: the Middle Liddell numbers homographs (ἄν1, ἄν2) and ends some words in σ; Autenrieth marks some with <>. */
const cleanHead = (text: string): string =>
  text.replace(/<>/gu, "").replace(/\d+$/u, "").replace(/σ$/u, "ς").replace(/\s+/gu, " ").trim();

/** The Greek word of a Beta Code key: "a)ristoto/kos1" → ἀριστοτόκος (the digit numbers homographs). */
const keyWord = (key: string): string => betaToUnicode(unescapeXml(key).replace(/<>/gu, "").replace(/\d+$/u, ""));

/** The headword text of an <orth> as it appears in the file: Beta Code or Unicode. */
const headText = (raw: string, beta: boolean): string => cleanHead(beta ? betaToUnicode(unescapeXml(raw)) : unescapeXml(raw));

const attribute = (tag: string, name: string): string => new RegExp(`\\b${name}="([^"]*)"`, "u").exec(tag)?.[1] ?? "";

/** The headword forms of an <orth>: "ἐγώ, ἐγών" answers to both. */
const forms = (head: string): string[] => head.split(/\s*,\s*/u).filter(Boolean);

function senseMarker(n: string): string | undefined {
  return /^(?:\d+|[A-Za-z]+|[Α-Ωα-ω]+)$/u.test(n) && n !== "0" && n !== "Perseus" ? `${n}.` : undefined;
}

// ---------------------------------------------------------------------------------------------------------------
// Autenrieth

/**
 * Autenrieth's entries run on: the headword, a note on forms up to the first colon, then the senses numbered (1), (2)
 * in the text and divided by dashes. The note becomes the grammar line and the numbered parts the senses.
 */
function autenriethSections(body: string): { grammar?: string; senses: Sense[] } {
  const colon = body.indexOf(":");
  const grammar = colon >= 0 && colon < 260 ? tidy(body.slice(0, colon)).replace(/^,\s*/u, "") : "";
  const rest = tidy(colon >= 0 && colon < 260 ? body.slice(colon + 1) : body);
  const starts: { at: number; end: number; n: number }[] = [];
  let next = 1;
  for (const m of rest.matchAll(/(?:^|[\s—–])\((\d+)\)\s/gu)) {
    if (Number(m[1]) !== next) continue;
    starts.push({ at: m.index, end: m.index + m[0].length, n: next++ });
  }
  const clean = (text: string) => text.replace(/^[\s—–]+|[\s—–]+$/gu, "");
  const senses: Sense[] = [];
  if (starts.length) {
    const lead = clean(rest.slice(0, starts[0]!.at));
    if (lead) senses.push({ gloss: lead });
    starts.forEach((s, i) => senses.push({ marker: `${s.n}.`, gloss: clean(rest.slice(s.end, starts[i + 1]?.at)) }));
  } else senses.push({ gloss: clean(rest) });
  return { ...(grammar ? { grammar } : {}), senses };
}

/** Autenrieth's entries (type="main") whose headwords `wanted` accepts. */
export function parseAutenrieth(xml: string, wanted: (key: string) => boolean): LexiconEntry[] {
  const out: LexiconEntry[] = [];
  let total = 0;
  for (const [, tag, inner] of xml.matchAll(/<entryFree\b([^>]*)>([^]*?)<\/entryFree>/gu)) {
    total++;
    const key = attribute(tag!, "key");
    const keys = [headwordKey(keyWord(key))];
    const orth = /<orth\b[^>]*>([^<]*)<\/orth>/u.exec(inner!)?.[1];
    if (orth !== undefined) keys.push(headwordKey(forms(headText(orth, true))[0] ?? ""));
    if (!keys.some(wanted)) continue;
    const root = parseFragment(inner!, `Autenrieth ${key}`);
    const headEl = elements(root).find((el) => el.localName === "orth");
    if (!headEl) throw new Error(`Autenrieth ${key}: no headword`);
    const how = { beta: true };
    const headword = cleanHead(plain(render(headEl, how, true)));
    const body = children(root).filter((child) => child !== headEl).map((child) => render(child, how)).join("");
    const { grammar, senses } = autenriethSections(body);
    out.push({ keys, article: { head: headword, sections: [{ ...(grammar ? { grammar } : {}), senses }] } });
  }
  if (total !== 9824) throw new Error(`Autenrieth has ${total} entries, expected 9,824: the download is incomplete or changed`);
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// Middle Liddell and LSJ

/** Senses of a Liddell-Scott entry: the <sense> elements, each labelled A, I, 1, a by its `n`. */
function senseList(root: Element, how: Rendering, what: string): Sense[] {
  const senses: Sense[] = [];
  for (const sense of elements(root).filter((el) => el.localName === "sense")) {
    if (sense.getElementsByTagName("sense").length > 0) throw new Error(`${what}: nested senses`);
    const gloss = tidy(children(sense).map((child) => render(child, how)).join(""));
    if (!gloss) continue;
    const marker = senseMarker(sense.getAttribute("n") ?? "");
    senses.push(marker ? { marker, gloss } : { gloss });
  }
  return senses;
}

/** The Middle Liddell's entries (main and cross-reference) whose headword `wanted` accepts. */
export function parseLiddell(xml: string, wanted: (key: string) => boolean): LexiconEntry[] {
  const out: LexiconEntry[] = [];
  let total = 0;
  for (const [, tag, inner] of xml.matchAll(/<entry\b([^>]*)>([^]*?)<\/entry>/gu)) {
    total++;
    const key = attribute(tag!, "key");
    const orths = [...inner!.matchAll(/<orth\b[^>]*>([^<]*)<\/orth>/gu)].map((m) => headText(m[1]!, false));
    // Only the first <orth> is the headword. The key names the main entry a phrase is filed under (οὐγάρ under οὐ),
    // and the other orths cite words, so neither may name the entry; the key serves only an entry without an orth.
    const keys = [headwordKey(orths[0] ? forms(orths[0])[0] ?? "" : keyWord(key))];
    if (!keys.some(wanted)) continue;
    const what = `Middle Liddell ${key}`;
    const root = parseFragment(inner!, what);
    const how = { beta: false };
    const note = elements(root).filter((el) => el.localName === "note").map((el) => render(el, how)).join(" ");
    const etymology = tidy(elements(root).filter((el) => el.localName === "etym").map((el) => render(el, how)).join(" "));
    let senses = senseList(root, how, what);
    // A cross-reference entry (ἀγαπώντως "= ἀγαπητῶς") has no senses: its etymology is the whole entry.
    if (!senses.length) senses = etymology ? [{ gloss: etymology }] : [];
    if (!senses.length) throw new Error(`${what}: no senses`);
    const grammar = tidy(`${note} ${senses[0]!.gloss === etymology || !etymology ? "" : `[${etymology}]`}`);
    out.push({ keys, article: { head: orths[0] ?? "", sections: [{ ...(grammar ? { grammar } : {}), senses }] } });
  }
  if (total !== 36494) throw new Error(`The Middle Liddell has ${total} entries, expected 36,494`);
  return out;
}

/** Parses one LSJ file; returns its entries and their count (the file's, wanted or not). */
export function parseLsj(xml: string, wanted: (key: string) => boolean): { entries: LexiconEntry[]; total: number } {
  const entries: LexiconEntry[] = [];
  let total = 0;
  for (const [, tag, inner] of xml.matchAll(/<entryFree\b([^>]*)>([^]*?)<\/entryFree>/gu)) {
    total++;
    const key = attribute(tag!, "key");
    // The headwords (the first <orth>, then variants such as Ep. ἠέλιος for ἥλιος) name the entry. The key names the
    // main entry a phrase is filed under (οὐ γάρ under οὐ), so it serves only an entry without an orth.
    const head = inner!.slice(0, inner!.search(/<sense\b/u) >= 0 ? inner!.search(/<sense\b/u) : inner!.length);
    const orths = [...head.matchAll(/<orth\b[^>]*>([^<]*)<\/orth>/gu)].map((m) => headwordKey(forms(headText(m[1]!, true))[0] ?? ""));
    const keys = orths.length ? orths : [headwordKey(keyWord(key))];
    if (!keys.some(wanted)) continue;
    const what = `LSJ ${key}`;
    const root = parseFragment(inner!, what);
    const how = { beta: true };
    const parts = children(root);
    const firstSense = parts.findIndex((child) => child.nodeType === 1 && (child as Element).localName === "sense");
    const lead = firstSense < 0 ? parts : parts.slice(0, firstSense);
    const orth = lead.find((child): child is Element => child.nodeType === 1 && (child as Element).localName === "orth");
    if (!orth) throw new Error(`${what}: no headword`);
    const headword = cleanHead(plain(render(orth, how, true)));
    const grammar = tidy(lead.filter((child) => child !== orth).map((child) => render(child, how)).join(""))
      .replace(/^[,:;\s—–]+/u, "");
    const senses = senseList(root, how, what);
    if (root.getElementsByTagName("sense").length !== elements(root).filter((el) => el.localName === "sense").length) {
      throw new Error(`${what}: a sense is not a child of the entry`);
    }
    if (!senses.length && !grammar) throw new Error(`${what}: empty entry`);
    entries.push({
      keys,
      article: { head: headword, sections: [senses.length ? { ...(grammar ? { grammar } : {}), senses } : { senses: [{ gloss: grammar }] }] },
    });
  }
  return { entries, total };
}

/**
 * An article cut to about `limit` characters of senses, whole senses only (the first always stays); a last sense says
 * how many were left out. The LSJ's longest entries (λόγος, ἐπί) run to 100 KB, which no word panel should fetch.
 */
export function abridge(article: Article, limit: number, where: string): Article {
  return {
    ...article,
    sections: article.sections.map((section) => {
      const senses = section.senses ?? [];
      let used = 0;
      const kept = senses.findIndex((sense, i) => {
        used += sense.gloss.length + (sense.examples?.length ?? 0);
        return i > 0 && used > limit;
      });
      if (kept < 0) return section;
      return { ...section, senses: [...senses.slice(0, kept), { gloss: `… ${senses.length - kept} more senses are not shown here: ${where}.` }] };
    }),
  };
}

/** The headword an article is listed under: its first form, without the hyphens that divide a compound. */
export const headwordForm = (article: Article): string => (forms(article.head)[0] ?? "").replace(/[-‑·]/gu, "");
