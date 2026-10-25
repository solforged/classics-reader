// Prose Edda: Old Norse from Icelandic Wikisource wikitext; English from Brodeur (1916) rendered Wikisource HTML.
import * as cheerio from "cheerio";
import type { AnyNode, Element } from "domhandler";
import type { AnalysisTable } from "./analyses";
import { tokenize } from "./bugge";
import { hasClass, inline } from "./html";
import type { EnUnit, OnUnit } from "./types";

function cleanWiki(s: string): string {
  return s
    .replace(/'''|''/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/<\/?(span|div|center|small|big|sup|sub|font)[^>]*>/g, "")
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, "$1")
    .replace(/--/g, "–")
    .replace(/\s+/g, " ")
    .trim();
}

const ROMAN = /^(?:[IVXL]+)$/;

/** Old Norse chapters: `'''12. Title.'''` headings (Háttatal uses `'''I.'''` parts), paragraphs and numbered verse blockquotes. */
export function parseSnorra(wiki: string, table: AnalysisTable): OnUnit[] {
  const units: OnUnit[] = [];
  const body = wiki.replace(/^\{\{Verk[^\n]*\n/, "").replace(/<div[^>]*>[\s\S]*?<\/div>/g, "");
  let chapter = "0";
  let n = 0;
  const blocks = body.split(/(<blockquote>[\s\S]*?<\/blockquote>)/);
  for (const block of blocks) {
    if (block.startsWith("<blockquote>")) {
      const inner = block.replace(/<\/?blockquote>/g, "");
      const parts = inner.split(/<br\s*\/?>/).map(cleanWiki).filter(Boolean);
      let label: string | undefined;
      if (parts[0] && /^\d+\.$/.test(parts[0])) label = parts.shift()!.replace(".", "");
      if (parts.length)
        units.push({ key: `c${chapter}.s${++n}`, kind: "stanza", label, lines: parts.map((l) => tokenize(l, table)) });
      continue;
    }
    for (const para of block.split(/\n\s*\n/)) {
      const head = para.trim().match(/^'''(\d+|[IVXL]+)\.\s*([^']*)'''\s*$/);
      if (head) {
        chapter = head[1]!;
        n = 0;
        const title = cleanWiki(head[2] ?? "");
        units.push({
          key: `c${chapter}.h0`,
          kind: "head",
          label: chapter,
          lines: title ? [tokenize(title, table)] : [],
        });
        continue;
      }
      for (const piece of para.split(/<br\s*\/?>/)) {
        const t = cleanWiki(piece);
        if (!t || !/\p{L}/u.test(t)) continue;
        units.push({ key: `c${chapter}.p${++n}`, kind: "prose", lines: [tokenize(t, table)] });
      }
    }
  }
  return units;
}

const romanValue = (r: string) => {
  const v: Record<string, number> = { I: 1, V: 5, X: 10, L: 50 };
  let total = 0;
  for (let i = 0; i < r.length; i++) {
    const cur = v[r[i]!]!;
    const next = v[r[i + 1]!] ?? 0;
    total += cur < next ? -cur : cur;
  }
  return total;
};

const skipWs = (el: Element) =>
  hasClass(el, "pagenum") || hasClass(el, "ws-noexport") || hasClass(el, "reference") || el.name === "sup";

/** Brodeur: paragraphs whose bold Roman numeral starts a chapter, and <dl><dd> verse blocks. */
export function parseBrodeur(html: string): EnUnit[] {
  const $ = cheerio.load(html);
  const root = $(".mw-parser-output").first();
  const scope = root.length ? root : $("body");
  const units: EnUnit[] = [];
  let chapter = "0";
  let n = 0;
  const elements = scope.find("p, dl, div.wst-center").toArray();
  for (const el of elements) {
    if ($(el).parents('dl, .references, .reflist, .mw-references-wrap, table, [class*="wst-header"]').length) continue;
    if ($(el).find("#dynamic_layout_overrider").length) continue;
    if (el.name === "div") continue; // centered titles are handled through their <p> children
    if (el.name === "dl") {
      const lines = $(el)
        .find("dd")
        .toArray()
        .map((dd) => inline(dd, { skip: skipWs }).replace(/\u200b/g, "").replace(/\s{2,}/g, "  ").trim())
        .filter(Boolean);
      if (lines.length) units.push({ key: `c${chapter}.s${++n}`, kind: "stanza", lines });
      continue;
    }
    const centered = $(el).closest(".wst-center").length > 0;
    const plain = inline(el, { skip: skipWs }).replace(/\u200b/g, "").replace(/\n/g, " ").trim();
    if (centered && ROMAN.test(plain)) {
      // Prologue divisions are centered numerals.
      chapter = String(romanValue(plain));
      n = 0;
      units.push({ key: `c${chapter}.h0`, kind: "head", label: plain, lines: [] });
      continue;
    }
    // Other chapters start with a bold Roman numeral, possibly after page-number spans or an editorial "[".
    const meaningful = (c: AnyNode) =>
      c.type === "text"
        ? c.data.replace(/[\s\u200b[]/g, "") !== ""
        : c.type === "tag" && !skipWs(c) && c.name !== "link" && c.name !== "style" && $(c).text().replace(/[\s\u200b]/g, "") !== "";
    const lead = $(el).contents().toArray().find(meaningful);
    if (!lead) continue;
    const leadText = lead.type === "tag" && lead.name === "b" ? $(lead).text().trim().replace(/\.$/, "") : "";
    if (leadText && ROMAN.test(leadText)) {
      chapter = String(romanValue(leadText));
      n = 0;
      units.push({ key: `c${chapter}.h0`, kind: "head", label: leadText, lines: [] });
      $(lead).remove();
    } else if (chapter === "0" && !centered && units.some((u) => u.kind === "head")) {
      // Untitled first division (Prologue I).
      chapter = "1";
      n = 0;
      units.push({ key: "c1.h0", kind: "head", label: "I", lines: [] });
    }
    const text = inline(el, { skip: skipWs }).replace(/\u200b/g, "").replace(/\n/g, " ").trim();
    if (!text) continue;
    units.push({ key: `c${chapter}.${centered ? "h" : "p"}${++n}`, kind: centered ? "head" : "prose", lines: [text] });
  }
  return units;
}
