// Reads An Anglo-Saxon Dictionary Online (Bosworth–Toller, v0.1 dump of 2021-04-09 by Tichý et al., Charles
// University, CC BY 4.0): bosworth_entries_export.csv, columns "id";"headword";"body", the body being the entry's
// XML. The dump has one row per homograph entry (an entry for each part of speech) and a further row for each entry
// of Toller's Supplement (1921, `add="1"`). Entries become `Article`s (src/lib/dict.ts): one article per printed
// headword, one section per entry, senses numbered as Bosworth–Toller numbers them, a few citations per sense.
import { load, type CheerioAPI } from "cheerio";
import type { AnyNode, Element } from "domhandler";
import type { Article, ArticleSection, Sense } from "../../../src/lib/dict";

export interface BtRow {
  id: string;
  headword: string;
  body: string;
}

/** The dump's rows; throws unless the CSV is well formed. */
export function readBtCsv(text: string): BtRow[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let i = 0;
  const n = text.length;
  while (i < n) {
    if (text[i] === "\"") {
      let value = "";
      let j = i + 1;
      for (;;) {
        const quote = text.indexOf("\"", j);
        if (quote < 0) throw new Error("Bosworth–Toller CSV: unterminated quoted field");
        value += text.slice(j, quote);
        if (text[quote + 1] === "\"") {
          value += "\"";
          j = quote + 2;
          continue;
        }
        j = quote + 1;
        break;
      }
      row.push(value);
      i = j;
    } else {
      let j = i;
      while (j < n && text[j] !== ";" && text[j] !== "\n" && text[j] !== "\r") j++;
      row.push(text.slice(i, j));
      i = j;
    }
    if (text[i] === ";") {
      i++;
      continue;
    }
    if (text[i] === "\r") i++;
    if (text[i] === "\n" || i >= n) {
      i++;
      rows.push(row);
      row = [];
    } else throw new Error(`Bosworth–Toller CSV: unexpected character ${JSON.stringify(text[i])} at ${i}`);
  }
  const [header, ...data] = rows;
  if (header?.join(";") !== "id;headword;body") throw new Error(`Unexpected Bosworth–Toller CSV header: ${header?.join(";")}`);
  return data.map((cells) => {
    if (cells.length !== 3) throw new Error(`Bosworth–Toller CSV row with ${cells.length} cells: ${cells[0]}`);
    return { id: cells[0]!, headword: cells[1]!, body: cells[2]! };
  });
}

/** Bosworth–Toller marks a long vowel with an acute accent; this reader writes the macron (á → ā, ǽ → ǣ). */
export const macronize = (text: string): string =>
  text.normalize("NFD").replace(/([aeiouyæ])\u0301/giu, "$1\u0304").normalize("NFC");

/** The key a headword is found under: unmarked, lowercase, ð as þ, without hyphens (ge-hátan), spaces and dots. */
export const btKey = (headword: string): string =>
  headword.normalize("NFD").replace(/\p{M}/gu, "").normalize("NFC").toLowerCase()
    .replace(/ð/gu, "þ").replace(/ƿ/gu, "w").replace(/[-\s.·'’()=]/gu, "");

/** A headword printed in capitals (CWEÐAN, IC) is lowercased. */
const printed = (headword: string): string => macronize(headword === headword.toUpperCase() ? headword.toLowerCase() : headword);

/** The headword as the reader shows a lemma: macrons, no hyphens (ge-hátan → gehātan). */
export const btLemma = (headword: string): string => printed(headword).replace(/-/gu, "");

/** Bosworth–Toller's part of speech → the UPOS classes of the readings it describes. */
const CLASSES: Record<string, string[]> = {
  noun: ["NOUN", "PROPN"], verb: ["VERB", "AUX"], adjective: ["ADJ", "DET", "NUM"], adverb: ["ADV"],
  preposition: ["ADP"], conjunction: ["CCONJ", "SCONJ"], pronoun: ["PRON", "DET"], numeral: ["NUM", "ADJ", "DET"],
  interjection: ["INTJ"],
};

// ---- Entry bodies -------------------------------------------------------------------------------------------

/** Elements that carry nothing for a reader: page breaks, the editors' notes, etymologies and derivative lists. */
const DROP: Record<string, true> = { page: true, problem: true, etym: true, der: true, checked: true, form: true };
const BLOCK: Record<string, true> = { examples: true, ex: true, sense: true, snum: true };
const MAX_SENSES = 30;
const MAX_EXAMPLES = 2;
const MAX_GLOSS = 320;
const MAX_QUOTE = 240;

type Node = AnyNode;
const isTag = (node: Node): node is Element => node.type === "tag";
const nameOf = (node: Node): string => (isTag(node) ? node.name : "");
const childrenOf = (node: Node): Node[] => ("children" in node ? (node.children as Node[]) : []);
const rawText = (node: Node): string => (node.type === "text" ? node.data : childrenOf(node).map(rawText).join(""));
const attr = (node: Node, name: string): string => (isTag(node) ? (node.attribs[name] ?? "") : "");

const esc = (text: string): string => text.replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;");

/** Text as shown: length marks as macrons, whitespace collapsed, the stray literal <b> and <i> of some entries dropped. */
const clean = (text: string): string => macronize(text).replace(/<\/?[a-z]+>/giu, "").replace(/\s+/gu, " ");
const plain = (node: Node): string => clean(rawText(node)).trim();

/**
 * An entry part's mixed content as HTML, cut after `budget` characters of text. <i-s/>…<i-e/> and <b-s/>…<b-e/> mark
 * italics and bold; English equivalents stay plain and Latin ones are emphasised; a headword citation (<cit>) is
 * bold; a citation's source (<references>) goes in parentheses. A printed ending (<infl full="cyninges">es</infl>)
 * gets its hyphen.
 */
function inline(nodes: readonly Node[], budget = Infinity): string {
  let html = "";
  let length = 0;
  let italic = false;
  let bold = false;
  const emit = (text: string, latin: boolean) => {
    let chunk = esc(text);
    if (latin) chunk = `<em>${chunk}</em>`;
    if (italic) chunk = `<i>${chunk}</i>`;
    if (bold) chunk = `<b>${chunk}</b>`;
    html += chunk;
  };
  /** Adds text; false once the budget is spent (the last piece is cut at a word). */
  const add = (raw: string, latin: boolean): boolean => {
    let text = clean(raw);
    if (!text.trim() && !html.trim()) return true;
    const room = budget - length;
    if (text.length > room) {
      const cut = text.slice(0, Math.max(room, 0));
      text = `${cut.slice(0, Math.max(cut.lastIndexOf(" "), room - 24)).trimEnd()}…`;
      emit(text, latin);
      length = budget;
      return false;
    }
    emit(text, latin);
    length += text.length;
    return true;
  };
  const visit = (node: Node, latin: boolean): boolean => {
    if (node.type === "text") return add(node.data, latin);
    if (!isTag(node) || length >= budget) return length < budget;
    switch (node.name) {
      case "i-s": italic = true; return true;
      case "i-e": italic = false; return true;
      case "b-s": bold = true; return true;
      case "b-e": bold = false; return true;
      case "br": return add(" ", latin);
      case "edit": {
        const text = plain(node);
        // "Add:" only says the entry belongs to the supplement; "Substitute:" and "Delete:" tell what it does.
        if (!text || /^add:?$/iu.test(text)) return true;
        return childrenOf(node).every((child) => visit(child, latin));
      }
      case "references": {
        const text = plain(node).replace(/[.,;:\s]+$/u, "");
        if (text) {
          html += ` <span class="ref">(${esc(text)})</span>`;
          length += text.length + 2;
        }
        return true;
      }
      case "equiv": case "trans": {
        const lang = attr(node, "lang");
        return childrenOf(node).every((child) => visit(child, /^la/iu.test(lang) || latin));
      }
      case "cit": {
        const was = bold;
        bold = true;
        const ok = add(rawText(node), latin);
        bold = was;
        return ok;
      }
      case "infl": case "var": {
        const text = plain(node);
        const full = attr(node, "full");
        // An ending printed as "es" with the whole form in `full`: show "-es".
        const ending = !!full && !text.startsWith("-") && text !== full && /^\p{L}+$/u.test(text) && full.endsWith(text);
        if (ending && childrenOf(node).every((child) => child.type === "text")) return add(` -${rawText(node).trim()}`, latin);
        return childrenOf(node).every((child) => visit(child, latin));
      }
      default:
        if (Object.hasOwn(DROP, node.name) || Object.hasOwn(BLOCK, node.name)) return true;
        return childrenOf(node).every((child) => visit(child, latin));
    }
  };
  for (const node of nodes) if (!visit(node, false)) break;
  return html.replace(/\s+/gu, " ").replace(/,(?=[^\s<])/gu, ", ").trim();
}

/** The <ex> elements within nodes (<examples> blocks, or examples written straight into a definition). */
const examplesOf = (nodes: readonly Node[]): Element[] =>
  nodes.flatMap((node) => (nameOf(node) === "ex" ? [node as Element] : nameOf(node) === "examples" ? examplesOf(childrenOf(node)) : []));

/** A few citations: the Old English with the headword bold, its translation and where it is cited. */
function examplesHtml(examples: readonly Element[]): string | undefined {
  const parts: string[] = [];
  const quoted = examples.filter((ex) => childrenOf(ex).some((child) => nameOf(child) === "oe"));
  // Short quotations first: some are paragraphs.
  const byLength = [...quoted].sort((a, b) => plain(a).length - plain(b).length);
  const chosen = new Set(byLength.slice(0, MAX_EXAMPLES));
  for (const ex of quoted.filter((candidate) => chosen.has(candidate))) {
    const kids = childrenOf(ex);
    const oe = inline(childrenOf(kids.find((child) => nameOf(child) === "oe")!), MAX_QUOTE);
    const translations = kids.filter((child) => nameOf(child) === "trans");
    const translation = translations.find((child) => !/^la/iu.test(attr(child, "lang"))) ?? translations[0];
    const said = translation ? inline(childrenOf(translation), MAX_QUOTE).replace(/[,;\s]+$/u, "") : "";
    const refs = kids.find((child) => nameOf(child) === "references");
    parts.push(`<em lang="ang">${oe}</em>${said ? ` “${said}”` : ""}${refs ? ` ${inline([refs])}` : ""}`);
  }
  return parts.length ? parts.join("<br>") : undefined;
}

/**
 * A body's senses, nested senses following their parent. `see` collects the entry ids of cross-references
 * ("v. sculan"), and `seeSenses` the senses made from them.
 */
function sensesOf(nodes: readonly Node[], out: Sense[], see: string[], seeSenses: Set<Sense>): void {
  let current: Sense | undefined;
  for (const node of nodes) {
    switch (nameOf(node)) {
      case "def": {
        const kids = childrenOf(node);
        const gloss = inline(kids, MAX_GLOSS);
        const examples = examplesHtml(examplesOf(kids));
        if (gloss || examples) out.push(current = { gloss, ...(examples ? { examples } : {}) });
        break;
      }
      case "examples": case "ex": {
        const examples = examplesHtml(examplesOf([node]));
        if (!examples) break;
        if (current && !current.examples) current.examples = examples;
        else out.push(current = { gloss: "", examples });
        break;
      }
      case "sense": {
        const kids = childrenOf(node);
        const snum = kids.find((child) => nameOf(child) === "snum");
        const marker = snum ? plain(snum) : `${attr(node, "num")}.`;
        const own: Sense[] = [];
        sensesOf(kids.filter((child) => nameOf(child) !== "sense" && nameOf(child) !== "snum"), own, see, seeSenses);
        const [first, ...rest] = own;
        out.push(first ? { marker, ...first } : { marker, gloss: "" }, ...rest);
        sensesOf(kids.filter((child) => nameOf(child) === "sense"), out, see, seeSenses);
        current = out.at(-1);
        break;
      }
      case "see": {
        for (const link of childrenOf(node).filter((child) => nameOf(child) === "a")) {
          // Links write the entry id zero-padded to six digits ("031535"); the CSV's id column does not.
          const href = attr(link, "href").replace(/^0+/u, "");
          if (href) see.push(href);
        }
        const gloss = inline(childrenOf(node));
        if (gloss) {
          out.push(current = { gloss });
          seeSenses.add(current);
        }
        break;
      }
      default:
    }
  }
}

interface BtEntry {
  id: string;
  /** The headword as printed, hyphens and accents included. */
  headword: string;
  /** Toller's Supplement rather than Bosworth's main dictionary. */
  supplement: boolean;
  pos: string[];
}

export interface BtArticle {
  articles: Article[];
  /** The headword the entries are printed under, when it is not the lemma looked up (a cross-reference's target). */
  via?: string;
  /** Short plain-text glosses for the lexicon, for the readings of each class ("" classes: any). */
  glosses: { classes: string[]; gloss: string }[];
}

/** A short plain-text gloss from a sense: "a king, ruler, emperor" (up to the first semicolon, which starts the Latin). */
function shortGloss(sense: Sense): string {
  const text = sense.gloss.replace(/<[^>]+>/gu, "").replace(/&lt;/gu, "<").replace(/&gt;/gu, ">").replace(/&amp;/gu, "&")
    .replace(/\s+/gu, " ").trim();
  const first = (text.split(";")[0] ?? "").replace(/[\s.,:]+$/u, "");
  return first.length > 90 ? `${first.slice(0, 90).replace(/\s+\S*$/u, "")}…` : first;
}

export class BtDictionary {
  private readonly byKey = new Map<string, BtEntry[]>();
  private readonly bodies = new Map<string, string>();
  private readonly keyOf = new Map<string, string>();
  private readonly parsed = new Map<string, CheerioAPI>();
  private readonly cache = new Map<string, BtArticle | null>();

  constructor(rows: readonly BtRow[]) {
    for (const row of rows) {
      const head = row.headword.trim();
      // Affixes (ge-, -ness) are entries of their own, never a word's lemma.
      if (!head || head.startsWith("-") || head.endsWith("-")) continue;
      const key = btKey(head);
      if (!key) continue;
      const pos = [...row.body.matchAll(/<pos>([^<]*)<\/pos>/gu)].map((m) => m[1]!.trim());
      const entry: BtEntry = { id: row.id, headword: head, supplement: / add="1"/u.test(row.body.slice(0, 400)), pos };
      const list = this.byKey.get(key);
      if (list) list.push(entry);
      else this.byKey.set(key, [entry]);
      this.bodies.set(row.id, row.body);
      this.keyOf.set(row.id, key);
    }
  }

  get size(): number {
    return this.byKey.size;
  }

  /** Is there an entry (Bosworth's or Toller's) under the key? */
  has(key: string): boolean {
    return this.byKey.has(key);
  }

  /** The entries under a key, Bosworth's before Toller's. */
  private entries(key: string): BtEntry[] {
    return [...(this.byKey.get(key) ?? [])].sort((a, b) => Number(a.supplement) - Number(b.supplement));
  }

  /** The headword the main entry that fits a word class best prints (else the first entry's); undefined for no entry. */
  headword(key: string, upos?: string): string | undefined {
    const entries = this.entries(key);
    const main = entries.filter((entry) => !entry.supplement);
    const pool = main.length ? main : entries;
    return (upos ? pool.find((entry) => entry.pos.some((pos) => CLASSES[pos]?.includes(upos))) : undefined)?.headword ?? pool[0]?.headword;
  }

  private doc(id: string): CheerioAPI {
    let doc = this.parsed.get(id);
    if (!doc) {
      doc = load(this.bodies.get(id)!, { xmlMode: true });
      this.parsed.set(id, doc);
    }
    return doc;
  }

  private section(entry: BtEntry): { section: ArticleSection; redirects: string[]; redirect: boolean } {
    const $ = this.doc(entry.id);
    const kids = childrenOf($("column").get(0)!);
    const grammar = kids.find((child) => nameOf(child) === "grammar");
    const redirects: string[] = [];
    const seeSenses = new Set<Sense>();
    const senses: Sense[] = [];
    sensesOf(kids, senses, redirects, seeSenses);
    const kept = senses.filter((sense) => sense.gloss || sense.examples).slice(0, MAX_SENSES);
    const gramGrp = $("gramGrp").get(0);
    const traits = gramGrp ? childrenOf(gramGrp).filter((child) => nameOf(child) === "gen" || nameOf(child) === "subc").map(plain) : [];
    const pos = entry.pos.filter((p) => p !== "unknown");
    const label = [...pos, ...traits].join(", ");
    const note = grammar ? inline(childrenOf(grammar), 200) : "";
    const section: ArticleSection = {
      ...(entry.supplement ? { label: "<i>Supplement</i> " } : label ? { label: `<i>${esc(label)}</i> ` } : {}),
      ...(note ? { grammar: note } : {}),
      ...(kept.length ? { senses: kept } : {}),
    };
    const classes = [...new Set(pos.flatMap((p) => CLASSES[p] ?? []))];
    if (classes.length) section.classes = classes;
    return { section, redirects, redirect: redirects.length > 0 && senses.every((sense) => seeSenses.has(sense)) };
  }

  /** The articles for a key, following a cross-reference entry ("v. sculan") to its target when nothing else is there. */
  article(key: string, depth = 0): BtArticle | undefined {
    const cached = this.cache.get(key);
    if (cached !== undefined) return cached ?? undefined;
    const found = this.build(key, depth);
    this.cache.set(key, found ?? null);
    return found;
  }

  private build(key: string, depth: number): BtArticle | undefined {
    const entries = this.entries(key);
    const byHead = new Map<string, { head: string; sections: ArticleSection[] }>();
    const redirects: string[] = [];
    for (const entry of entries) {
      const { section, redirects: see, redirect } = this.section(entry);
      if (redirect) {
        redirects.push(...see);
        continue;
      }
      if (!section.senses && !section.grammar) continue;
      const head = btLemma(entry.headword);
      let group = byHead.get(head);
      // A supplement entry belongs with the main entry printed the same (or, failing that, the first).
      if (!group && entry.supplement) group = [...byHead.values()][0];
      if (!group) byHead.set(head, group = { head, sections: [] });
      group.sections.push(section);
    }
    if (!byHead.size) {
      if (depth >= 3) return undefined;
      for (const id of redirects) {
        const target = this.keyOf.get(id);
        const next = target && target !== key ? this.article(target, depth + 1) : undefined;
        if (next) return { ...next, via: next.via ?? next.articles[0]?.head };
      }
      return undefined;
    }
    const articles: Article[] = [...byHead.values()].map(({ head, sections }) => {
      // Entries with no part of speech (the supplement's) open with whichever entry opens.
      const classed = [...new Set(sections.flatMap((section) => section.classes ?? []))];
      for (const section of sections) if (!section.classes && classed.length) section.classes = classed;
      return { head, sections };
    });
    const glosses = articles.flatMap((article) => article.sections)
      .map((section) => ({ classes: section.classes ?? [], gloss: section.senses?.map(shortGloss).find(Boolean) ?? "" }))
      .filter((entry) => entry.gloss);
    return { articles, glosses };
  }

  /** The lexicon gloss for a word class: that of the first section that describes the class, else the first. */
  gloss(key: string, upos: string): string {
    const glosses = this.article(key)?.glosses ?? [];
    return (glosses.find((entry) => entry.classes.includes(upos)) ?? glosses[0])?.gloss ?? "";
  }
}
