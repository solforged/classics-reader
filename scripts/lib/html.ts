// Inline HTML helpers for cheerio-parsed sources.
import type { AnyNode, Element } from "domhandler";

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export interface InlineOptions {
  /** Keep <i>/<em> as <i>. Otherwise everything becomes plain text. */
  italics?: boolean;
  /** Return true to drop an element and its contents. */
  skip?: (el: Element) => boolean;
}

/** Serialize a node's inline content as plain text or minimal HTML (only <i>), whitespace collapsed. */
export function inline(node: AnyNode | AnyNode[], opts: InlineOptions = {}): string {
  const out: string[] = [];
  const walk = (n: AnyNode) => {
    if (n.type === "text") {
      out.push(opts.italics ? escape(n.data) : n.data);
      return;
    }
    if (n.type !== "tag" && n.type !== "script" && n.type !== "style") return;
    const el = n as Element;
    if (el.name === "script" || el.name === "style" || el.name === "sup") return;
    if (opts.skip?.(el)) return;
    if (el.name === "br") {
      out.push("\n");
      return;
    }
    const ital = opts.italics && (el.name === "i" || el.name === "em");
    if (ital) out.push("<i>");
    for (const c of el.children) walk(c);
    if (ital) out.push("</i>");
  };
  for (const n of Array.isArray(node) ? node : [node]) walk(n);
  return out
    .join("")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t\r]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/<i>\s*<\/i>/g, "")
    .trim();
}

export const hasClass = (el: Element, cls: string) => (el.attribs.class ?? "").split(/\s+/).includes(cls);
