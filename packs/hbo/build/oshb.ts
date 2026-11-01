// Reads one book of the Open Scriptures Hebrew Bible (morphhb, wlc/<Book>.xml): the Westminster Leningrad Codex as OSIS
// with a lemma and a morphology code per written word. The parser throws on anything it does not account for.
//
//   <w lemma="c/7225" morph="HC/Ncfsa">וְ/בְרֵאשִׁית</w>   text, lemma and morph are split into morphemes by "/"
//   <seg type="x-maqqef">־</seg>                              the maqqef joins two words without a space
//   <w type="x-ketiv">…</w><note type="variant"><rdg type="x-qere"><w>…</w></rdg></note>   ketiv written, qere read
import { DOMParser, type Element, type Node } from "@xmldom/xmldom";

export interface OshbWord {
  /** The written word with "/" between its morphemes; never normalized. */
  text: string;
  /** Lemma parts joined by "/": prefix letters, then the Strong's number with the project's augmentation ("1254 a"). */
  lemma: string;
  /** Language letter, then one code per morpheme, joined by "/". */
  morph: string;
  /** The ketiv (as written) of a word read as its qere: the text of the ketiv, "/" removed. */
  ketiv?: string;
}

/** A written word, or punctuation the manuscript sets between words. */
export type OshbItem =
  | { kind: "word"; word: OshbWord; space: boolean }
  | { kind: "seg"; type: OshbSeg; text: string; space: boolean };

export type OshbSeg = "maqqef" | "sof-pasuq" | "paseq" | "pe" | "samekh";
type NoSpace<T> = T extends unknown ? Omit<T, "space"> : never;
const SEGS: ReadonlySet<string> = new Set<OshbSeg>(["maqqef", "sof-pasuq", "paseq", "pe", "samekh"]);

export interface OshbVerse {
  chapter: number;
  verse: number;
  items: OshbItem[];
}

const children = (node: Node): Node[] => Array.from(node.childNodes as unknown as ArrayLike<Node>);
const isElement = (node: Node): node is Element => node.nodeType === 1;

function word(el: Element, where: string): OshbWord {
  const text = el.textContent;
  const lemma = el.getAttribute("lemma");
  const morph = el.getAttribute("morph");
  if (!text || !lemma || !morph) throw new Error(`OSHB word without text, lemma or morphology at ${where}`);
  if (text.split("/").length !== morph.split("/").length) throw new Error(`OSHB ${where}: ${text} and ${morph} differ in morphemes`);
  return { text, lemma, morph };
}

/**
 * The verses of the given chapters. Notes about differences from BHS (`n=` letters) are skipped; a ketiv word is
 * replaced by its qere word or words, which carry the ketiv text.
 */
export function parseOshb(xml: string, book: string, chapters: ReadonlySet<number>): OshbVerse[] {
  const doc = new DOMParser().parseFromString(xml.replace(/^\uFEFF/u, ""), "text/xml");
  const verses: OshbVerse[] = [];
  for (const el of Array.from(doc.getElementsByTagName("verse") as unknown as ArrayLike<Element>)) {
    const id = el.getAttribute("osisID")!;
    const match = /^(\w+)\.(\d+)\.(\d+)$/u.exec(id);
    if (!match || match[1] !== book) throw new Error(`Unexpected OSHB verse id ${id}`);
    const chapter = Number(match[2]);
    if (!chapters.has(chapter)) continue;
    const items: OshbItem[] = [];
    let space = false;
    let ketiv: OshbWord | undefined;
    const add = (item: NoSpace<OshbItem>) => {
      items.push({ ...item, space } as OshbItem);
      space = false;
    };
    for (const node of children(el)) {
      if (node.nodeType === 3) {
        if (node.nodeValue!.trim()) throw new Error(`OSHB ${id}: text outside a word: ${node.nodeValue}`);
        space = true;
        continue;
      }
      if (!isElement(node)) continue;
      switch (node.tagName) {
        case "w": {
          const w = word(node, id);
          if (node.getAttribute("type") === "x-ketiv") {
            if (ketiv) throw new Error(`OSHB ${id}: ketiv ${ketiv.text} has no qere`);
            ketiv = w;
          } else {
            if (node.getAttribute("type")) throw new Error(`OSHB ${id}: unknown word type ${node.getAttribute("type")}`);
            add({ kind: "word", word: w });
          }
          break;
        }
        case "seg": {
          const type = node.getAttribute("type")?.replace(/^x-/u, "") ?? "";
          if (!SEGS.has(type)) throw new Error(`OSHB ${id}: unknown seg ${node.getAttribute("type")}`);
          add({ kind: "seg", type: type as OshbSeg, text: node.textContent! });
          break;
        }
        case "note": {
          if (node.getAttribute("type") !== "variant") {
            // Editorial remarks on differences from BHS (n="c", "p", "1" …) and the KJV verse number.
            if (!node.getAttribute("n") && !/^KJV:/u.test(node.textContent!)) throw new Error(`OSHB ${id}: unknown note`);
            break;
          }
          const readings = children(node).filter(isElement).filter((child) => child.tagName === "rdg");
          const qere = readings.length === 1 && readings[0]!.getAttribute("type") === "x-qere" ? readings[0]! : undefined;
          if (!qere || !ketiv) throw new Error(`OSHB ${id}: a variant note without a ketiv and a qere`);
          const written = ketiv.text.replaceAll("/", "");
          const catchWord = children(node).filter(isElement).find((child) => child.tagName === "catchWord")?.textContent;
          if (catchWord?.replaceAll("/", "") !== written) throw new Error(`OSHB ${id}: ketiv ${written} differs from the note's ${catchWord}`);
          const words = children(qere).filter(isElement).map((w) => word(w, id));
          if (!words.length) throw new Error(`OSHB ${id}: qere without words`);
          words.forEach((w, i) => {
            if (i === 0) add({ kind: "word", word: { ...w, ketiv: written } });
            else {
              space = true;
              add({ kind: "word", word: w });
            }
          });
          ketiv = undefined;
          break;
        }
        default:
          throw new Error(`OSHB ${id}: unknown element ${node.tagName}`);
      }
    }
    if (ketiv) throw new Error(`OSHB ${id}: ketiv ${ketiv.text} has no qere`);
    verses.push({ chapter, verse: Number(match[3]), items });
  }
  return verses;
}
