// Parses Perseus canonical-latinLit EpiDoc TEI for one book of the Aeneid: Greenough's Latin (perseus-lat2) and
// Theodore C. Williams's English (perseus-eng2). Both mark Greenough's paragraphs as "cards" named by the Latin line
// that opens them: milestones before Latin lines, divs around English lines.
import { DOMParser, type Element, type Node } from "@xmldom/xmldom";

export interface LatinLine {
  n: number;
  /** The line's text; speech marks (<q>) are not printed. */
  text: string;
  /** Greenough brackets the line as spurious (<del>). */
  bracketed: boolean;
}

export interface LatinBook {
  lines: LatinLine[];
  /** First line of each paragraph, ascending. */
  cards: number[];
}

/** One English paragraph: the Latin line it starts at and Williams's verse lines. */
export interface EnglishCard {
  start: number;
  lines: string[];
}

const children = (node: Node): Node[] => Array.from(node.childNodes as unknown as ArrayLike<Node>);
const isElement = (node: Node): node is Element => node.nodeType === 1;
const text = (node: Node): string => (node.textContent ?? "").replace(/\s+/gu, " ").trim();

function bookDiv(xml: string, book: number): Element {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  const divs = Array.from(doc.getElementsByTagName("div") as unknown as ArrayLike<Element>)
    .filter((div) => div.getAttribute("subtype") === "book" && div.getAttribute("n") === String(book));
  if (divs.length !== 1) throw new Error(`Expected one Perseus book ${book} div, found ${divs.length}`);
  return divs[0]!;
}

const lineNumber = (l: Element): number => {
  const n = Number(l.getAttribute("n"));
  if (!Number.isInteger(n) || n < 1) throw new Error(`Perseus line without a number: ${l.toString()}`);
  return n;
};

export function parseLatin(xml: string, book: number): LatinBook {
  const lines: LatinLine[] = [];
  const cards: number[] = [];
  let pending: number | undefined;
  for (const node of children(bookDiv(xml, book)).filter(isElement)) {
    if (node.localName === "milestone") {
      if (node.getAttribute("unit") !== "card" || pending !== undefined) throw new Error(`Unexpected Latin milestone ${node.toString()}`);
      pending = Number(node.getAttribute("n"));
      continue;
    }
    if (node.localName !== "l") throw new Error(`Unexpected element in Latin book ${book}: ${node.localName}`);
    const n = lineNumber(node);
    if (n !== lines.length + 1) throw new Error(`Latin line ${n} follows ${lines.length}`);
    if (pending !== undefined) {
      if (pending !== n) throw new Error(`Latin card ${pending} stands before line ${n}`);
      cards.push(n);
      pending = undefined;
    }
    const inner = children(node).filter(isElement);
    const bracketed = inner.some((child) => child.localName === "del");
    if (bracketed && (inner.length !== 1 || text(inner[0]!) !== text(node))) throw new Error(`Latin line ${n} is partly deleted`);
    lines.push({ n, text: text(node), bracketed });
  }
  if (cards[0] !== 1) throw new Error(`Latin book ${book} does not open with a card`);
  return { lines, cards };
}

/**
 * Williams's cards, with any paragraph he marks by a milestone inside a card split off as its own card (Aeneid 1.132
 * starts mid-line: "he voiced this word: | “What pride of birth or power"). Place-name markup is dropped.
 */
export function parseEnglish(xml: string, book: number): EnglishCard[] {
  const cards: EnglishCard[] = [];
  let expected = 1;
  for (const div of children(bookDiv(xml, book)).filter(isElement)) {
    if (div.localName !== "div" || div.getAttribute("subtype") !== "card") throw new Error(`Unexpected English element ${div.localName}`);
    let card: EnglishCard = { start: Number(div.getAttribute("n")), lines: [] };
    cards.push(card);
    for (const l of children(div).filter(isElement)) {
      if (l.localName !== "l") throw new Error(`Unexpected element in English card ${card.start}: ${l.localName}`);
      if (lineNumber(l) !== expected++) throw new Error(`English line ${l.getAttribute("n")} out of order`);
      let line = "";
      for (const part of children(l)) {
        if (isElement(part) && part.localName === "milestone") {
          if (line.trim()) card.lines.push(line.replace(/\s+/gu, " ").trim());
          card = { start: Number(part.getAttribute("n")), lines: [] };
          cards.push(card);
          line = "";
          continue;
        }
        line += part.textContent ?? "";
      }
      if (line.trim()) card.lines.push(line.replace(/\s+/gu, " ").trim());
    }
  }
  for (const [i, card] of cards.entries()) {
    if (!Number.isInteger(card.start) || (i && card.start <= cards[i - 1]!.start)) throw new Error(`English card ${card.start} out of order`);
  }
  return cards;
}
