// Reads an ISWOC text (the Oslo treebank of Old English, PROIEL XML schema 2.1): divisions of sentences of tokens.
// A token has its form as printed, lemma, part of speech, ten-character morphology, dependency relation, the
// punctuation and space that follow it (presentation-after) and its citation. Tokens without a form are the
// treebank's empty (elided) elements and are dropped. The parser throws on anything it does not expect.
import { DOMParser, type Element, type Node } from "@xmldom/xmldom";

export interface IswocToken {
  id: string;
  form: string;
  lemma: string;
  /** PROIEL part-of-speech tag, e.g. "Nb". */
  pos: string;
  morphology: string;
  relation: string;
  /** Punctuation and space after the token; null when the next token is written together with it (n + æs = næs). */
  after: string | null;
  /** The token's citation-part: a chapter number in Apollonius ("12"), "MARK 4.17" in the Gospel. */
  citation: string;
}

export interface IswocSentence {
  id: string;
  tokens: IswocToken[];
}

export interface IswocDivision {
  title: string;
  sentences: IswocSentence[];
}

export interface IswocText {
  id: string;
  title: string;
  license: string;
  licenseUrl: string;
  divisions: IswocDivision[];
  /** Ids of the tokens whose stray leading space was moved to the token before (see LEADING_SPACE). */
  repairs: string[];
}

const children = (node: Node): Element[] =>
  (Array.from(node.childNodes as unknown as ArrayLike<Node>)).filter((child): child is Element => child.nodeType === 1);

function attribute(element: Element, name: string): string {
  const value = element.getAttribute(name);
  if (value === null || value === "") throw new Error(`ISWOC <${element.tagName}> lacks ${name}: ${element.toString().slice(0, 160)}`);
  return value;
}

const text = (element: Element, tag: string): string => {
  const found = children(element).filter((child) => child.tagName === tag);
  if (found.length !== 1) throw new Error(`ISWOC source has ${found.length} <${tag}> elements`);
  return (found[0]!.textContent ?? "").trim();
};

/**
 * The token whose form carries the space that belongs to the previous token's presentation-after (Mark 9.46 prints
 * "swylt" and " ne"). The previous token then ends with the space and the form is trimmed.
 */
export const LEADING_SPACE = "1445799";

export function parseIswoc(xml: string): IswocText {
  const doc = new DOMParser({
    onError: (level, message) => {
      throw new Error(`ISWOC XML ${level}: ${message}`);
    },
  }).parseFromString(xml, "text/xml");
  const root = doc.documentElement;
  if (!root || root.tagName !== "proiel" || root.getAttribute("schema-version") !== "2.1") {
    throw new Error("Not a PROIEL schema 2.1 export");
  }
  const sources = children(root).filter((child) => child.tagName === "source");
  if (sources.length !== 1) throw new Error(`Expected one <source>, found ${sources.length}`);
  const source = sources[0]!;
  const divisions: IswocDivision[] = [];
  const repairs: string[] = [];
  for (const div of children(source).filter((child) => child.tagName === "div")) {
    const sentences: IswocSentence[] = [];
    for (const sentence of children(div).filter((child) => child.tagName === "sentence")) {
      if (sentence.getAttribute("status") !== "reviewed") {
        throw new Error(`ISWOC sentence ${sentence.getAttribute("id")} is not reviewed`);
      }
      const tokens: IswocToken[] = [];
      for (const token of children(sentence).filter((child) => child.tagName === "token")) {
        if (token.getAttribute("empty-token-sort")) {
          if (token.getAttribute("form")) throw new Error(`Empty token ${token.getAttribute("id")} has a form`);
          continue;
        }
        const id = attribute(token, "id");
        let form = attribute(token, "form");
        const after = token.getAttribute("presentation-after");
        if (form !== form.trim()) {
          const previous = tokens.at(-1);
          if (id !== LEADING_SPACE || form !== ` ${form.trim()}` || previous?.after !== null) {
            throw new Error(`ISWOC token ${id} has the form "${form}" with surrounding space`);
          }
          repairs.push(id);
          previous.after = " ";
          form = form.trim();
        }
        tokens.push({
          id, form, lemma: attribute(token, "lemma"), pos: attribute(token, "part-of-speech"),
          morphology: attribute(token, "morphology"), relation: attribute(token, "relation"),
          after: after === null ? null : after, citation: attribute(token, "citation-part"),
        });
      }
      sentences.push({ id: attribute(sentence, "id"), tokens });
    }
    divisions.push({ title: text(div, "title"), sentences });
  }
  return {
    id: attribute(source, "id"), title: text(source, "title"), license: text(source, "license"),
    licenseUrl: text(source, "license-url"), divisions, repairs,
  };
}
