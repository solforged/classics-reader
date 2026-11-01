// Parses Perseus canonical-greekLit EpiDoc TEI for book 1 of the Iliad or Odyssey: the Greek text (perseus-grc2) and
// A. T. Murray's English prose (perseus-eng3). Both mark the Loeb pages as "cards" named by the Greek line that opens
// them. Murray's prose is not line for line: Perseus also records, every fifth line, the point in his English where that
// line is reached; those marks fall mid-sentence and are not used.
import { DOMParser, type Element, type Node } from "@xmldom/xmldom";

export interface GreekLine {
  n: number;
  text: string;
  /** Allen's (or Murray's) text starts a new paragraph at this line. */
  paragraph: boolean;
}

export interface GreekBook {
  lines: GreekLine[];
  /** First line of each Loeb page, ascending. */
  cards: number[];
}

/** One English page: the Greek line it opens at, and its paragraphs. */
export interface EnglishCard {
  start: number;
  paragraphs: string[];
}

const children = (node: Node): Node[] => Array.from(node.childNodes as unknown as ArrayLike<Node>);
const isElement = (node: Node): node is Element => node.nodeType === 1;
const collapse = (text: string): string => text.replace(/\s+/gu, " ").trim();

function bookDiv(xml: string, book: number): Element {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  const divs = Array.from(doc.getElementsByTagName("div") as unknown as ArrayLike<Element>)
    .filter((div) => div.getAttribute("subtype")?.toLowerCase() === "book" && div.getAttribute("n") === String(book));
  if (divs.length !== 1) throw new Error(`Expected one Perseus book ${book} div, found ${divs.length}`);
  return divs[0]!;
}

/** Book `book` of the Greek: numbered lines (speech wrappers and milestones read through) and the card milestones. */
export function parseGreek(xml: string, book: number): GreekBook {
  const lines: GreekLine[] = [];
  const cards: number[] = [];
  let pending: number | undefined;
  const walk = (node: Element): void => {
    for (const child of children(node).filter(isElement)) {
      const name = child.localName;
      if (name === "milestone") {
        if (child.getAttribute("unit") !== "card") throw new Error(`Unexpected Greek milestone ${child.toString()}`);
        if (pending !== undefined) throw new Error(`Greek card ${pending} is followed by another card`);
        pending = Number(child.getAttribute("n"));
      } else if (name === "l") {
        const n = Number(child.getAttribute("n"));
        if (n !== lines.length + 1) throw new Error(`Greek line ${child.getAttribute("n")} follows ${lines.length}`);
        if (pending !== undefined) {
          if (pending !== n) throw new Error(`Greek card ${pending} stands before line ${n}`);
          cards.push(n);
          pending = undefined;
        }
        const inner = Array.from(child.getElementsByTagName("*") as unknown as ArrayLike<Element>);
        const marks = inner.filter((el) => el.localName === "milestone");
        if (marks.length !== inner.length || marks.some((el) => !/^para$/iu.test(el.getAttribute("unit") ?? ""))) {
          throw new Error(`Greek line ${n} has markup other than paragraph marks`);
        }
        lines.push({ n, text: collapse(child.textContent ?? ""), paragraph: marks.length > 0 });
      } else if (name === "q") {
        walk(child);
      } else throw new Error(`Unexpected element in Greek book ${book}: ${name}`);
    }
  };
  walk(bookDiv(xml, book));
  if (pending !== undefined || cards[0] !== 1) throw new Error(`Greek book ${book} does not open with a card`);
  return { lines, cards };
}

/**
 * Murray's cards, each a list of paragraphs. His page-long paragraphs are one <p> per card; the Iliad's file also
 * breaks paragraphs by a new line in the text and by <quote> (a speech); the Odyssey's file wraps its lines, so a
 * new line there is a space. Footnote markers are dropped; the five-line marks are read as the space they replace
 * (a hyphen at the end of the English line joins).
 */
export function parseEnglish(xml: string, book: number, newlines: "paragraphs" | "spaces"): EnglishCard[] {
  const cards: EnglishCard[] = [];
  for (const div of children(bookDiv(xml, book)).filter(isElement)) {
    if (div.localName !== "div" || div.getAttribute("subtype") !== "card") throw new Error(`Unexpected English element ${div.localName}`);
    let text = "";
    const walk = (node: Node): void => {
      if (node.nodeType === 3) {
        const value = node.nodeValue ?? "";
        text += newlines === "spaces" ? value.replace(/\s*\n\s*/gu, " ") : value;
        return;
      }
      if (!isElement(node)) return;
      switch (node.localName) {
        case "note": // a footnote marker: keep the space a printed marker stood between
          if (/[,;:.?!)]$/u.test(text)) text += " ";
          return;
        case "milestone":
          if (node.getAttribute("unit") !== "line") throw new Error(`Unexpected English milestone ${node.toString()}`);
          if (!/[-‐]$/u.test(text)) text += " ";
          return;
        case "quote":
          text += "\n";
          children(node).forEach(walk);
          text += "\n";
          return;
        case "p":
        case "placeName":
        case "corr":
          children(node).forEach(walk);
          return;
        default:
          throw new Error(`Unexpected element in English card: ${node.localName}`);
      }
    };
    for (const p of children(div).filter(isElement)) {
      if (p.localName !== "p") throw new Error(`Unexpected element in English card ${div.getAttribute("n")}: ${p.localName}`);
      text += "\n";
      walk(p);
    }
    const paragraphs = text.split("\n").map(collapse).filter(Boolean);
    cards.push({ start: Number(div.getAttribute("n")), paragraphs });
  }
  for (const [i, card] of cards.entries()) {
    if (!Number.isInteger(card.start) || (i && card.start <= cards[i - 1]!.start) || !card.paragraphs.length) {
      throw new Error(`English card ${card.start} out of order or empty`);
    }
  }
  return cards;
}
