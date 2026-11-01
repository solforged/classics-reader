// Reads Brown–Driver–Briggs as the Open Scriptures Hebrew Lexicon encodes it (BrownDriverBriggs.xml) and turns an
// entry into a dictionary article (src/lib/dict.ts). An entry is the headword, BDB's occurrence count and part of
// speech, a lead of definitions, and nested numbered senses; verbs carry one sense per stem (<stem>Qal</stem>). The
// parser throws on any element it does not render.
import { DOMParser, type Element, type Node } from "@xmldom/xmldom";
import type { Article, ArticleSection, Sense } from "../../../src/lib/dict";

const children = (node: Node): Node[] => Array.from(node.childNodes as unknown as ArrayLike<Node>);
const isElement = (node: Node): node is Element => node.nodeType === 1;
const esc = (text: string) => text.replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;");
const collapse = (text: string) => text.replace(/\s+/gu, " ");

/** The entries of BrownDriverBriggs.xml by id. */
export function parseBdb(xml: string): Map<string, Element> {
  const doc = new DOMParser().parseFromString(xml.replace(/^\uFEFF/u, ""), "text/xml");
  const entries = new Map<string, Element>();
  for (const entry of Array.from(doc.getElementsByTagName("entry") as unknown as ArrayLike<Element>)) {
    entries.set(entry.getAttribute("id")!, entry);
  }
  const count = xml.match(/<entry /gu)?.length ?? 0;
  if (!entries.size || entries.size !== count) throw new Error(`Parsed ${entries.size} of ${count} BDB entries`);
  return entries;
}

/** A node as inline HTML: Hebrew words in their own language and direction, definitions kept as <i>. */
function inline(node: Node): string {
  if (node.nodeType === 3) return esc(collapse(node.nodeValue!));
  if (!isElement(node)) return "";
  const inner = () => children(node).map(inline).join("");
  switch (node.tagName) {
    case "w": return `<span lang="hbo" dir="rtl">${inner()}</span>`;
    case "def": case "foreign": case "stem": case "asp": return `<i>${inner()}</i>`;
    case "em": return `<em>${inner()}</em>`;
    case "pos": case "ref": return inner();
    case "status": case "page": return "";
    default: throw new Error(`Unrendered BDB element <${node.tagName}>`);
  }
}

/** Collapsed whitespace, no leading punctuation; "" when nothing readable remains. */
function tidy(html: string): string {
  if (!/[\p{L}\p{N}]/u.test(html.replace(/<[^>]+>/gu, ""))) return "";
  return collapse(html).replace(/^[\s.,;:—–]+/u, "").trim();
}

/**
 * A sense's own text and its nested senses, flattened into `out`. The number column holds the path of the senses' `n`
 * values up to two levels ("2.a"); a deeper path leads the text instead. A stem (Qal, Niph.) heads its senses on a
 * line of its own.
 */
function flatten(el: Element, path: readonly string[], out: Sense[]): void {
  const n = el.getAttribute("n");
  const here = n ? [...path, n] : path;
  const stemEl = children(el).filter(isElement).find((child) => child.tagName === "stem");
  const stem = stemEl ? `<b>${esc(collapse(stemEl.textContent!).trim().replace(/\.$/u, ""))}</b>` : "";
  let buffer: Node[] = [];
  let first = true;
  const flush = () => {
    const html = tidy(buffer.filter((node) => node !== stemEl).map(inline).join(""));
    buffer = [];
    const text = first && stem ? `${stem}${html ? `. ${html}` : ""}` : html;
    if (!text) return;
    const number = first && here.length ? here.join(".") : "";
    if (number && here.length <= 2) out.push({ marker: esc(number), gloss: text });
    else out.push({ gloss: number ? `<b>${esc(number)}</b> ${text}` : text });
    first = false;
  };
  for (const node of children(el)) {
    if (isElement(node) && node.tagName === "sense") {
      flush();
      flatten(node, here, out);
    } else buffer.push(node);
  }
  flush();
}

interface Part {
  kind: string;
  html: string;
}

/**
 * An entry as an article: the grammar line holds BDB's occurrence count and part of speech (and, when the entry has
 * senses, its lead of definitions); the senses follow. `gloss` is the lexical index's gloss, shown for an entry that
 * has no <def> of its own (most names).
 */
export function bdbArticle(entry: Element, gloss: string | undefined): Article {
  const id = entry.getAttribute("id");
  const nodes = children(entry).filter((node) => !(isElement(node) && (node.tagName === "status" || node.tagName === "page")));
  const firstSense = nodes.findIndex((node) => isElement(node) && node.tagName === "sense");
  const lead = firstSense < 0 ? nodes : nodes.slice(0, firstSense);
  const rest = firstSense < 0 ? [] : nodes.slice(firstSense);
  const headAt = lead.findIndex((node) => isElement(node) && node.tagName === "w");
  if (headAt < 0) throw new Error(`BDB entry ${id} without a headword`);
  let head = collapse(lead[headAt]!.textContent!).trim();
  // A headword in brackets is a form BDB doubts: "[אֵב]".
  const before = lead.slice(0, headAt).map((node) => node.textContent ?? "").join("").trim();
  if (before && before !== "[") throw new Error(`BDB entry ${id}: text before the headword: ${before}`);
  if (before) head = `[${head}]`;
  const parts: Part[] = lead.slice(headAt + 1).map((node) => ({ kind: isElement(node) ? node.tagName : "text", html: inline(node) }));
  if (before && parts[0]?.kind === "text") parts[0] = { kind: "text", html: parts[0].html.replace(/^\s*\]/u, "") };

  // BDB's occurrence count follows the headword ("אָב 1101 n.m.").
  let count = "";
  const countAt = parts.findIndex((part) => part.kind === "text" && part.html.trim());
  const counted = countAt >= 0 ? /^\s*(\d+)(?=\s|$)/u.exec(parts[countAt]!.html) : undefined;
  if (counted) {
    count = `${counted[1]}×`;
    parts[countAt] = { kind: "text", html: parts[countAt]!.html.slice(counted[0].length) };
  }
  // The grammar line runs to the last part of speech before the first definition.
  const firstDef = parts.findIndex((part) => part.kind === "def");
  const lastPos = parts.reduce((at, part, i) => (part.kind === "pos" && (firstDef < 0 || i < firstDef) ? i : at), -1);
  let afterPos = parts.slice(lastPos + 1);
  const stop = afterPos[0]?.kind === "text" ? /^\s*\.?/u.exec(afterPos[0].html)![0] : "";
  if (stop) afterPos = [{ kind: "text", html: afterPos[0]!.html.slice(stop.length) }, ...afterPos.slice(1)];
  const grammar = tidy([count, ...parts.slice(0, lastPos + 1).map((part) => part.html)].join(" ") + (lastPos >= 0 && stop.includes(".") ? "." : ""))
    .replace(/ \./gu, ".");
  let leadGloss = tidy(afterPos.map((part) => part.html).join(""));
  if (gloss && entry.getElementsByTagName("def").length === 0) {
    leadGloss = `<i>${esc(gloss)}</i>${leadGloss ? ` — ${leadGloss}` : ""}`;
  }

  const senses: Sense[] = [];
  let pending: Node[] = [];
  const flushPending = () => {
    const html = tidy(pending.map(inline).join(""));
    pending = [];
    if (html) senses.push({ gloss: html });
  };
  for (const node of rest) {
    if (isElement(node) && node.tagName === "sense") {
      flushPending();
      flatten(node, [], senses);
    } else pending.push(node);
  }
  flushPending();

  const section: ArticleSection = senses.length
    ? { grammar: [grammar, leadGloss].filter(Boolean).join(" "), senses }
    : { ...(grammar ? { grammar } : {}), senses: leadGloss ? [{ gloss: leadGloss }] : [] };
  return { head, sections: [section] };
}

/** The entry's lead definitions as plain text ("utter, say"), for the lexicon list. */
export function bdbGloss(entry: Element): string {
  const nodes = children(entry);
  const firstSense = nodes.findIndex((node) => isElement(node) && node.tagName === "sense");
  return (firstSense < 0 ? nodes : nodes.slice(0, firstSense))
    .filter((node): node is Element => isElement(node) && node.tagName === "def")
    .map((def) => collapse(def.textContent!).trim()).join(", ");
}
