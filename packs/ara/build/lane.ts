// Lane's Arabic–English Lexicon (1863–93) in the Perseus Digital Library's TEI, as amended by the Lane's Lexicon project
// (laneslexicon/lexicon_xml): one file per letter (x0.xml the main volumes, x1.xml the Supplement of the posthumous
// volume), each root a <div2 type="root" n="ktb"> holding its entries, an <entryFree> per verb form and per noun.
//
// What the files hold, and what this parser does about it:
//   - Arabic is in Perseus's Buckwalter transliteration inside <foreign lang="ar"> and <orth lang="ar">
//     (build/buckwalter.ts converts it); a span the converter refuses (the source has typing errors) is shown in its
//     transliteration, marked, and counted in `unconverted`.
//   - An entry's first <orth> in its first <form> is the headword; the <orth>s after it are unvocalized spellings for
//     searching (and "*", a placeholder), which the reader does not show. <itype> is the verb form (1–13, or Q. 1,
//     R. Q. 1 and Q. Q. 1 for the quadriliteral classes).
//   - The running text marks its numbered paragraphs "-A2-" and the senses run in after a dash "― -b2-". A paragraph
//     becomes a section of the Article and a sense a Sense.
//   - Root labels are Buckwalter letters with the printed oddities: two-letter keys for geminate roots (sb for sbb),
//     "$Sw and $SY" for the two roots a verb is filed under, "Quasi $dqm" for a quasi-quadriliteral, and ", &c." after
//     roots the lexicon does not treat in full. Entries are indexed under every root their label names.
//   - Entries are filed by root, but a root label can be mistyped (dbr filed under dbx); the headword index finds an
//     entry by its form wherever it is filed.
//
// An article can run to 100 KB (the particle bi- has 30 KB in its first sense), which no word panel should fetch: an
// article is cut to about `limit` characters after a whole sense, and a last sense says how many were left out, as the
// Homer Reader does with the LSJ; a single sense longer than the limit is cut at its last clause end.
import { readdir } from "node:fs/promises";
import { DOMParser, type Element, type Node } from "@xmldom/xmldom";
import type { Article, ArticleSection, Sense } from "../../../src/lib/dict";
import { LANE_AVAILABILITY, LANE_CREDIT } from "../dictionaries";
import { checkBuckwalter, tryToArabic } from "./buckwalter";
import { firstWord, skeleton, spellings, verbStems, vocalKey, withoutArticle } from "./keys";

/** The number of <entryFree> elements in the files at the pinned commit. */
const ENTRIES = 48_103;

export interface LaneEntry {
  file: string;
  /** From the Supplement (x1.xml), which adds to the main volumes' entry for the same root. */
  supplement: boolean;
  /** The root keys of its <div2> label. */
  roots: readonly string[];
  /** The <entryFree> element as written. */
  xml: string;
  /** Headword in Arabic script, or "" when the entry has none. */
  head: string;
  /** Verb form as printed: "1" … "13", "Q. 1", "R. Q. 1", "Q. Q. 1", or "alphabetical letter". */
  itype: string;
}

const attribute = (tag: string, name: string): string => new RegExp(`\\b${name}="([^"]*)"`, "u").exec(tag)?.[1] ?? "";

const unescapeXml = (text: string): string =>
  text.replace(/&#x([0-9A-Fa-f]+);/gu, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/gu, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&lt;/gu, "<").replace(/&gt;/gu, ">").replace(/&amp;/gu, "&");

/** Words that stand between the roots of a <div2> label. */
const LABEL_WORDS = new Set(["and", "or", "accord", "to", "some", "Quasi", "c"]);

/**
 * The roots a <div2> label stands for: "$Sw and $SY" is two, "ktb, &c." and "Quasi $dqm" one, "tqY: or, accord. to some, tqw"
 * two, "kzm kwn kwY" three. The label is hand-keyed: a root may carry a colon or a parenthesis ("HY:", "(dmw", "dmY)").
 */
export function rootsOf(label: string): string[] {
  const tokens = unescapeXml(label).replace(/&c\./gu, " ").replace(/[:()]/gu, " ").split(/[\s,]+/u)
    .map((token) => token.replace(/\.$/u, "")).filter((token) => token && !LABEL_WORDS.has(token));
  return [...new Set(tokens)];
}

const VERB = /^(?:\d+|(?:R\. ?Q\.|Q\. ?Q\.|Q\.) ?\d+)$/u;

/**
 * A headword that is a noun's: it ends in a tanwin (تَبْلِيغٌ) or, vocalized, begins with the article (الاِضْطِبَاعُ). Lane files the
 * verbal noun and the participles of a derived form under the verb's form, so that <itype> 2 stands on تَبْلِيغٌ; a verb's headword
 * has neither (an unvocalized verb's "ال" is its alef and lām, التقى, and a vocalized one's lām has a sukun).
 */
const nounHead = (word: string): boolean =>
  /[\u064B-\u064D]\u0627?$/u.test(word) || (/^ال(?=\p{L})/u.test(word) && /[\u064B-\u0650]/u.test(word.slice(0, -1)));

/** An entry on a verb (its <itype> is the verb form, and its headword a verb's) as against one on a noun, a particle or a letter. */
export const isVerb = (entry: LaneEntry): boolean => VERB.test(entry.itype) && !nounHead(firstWord(entry.head));

/** An entry with a headword in Arabic script; the stubs ("see 6.") have none, and a few headwords are too garbled to convert. */
export const hasArabicHead = (entry: LaneEntry): boolean => /\p{Script=Arabic}/u.test(entry.head);

/** Arabic for a headword; a headword the converter refuses stays as written (it only names the entry). */
const headOf = (raw: string): string => tryToArabic(raw) ?? raw;

// ---------------------------------------------------------------------------------------------------------------
// Roots

const HAMZA = ["A", "A^", "A'", "'"];
/** The letters of a root label that a radical (an Arabic letter, or CAMeL's # for a weak or hamza radical) can be. */
const RADICAL: Readonly<Record<string, readonly string[]>> = {
  ب: ["b"], ت: ["t"], ث: ["v"], ج: ["j"], ح: ["H"], خ: ["x"], د: ["d"], ذ: ["*"], ر: ["r"], ز: ["z"], س: ["s"], ش: ["$"],
  ص: ["S"], ض: ["D"], ط: ["T"], ظ: ["Z"], ع: ["E"], غ: ["g"], ف: ["f"], ق: ["q"], ك: ["k"], ل: ["l"], م: ["m"], ن: ["n"],
  ه: ["h"], و: ["w"], ي: ["y", "Y"], ى: ["Y", "y"],
  ء: HAMZA, أ: HAMZA, إ: HAMZA, ؤ: HAMZA, ئ: HAMZA, آ: HAMZA, ا: HAMZA, ٱ: HAMZA,
  "#": ["w", "y", "Y", ...HAMZA],
};

/** The Arabic letter of a root label's letter. */
const LETTER: Readonly<Record<string, string>> = Object.fromEntries([
  ...Object.entries(RADICAL).filter(([arabic]) => arabic !== "#").flatMap(([arabic, labels]) => labels.map((label) => [label, arabic] as const)),
  ...HAMZA.map((label) => [label, "ء"] as const),
  ["Y", "ي"], ["y", "ي"],
]);

/** A root as Lane files it: its label's letters in order, and the key they make (geminate roots lose the repeated letter). */
export interface RootCandidate {
  letters: string[];
  key: string;
}

/** Every way a CAMeL root (radicals, # for the unresolved ones) can be spelt as a Lane root label. */
export function rootCandidates(radicals: readonly string[]): RootCandidate[] {
  let all: string[][] = [[]];
  for (const radical of radicals) {
    const options = RADICAL[radical];
    if (!options) return [];
    all = all.flatMap((prefix) => options.map((option) => [...prefix, option]));
  }
  return all.flatMap((letters) => {
    const key = letters.join("");
    // Geminate roots are filed under two letters: sbb under sb.
    return letters.length === 3 && letters[1] === letters[2]
      ? [{ letters, key }, { letters, key: letters.slice(0, 2).join("") }]
      : [{ letters, key }];
  });
}

/** A root label's letters as radicals, e.g. ["k", "t", "b"] → ك.ت.ب. */
export const radicalsOf = (letters: readonly string[]): string => letters.map((letter) => LETTER[letter] ?? "؟").join(".");

/** The letters of a root label ("A^rx" → A^, r, x). */
export const lettersOf = (label: string): string[] => label.match(/A\^|A'|[A-Za-z$*']/gu) ?? [];

// ---------------------------------------------------------------------------------------------------------------
// The files

export interface LaneFiles {
  entries: LaneEntry[];
  /** Entries per root key, the main volumes' first. */
  byRoot: Map<string, LaneEntry[]>;
}

/** Reads every file of Lane's XML in `dir`; throws if a file lacks the credit or the availability statement, or if entries are missing. */
export async function readLane(dir: string): Promise<LaneFiles> {
  checkBuckwalter();
  const names = (await readdir(dir)).filter((name) => name.endsWith(".xml"));
  // The main volumes (x0.xml) come before the Supplement (x1.xml) of the same root.
  names.sort((a, b) => Number(/(\d)\.xml$/u.exec(a)![1]) - Number(/(\d)\.xml$/u.exec(b)![1]) || a.localeCompare(b));
  if (names.length !== 36) throw new Error(`Lane: ${names.length} XML files in ${dir}, expected 36`);
  const entries: LaneEntry[] = [];
  const byRoot = new Map<string, LaneEntry[]>();
  for (const name of names) {
    const xml = await Bun.file(`${dir}/${name}`).text();
    // The statement's words, as they read once the markup between them is gone.
    const header = xml.slice(0, xml.indexOf("</teiHeader>")).replace(/<[^>]+>/gu, "").replace(/\s+/gu, " ");
    for (const required of LANE_AVAILABILITY) {
      if (!header.includes(required)) throw new Error(`Lane ${name}: the file lacks the Perseus statement "${required}"`);
    }
    const supplement = /1\.xml$/u.test(name);
    for (const [, attrs, inner] of xml.matchAll(/<div2\b([^>]*)>([^]*?)<\/div2>/gu)) {
      const roots = rootsOf(attribute(attrs!, "n"));
      for (const [, , element] of inner!.matchAll(/<entryFree\b([^>]*)>([^]*?<\/entryFree>)/gu)) {
        // Verbs and nouns have a plain <form>, quadriliteral verbs one typed "Q"; <form n="infl"> gives an inflection in the text.
        const form = /<form(?![^>]*\bn="infl")[^>]*>\s*(?:<itype>([^<]*)<\/itype>\s*)?(?:<orth\b[^>]*>([^<]*)<\/orth>)?/u.exec(element!);
        const entry: LaneEntry = {
          file: name,
          supplement,
          roots,
          xml: `<entryFree>${element}`,
          head: form?.[2] ? headOf(unescapeXml(form[2])) : "",
          itype: unescapeXml(form?.[1] ?? ""),
        };
        entries.push(entry);
        for (const root of roots) {
          const list = byRoot.get(root);
          if (list) list.push(entry);
          else byRoot.set(root, [entry]);
        }
      }
    }
  }
  if (entries.length !== ENTRIES) throw new Error(`Lane: ${entries.length} entries, expected ${ENTRIES}`);
  return { entries, byRoot };
}

// ---------------------------------------------------------------------------------------------------------------
// Articles

const parser = new DOMParser({
  onError: (level, message) => {
    if (level !== "warning") throw new Error(`Lane XML: ${message}`);
  },
});

const children = (node: Node): Node[] => Array.from(node.childNodes as unknown as ArrayLike<Node>);
const elements = (node: Node): Element[] => children(node).filter((child): child is Element => child.nodeType === 1);

const esc = (text: string): string => text.replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;");

/** Counts of Arabic spans the converter refused, by their text. */
export type Unconverted = Map<string, number>;

/** An Arabic span; the transliteration of one that cannot be converted (its letters as references, so no abbreviation matches them). */
function arabic(text: string, unconverted: Unconverted): string {
  if (!text.trim()) return esc(text);
  const converted = tryToArabic(text);
  if (converted !== undefined) return `<span lang="ar">${esc(converted)}</span>`;
  unconverted.set(text, (unconverted.get(text) ?? 0) + 1);
  const raw = esc(text).replace(/[A-Za-z]/gu, (letter) => `&#${letter.charCodeAt(0)};`);
  return `<span class="lane-raw" title="Perseus transliteration, which has a typing error and cannot be converted to Arabic script">${raw}</span>`;
}

/** Elements the entries use; any other is a surprise. */
const KNOWN_ELEMENTS: Readonly<Record<string, true>> = {
  form: true, itype: true, orth: true, foreign: true, hi: true, quote: true, L: true, pb: true, note: true, G: true, H: true,
  lb: true, Table: true, row: true, cell: true,
};

function render(node: Node, unconverted: Unconverted, skip: Element | undefined): string {
  if (node.nodeType === 3) return esc((node.nodeValue ?? "").replace(/\s+/gu, " "));
  if (node.nodeType !== 1) return "";
  const el = node as Element;
  const name = el.localName ?? "";
  if (!Object.hasOwn(KNOWN_ELEMENTS, name)) throw new Error(`Lane: unexpected element <${name}>`);
  if (el === skip || name === "pb" || name === "note") return "";
  if (name === "lb") return " ";
  const lang = el.getAttribute("lang");
  const text = () => children(el).map((child) => render(child, unconverted, skip)).join("");
  if (name === "foreign" || name === "orth") {
    const content = el.textContent ?? "";
    if (lang === "gr") return `<span lang="grc">${esc(content)}</span>`;
    if (lang === "he") return `<span lang="he">${esc(content)}</span>`;
    return arabic(content, unconverted);
  }
  if (name === "hi") return `<i>${text()}</i>`;
  if (name === "quote") {
    const lines = elements(el).filter((line) => line.localName === "L");
    return lines.length ? ` ${lines.map((line) => render(line, unconverted, skip).trim()).join(" / ")} ` : text();
  }
  if (name === "Table") {
    return elements(el).map((row) => elements(row).map((cell) => render(cell, unconverted, skip).trim()).join(" – ")).join("; ");
  }
  return text();
}

/** Whitespace and the spaces before punctuation tidied. */
const tidy = (html: string): string =>
  html.replace(/\s+/gu, " ").replace(/\s+([,;:.)\]])/gu, "$1").replace(/([([])\s+/gu, "$1").trim();

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII"];

/** The verb form as grammars name it ("form II"), or the class of a quadriliteral. */
function formLabel(itype: string): string {
  if (!itype || itype === "alphabetical letter") return itype ? "letter of the alphabet" : "";
  const quadriliteral = /^(R\. ?Q\.|Q\. ?Q\.|Q\.) ?(\d+)$/u.exec(itype);
  if (quadriliteral) {
    const kinds: Readonly<Record<string, string>> = { "R.Q.": "reduplicative quadriliteral", "Q.Q.": "quasi-quadriliteral", "Q.": "quadriliteral" };
    const kind = kinds[quadriliteral[1]!.replace(/\s/gu, "")];
    if (!kind) throw new Error(`Lane: unknown verb class ${itype}`);
    return `${kind}, form ${quadriliteral[2]}`;
  }
  const form = ROMAN[Number(itype)];
  if (!form) throw new Error(`Lane: unknown verb form ${itype}`);
  return `form ${form}`;
}

/**
 * The text up to the last top-level sentence or clause end ("; ", or ". " and ": " before a capital, Arabic or a bracket;
 * not the periods of "inf. n.") within `max` characters, then an ellipsis. Cut points lie outside every tag, so the cut
 * text has balanced tags.
 */
export function cutHtml(html: string, max: number): string {
  if (html.length <= max) return html;
  let depth = 0;
  let best = -1;
  for (const token of html.matchAll(/<\/?[A-Za-z][^>]*>|[^<]+/gu)) {
    const text = token[0];
    if (text.startsWith("</")) depth--;
    else if (text.startsWith("<")) depth += text.endsWith("/>") ? 0 : 1;
    else if (depth === 0) {
      for (const boundary of text.matchAll(/;\s|[.:]\s(?=[A-Z([↓]|&#|$)/gu)) {
        const at = token.index + boundary.index + 1;
        if (at > max && best >= 0) return `${html.slice(0, best).trimEnd()} …`;
        best = at;
      }
    }
  }
  return best >= 0 ? `${html.slice(0, best).trimEnd()} …` : html;
}

export interface LaneOptions {
  /** About this many characters of HTML per article (see the header). */
  limit: number;
}

/** The first italic phrase of an article, cut to a short gloss for the lexicon list. */
export function glossOf(article: Article): string {
  const html = article.sections.flatMap((section) => section.senses ?? []).map((sense) => sense.gloss).join(" ");
  const first = /<i>([^]*?)<\/i>/u.exec(html)?.[1] ?? "";
  const text = first.replace(/<[^>]+>/gu, "").replace(/&amp;/gu, "&").replace(/&lt;/gu, "<").replace(/&gt;/gu, ">").trim();
  const clause = /^[^;:(]+/u.exec(text)?.[0].replace(/[\s,.]+$/u, "") ?? "";
  return clause.length <= 70 ? clause : `${clause.slice(0, 70).trimEnd()}…`;
}

/** An entry as an Article, cut to `options.limit` characters; `cut` counts the senses left out. */
export function articleOf(entry: LaneEntry, options: LaneOptions, unconverted: Unconverted): { article: Article; cut: number } {
  const root = parser.parseFromString(`<r>${entry.xml}</r>`, "text/xml").documentElement!;
  const element = elements(root)[0]!;
  const parts = children(element);
  const headForm = parts.find((child): child is Element => child.nodeType === 1 && (child as Element).localName === "form"
    && !(child as Element).getAttribute("n"));
  // After the headword, an orth that follows text in the same <form> is part of the headword phrase ("… and bihi").
  let phrase = "";
  if (headForm) {
    const kids = children(headForm);
    let seenOrth = false;
    let text = false;
    for (const kid of kids) {
      if (kid.nodeType === 1 && (kid as Element).localName === "orth") {
        if (seenOrth && text && (kid.textContent ?? "").trim() !== "*") phrase += render(kid, unconverted, undefined);
        seenOrth = true;
      } else if (seenOrth && kid.nodeType === 3 && (kid.nodeValue ?? "").trim()) {
        text = true;
        phrase += esc(kid.nodeValue!.replace(/\s+/gu, " "));
      }
    }
  }
  const body = tidy(`${phrase} ${parts.map((child) => render(child, unconverted, headForm)).join("")}`);

  // Paragraphs "-A2-" and, inside them, the senses run in after a dash "― -b2-".
  const pieces = body.split(/\s*(?:―\s*)?-([Ab])(\d+)-\s*/gu);
  const paragraphs: { n: number; senses: { n: number; html: string }[] }[] = [{ n: 1, senses: [{ n: 1, html: pieces[0]! }] }];
  for (let i = 1; i < pieces.length; i += 3) {
    const html = pieces[i + 2]!;
    if (pieces[i] === "A") paragraphs.push({ n: Number(pieces[i + 1]), senses: [{ n: 1, html }] });
    else paragraphs.at(-1)!.senses.push({ n: Number(pieces[i + 1]), html });
  }
  const clean = (html: string): string => html.replace(/^[\s,;:―]+/u, "").replace(/[\s―]+$/u, "");
  const sections: ArticleSection[] = [];
  for (const paragraph of paragraphs) {
    const senses: Sense[] = paragraph.senses.filter((sense) => clean(sense.html)).map((sense) => ({
      ...(paragraph.senses.length > 1 ? { marker: `${sense.n}.` } : {}),
      gloss: clean(sense.html),
    }));
    if (senses.length) {
      sections.push({
        ...(paragraphs.length > 1 ? { label: `<strong>${paragraph.n}.</strong> ` } : {}),
        senses,
      });
    }
  }
  if (!sections.length) sections.push({ senses: [{ gloss: "" }] });
  const label = formLabel(entry.itype);
  const first = sections[0]!;
  sections[0] = {
    ...first,
    label: `${entry.supplement ? "<i>Supplement</i> " : ""}${first.label ?? ""}`,
    ...(label ? { grammar: `<i>${label}</i>` } : {}),
  };
  if (!sections[0].label) delete sections[0].label;

  const where = `Lane, ${entry.head || "this entry"}`;
  return abridge({ head: entry.head, sections }, options.limit, where);
}

/** An article cut after the sense that reaches `limit` characters (the first sense always stays, cut at a clause end when it alone is longer). */
function abridge(article: Article, limit: number, where: string): { article: Article; cut: number } {
  let used = 0;
  let cut = 0;
  let stopped = false;
  const sections: ArticleSection[] = [];
  for (const section of article.sections) {
    const senses: Sense[] = [];
    for (const sense of section.senses ?? []) {
      if (stopped) {
        cut++;
        continue;
      }
      const gloss = sections.length === 0 && senses.length === 0 ? cutHtml(sense.gloss, limit) : sense.gloss;
      if (used > 0 && used + gloss.length > limit) {
        stopped = true;
        cut++;
        continue;
      }
      used += gloss.length;
      senses.push({ ...sense, gloss });
    }
    if (senses.length) sections.push({ ...section, senses });
  }
  if (cut) {
    const last = sections.at(-1)!;
    last.senses = [...last.senses!, { gloss: `… ${cut} more ${cut === 1 ? "sense is" : "senses are"} not shown here: ${esc(where)}.` }];
  }
  return { article: { ...article, sections }, cut };
}

// ---------------------------------------------------------------------------------------------------------------
// Lookup

/** Entries by the vocal key and by the skeleton of a form of their headword (build/keys.ts). */
export interface HeadwordIndex {
  byVocal: Map<string, LaneEntry[]>;
  bySkeleton: Map<string, LaneEntry[]>;
}

/**
 * `byVocal` and `bySkeleton` hold every entry under its headword (its first word) in the spellings it can have and, for a noun,
 * under the headword without its article. The entries of a headword's own form come before those of the others in a list.
 */
export interface LaneIndex extends HeadwordIndex {
  /**
   * The verb entries again, under the forms of their one-word headword that name the verb: without the object, the person or the
   * ending Lane's example puts on it (كَتَبَهُ, أَنْزَلَتْ, اصطفّوا). Another word can be spelt like such a form, so a noun's lookup leaves these out.
   */
  verbs: HeadwordIndex;
  /**
   * The verb entries whose headword is a phrase ("He sat in the sun": the verb with its complement), under its first word and the
   * forms of it that name the verb. That word is not always a verb (هَذَا يُمْرِئُ …, لَمْ يَتَّجِهْ …), so a lookup that is not
   * for a verb, or that ignores roots, leaves these out.
   */
  phrases: HeadwordIndex;
}

/**
 * The forms of a headword by which an entry is found: its first word, then the forms that name the same word (a noun's without
 * its article, as Lane files الشَّمْسُ, and a verb's without its object, person or ending).
 */
export function headForms(entry: LaneEntry): string[] {
  const word = firstWord(entry.head);
  if (isVerb(entry)) return [word, ...verbStems(word)];
  const bare = withoutArticle(word);
  return bare === undefined ? [word] : [word, bare];
}

export function indexHeadwords(entries: readonly LaneEntry[]): LaneIndex {
  const empty = (): HeadwordIndex => ({ byVocal: new Map(), bySkeleton: new Map() });
  const index = { ...empty(), verbs: empty(), phrases: empty() };
  const add = (map: Map<string, LaneEntry[]>, key: string, entry: LaneEntry) => {
    const list = map.get(key);
    if (!list) map.set(key, [entry]);
    else if (!list.includes(entry)) list.push(entry);
  };
  const addForms = (target: HeadwordIndex, forms: readonly string[], entry: LaneEntry) => {
    for (const spelling of forms.flatMap(spellings)) {
      add(target.byVocal, vocalKey(spelling), entry);
      add(target.bySkeleton, skeleton(spelling), entry);
    }
  };
  const others: [HeadwordIndex, string[], LaneEntry][] = [];
  for (const entry of entries) {
    if (!entry.head || !/\p{Script=Arabic}/u.test(entry.head)) continue;
    const verb = isVerb(entry);
    // A noun phrase is filed under its first word by Lane, but it is not that word's entry; a verb's is the verb's, with its complement.
    if (/\s/u.test(entry.head.trim())) {
      if (verb) others.push([index.phrases, headForms(entry), entry]);
      continue;
    }
    const [word, ...rest] = headForms(entry);
    addForms(index, [word!], entry);
    others.push([verb ? index.verbs : index, rest, entry]);
  }
  for (const [target, forms, entry] of others) addForms(target, forms, entry);
  return index;
}
