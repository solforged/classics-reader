// Renders dictionary shard records (src/lib/dict.ts) for the word panel and the lemma pages, following each
// dictionary's style in the language pack.
import { lang } from "../lang";
import type { Dictionary } from "../lang/types";
import type { Article, ArticleSection, DictHit, Sense } from "./dict";
import { parseMorph } from "./morph";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const abbreviationPatterns = new Map<string, RegExp | undefined>();
/** One pattern for all of a dictionary's abbreviations, longest first, not inside a longer word. */
function abbreviationPattern(dict: Dictionary): RegExp | undefined {
  if (abbreviationPatterns.has(dict.id)) return abbreviationPatterns.get(dict.id);
  const all = [...Object.keys(dict.abbreviations ?? {}), ...Object.keys(dict.grammarAbbreviations ?? {})];
  const pattern = all.length
    ? new RegExp(`(?<![\\p{L}\\p{N}-])(?:${all.sort((a, b) => b.length - a.length).map(escapeRegExp).join("|")})(?![\\p{L}-])`, "gu")
    : undefined;
  abbreviationPatterns.set(dict.id, pattern);
  return pattern;
}

/** Marks up abbreviations and replaces the headword mark, outside tags. */
function enrich(dict: Dictionary, html: string, headword: string, grammar = false): string {
  const pattern = abbreviationPattern(dict);
  const mark = dict.headwordMark;
  return html.split(/(<[^>]+>)/).map((part) => {
    if (part.startsWith("<")) return part;
    let out = pattern
      ? part.replace(pattern, (abbr) => {
        const title = dict.abbreviations?.[abbr] ?? (grammar ? dict.grammarAbbreviations?.[abbr] : undefined);
        return title ? `<abbr title="${esc(title)}">${abbr}</abbr>` : abbr;
      })
      : part;
    if (mark) out = out.replaceAll(mark, `<span class="headword-repeat" data-headword-repeat>${esc(headword)}</span>`);
    return out;
  }).join("");
}

/** The headword as repeated in examples, without compound separators. */
const repeatedHead = (article: Article) => article.head.replace(/[-‑·.]/g, "");

function senseHtml(dict: Dictionary, sense: Sense, headword: string): string {
  const marker = sense.marker ? `<span class="sense-number">${sense.marker}</span>` : "";
  const gloss = `<span class="sense-gloss">${enrich(dict, sense.gloss, headword)}</span>`;
  const examples = sense.examples ? `<span class="sense-examples">${enrich(dict, sense.examples, headword)}</span>` : "";
  return marker + gloss + examples;
}

function sectionContent(dict: Dictionary, section: ArticleSection, headword: string): string {
  if (section.text !== undefined) return `<p class="entry-fallback">${enrich(dict, section.text, headword)}</p>`;
  const senses = section.senses ?? [];
  if (!senses.some((s) => s.marker)) {
    return senses.map((s) => `<p class="entry-sense">${senseHtml(dict, s, headword)}</p>`).join("");
  }
  const first = senses.slice(0, 3).map((s) => `<li>${senseHtml(dict, s, headword)}</li>`).join("");
  const more = senses.slice(3).map((s) => `<li>${senseHtml(dict, s, headword)}</li>`).join("");
  let content = `<ol class="entry-senses">${first}</ol>`;
  if (more) {
    content += `<details class="more-senses">` +
      `<summary data-entry-ui>more senses (${senses.length - 3})</summary>` +
      `<ol class="entry-senses" start="4">${more}</ol></details>`;
  }
  return content;
}

/** An "article" entry: homograph sections, numbered senses; sections that do not fit the reading are collapsed. */
function articleHtml(dict: Dictionary, article: Article, morph?: string): string {
  const headword = repeatedHead(article);
  const upos = morph ? parseMorph(morph).upos : "";
  const byClass = article.sections.some((section) => section.classes);
  const fits = article.sections.map((section) => {
    if (section.classes) return section.classes.includes(upos);
    const grammar = (section.grammar || section.text || "").replace(/\([^)]*\)/g, "");
    return morph && dict.fits ? dict.fits(morph, grammar) : false;
  });
  // A dictionary's `fits` test collapses the other sections only when one section alone fits; build-time classes
  // collapse every section that does not list the reading's class.
  const fitting = fits.filter(Boolean).length;
  const collapse = (i: number) => fitting > 0 && !fits[i] && (byClass || fitting === 1);
  const blocks = article.sections.map((section, i) => {
    const label = `${section.label ?? ""}${enrich(dict, section.grammar ?? "", headword, true)}`;
    const source = `${label ? `<div class="entry-grammar">${label}</div>` : ""}${sectionContent(dict, section, headword)}`;
    if (collapse(i)) {
      const firstGloss = /<i>[^]*?<\/i>/.exec(section.senses?.[0]?.gloss ?? section.text ?? "")?.[0] ?? "";
      const textLabel = section.text?.split("<i>")[0]?.replace(/<[^>]+>/g, "").slice(0, 120) ?? "";
      // Sections with build-time classes (Frieze) have plain glosses, not italic ones: show the start of the first.
      const plainLabel = byClass && !firstGloss ? (section.senses?.[0]?.gloss ?? "").replace(/<[^>]+>/g, "") : "";
      const summary = label + (section.grammar ? "" : esc(textLabel)) +
        (firstGloss ? ` <span class="homograph-gloss">${enrich(dict, firstGloss, headword)}</span>` : "") +
        (plainLabel ? ` <span class="homograph-gloss">${plainLabel.length > 80 ? `${plainLabel.slice(0, 80).trimEnd()}…` : plainLabel}</span>` : "");
      return `<details class="entry-section other-homograph">` +
        `<summary data-entry-ui>${summary}</summary>${source}</details>`;
    }
    return `<section class="entry-section">${source}</section>`;
  }).join("");
  // A right-to-left language's headword carries its code, which sets its direction and font (Base.astro, global.css).
  const attrs = lang.dir ? ` lang="${lang.code}"` : "";
  return `<article class="dict-article"><b class="entry-headword"${attrs} data-entry-ui>${esc(article.head)}</b>${blocks}</article>`;
}

/** First gloss of an "article" entry, for a compound's component. */
function firstGlossHtml(dict: Dictionary, article: Article): string {
  const first = article.sections[0];
  const html = first?.senses?.[0]?.gloss ?? first?.text ?? "";
  const gloss = /<i>([^]*?)<\/i>/.exec(html)?.[1];
  return enrich(dict, gloss ?? html, repeatedHead(article));
}

function entriesHtml(dict: Dictionary, articles: Article[], morph?: string): string {
  switch (dict.style) {
    case "article":
      return articles.map((article) => articleHtml(dict, article, morph)).join("");
    case "plain":
      return articles.map((article) =>
        `<p><b>${esc(article.head)}</b> ${article.sections.map((s) => s.text ?? "").join(" ")}</p>`).join("");
    case "glosses":
      return articles.flatMap((article) => article.sections.map((s) =>
        `<p><i>${s.grammar ?? ""}</i> ${(s.senses ?? []).map((sense) => sense.gloss).join("; ")}</p>`)).join("");
    case "names":
      return articles.map((article) => {
        const desc = article.sections[0]?.senses?.[0]?.gloss;
        return `<p class="name-gloss"><b>${esc(article.head)}</b>${desc ? ` — ${desc}` : ""}</p>`;
      }).join("");
  }
}

export interface DictionaryOptions {
  /** Exact lemma, for pack-specific senses that share a dictionary lookup key. */
  lemma?: string;
  /** The reading's UD morphology, to open the homograph section that fits it. */
  morph?: string;
  /** Current work slug, to prefer names entries that cite it. */
  work?: string;
  properNoun?: boolean;
  parts?: ReadonlyMap<string, DictHit | undefined>;
  fullTitles?: boolean;
}

/** Source blocks shared by the reader panel and build-time lemma pages. */
export function dictionaryHtml(hit: DictHit | undefined, options: DictionaryOptions = {}): string {
  if (options.lemma) hit = lang.dictionaryEntry?.(options.lemma) ?? hit;
  if (!hit) return `<p class="wp-empty">No dictionary entry found.</p>`;
  const blocks: string[] = [];
  const common: string[] = [];
  const proper = options.properNoun || (options.morph !== undefined && parseMorph(options.morph).upos === "PROPN");
  const heading = options.fullTitles ? "h2" : "h4";
  const via = hit.via ? `<p class="dict-via">Listed as <i>${esc(hit.via)}</i>.</p>` : "";
  const capitalized = (article: Article) => /^\p{Lu}/u.test(article.head);
  for (const dict of lang.dictionaries) {
    const all = hit.entries[dict.id];
    if (!all?.length) continue;
    if (dict.fallbackFor && hit.entries[dict.fallbackFor]?.length) continue;
    const title = options.fullTitles ? dict.fullTitle : dict.title;
    if (dict.style === "names") {
      if (!proper) continue;
      const work = options.work;
      const inWork = work ? all.filter((article) => article.works?.includes(work)) : [];
      blocks.push(`<${heading}>${title}</${heading}>${entriesHtml(dict, inWork.length ? inWork : all)}`);
      continue;
    }
    const noteText = hit.notes?.[dict.id];
    const note = noteText ? `<p class="dict-via">${esc(noteText)}</p>` : "";
    // For a proper noun, entries for the common word that shares its spelling go into a closed section.
    const own = proper ? all.filter(capitalized) : all;
    const others = proper ? all.filter((article) => !capitalized(article)) : [];
    for (const [articles, target] of [[own, blocks], [others, common]] as const) {
      if (!articles.length) continue;
      const html = entriesHtml(dict, articles, options.morph);
      target.push(dict.collapsed
        ? `<details class="dict-collapsed"><summary>${title}</summary>${via}${note}${html}</details>`
        : `<${heading}>${title}</${heading}>${via}${note}${html}`);
    }
  }
  if (common.length) {
    blocks.push(`<details class="common-dictionary"><summary>Dictionary entries for the common word</summary>` +
      `${common.join("")}</details>`);
  }
  const defined = lang.dictionaries.some((dict) => dict.style !== "names" && hit.entries[dict.id]?.length);
  const glossary = lang.dictionaries.find((dict) => dict.style === "article");
  if (hit.parts?.length && !defined && glossary) {
    blocks.push(`<p class="compound">Compound: ${hit.parts.map((part) => `<b>${esc(part)}</b>`).join(" + ")}</p>`);
    for (const part of hit.parts) {
      const article = options.parts?.get(part)?.entries[glossary.id]?.[0];
      const gloss = article
        ? firstGlossHtml(glossary, article)
        : `<span class="wp-empty">No ${esc(glossary.title)} entry found.</span>`;
      blocks.push(`<p class="compound-part"><b>${esc(part)}</b> — ${gloss}</p>`);
    }
  }
  return blocks.join("") || `<p class="wp-empty">No dictionary entry found.</p>`;
}
