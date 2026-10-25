// Parses Sophus Bugge, Norrœn fornkvæði (1867), as transcribed at etext.old.no/Bugge.
import * as cheerio from "cheerio";
import type { AnalysisTable } from "../../../scripts/core/analyses";
import { inline } from "../../../scripts/core/html";
import type { SourceUnit, Piece } from "../../../scripts/core/types";

const WORD = /[\p{L}\p{M}]+/gu;

/** Split a line of Old Norse into clickable word pieces and plain punctuation/space pieces. */
export function tokenize(text: string, table: AnalysisTable, supplied = false): Piece[] {
  const out: Piece[] = [];
  let last = 0;
  for (const m of text.matchAll(WORD)) {
    if (m.index! > last) out.push(text.slice(last, m.index));
    const ids = table.lookup(m[0]);
    out.push(supplied ? [m[0], ids, 1] : [m[0], ids]);
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export interface BuggeOptions {
  keyPrefix: string;
  /** Only keep stanzas numbered at least this (used to fill the Codex Regius lacuna). */
  fromStanza?: number;
  /** Heading to emit before the first unit (e.g. the part title in Svipdagsmál). */
  head?: string;
}

export function parseBugge(html: string, table: AnalysisTable, opts: BuggeOptions): SourceUnit[] {
  const $ = cheerio.load(html);
  const units: SourceUnit[] = [];
  let n = 0;
  if (opts.head) units.push({ key: `${opts.keyPrefix}h0`, kind: "head", lines: [tokenize(opts.head, table)] });
  for (const tr of $("table").first().find("tr").toArray()) {
    const tds = $(tr).children("td").toArray();
    if (!tds.length) continue;
    const text = $(tr).text();
    if (/Anmærkning/.test(text)) break;
    if ($(tr).find('font[size="6"]').length) continue; // title row
    const first = tds[0]!;
    if (first.attribs.align === "right") {
      const num = $(first).text().match(/^\s*\[?(\d+)\]?/)?.[1];
      if (!num) continue;
      if (opts.fromStanza && Number(num) < opts.fromStanza) continue;
      const verse = tds[1];
      if (!verse) continue;
      const lines = inline(verse)
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => tokenize(l, table));
      if (lines.length) units.push({ key: `${opts.keyPrefix}s${++n}`, kind: "stanza", label: num, lines });
    } else {
      if (opts.fromStanza) continue;
      const para = inline(tds.find((td) => td.attribs.colspan) ?? first)
        .replace(/\s*\n\s*/g, " ")
        .trim();
      if (para && /\p{L}/u.test(para)) units.push({ key: `${opts.keyPrefix}p${++n}`, kind: "prose", lines: [tokenize(para, table)] });
    }
  }
  return units;
}
