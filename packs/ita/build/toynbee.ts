// Reads Paget Toynbee's Concise Dictionary of Proper Names and Notable Matters in the Works of Dante (Oxford, 1914;
// public domain) from the Internet Archive's OCR of the first copy (concisedictionar00toynrich). The OCR keeps the
// printed page: running heads, page numbers and printer's marks sit between the entries and inside them, hyphens
// break words at line ends, and the superscript line numbers that follow references to the prose works come out as
// punctuation. This file removes that and nothing else; it does not rewrite the dictionary.
//
// Furniture. A page opens with a running head, the first and last headword of the page with the page number between
// them, each alone on a line. The pieces are removed when they are such lines, and each piece that names a headword
// must be a headword the entry scan finds close by, so that a missed entry shows up as a running head with no entry.
//
// Entries. A line starts an entry when it reads Headword, then a comma, a bracket or a full stop and a bracket (a bare
// cross-reference), and when the headwords of the starts so chosen stay in alphabetical order. A longest ordered
// subset of the candidate lines is taken, each weighted by how sure its start is; a candidate left out is a line
// that opens a paragraph with a name (Cacciaguida (in the Heaven of Mars) ...), and the paragraph stays with the
// entry it is in. The dictionary files "Pier da Medicina" after "Pier Traversaro", so the order is by word with
// capitals first, which the key below reproduces.
//
// Citations. The Commedia is cited as Inf. xxviii. 136-8, Purg. xii. 49-51, Par. xvi. 112-14, in lists that give the
// canto once or the cantica once, and as v. or vv. for lines of the canto last cited. They are rewritten as the
// reader writes them (Inf. 28.136–8) with the cantica given every time, so that each can be found by a pattern. A
// number whose digits the OCR confused is read through a table of the confusions and checked against the poem: the
// canto must exist and the line must be in it; a line (or a neighbour) with a word of the headword confirms it.
// References to the prose works keep what the OCR gives, without the superscript line numbers, which it loses.
//
// The tables FIXES and NOT_START are the OCR strings the rules above do not explain. The build throws on a table
// entry that nothing uses, and on a running head that no entry explains.

export type Cantica = "inferno" | "purgatorio" | "paradiso";

/** The poem the citations are checked against: for each cantica, for each canto, the text of each line. */
export type Commedia = Readonly<Record<Cantica, readonly (readonly string[])[]>>;

export interface ToynbeeEntry {
  /** Headword as printed, e.g. "Almeone", with a given name where Toynbee files the person under the family ("Accorso, Francesco d'"). */
  head: string;
  /** Homograph number when the headword is numbered (Alpe 1, Alpe 2). */
  n?: number;
  /**
   * The entry after the headword, one <p> per printed paragraph: hyphenation joined, furniture removed, text escaped
   * (&, <, >), no markup but the paragraphs. Citations of the Commedia read "Inf. 5.116", "Purg. 12.49–51",
   * "Par. 16.112–14"; those that are not lines of the poem stay as printed. Cross-references stay in square
   * brackets: "[Forese.]".
   */
  html: string;
  /** Every Commedia citation in the entry that is a line of the poem, as [cantica, canto, first line]. */
  cites: [Cantica, number, number][];
  /** For an entry that is only a cross-reference ("Adam. [Adamo.]"): the headwords it sends the reader to. */
  see?: string[];
}

export interface ToynbeeStats {
  entries: number;
  /** Entries that are only a cross-reference. */
  stubs: number;
  /** Candidate lines the ordered scan did not take as entries. */
  continuations: number;
  /** Running-head pieces and page marks removed. */
  furniture: number;
  /** Commedia references read: all, with no digit repaired, with a digit repaired, with a word of the headword in the line, not lines of the poem; and the v. / vv. forms. */
  cites: { read: number; clean: number; repaired: number; confirmed: number; dropped: number; verses: number; versesDropped: number };
}

const CANTICA: Readonly<Record<string, Cantica>> = { Inf: "inferno", Tnf: "inferno", Purg: "purgatorio", Pnrg: "purgatorio", Par: "paradiso" };
const CANTICA_NAME: Readonly<Record<Cantica, string>> = { inferno: "Inf.", purgatorio: "Purg.", paradiso: "Par." };

/**
 * Strings of the OCR corrected before anything is read, each within one line: the printed text on the right. The OCR
 * damage here is to a headword (the entry would be lost or misfiled) or to a citation no rule can read.
 */
export const FIXES: readonly (readonly [string, string])[] = [
  // headwords misread
  ["Atorismi, Aphorisms", "Aforismi, Aphorisms"],
  ["Agdbito, Agapetus", "Agabito, Agapetus"],
  ["All, Ali ibn", "Ali, Ali ibn"],
  ["Area, Deir, ancient", "Arca, Dell', ancient"],
  ["Amo, principal river", "Arno, principal river"],
  ["Eglogtie'^\\ Latin", "Egloghe, Latin"],
  ["Gennaioi January", "Gennaio, January"],
  ["Hehraeosy Epistola ad,", "Hebraeos, Epistola ad,"],
  ["TbebaidoSf Thebaid", "Thebaidos, Thebaid"],
  ["Torquato S Titus", "Torquato 1, Titus"],
  ["Torquato ^4 Lucius", "Torquato 2, Lucius"],
  ["Pape Satan . . . [Pluto.]", "Pape Satan. [Pluto.]"],
  ["Carlo^Charles, Count of Alen^on", "Carlo 4, Charles, Count of Alençon"],
  ["Federicoi, Emperor Frederick I,", "Federico 1, Emperor Frederick I,"],
  ["MantOj daughter of Tiresias", "Manto, daughter of Tiresias"],
  ["JosaflF^t, valley of Jehoshaphat", "Josafat, valley of Jehoshaphat"],
  ["Giosaflfkt. [JosafiRit.]", "Giosafat. [Josafat.]"],
  ["Brunette Latini, Florentine", "Brunetto Latini, Florentine"],
  ["Ifig6nia, Iphigenia", "Ifigenia, Iphigenia"],
  ["Illuminate, Illuminato", "Illuminato, Illuminato"],
  ["Cupfdo, Cupid", "Cupido, Cupid"],
  ["Esaii, Esau", "Esaù, Esau"],
  ["Camicion de* Fazzi, Alberto", "Camicion de' Pazzi, Alberto"],
  ["Gianni de* Soldanier, Floren-", "Gianni de' Soldanier, Floren-"],
  ["Belzebii, Beelzebub", "Belzebù, Beelzebub"],
  ["Langfa, name of a fountain", "Langia, name of a fountain"],
  ["Malacodaj ' Evil-tail'", "Malacoda, 'Evil-tail'"],
  ["RamondoBerlinghieri. [Ber-", "Ramondo Berlinghieri. [Ber-"],
  ["RamondodiTolosa. [Tolosa.]", "Ramondo di Tolosa. [Tolosa.]"],
  ["BisenziO; stream in Tuscany", "Bisenzio, stream in Tuscany"],
  ["Arnaldo Danielle], Arnaut", "Arnaldo Daniello, Arnaut"],
  ["Ete6cle,Eteocles,", "Eteocle, Eteocles,"],
  ["I Cervia, small town", "Cervia, small town"],
  ["PoUuce, Pollux,", "Polluce, Pollux,"],
  ["Sett a, Ceuta,", "Setta, Ceuta,"],
  ["• Torso, Tours,", "Torso, Tours,"],
  ["Alpe-^,Alps,", "Alpe 1, Alps,"],
  ["Jacomo da sant* Andrea,", "Jacomo da sant' Andrea,"],
];

/** Lines that look like a running head and are the text of a table (the angelic hierarchies, under Gerarchia). */
export const TEXT_LINES: readonly string[] = ["Dionysius St. Gregory St. Gregory"];

/** Running heads of a page whose entry the OCR lost: page 142 of the book, unreadable from the Cicero entry on. */
export const LOST_HEADS: readonly string[] = ["CidHa"];

/** Lines that open a paragraph the way an entry does, and are not entries, though the order would admit them. */
export const NOT_START: readonly string[] = [
  "Guido Guerra IV, otherwise known",
  "Guido Guerra IV, married (c.",
];

// --- the page ---------------------------------------------------------------------------------------------------

const PARTICLES = "di|da|de|del|della|dello|dell'|d'|dal|dalla|dei|degli|delle|il|la|le|lo|San|Santa|Sant'|St\\.|De|Di|Del|Della|Dell'|Il|La";
const particle = new RegExp(`^(?:${PARTICLES})$`, "u");
const capital = /^\p{Lu}[\p{L}'’-]*$/u;
/** Characters that surround a running head without belonging to it: digits, brackets, marks. */
const EDGE = /^[\d\s^*|<>()'":;‘’“”«»■=%~_{}-]+|[\d\s^*|<>()'":;‘’“”«»■=%~_{}-]+$/gu;

/** A work cited by its abbreviation, alone on a line because the OCR set its superscripts loose. */
const WORK = /^(?:Conv|Mon|Epist|Acts|Inf|Purg|Par|Con|Coi|Eel|Ecl|Canz)$/u;

/** The headword a line shows when it is only a running-head piece: "Aegyptius i" -> "Aegyptius"; else undefined. */
function runningHead(line: string): string | undefined {
  if (/\p{L}-$/u.test(line)) return undefined;
  const core = line.replace(EDGE, "").replace(/(?: \p{Ll}{1,2})+$/u, "");
  if (core.length < 2 || core.length > 40 || /[.,[\]()]$/u.test(core) || /[[\]()]/u.test(core) || WORK.test(core)) return undefined;
  for (const word of core.split(" ")) {
    const bare = word.replace(/,$/u, "");
    if (!(capital.test(bare) || particle.test(bare))) return undefined;
  }
  return core;
}

/** A page number as the OCR reads it: a few characters, no word. */
const isPageMark = (line: string): boolean =>
  line.length <= 8 && !/[.,;:\])-]$/u.test(line) && !/^\p{Ll}/u.test(line) && !/\p{L}{3}/u.test(line);

/** Superscript line numbers of a reference to a prose work, set loose from the text by the OCR. */
const isLooseNumber = (line: string): boolean => line.length <= 14 && /\d/u.test(line) && !/\p{L}{2}/u.test(line);

interface Line {
  text: string;
  /** The line opens a block (blank line before). */
  start: boolean;
  /** Furniture was removed between the previous line and this one. */
  gap: boolean;
}

interface Piece {
  /** Index in the line stream of the first line after the piece. */
  at: number;
  head: string;
  /** The block the piece was, to give it back as text when no entry explains it. */
  block: number;
  text: string;
}

function dropFurniture(lines: readonly string[], restore: ReadonlySet<number>): { lines: Line[]; pieces: Piece[]; removed: number } {
  const blocks: string[][] = [];
  let block: string[] = [];
  for (const line of lines) {
    if (line === "") {
      if (block.length) blocks.push(block);
      block = [];
    } else block.push(line);
  }
  if (block.length) blocks.push(block);

  const out: Line[] = [];
  const pieces: Piece[] = [];
  let removed = 0;
  let gap = false;
  blocks.forEach((b, index) => {
    const only = b.length === 1 ? b[0] : undefined;
    const head = only === undefined || TEXT_LINES.includes(only) ? undefined : runningHead(only);
    const furniture = !restore.has(index) && only !== undefined && (head !== undefined || isPageMark(only) || isLooseNumber(only));
    if (furniture) {
      removed++;
      gap = true;
      if (head !== undefined && only !== undefined) pieces.push({ at: out.length, head, block: index, text: only });
      return;
    }
    // "Rocco de' Mozzi." and the bracket that follows it on the next line are one cross-reference
    const joined: string[] = [];
    for (const text of b) {
      const last = joined.at(-1);
      if (last !== undefined && text.startsWith("[") && /^\p{Lu}[\p{L}'’ ,-]{0,58}\.$/u.test(last)) joined[joined.length - 1] = `${last} ${text}`;
      else joined.push(text);
    }
    joined.forEach((text, k) => out.push({ text, start: k === 0, gap: k === 0 && gap }));
    gap = false;
  });
  return { lines: out, pieces, removed };
}

// --- entries ----------------------------------------------------------------------------------------------------

const SMALL = "(?:di|da|de'?|del|della|dello|dell'|d'|dal|dalla|dei|degli|delle|il|la|le|lo|e|sant')";
const WORD = String.raw`(?:\p{Lu}[\p{L}'’-]*|(?:d|dell|all|nell)['’]\p{Lu}[\p{L}'’-]*|${SMALL}(?![\p{L}]))`;
/** A homograph number as the OCR makes it: a digit or a raised one, or I, l, J after a space (Alighiero II). */
const MARK = String.raw`(?:[\s-]?[\d^'*»¹²³|!\\]{1,3}|\s[IlJi]{1,2}(?![\p{L}]))`;
/** Headword, homograph mark, alluded-to bracket, separator (a space only after a mark the OCR made of a raised number). */
const START = new RegExp(
  String.raw`^\[?(?<head>${WORD}(?: ${WORD}){0,5}?)(?<mark>${MARK})?(?<bracket> ?[\]J])?(?<sep>,\s?|\.\s?\[|\s?\(|\s\[|\s?\]\s?,|(?<=[\^*»¹²³|!\\]|(?<!\bd|\bde|\bsant)')\s(?=\p{Lu}))`,
  "u",
);
/** A bare cross-reference: the whole head, commas and all, up to the full stop before the bracket. */
const STUB = new RegExp(String.raw`^(?<head>\p{Lu}[\p{L}'’ ,-]{0,58}?)(?<mark>${MARK})?\s?\.\s?\[(?<xref>.*)$`, "u");
/** After "Head," these open a sentence about the name, not an entry ("Dido, also called Elissa" is an entry). */
const CONTINUES = /^(?:who|whom|whose|which|that|was|is|had|has|were|are|he|she|it|they|his|her|their|when|where|while|after|before|since|but|and|or|also(?! (?:called|known|named|written|spelt|spelled)\b)|then|however|besides)\b/u;
/** A line that ends a paragraph, or a bare cross-reference as the OCR makes its closing bracket. */
const PARAGRAPH_END = /[.!?\]'"^*)»]$/u;
const STUB_END = /\.\s?\[.*[\]lJ.}\\)]\s?$/u;
/** A name's second part when Toynbee files by family: "Benedetto, San", "Brigata, Il", "Anima, De". */
const POSTPOSED = /^(?:San|Santa|Sant'|Il|II|La|Lo|Le|De|Di|Del|Della|Dell'|Dei|Degli|Delle)$/u;
const TRAILING_SMALL = new RegExp(`^${SMALL}$`, "u");
const GIVEN = new RegExp(String.raw`^(?<given>${WORD}(?: ${WORD}){0,3})(?<bracket>\])?,\s?`, "u");
/** The article and preposition after a family name as the OCR makes them: "Toppo, II" for "Toppo, Il", "Pera, Delia". */
const tidyHead = (head: string): string => head.replace(/, II\b/gu, ", Il").replace(/, Delia$/u, ", Della").replace(/, DI$/u, ", Di");

/** The letters of a word, accents off: the key matching uses. */
const letters = (text: string): string => text.normalize("NFD").replace(/[\u0300-\u036f]/gu, "").toLowerCase().replace(/[^a-z]/gu, "");

/**
 * Order of the printed dictionary, as far as it can be held: by the first word of the headword. The rest of a name is
 * not ordered consistently ("Pier Damiano", "Pier Traversaro", "Pier da Medicina" but "Azzo da Esti", "Azzo Marchio").
 */
const orderKey = (head: string): string => letters(head.split(/[\s,]+/u)[0] ?? head);

interface Candidate {
  at: number;
  head: string;
  mark: string;
  bracket: boolean;
  stub: boolean;
  sep: string;
  key: string;
  weight: number;
  /** The line after the head and its separator. */
  rest: string;
}

/** What the cross-references and running heads say is a headword (folded), for the weight of a candidate. */
function evidence(lines: readonly Line[], pieces: readonly Piece[]): Set<string> {
  const seen = new Set<string>();
  const text = lines.map((l) => l.text).join(" ");
  for (const m of text.matchAll(/\[([^\]]{1,80})\]/gu)) {
    for (const item of (m[1] ?? "").split(/[:;]/u)) seen.add(letters(item.replace(/[\s\d^'*.]+$/u, "")));
  }
  for (const p of pieces) seen.add(letters(p.head));
  seen.delete("");
  return seen;
}

function candidates(lines: readonly Line[], known: ReadonlySet<string>): Candidate[] {
  const out: Candidate[] = [];
  lines.forEach((line, at) => {
    const prev = lines[at - 1];
    const stub = STUB.exec(line.text);
    const m = START.exec(line.text);
    const g = m?.groups;
    if (!stub && !(m && g)) return;
    const afterStub = prev !== undefined && STUB_END.test(prev.text);
    // a headword a running head names opens an entry wherever the previous line stopped (Guizzante, after a quoted line)
    const named = line.gap && line.start && g?.head !== undefined && known.has(letters(g.head));
    if (line.gap && prev && !PARAGRAPH_END.test(prev.text) && !afterStub && !named) return;
    if (!stub && !line.start && prev && !PARAGRAPH_END.test(prev.text) && !afterStub) return;
    if (stub?.groups) {
      const head = stub.groups.head ?? "";
      out.push({
        at, head: tidyHead(head.trim()), mark: stub.groups.mark ?? "", bracket: false, stub: true, sep: ". [",
        key: orderKey(head), weight: 4, rest: `[${stub.groups.xref ?? ""}`,
      });
      return;
    }
    if (!m || !g) return;
    let rest = line.text.slice(m[0].length);
    const sep = g.sep ?? "";
    if (sep.startsWith(",") && CONTINUES.test(rest)) return;
    if (/^\s?\(/u.test(sep) && /^in\b/u.test(rest)) return;
    let head = g.head ?? "";
    let weight = 1;
    if (known.has(letters(head))) weight = 4;
    else if (g.mark || g.bracket) weight = 2;
    else if (/^\s?\(/u.test(sep)) return;
    const key = orderKey(head);
    if (sep.startsWith(",")) {
      // Toynbee files a person under the family with the given name after it: "Accorso, Francesco d'"
      const given = GIVEN.exec(rest);
      const name = given?.groups?.given;
      const tail = name?.split(" ").at(-1) ?? "";
      if (given && name && (given.groups?.bracket === "]" || TRAILING_SMALL.test(tail) || POSTPOSED.test(name) || known.has(letters(head + name)))) {
        head = `${head}, ${name}`;
        rest = rest.slice(given[0].length);
      }
    }
    out.push({ at, head: tidyHead(head), mark: g.mark ?? "", bracket: Boolean(g.bracket), stub: false, sep, key, weight, rest });
  });
  return out;
}

/** The ordered subset of the candidates with the greatest weight; equal keys are allowed. */
function ordered(items: readonly Candidate[]): Set<number> {
  const best: number[] = [];
  const from: number[] = [];
  let top = -1;
  items.forEach((item, k) => {
    let base = 0;
    let via = -1;
    for (let j = 0; j < k; j++) {
      const other = items[j];
      if (other !== undefined && (other.key <= item.key || other.key.startsWith(item.key)) && (best[j] ?? 0) > base) {
        base = best[j] ?? 0;
        via = j;
      }
    }
    best[k] = base + item.weight;
    from[k] = via;
    if (top < 0 || (best[k] ?? 0) > (best[top] ?? 0)) top = k;
  });
  const keep = new Set<number>();
  for (let k = top; k >= 0; k = from[k] ?? -1) keep.add(k);
  return keep;
}

/** Edit distance, for comparing a running head with the headword the scan found. */
function distance(a: string, b: string): number {
  let row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) {
      next[j] = Math.min((row[j] ?? 0) + 1, (next[j - 1] ?? 0) + 1, (row[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    row = next;
  }
  return row[b.length] ?? 0;
}

const esc = (text: string): string => text.replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;");

// --- text -------------------------------------------------------------------------------------------------------

/** The words that stand inside a line anywhere in the book, to tell "hiding-place" from "fami-ly" at a line end. */
function wordsInside(lines: readonly Line[]): Set<string> {
  const seen = new Set<string>();
  for (const { text } of lines) {
    const words = text.split(" ").slice(1, -1);
    for (const w of words) seen.add(w.replace(/^[^\p{L}]+|[^\p{L}-]+$/gu, "").toLowerCase());
  }
  return seen;
}

function joinLines(lines: readonly string[], inside: ReadonlySet<string>): string {
  let text = lines[0] ?? "";
  for (const next of lines.slice(1)) {
    if (/\p{L}-$/u.test(text) && /^\p{Ll}/u.test(next)) {
      const left = /(\p{L}+)-$/u.exec(text)?.[1] ?? "";
      const right = /^\p{L}+/u.exec(next)?.[0] ?? "";
      const compound = inside.has(`${left}-${right}`.toLowerCase()) && !inside.has(`${left}${right}`.toLowerCase());
      text = compound ? text + next : text.slice(0, -1) + next;
    } else if (/\d-$/u.test(text) && /^\d/u.test(next)) text += next;
    else text += ` ${next}`;
  }
  return text;
}

/** Digits the OCR spaced apart ("1 3 00", "1 1 2-1 4") are one number; groups of two digits or more are not touched. */
const joinDigits = (text: string): string => text.replace(/(?<![\d])(?:\d ){1,3}\d{1,3}(?!\d)/gu, (run) => run.replace(/ /gu, ""));

// --- citations --------------------------------------------------------------------------------------------------

const ROMAN = /^(?<roman>[IVXLCivxlc|!1]{1,6})(?![\p{L}\d])\s?[.,]\s?['’‘"]?\s?/u;
const NUMBER = /^(?<digits>[0-9OoIil!|S$]{1,3})(?![\p{L}\d])/u;
const DIGIT: Readonly<Record<string, string>> = { O: "0", o: "0", I: "1", i: "1", l: "1", "!": "1", "|": "1", S: "5", $: "5" };
const DASH = /^\s?[-–—−~]+\s?/u;
const SENTINEL = /^\s?(?:fF?|ff)\.?/u;

/** A number of the OCR: its value, whether a letter stood for a digit, and where it ends. */
interface Num {
  text: string;
  value: number;
  repaired: boolean;
  end: number;
}

function readNum(text: string, at: number): Num | undefined {
  const m = NUMBER.exec(text.slice(at));
  const digits = m?.groups?.digits;
  if (!digits) return undefined;
  const hasDigit = /\d/u.test(digits);
  // a line 1 reads as a lone I or l, and only where a list punctuation follows
  const loneOne = /^[Il]$/u.test(digits) && /^\s?(?:[;,.)\]]|$)/u.test(text.slice(at + digits.length));
  if (!hasDigit && digits.length < 3 && !loneOne) return undefined;
  const fixed = [...digits].map((c) => DIGIT[c] ?? c).join("");
  return { text: fixed, value: Number(fixed), repaired: fixed !== digits, end: at + digits.length };
}

function romanValue(roman: string): number | undefined {
  const s = roman.toLowerCase().replace(/[l|!1]/gu, "i");
  if (/[^ivxc]/u.test(s)) return undefined;
  const value: Record<string, number> = { i: 1, v: 5, x: 10, c: 100 };
  let total = 0;
  for (let k = 0; k < s.length; k++) {
    const a = value[s[k] ?? ""] ?? 0;
    const b = value[s[k + 1] ?? ""] ?? 0;
    total += a < b ? -a : a;
  }
  const canonical = total >= 1 && total <= 39 ? toRoman(total) : "";
  return canonical === s ? total : undefined;
}

function toRoman(n: number): string {
  const parts: [number, string][] = [[10, "x"], [9, "ix"], [5, "v"], [4, "iv"], [1, "i"]];
  let out = "";
  let rest = n;
  for (const [v, s] of parts) {
    while (rest >= v) {
      out += s;
      rest -= v;
    }
  }
  return out;
}

/** The last digits of a range written short ("112-14", "130-2") restored to a line number. */
function expand(first: string, last: string): number {
  return last.length < first.length ? Number(first.slice(0, first.length - last.length) + last) : Number(last);
}

interface Ref {
  /** The canto the first line is in, and the line. */
  canto: number;
  first: number;
  /** The end of a range as printed ("14" in 112-14) and its value, and the canto it is in. */
  tail?: string;
  lastLine?: number;
  lastCanto?: number;
  repaired: boolean;
  /** The reference as the OCR printed it, from the canto's numeral. */
  printed: string;
  suffix: string;
}

interface Read {
  /** The reference list as printed and as read: refs with the separator that came before each. */
  items: { sep: string; roman: string; refs: Ref[] }[];
  end: number;
}

function readLineRefs(text: string, from: number, canto: number): { refs: Ref[]; seps: string[]; end: number } | undefined {
  const refs: Ref[] = [];
  const seps: string[] = [];
  let at = from;
  for (;;) {
    const a = readNum(text, at);
    if (!a) break;
    let end = a.end;
    const ref: Ref = { canto, first: a.value, repaired: a.repaired, printed: text.slice(at, end), suffix: "" };
    const dash = DASH.exec(text.slice(end));
    if (dash) {
      const after = end + dash[0].length;
      const b = readNum(text, after);
      const r = ROMAN.exec(text.slice(after));
      const c = r?.groups?.roman ? romanValue(r.groups.roman) : undefined;
      const bAfterRoman = r && c !== undefined ? readNum(text, after + r[0].length) : undefined;
      if (bAfterRoman && c !== undefined && r) {
        ref.lastCanto = c;
        ref.lastLine = bAfterRoman.value;
        ref.repaired ||= bAfterRoman.repaired;
        ref.tail = `${c}.${bAfterRoman.text}`;
        end = bAfterRoman.end;
      } else if (b) {
        ref.tail = b.text;
        ref.lastLine = expand(a.text, b.text);
        ref.repaired ||= b.repaired;
        end = b.end;
      }
    }
    const ff = SENTINEL.exec(text.slice(end));
    if (ff) {
      ref.suffix = ff[0].trim();
      end += ff[0].length;
    }
    ref.printed = text.slice(at, end);
    refs.push(ref);
    const comma = /^,\s?/u.exec(text.slice(end));
    const next = comma ? readNum(text, end + comma[0].length) : undefined;
    if (comma && next && /\d/u.test(text.slice(end + comma[0].length, next.end))) {
      seps.push(comma[0]);
      at = end + comma[0].length;
      continue;
    }
    at = end;
    break;
  }
  return refs.length ? { refs, seps, end: at } : undefined;
}

/** What a citation list reads as: "Inf. xiv. 30; xx. 62" -> cantica, then (canto, lines) groups. */
function readList(text: string, from: number): Read | undefined {
  const items: Read["items"] = [];
  let at = from;
  let sep = "";
  let previous = 0;
  for (;;) {
    const r = ROMAN.exec(text.slice(at));
    const canto = r?.groups?.roman ? romanValue(r.groups.roman) : undefined;
    if (!r || canto === undefined) break;
    const lines = readLineRefs(text, at + r[0].length, canto);
    if (!lines) break;
    // "; v. 78" after a higher canto is verse 78 of that canto, not canto V
    if (items.length && /^v$/iu.test(r.groups?.roman ?? "") && canto < previous) break;
    previous = canto;
    items.push({ sep, roman: r.groups?.roman ?? "", refs: lines.refs });
    at = lines.end;
    const cont = /^\s?;\s?/u.exec(text.slice(at));
    if (!cont) break;
    if (!ROMAN.test(text.slice(at + cont[0].length))) break;
    sep = cont[0].trim() === ";" ? "; " : "; ";
    at += cont[0].length;
  }
  return items.length ? { items, end: at } : undefined;
}

// --- the table of the poem the references are checked against ---------------------------------------------------

function lineOf(poem: Commedia, cantica: Cantica, canto: number, line: number): string | undefined {
  return poem[cantica][canto - 1]?.[line - 1];
}

function sameName(a: string, b: string): boolean {
  const n = Math.min(a.length, b.length);
  if (n < 4) return a === b;
  let k = 0;
  while (k < n && a[k] === b[k]) k++;
  return k >= Math.min(5, n);
}

/** Folded words of a line of the poem. */
const wordsOf = (line: string): string[] => line.split(/[^\p{L}']+/u).map(letters).filter(Boolean);

function confirms(poem: Commedia, cantica: Cantica, canto: number, first: number, last: number, names: readonly string[]): boolean {
  for (let line = first - 1; line <= last + 1; line++) {
    const text = lineOf(poem, cantica, canto, line);
    if (text && wordsOf(text).some((w) => names.some((n) => sameName(w, n)))) return true;
  }
  return false;
}

// --- reading ----------------------------------------------------------------------------------------------------

interface Context {
  poem: Commedia;
  names: string[];
  stats: ToynbeeStats["cites"];
  cites: [Cantica, number, number][];
}

function render(cantica: Cantica, read: Read, ctx: Context): string {
  const out: string[] = [];
  for (const item of read.items) {
    const roman = romanValue(item.roman) ?? 0;
    item.refs.forEach((ref, k) => {
      const sep = k === 0 ? item.sep : ", ";
      const size = ctx.poem[cantica][roman - 1]?.length ?? 0;
      const lastCanto = ref.lastCanto ?? roman;
      const lastSize = ctx.poem[cantica][lastCanto - 1]?.length ?? 0;
      const last = ref.lastLine ?? ref.first;
      const ok = ref.first >= 1 && ref.first <= size && last >= 1 && last <= lastSize && (lastCanto > roman || last >= ref.first);
      ctx.stats.read++;
      if (!ok) {
        ctx.stats.dropped++;
        out.push(`${sep}${k === 0 ? `${item.roman}. ` : ""}${ref.printed}`);
        return;
      }
      ctx.stats[ref.repaired ? "repaired" : "clean"]++;
      if (lastCanto === roman && confirms(ctx.poem, cantica, roman, ref.first, last, ctx.names)) ctx.stats.confirmed++;
      ctx.cites.push([cantica, roman, ref.first]);
      const tail = ref.tail === undefined ? "" : `–${ref.tail}`;
      out.push(`${sep}${CANTICA_NAME[cantica]} ${roman}.${ref.first}${tail}${ref.suffix ? ` ${ref.suffix}` : ""}`);
    });
  }
  return out.join("");
}

/** Rewrites the Commedia citations of a paragraph. */
function readCitations(text: string, ctx: Context): string {
  let out = "";
  let pos = 0;
  for (const m of text.matchAll(/(?<![\p{L}])(Inf|Tnf|Purg|Pnrg|Par)(?![\p{L}])[.,]?\s?/gu)) {
    const at = m.index ?? 0;
    const cantica = CANTICA[m[1] ?? ""];
    if (at < pos || !cantica) continue;
    const read = readList(text, at + m[0].length);
    if (!read) continue;
    out += text.slice(pos, at) + render(cantica, read, ctx);
    pos = read.end;
  }
  return out + text.slice(pos);
}

/** Lines of the canto last cited ("v. 78", "vv. 99-102") written out in full. */
function readVerses(text: string, ctx: Context): string {
  const re = /(?<cite>\b(?:Inf|Purg|Par)\. (?<canto>\d+)\.\d+)|(?<other>\b(?:Conv|Mon|Epist|Eel|Ecl|Canz|Carm|V\. ?[EN]|A\. ?T|Aen|Met|Metam|Matt|Luke|John|Acts|Rev|Heb|Gen|Vill|Ball|Son|Sest)\b)|(?<verse>(?<![\p{L}\d.])(?:vv?|yv)\. ?\d{1,3}(?:[-–—]\d{1,3})?(?:, ?\d{1,3}(?:[-–—]\d{1,3})?)*)/gu;
  let last: { cantica: Cantica; canto: number } | undefined;
  return text.replace(re, (whole, ...rest: unknown[]) => {
    const groups = rest.at(-1) as Record<string, string | undefined>;
    if (groups.cite) {
      const cantica = (Object.entries(CANTICA_NAME).find(([, name]) => whole.startsWith(name))?.[0] ?? "inferno") as Cantica;
      last = { cantica, canto: Number(groups.canto) };
      return whole;
    }
    if (groups.other) {
      last = undefined;
      return whole;
    }
    ctx.stats.verses++;
    if (!last) {
      ctx.stats.versesDropped++;
      return whole;
    }
    const size = ctx.poem[last.cantica][last.canto - 1]?.length ?? 0;
    const items = whole.replace(/^(?:vv?|yv)\. ?/u, "").split(/, ?/u);
    const out: string[] = [];
    for (const item of items) {
      const [a, b] = item.split(/[-–—]/u);
      const first = Number(a);
      const to = b === undefined ? first : expand(a ?? "", b);
      if (!(first >= 1 && to >= first && to <= size)) {
        ctx.stats.versesDropped++;
        return whole;
      }
      ctx.cites.push([last.cantica, last.canto, first]);
      out.push(`${CANTICA_NAME[last.cantica]} ${last.canto}.${first}${b === undefined ? "" : `–${b}`}`);
    }
    return out.join(", ");
  });
}

/** Square brackets as the printer set them: closed, without the raised numbers the OCR cannot read. */
function repairBrackets(text: string): string {
  return text
    .replace(/\[\s+/gu, "[")
    .replace(/\s+\]/gu, "]")
    .replace(/\[([^\][]*?\.)[lJ|](?=[\s;,.)]|$)/gu, "[$1]")
    .replace(/\[[^\][]*\]/gu, (group) => group.replace(/\s?[\^*]+/gu, ""));
}

/** Raised line numbers of the prose-work references, which the OCR sets as ^ and quotes after a digit. */
const dropSuperscripts = (text: string): string =>
  text.replace(/(?<=\d)['’"]?\^[^\s;,)\]]*/gu, (run) => (run.endsWith(".") ? "." : ""));

/** Words of the headword and the form that follows it, which a line of the poem should show. */
function nameWords(head: string, text: string): string[] {
  const words = head.split(/[\s,]+/u).filter((w) => /^\p{Lu}/u.test(w)).map(letters);
  const gloss = /^(\p{Lu}[\p{L}'’-]+),/u.exec(text)?.[1];
  if (gloss) words.push(letters(gloss));
  return words.filter((w) => w.length >= 4);
}

// --- the entries ------------------------------------------------------------------------------------------------

interface Raw {
  head: string;
  mark: string;
  stub: boolean;
  first: string;
  lines: Line[];
}

export function readToynbee(ocr: string, poem: Commedia): { entries: ToynbeeEntry[]; stats: ToynbeeStats } {
  const body = ocr.split("\n");
  const first = body.findIndex((l) => /^Abate\s+di\s+San\s+Zeno\./u.test(l.trim()));
  const last = body.findIndex((l, i) => i > first && l.trim() === "TABLES");
  if (first < 0 || last < 0) throw new Error("toynbee: the entries are not where the 1914 OCR has them (Abate di San Zeno ... TABLES)");

  const usedFix = new Set<number>();
  const lines = body.slice(first, last).map((raw) => {
    let line = raw.replace(/\s+/gu, " ").trim();
    FIXES.forEach(([from, to], k) => {
      if (line.includes(from)) {
        line = line.split(from).join(to);
        usedFix.add(k);
      }
    });
    return line;
  });
  const unusedFix = FIXES.filter((_, k) => !usedFix.has(k)).map(([from]) => from);
  if (unusedFix.length) throw new Error(`toynbee: FIXES used by no line: ${unusedFix.join(" | ")}`);

  interface Scan {
    stream: Line[];
    pieces: Piece[];
    removed: number;
    all: Candidate[];
    accepted: Candidate[];
    unexplained: Piece[];
  }

  const scan = (restore: ReadonlySet<number>): Scan => {
    const { lines: stream, pieces, removed } = dropFurniture(lines, restore);
    const known = evidence(stream, pieces);
    const all = candidates(stream, known);
    const usedStart = new Set<string>();
    const pool = all.filter((c) => {
      const line = stream[c.at]?.text ?? "";
      const hit = NOT_START.find((s) => line.startsWith(s));
      if (hit === undefined) return true;
      usedStart.add(hit);
      return false;
    });
    const keep = ordered(pool);
    let accepted = pool.filter((_, k) => keep.has(k));
    // the same headword twice in a row without a number is the name opening a paragraph, not a second entry
    accepted = accepted.filter((c, k) => {
      const prev = accepted[k - 1];
      if (c.stub || c.mark !== "" || !prev) return true;
      const a = letters(prev.head);
      const b = letters(c.head);
      return a !== b && !(c.weight === 1 && a.startsWith(b));
    });

    // A running head is explained by an entry whose headword it spells (the OCR may differ by a letter or two) on its
    // page. A page of one long entry (Dante, Carlo) has the same headword at both ends and starts no entry of its own.
    const spells = (piece: Piece, c: Candidate): boolean => {
      const folded = letters(piece.head);
      const tolerance = Math.max(2, Math.floor(folded.length / 3));
      const first = letters(c.head.split(",")[0] ?? c.head);
      const whole = letters(c.head);
      return (
        distance(folded, first) <= tolerance || distance(folded, whole) <= tolerance ||
        first.startsWith(folded) || folded.startsWith(first) || whole.startsWith(folded)
      );
    };
    const explained = (piece: Piece): boolean => {
      const inForce = accepted.filter((c) => c.at <= piece.at).length - 1;
      return accepted.some((c, k) => k >= inForce && c.at <= piece.at + 120 && spells(piece, c));
    };
    // A candidate the order left out, which a running head spells and no accepted entry does, is that entry with its
    // headword misread (Bpistolae for Epistolae): it is taken, at its place in the book.
    for (const piece of pieces) {
      if (explained(piece)) continue;
      const near = pool.filter((c) => !accepted.includes(c) && c.at >= piece.at && c.at <= piece.at + 120 && spells(piece, c));
      const found = near.find((c) => c.stub || c.weight > 1) ?? near[0];
      if (found) accepted = [...accepted, found].sort((a, b) => a.at - b.at);
    }
    const unexplained = pieces.filter((p) => !explained(p) && letters(p.head).length > 3);
    const unusedStart = NOT_START.filter((s) => !usedStart.has(s));
    if (unusedStart.length) throw new Error(`toynbee: NOT_START used by no line: ${unusedStart.join(" | ")}`);
    return { stream, pieces, removed, all, accepted, unexplained };
  };

  // A line the running-head rule took that starts an entry (Beringhieri, Ramondo, Ray-) is text, and goes back.
  const restore = new Set<number>();
  let result = scan(restore);
  for (let pass = 0; pass < 3; pass++) {
    const text = result.unexplained.filter((p) => START.test(p.text) || STUB.test(p.text));
    if (!text.length) break;
    for (const p of text) restore.add(p.block);
    result = scan(restore);
  }
  const { stream, removed, all, accepted, unexplained } = result;
  const strays = unexplained.filter((p) => !LOST_HEADS.includes(p.head));
  if (strays.length) {
    const named = strays.slice(0, 40).map((p) => `${p.head} (before ${stream[p.at]?.text.slice(0, 24) ?? "?"})`);
    throw new Error(`toynbee: ${strays.length} running heads without a headword nearby: ${named.join("; ")}`);
  }
  const unusedLost = LOST_HEADS.filter((h) => !unexplained.some((p) => p.head === h));
  if (unusedLost.length) throw new Error(`toynbee: LOST_HEADS used by no running head: ${unusedLost.join(" | ")}`);
  const unusedText = TEXT_LINES.filter((t) => !lines.includes(t));
  if (unusedText.length) throw new Error(`toynbee: TEXT_LINES used by no line: ${unusedText.join(" | ")}`);

  const inside = wordsInside(stream);
  const raws: Raw[] = accepted.map((c, k) => {
    const next = accepted[k + 1]?.at ?? stream.length;
    return { head: c.head, mark: c.mark, stub: c.stub, first: c.rest, lines: stream.slice(c.at + 1, next) };
  });

  // homograph numbers: the headwords that repeat, in the order they stand; a cross-reference the printer did not
  // number is a spelling of the headword and takes no number
  const byHead = new Map<string, number[]>();
  raws.forEach((r, k) => {
    if (r.stub && !r.mark.trim()) return;
    const key = letters(r.head);
    byHead.set(key, [...(byHead.get(key) ?? []), k]);
  });
  const numbers: (number | undefined)[] = raws.map(() => undefined);
  const disagree: string[] = [];
  for (const members of byHead.values()) {
    if (members.length < 2) continue;
    let bad = false;
    members.forEach((k, order) => {
      numbers[k] = order + 1;
      const digit = /\d+/u.exec(raws[k]?.mark ?? "")?.[0];
      if (digit !== undefined && Number(digit) !== order + 1) bad = true;
    });
    if (bad) disagree.push(members.map((k) => `${raws[k]?.head}${raws[k]?.mark.trim() ? ` ${raws[k]?.mark.trim()}` : ""}${raws[k]?.stub ? " [stub]" : ""}`).join(" / "));
  }
  if (disagree.length) throw new Error(`toynbee: homograph numbers that disagree with the order: ${disagree.join("; ")}`);

  const stats: ToynbeeStats = {
    entries: raws.length,
    stubs: raws.filter((r) => r.stub).length,
    continuations: all.length - accepted.length,
    furniture: removed,
    cites: { read: 0, clean: 0, repaired: 0, confirmed: 0, dropped: 0, verses: 0, versesDropped: 0 },
  };

  const entries = raws.map((raw, k): ToynbeeEntry => {
    const paragraphs: string[][] = [[raw.first]];
    let prev = raw.first;
    for (const line of raw.lines) {
      const fresh = line.start && PARAGRAPH_END.test(prev) && !/^[\p{Ll}\d,;:]/u.test(line.text);
      if (fresh) paragraphs.push([line.text]);
      else paragraphs.at(-1)?.push(line.text);
      prev = line.text;
    }
    const ctx: Context = { poem, names: nameWords(raw.head, raw.first), stats: stats.cites, cites: [] };
    const texts = paragraphs
      .map((p) => joinLines(p, inside))
      .filter((t) => t.trim() !== "")
      .map((t) => {
        let text = joinDigits(t);
        if (raw.stub && (text.match(/\[/gu)?.length ?? 0) > (text.match(/\]/gu)?.length ?? 0)) text += "]";
        text = readVerses(readCitations(text, ctx), ctx);
        return dropSuperscripts(repairBrackets(text)).replace(/\s+/gu, " ").trim();
      });
    const entry: ToynbeeEntry = {
      head: raw.head,
      html: texts.map((t) => `<p>${esc(t)}</p>`).join(""),
      cites: ctx.cites.filter(([a, b, c], i, all) => all.findIndex(([x, y, z]) => x === a && y === b && z === c) === i),
    };
    const n = numbers[k];
    if (n !== undefined) entry.n = n;
    if (raw.stub) {
      entry.see = (/\[([^\]]*)\]?/u.exec(texts[0] ?? "")?.[1] ?? "").split(/[:;]/u).map((s) => s.replace(/[\s.]+$/u, "").trim()).filter(Boolean);
    }
    return entry;
  });
  return { entries, stats };
}

export function parseToynbee(ocr: string, poem: Commedia): ToynbeeEntry[] {
  return readToynbee(ocr, poem).entries;
}

/** The plain text of an entry's first paragraph. */
const plain = (html: string): string =>
  (/<p>(.*?)<\/p>/u.exec(html)?.[1] ?? "").replace(/&lt;/gu, "<").replace(/&gt;/gu, ">").replace(/&amp;/gu, "&");

/**
 * One line for a list: what the entry says the name is, up to the first citation, bracket, semicolon or full stop
 * (not after an abbreviation), and no longer than about a line. A cross-reference reads "see Adamo".
 */
export function toynbeeGloss(entry: ToynbeeEntry): string {
  if (entry.see) return `see ${entry.see.join(", ")}`;
  let text = plain(entry.html);
  const stop = /(?:\b(?:Inf|Purg|Par)\. \d)|\s\[|;|\s\((?:cf|ref|var)\.|(?<=\p{Ll}{3}|\p{Lu}\p{Ll}{2}|\d)\.(?=\s\p{Lu}|$)/u.exec(text);
  if (stop) text = text.slice(0, stop.index);
  text = text.replace(/[\s,:(]+$/u, "");
  if (text.length > 120) {
    const cut = text.lastIndexOf(", ", 120);
    text = cut > 30 ? text.slice(0, cut) : `${text.slice(0, text.lastIndexOf(" ", 117))}…`;
  }
  return text;
}
export const __internals = { dropFurniture, candidates, ordered, evidence, letters, distance };
