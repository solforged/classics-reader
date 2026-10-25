// Structures the Old Norse dictionaries' entries into shard articles (src/lib/dict.ts) at build time.
import type { Article, ArticleSection, DictEntry } from "../../../src/lib/dict";
import type { WiktGloss } from "./lexicon";

export const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Splits HTML after its first italic gloss (and trailing punctuation): [gloss, examples]. */
function splitGloss(html: string): [string, string] {
  const gloss = /<i>[^]*?<\/i>/.exec(html);
  if (!gloss) return [html, ""];
  const glossEnd = gloss.index + gloss[0].length;
  const end = glossEnd + (html.slice(glossEnd).match(/^[\s,;:.!?]*/)?.[0].length ?? 0);
  return [html.slice(0, end), html.slice(end)];
}

/**
 * One Zoëga homograph section: grammar note, then senses numbered "1)", "2)" … at the top level (outside italics,
 * bold and parentheses). Sections whose markup or numbering does not parse keep their text whole.
 */
function zoegaSection(label: string, html: string): ArticleSection {
  const markers: { start: number; end: number; number: number }[] = [];
  const stack: string[] = [];
  let depth = 0;
  let valid = true;
  for (const token of html.matchAll(/<\/?(?:i|strong)>|\b\d+\)|[()]/g)) {
    const value = token[0];
    if (value.startsWith("</")) {
      if (stack.pop() !== value.slice(2, -1)) valid = false;
    } else if (value.startsWith("<")) stack.push(value.slice(1, -1));
    else if (!stack.length) {
      if (value === "(") depth++;
      else if (value === ")") depth = Math.max(0, depth - 1);
      else if (depth) depth--;
      else if (
        (token.index === 0 || /\s/.test(html[token.index - 1]!)) &&
        /\s|<|^$/.test(html[token.index + value.length] ?? "")
      ) {
        markers.push({ start: token.index, end: token.index + value.length, number: Number(value.slice(0, -1)) });
      }
    }
  }
  if (stack.length || depth) valid = false;
  if (markers.some((m, i) => m.number !== i + 1)) valid = false;
  const labelled = (section: ArticleSection): ArticleSection => (label ? { label, ...section } : section);
  if (!valid) return labelled({ text: html });
  if (markers.length) {
    return labelled({
      grammar: html.slice(0, markers[0]!.start),
      senses: markers.map((m, i) => {
        const [gloss, examples] = splitGloss(html.slice(m.end, markers[i + 1]?.start));
        return { marker: html.slice(m.start, m.end), gloss, ...(examples ? { examples } : {}) };
      }),
    });
  }
  const firstGloss = html.indexOf("<i>");
  if (firstGloss < 0) return labelled({ text: html });
  const [gloss, examples] = splitGloss(html.slice(firstGloss));
  return labelled({ grammar: html.slice(0, firstGloss), senses: [{ gloss, ...(examples ? { examples } : {}) }] });
}

/** A Zoëga entry split at its homograph labels ("<strong>II)</strong>"), each section parsed into senses. */
export function zoegaArticle(entry: DictEntry): Article {
  const html = entry.d.join(" ");
  const markers = [...html.matchAll(/<strong>[IVXLCDM]+\)<\/strong>/g)];
  if (!markers.length) return { head: entry.w, sections: [zoegaSection("", html)] };
  const sections: ArticleSection[] = [];
  const before = html.slice(0, markers[0]!.index);
  if (before.trim()) sections.push(zoegaSection("", before));
  else if (before) sections.push({ grammar: before, senses: [] });
  for (const [i, marker] of markers.entries()) {
    sections.push(zoegaSection(marker[0], html.slice(marker.index + marker[0].length, markers[i + 1]?.index)));
  }
  return { head: entry.w, sections };
}

/** A Cleasby–Vigfússon entry: headword and plain text. */
export function plainArticle(entry: DictEntry): Article {
  return { head: entry.w, sections: [{ text: esc(entry.d.join(" ")) }] };
}

/** A Wiktionary sense group: part of speech and glosses, without a headword. */
export function glossArticle(gloss: WiktGloss): Article {
  return { head: "", sections: [{ grammar: esc(gloss.pos), senses: gloss.glosses.map((g) => ({ gloss: esc(g) })) }] };
}
