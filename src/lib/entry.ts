import type { DictEntry, DictHit } from "./dict";
import { entryFits } from "./norse";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const ABBREVIATIONS: Record<string, string> = {
  "e-m": "einhverjum — someone or something (dative)",
  "e-n": "einhvern — someone (accusative)",
  "e-s": "einhvers — someone’s or something’s (genitive)",
  "e-t": "eitthvat — something",
  "e-u": "einhverju — something (dative)",
  "e-a": "einhverja — someone (feminine accusative)",
  "e-rra": "einhverra — some people or things (genitive plural)",
  "e-rri": "einhverri — someone or something (feminine dative)",
  "e-rar": "einhverrar — someone’s or something’s (feminine genitive)",
  "e-rr": "einhverr — someone or something (nominative)",
  "acc.": "accusative", "dat.": "dative", "gen.": "genitive", "nom.": "nominative",
  "pl.": "plural", "sg.": "singular", "sing.": "singular", "poet.": "poetic", "fig.": "figurative",
  "refl.": "reflexive", "impers.": "impersonal", "pret.": "preterite (past tense)", "pp.": "past participle",
  "esp.": "especially", "cf.": "compare", "e.g.": "for example", "opp.": "opposed to", "absol.": "absolute use",
  "indecl.": "indeclinable", "compar.": "comparative", "superl.": "superlative", "neut.": "neuter",
  "masc.": "masculine", "fem.": "feminine", "pron.": "pronoun", "pers.": "personal", "prep.": "preposition",
  "adv.": "adverb", "conj.": "conjunction", "interj.": "interjection", "infin.": "infinitive",
  "recipr.": "reciprocal", "pr.": "present", "pres.": "present", "part.": "participle", "ord.": "ordinal",
};
const GRAMMAR: Record<string, string> = {
  "m.": "masculine", "f.": "feminine", "n.": "neuter", "a.": "adjective", "v.": "verb",
};
const ABBREVIATION = new RegExp(
  "(?<![\\p{L}\\p{N}-])(?:" +
    [...Object.keys(ABBREVIATIONS), ...Object.keys(GRAMMAR)]
      .sort((a, b) => b.length - a.length)
      .map((abbr) => abbr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") +
    ")(?![\\p{L}-])",
  "gu",
);

function enrich(html: string, headword: string, grammar = false): string {
  return html.split(/(<[^>]+>)/).map((part) => {
    if (part.startsWith("<")) return part;
    return part.replace(ABBREVIATION, (abbr) => {
      const title = ABBREVIATIONS[abbr] ?? (grammar ? GRAMMAR[abbr] : undefined);
      return title ? `<abbr title="${esc(title)}">${abbr}</abbr>` : abbr;
    }).replace(/~/g, `<span class="headword-repeat" data-headword-repeat>${esc(headword)}</span>`);
  }).join("");
}

interface Sense {
  marker: string;
  leading: string;
  examples: string;
}
interface Section {
  label: string;
  grammar: string;
  senses: Sense[];
  fallback?: string;
}

function splitGloss(html: string): [string, string] {
  const gloss = /<i>[^]*?<\/i>/.exec(html);
  if (!gloss) return [html, ""];
  const glossEnd = gloss.index + gloss[0].length;
  const end = glossEnd + (html.slice(glossEnd).match(/^[\s,;:.!?]*/)?.[0].length ?? 0);
  return [html.slice(0, end), html.slice(end)];
}

function parseSection(label: string, html: string): Section {
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
  if (!valid) return { label, grammar: "", senses: [], fallback: html };
  if (markers.length) {
    return {
      label,
      grammar: html.slice(0, markers[0]!.start),
      senses: markers.map((m, i) => {
        const [leading, examples] = splitGloss(html.slice(m.end, markers[i + 1]?.start));
        return { marker: html.slice(m.start, m.end), leading, examples };
      }),
    };
  }
  const firstGloss = html.indexOf("<i>");
  if (firstGloss < 0) return { label, grammar: "", senses: [], fallback: html };
  const [leading, examples] = splitGloss(html.slice(firstGloss));
  return { label, grammar: html.slice(0, firstGloss), senses: [{ marker: "", leading, examples }] };
}

function sectionsOf(entry: DictEntry): Section[] {
  const html = entry.d.join(" ");
  const markers = [...html.matchAll(/<strong>[IVXLCDM]+\)<\/strong>/g)];
  if (!markers.length) return [parseSection("", html)];
  const sections: Section[] = [];
  if (html.slice(0, markers[0]!.index).trim()) sections.push(parseSection("", html.slice(0, markers[0]!.index)));
  else if (markers[0]!.index) sections.push({ label: "", grammar: html.slice(0, markers[0]!.index), senses: [] });
  for (const [i, marker] of markers.entries()) {
    sections.push(parseSection(marker[0], html.slice(marker.index + marker[0].length, markers[i + 1]?.index)));
  }
  return sections;
}

function senseHtml(sense: Sense, headword: string): string {
  const marker = sense.marker ? `<span class="sense-number">${sense.marker}</span>` : "";
  const gloss = `<span class="sense-gloss">${enrich(sense.leading, headword)}</span>`;
  const examples = sense.examples ? `<span class="sense-examples">${enrich(sense.examples, headword)}</span>` : "";
  return marker + gloss + examples;
}

/** Structured Zoëga article, preserving every definition character and expanding headword tildes. */
export function zoegaHtml(entry: DictEntry, msa?: string): string {
  const headword = entry.w.replace(/[-‑·.]/g, "");
  const sections = sectionsOf(entry);
  // Menota has several pronoun classes; entryFits uses PD for dictionary pronoun labels.
  const matchingMsa = msa?.replace(/\bx(?:PE|PI|PQ|PP|DD|DQ|DP|AT)\b/, "xPD");
  const fits = sections.map((section) => {
    const grammar = (section.grammar || section.fallback || "").replace(/\([^)]*\)/g, "");
    return matchingMsa ? entryFits(matchingMsa, grammar) : false;
  });
  const selected = fits.filter(Boolean).length === 1 ? fits.indexOf(true) : -1;
  const blocks = sections.map((section, i) => {
    const label = `${section.label}${enrich(section.grammar, headword, true)}`;
    let content: string;
    if (section.fallback !== undefined) content = `<p class="entry-fallback">${enrich(section.fallback, headword)}</p>`;
    else if (section.senses.some((s) => s.marker)) {
      const first = section.senses.slice(0, 3).map((s) => `<li>${senseHtml(s, headword)}</li>`).join("");
      const more = section.senses.slice(3).map((s) => `<li>${senseHtml(s, headword)}</li>`).join("");
      content = `<ol class="entry-senses">${first}</ol>`;
      if (more) {
        content += `<details class="more-senses">` +
          `<summary data-entry-ui>more senses (${section.senses.length - 3})</summary>` +
          `<ol class="entry-senses" start="4">${more}</ol></details>`;
      }
    } else content = section.senses.map((s) => `<p class="entry-sense">${senseHtml(s, headword)}</p>`).join("");
    const source = `${label ? `<div class="entry-grammar">${label}</div>` : ""}${content}`;
    if (selected >= 0 && selected !== i) {
      const firstGloss = /<i>[^]*?<\/i>/.exec(section.senses[0]?.leading ?? section.fallback ?? "")?.[0] ?? "";
      const fallbackLabel = section.fallback?.split("<i>")[0]?.replace(/<[^>]+>/g, "").slice(0, 120) ?? "";
      const summary = label + (section.grammar ? "" : esc(fallbackLabel)) +
        (firstGloss ? ` <span class="homograph-gloss">${enrich(firstGloss, headword)}</span>` : "");
      return `<details class="entry-section other-homograph">` +
        `<summary data-entry-ui>${summary}</summary>${source}</details>`;
    }
    return `<section class="entry-section">${source}</section>`;
  }).join("");
  return `<article class="zoega-entry"><b class="entry-headword" data-entry-ui>${esc(entry.w)}</b>${blocks}</article>`;
}

/** First Zoëga sense's English gloss, for a compound's component. */
export function zoegaGlossHtml(entry: DictEntry): string {
  const first = sectionsOf(entry)[0];
  const html = first?.senses[0]?.leading ?? first?.fallback ?? "";
  const gloss = /<i>([^]*?)<\/i>/.exec(html)?.[1];
  return enrich(gloss ?? html, entry.w.replace(/[-‑·.]/g, ""));
}

export interface DictionaryOptions {
  msa?: string;
  work?: string;
  properNoun?: boolean;
  parts?: ReadonlyMap<string, DictHit | undefined>;
  fullTitles?: boolean;
}

/** Source blocks shared by the reader panel and build-time lemma pages. */
export function dictionaryHtml(hit: DictHit | undefined, options: DictionaryOptions = {}): string {
  if (!hit) return `<p class="wp-empty">No dictionary entry found.</p>`;
  const blocks: string[] = [];
  const common: string[] = [];
  const proper = options.properNoun || options.msa?.startsWith("xNP");
  const heading = options.fullTitles ? "h2" : "h4";
  const via = hit.via ? `<p class="dict-via">Listed as <i>${esc(hit.via)}</i>.</p>` : "";
  if (proper && hit.n?.length) {
    const work = options.work;
    const inWork = work ? hit.n.filter((name) => name.works.includes(work)) : [];
    const names = inWork.length ? inWork : hit.n;
    const definitions = names.map((name) =>
      `<p class="name-gloss"><b>${esc(name.name)}</b>${name.desc ? ` — ${esc(name.desc)}` : ""}</p>`,
    ).join("");
    blocks.push(`<${heading}>Bellows, index of names</${heading}>${definitions}`);
  }
  const zoega = proper ? hit.z?.filter((entry) => /^\p{Lu}/u.test(entry.w)) : hit.z;
  const commonZoega = proper ? hit.z?.filter((entry) => !/^\p{Lu}/u.test(entry.w)) : undefined;
  for (const [entries, target] of [[zoega, blocks], [commonZoega, common]] as const) {
    if (!entries?.length) continue;
    const title = options.fullTitles ? "Zoëga, A Concise Dictionary of Old Icelandic (1910)" : "Zoëga";
    const definitions = entries.map((entry) => zoegaHtml(entry, options.msa)).join("");
    target.push(`<${heading}>${title}</${heading}>${via}${definitions}`);
  }
  if (hit.w?.length && !hit.z?.length) {
    const definitions = hit.w.map((entry) =>
      `<p><i>${esc(entry.pos)}</i> ${esc(entry.glosses.join("; "))}</p>`,
    ).join("");
    (proper ? common : blocks).push(`<${heading}>Wiktionary</${heading}>${via}${definitions}`);
  }
  const cleasby = proper ? hit.c?.filter((entry) => /^\p{Lu}/u.test(entry.w)) : hit.c;
  const commonCleasby = proper ? hit.c?.filter((entry) => !/^\p{Lu}/u.test(entry.w)) : undefined;
  for (const [entries, target] of [[cleasby, blocks], [commonCleasby, common]] as const) {
    if (!entries?.length) continue;
    const title = options.fullTitles
      ? "Cleasby–Vigfússon, An Icelandic-English Dictionary (1874)" : "Cleasby–Vigfússon";
    const definitions = entries.map((entry) => `<p><b>${esc(entry.w)}</b> ${esc(entry.d.join(" "))}</p>`).join("");
    target.push(`<details class="cleasby"><summary>${title}</summary>${via}${definitions}</details>`);
  }
  if (common.length) {
    blocks.push(`<details class="common-dictionary"><summary>Dictionary entries for the common word</summary>` +
      `${common.join("")}</details>`);
  }
  if (hit.parts?.length && !hit.z?.length && !hit.c?.length && !hit.w?.length) {
    blocks.push(`<p class="compound">Compound: ${hit.parts.map((part) => `<b>${esc(part)}</b>`).join(" + ")}</p>`);
    for (const part of hit.parts) {
      const entry = options.parts?.get(part)?.z?.[0];
      const gloss = entry ? zoegaGlossHtml(entry) : `<span class="wp-empty">No Zoëga entry found.</span>`;
      blocks.push(`<p class="compound-part"><b>${esc(part)}</b> — ${gloss}</p>`);
    }
  }
  return blocks.join("") || `<p class="wp-empty">No dictionary entry found.</p>`;
}
