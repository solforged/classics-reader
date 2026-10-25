// Shows source-language text in another script (the pack's `scripts`, e.g. Sanskrit in Devanagari) on every page.
// Text stays stored, searched and linked in the pack's own spelling: elements marked lang=<pack code> are converted in
// place, and their original text is kept so the toggle can switch back. The choice is stored per reader; the head
// script in src/layouts/Base.astro hides marked text until it is converted.
import { lang } from "../lang";
import type { DisplayScript } from "../lang/types";

const KEY = `${import.meta.env.PUBLIC_READER}-script`;
const originals = new WeakMap<Text, string>();
const tags = [lang.code, ...(lang.scripts ?? []).map((script) => script.tag)];
const marked = tags.map((tag) => `[lang="${tag}"]`).join(",");

export function activeScript(): DisplayScript | undefined {
  const id = localStorage.getItem(KEY);
  return lang.scripts?.find((script) => script.id === id);
}

/** `text` as the page currently shows source-language text. */
export function displayed(text: string): string {
  return activeScript()?.convert(text) ?? text;
}

function textNodes(el: Element): Text[] {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  return nodes;
}

/** An element's text in the stored spelling, whatever script it is shown in. */
export function sourceText(el: Element): string {
  return textNodes(el).map((node) => originals.get(node) ?? node.data).join("");
}

/** Converts (or restores) every marked element under `root`, and `root` itself when marked. */
export function applyScript(root: Element | Document = document): void {
  if (!lang.scripts?.length) return;
  const script = activeScript();
  const elements = [...root.querySelectorAll(marked)];
  if (root instanceof Element && root.matches(marked)) elements.push(root);
  for (const el of elements) {
    for (const node of textNodes(el)) {
      const original = originals.get(node) ?? node.data;
      originals.set(node, original);
      const shown = script ? script.convert(original) : original;
      if (node.data !== shown) node.data = shown;
    }
    el.setAttribute("lang", script?.tag ?? lang.code);
  }
  document.documentElement.dataset.script = script?.id ?? "";
}

export function setScript(id: string): void {
  if (id) localStorage.setItem(KEY, id);
  else localStorage.removeItem(KEY);
  applyScript();
}
