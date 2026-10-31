// Reads Frieze's Aeneid vocabulary as Dickinson College Commentaries export it (frieze-export-xml): one item per
// entry with the headword as printed (principal parts, gender), the definition with Aeneid citations, and its number
// of occurrences in the Aeneid. DCC keys entries by LASLA lemma: the page slug is the lemma with u written v, plus
// -0, -1 … for further entries of the same lemma (vt, vt-0 … for ut).
import type { Article, ArticleSection, Sense } from "../../../src/lib/dict";

export interface FriezeEntry {
  slug: string;
  /** The LASLA lemma the entry belongs to. */
  lemma: string;
  /** Headword as printed, e.g. "canō, cecinī, 3, n. and a.". */
  headword: string;
  /** Definition, plain text. */
  body: string;
  /** Occurrences in the whole Aeneid. */
  count: number;
}

const ITEM = new RegExp(
  "<item key=\"\\d+\"><field_fr_frieze_lemma><!\\[CDATA\\[<a href=\"https://dcc\\.dickinson\\.edu/vergil/([^\"]+)\">(.*?)</a>\\]\\]>" +
    "</field_fr_frieze_lemma><body><!\\[CDATA\\[<p>([^]*?)</p>\\s*\\]\\]></body><field_fr_occurences>([\\d ]+)</field_fr_occurences></item>",
  "gu",
);

const ENTITIES: Record<string, string> = { "&#039;": "'", "&quot;": "\"", "&gt;": ">", "&lt;": "<", "&amp;": "&" };
const decode = (text: string): string => text.replace(/&(?:#039|quot|gt|lt|amp);/gu, (entity) => ENTITIES[entity]!);

/** Every entry; throws unless every item parses. Counts of 1,000 or more are printed with a space ("2 083"). */
export function parseFrieze(xml: string): FriezeEntry[] {
  const entries: FriezeEntry[] = [];
  for (const [, slug, headword, body, count] of xml.matchAll(ITEM)) {
    entries.push({
      slug: slug!, lemma: slug!.replace(/-\d+$/u, "").replaceAll("v", "u"),
      headword: decode(headword!).trim(), body: decode(body!).replace(/\s+/gu, " ").trim(),
      count: Number(count!.replaceAll(" ", "")),
    });
  }
  const items = xml.match(/<item key=/gu)?.length ?? 0;
  if (!entries.length || entries.length !== items) throw new Error(`Parsed ${entries.length} of ${items} Frieze entries`);
  return entries;
}

const esc = (text: string) => text.replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;");

/**
 * A definition's parts: a leading parenthesis is its grammar ("(conj., denoting result), so that, …"); a definition
 * numbered 1., 2. … (names shared by several people) is one sense per number.
 */
function section(body: string): ArticleSection {
  const lead = /^(\([^()]*\)),?\s*/u.exec(body);
  const rest = lead ? body.slice(lead[0].length) : body;
  let senses: Sense[] = [{ gloss: esc(rest) }];
  if (/^1\.\s/u.test(rest)) {
    const parts: Sense[] = [];
    let next = 1;
    let start = 0;
    for (const match of rest.matchAll(/(?:^|\s)(\d+)\.\s/gu)) {
      if (Number(match[1]) !== next) continue;
      if (next > 1) parts.push({ marker: `${next - 1}.`, gloss: esc(rest.slice(start, match.index).trim()) });
      start = match.index + match[0].length;
      next++;
    }
    parts.push({ marker: `${next - 1}.`, gloss: esc(rest.slice(start).trim()) });
    if (parts.length > 1) senses = parts;
  }
  return { ...(lead ? { grammar: esc(lead[1]!) } : {}), senses };
}

/** The definition without its grammar note, for the lexicon's short gloss. */
export const friezeGloss = (entry: FriezeEntry): string => entry.body.replace(/^\([^()]*\),?\s*/u, "");

/**
 * Articles for one lemma's entries, most frequent first: one article per headword, one section per entry. A section
 * lists the word classes of the readings LASLA files under it, so the panel can open the one that fits.
 */
export function friezeArticles(entries: readonly { entry: FriezeEntry; classes: readonly string[] }[]): Article[] {
  const byHead = new Map<string, { count: number; sections: { count: number; section: ArticleSection }[] }>();
  for (const { entry, classes } of entries) {
    let group = byHead.get(entry.headword);
    if (!group) byHead.set(entry.headword, group = { count: 0, sections: [] });
    group.count += entry.count;
    group.sections.push({ count: entry.count, section: { ...section(entry.body), ...(classes.length ? { classes: [...classes] } : {}) } });
  }
  return [...byHead].sort((a, b) => b[1].count - a[1].count).map(([head, group]) => ({
    head, sections: group.sections.sort((a, b) => b.count - a.count).map((s) => s.section),
  }));
}
