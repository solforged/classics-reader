// Parses the EAE Codex Regius TEI (normalized level, with lemma + Menota morphosyntax, converted to UD).
import { DOMParser, type Element } from "@xmldom/xmldom";
import type { OnUnit, Piece, UnitKind } from "./types";
import type { AnalysisTable } from "./analyses";
import { menotaLemma, menotaToUd } from "./menota";

const TEI = "http://www.tei-c.org/ns/1.0";
const ME = "http://www.menota.org/ns/1.0";
const XML_NS = "http://www.w3.org/XML/1998/namespace";

type El = Element;

function loadEntities(text: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const m of text.matchAll(/<!ENTITY\s+(\w+)\s+"&#x([0-9A-Fa-f]+);"/g)) {
    map.set(m[1]!, String.fromCodePoint(parseInt(m[2]!, 16)));
  }
  return map;
}

export function parseEae(xml: string, entityText: string): Map<string, El> {
  const ents = loadEntities(entityText);
  const keep = new Set(["amp", "lt", "gt", "quot", "apos"]);
  const body = xml
    .slice(xml.indexOf("<TEI"))
    .replace(/&(\w+);/g, (m, name) => (keep.has(name) ? m : (ents.get(name) ?? "")));
  const doc = new DOMParser().parseFromString(body, "text/xml");
  const divs = new Map<string, El>();
  const bodyEl = doc.getElementsByTagNameNS(TEI, "body")[0];
  if (!bodyEl) throw new Error("EAE XML has no <body>");
  // Normalize before either the form index or a work's analyses reads the annotation.
  for (const word of Array.from(bodyEl.getElementsByTagNameNS(TEI, "w")) as El[]) {
    const lemma = word.getAttribute("lemma");
    if (lemma) word.setAttribute("lemma", menotaLemma(lemma, word.getAttributeNS(ME, "msa") || ""));
  }
  for (const div of children(bodyEl)) {
    if (div.localName === "div" && div.getAttribute("n")) {
      divs.set(div.getAttributeNS(XML_NS, "id") || div.getAttribute("xml:id") || "", div);
    }
  }
  return divs;
}

function children(el: El): El[] {
  const out: El[] = [];
  for (let n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 1) out.push(n as El);
  return out;
}

function textOf(el: El): string {
  return (el.textContent ?? "").replace(/\s+/g, " ").trim();
}

function normOf(el: El): El | undefined {
  // The normalized reading lives in choice/me:norm (directly or nested).
  const list = el.getElementsByTagNameNS(ME, "norm");
  return list.length ? (list[0] as El) : undefined;
}

/** Accumulates display pieces with Old Norse spacing rules. */
class LineBuilder {
  pieces: Piece[] = [];
  private needSpace = false;

  word(text: string, ids: number[], supplied: boolean, joinPrev = false) {
    if (!text) return;
    if (this.needSpace && !joinPrev) this.pieces.push(" ");
    this.pieces.push(supplied ? [text, ids, 1] : [text, ids]);
    this.needSpace = true;
  }

  punct(text: string) {
    if (!text) return;
    const t = text.replace(/\s+/g, " ");
    if (t.startsWith(" ")) {
      this.pieces.push(t);
      this.needSpace = !t.endsWith(" ");
    } else {
      this.pieces.push(t);
      this.needSpace = true;
    }
  }

  plain(text: string) {
    const t = text.replace(/\s+/g, " ").trim();
    if (!t) return;
    if (this.needSpace) this.pieces.push(" ");
    this.pieces.push(t);
    this.needSpace = true;
  }

  done(): Piece[] {
    // Merge adjacent plain strings.
    const out: Piece[] = [];
    for (const p of this.pieces) {
      const last = out[out.length - 1];
      if (typeof p === "string" && typeof last === "string") out[out.length - 1] = last + p;
      else out.push(p);
    }
    if (typeof out[out.length - 1] === "string") out[out.length - 1] = (out[out.length - 1] as string).trimEnd();
    if (typeof out[0] === "string") out[0] = (out[0] as string).trimStart();
    return out.filter((p) => p !== "");
  }
}

function wordAnalysis(w: El, table: AnalysisTable, surface: string, word?: string): number[] {
  const lemma = w.getAttribute("lemma");
  const msa = w.getAttributeNS(ME, "msa") || w.getAttribute("me:msa") || "";
  if (lemma) return [table.add(word !== undefined
    ? [lemma.normalize("NFC"), menotaToUd(msa), "e", word]
    : [lemma.normalize("NFC"), menotaToUd(msa), "e"])];
  return table.lookup(surface);
}

function walkInline(el: El, line: LineBuilder, table: AnalysisTable) {
  for (const c of children(el)) {
    const name = c.localName;
    if (name === "w" && c.namespaceURI === TEI) {
      const norm = normOf(c);
      if (!norm) continue;
      const text = textOf(norm);
      line.word(text, wordAnalysis(c, table, text), c.getAttribute("type") === "supplied");
    } else if (name === "punct") {
      const norm = normOf(c);
      if (norm) line.punct(norm.textContent ?? "");
    } else if (name === "seg" && c.getAttribute("type") === "enc") {
      // Enclitic group: one graphic word made of several grammatical words (vild+u).
      let first = true;
      const words = Array.from(c.getElementsByTagNameNS(TEI, "w")) as El[];
      for (const [i, w] of words.entries()) {
        const norm = normOf(w);
        if (!norm) continue;
        const text = textOf(norm);
        // A zero-width following word is fused into this segment; its independent surface is not supplied.
        const next = words[i + 1] && normOf(words[i + 1]!);
        const word = next && !textOf(next) ? "" : text;
        line.word(text, wordAnalysis(w, table, text, word), w.getAttribute("type") === "supplied", !first);
        first = false;
      }
    } else if (name === "choice") {
      const norm = normOf(c);
      if (norm) line.plain(norm.textContent ?? "");
    } else if (name === "facs" || name === "dipl" || name === "norm" || name === "m") {
      continue;
    } else {
      walkInline(c, line, table);
    }
  }
}

/** Collapse enclitic-group words into a single clickable piece. */
function mergeEnclitics(pieces: Piece[]): Piece[] {
  const out: Piece[] = [];
  for (const p of pieces) {
    const last = out[out.length - 1];
    if (typeof p !== "string" && last && typeof last !== "string") {
      out[out.length - 1] = [last[0] + p[0], [...last[1], ...p[1]], (last[2] ?? 0) | (p[2] ?? 0)].filter(
        (v, i) => i < 2 || v,
      ) as Piece;
    } else out.push(p);
  }
  return out;
}

export interface EaeUnit extends OnUnit {
  /** Conventional stanza number from the edition's xml:id (v.Vsp.17 → "17"), when present. */
  ref?: string;
}

export function eaeUnits(div: El, table: AnalysisTable, keyPrefix = ""): EaeUnit[] {
  const units: EaeUnit[] = [];
  let i = 0;
  const push = (kind: UnitKind, lines: Piece[][], label?: string, ref?: string) => {
    if (!lines.some((l) => l.length)) return;
    units.push({ key: `${keyPrefix}${kind[0]}${++i}`, kind, label, ref, lines: lines.filter((l) => l.length) });
  };
  const visit = (el: El) => {
    for (const c of children(el)) {
      switch (c.localName) {
        case "head": {
          const lb = new LineBuilder();
          walkInline(c, lb, table);
          push("head", [mergeEnclitics(lb.done())]);
          break;
        }
        case "lg": {
          const lines = (Array.from(c.getElementsByTagNameNS(TEI, "l")) as El[]).map((l) => {
            const lb = new LineBuilder();
            walkInline(l, lb, table);
            return mergeEnclitics(lb.done());
          });
          const id = c.getAttributeNS(XML_NS, "id") || "";
          const ref = id.match(/\.(\d+[a-z]?)$/)?.[1];
          push("stanza", lines, c.getAttribute("n") ?? undefined, ref);
          break;
        }
        case "p": {
          const lb = new LineBuilder();
          walkInline(c, lb, table);
          push("prose", [mergeEnclitics(lb.done())]);
          break;
        }
        case "div":
          visit(c);
          break;
        default:
          // lb, pb, anchor, milestones: nothing to display.
          break;
      }
    }
  };
  visit(div);
  return units;
}

export function headText(u: OnUnit): string {
  return u.lines
    .flat()
    .map((p) => (typeof p === "string" ? p : p[0]))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}
