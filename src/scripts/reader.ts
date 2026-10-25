// Reader page behaviour: column view, word panel, translator's notes, go-to, citation links, reading position.
import { lang, shardOf } from "../lang";
import type { DictHit } from "../lib/dict";
import { dictionaryHtml } from "../lib/entry";
import { expandMorph, formatMorph, parseMorph } from "../lib/morph";
import { selectParadigm, type Paradigm } from "../lib/paradigm";
import { applyScript, sourceText } from "./script";

/** [lemma, morph, source, lemma page slug, corpus count, segmented word] (see src/pages/[slug]/index.astro). */
type ClientAnalysis = [
  lemma: string, morph: string, source: "e" | "a" | "w" | "n", slug: string, count: number, word?: string,
];

const BASE = import.meta.env.BASE_URL.replace(/\/?$/, "/");
const json = <T,>(id: string): T => JSON.parse(document.getElementById(id)?.textContent ?? "null") as T;
const analyses = json<ClientAnalysis[]>("analyses");
const notes = json<Record<string, string>>("notes");
const rowIds = new Set(json<string[]>("row-ids"));
const site = json<{ sourceNotes: Record<string, string>; noteCredit: string }>("site");
const READER = import.meta.env.PUBLIC_READER;
const text = document.querySelector<HTMLElement>(".text")!;
const slug = text.dataset.slug!;
const abbr = text.dataset.abbr!;

// ------------------------------------------------------------ view toggle
// "all" shows every side; a side id shows only that column (the page's inline style hides the others).
const VIEW_KEY = `${READER}-view`;
const viewButtons = [...document.querySelectorAll<HTMLButtonElement>("[data-view]")];
const views = viewButtons.map((b) => b.dataset.view!);
function setView(view: string) {
  for (const v of views) document.body.classList.remove(`view-${v}`);
  document.body.classList.add(`view-${view}`);
  document.body.classList.toggle("view-single", view !== "all");
  for (const b of viewButtons) b.setAttribute("aria-pressed", String(b.dataset.view === view));
  localStorage.setItem(VIEW_KEY, view);
}
if (views.length) {
  const saved = localStorage.getItem(VIEW_KEY);
  setView(saved && views.includes(saved) ? saved : "all");
}
for (const b of viewButtons) b.addEventListener("click", () => setView(b.dataset.view!));

// ------------------------------------------------------------ navigation
document.getElementById("work-select")?.addEventListener("change", (e) => {
  location.href = `${BASE}${(e.target as HTMLSelectElement).value}/`;
});

function jump(id: string) {
  const row = document.getElementById(id);
  if (!row) return false;
  history.replaceState(null, "", `#${id}`);
  row.scrollIntoView({ block: "start" });
  row.classList.add("flash");
  setTimeout(() => row.classList.remove("flash"), 1600);
  return true;
}

document.getElementById("goto")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const input = document.getElementById("goto-input") as HTMLInputElement;
  // "1 23", "1,23" and "1:23" cite like "1.23".
  const want = input.value.trim().replace(/\s*[\s,:]\s*/g, ".");
  if (!want) return;
  // Exact row id, else the row containing a stanza with that label.
  if (rowIds.has(want) && jump(want)) return;
  for (const lab of text.querySelectorAll<HTMLElement>(".col.source .slabel, .col.source .chap, .col.translation .slabel")) {
    if (lab.textContent === want) {
      const row = lab.closest<HTMLElement>(".row");
      if (row && jump(row.id)) return;
    }
  }
  input.setCustomValidity(`No passage ${want}`);
  input.reportValidity();
  setTimeout(() => input.setCustomValidity(""), 1500);
});

// Citation links copy a stable URL.
text.addEventListener("click", (e) => {
  const cite = (e.target as HTMLElement).closest<HTMLAnchorElement>("a.cite");
  if (!cite) return;
  e.preventDefault();
  const id = cite.getAttribute("href")!.slice(1);
  jump(id);
  const url = `${location.origin}${location.pathname}#${id}`;
  navigator.clipboard?.writeText(url).then(
    () => toast(`Copied link to ${abbr} ${id}`),
    () => undefined,
  );
});

function toast(msg: string) {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  document.body.append(t);
  setTimeout(() => t.remove(), 1800);
}

// Remember the reading position for "Continue reading".
const seen = new IntersectionObserver(
  (entries) => {
    const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
    if (top) localStorage.setItem(`${READER}-last`, JSON.stringify({ slug, row: (top.target as HTMLElement).id }));
  },
  { rootMargin: "-20% 0px -70% 0px" },
);
for (const row of text.querySelectorAll(".row")) seen.observe(row);

// ------------------------------------------------------------ side panel
const panel = document.getElementById("word-panel")!;
const title = document.getElementById("wp-title")!;
const body = document.getElementById("wp-body")!;
let selected: HTMLElement | null = null;

function closePanel() {
  panel.hidden = true;
  document.body.classList.remove("panel-open");
  selected?.classList.remove("sel");
  selected = null;
}
document.getElementById("wp-close")!.addEventListener("click", closePanel);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closePanel();
});

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const shards = new Map<string, Promise<Record<string, DictHit>>>();
function dictionary(lemma: string): Promise<DictHit | undefined> {
  const shard = shardOf(lemma);
  let p = shards.get(shard);
  if (!p) {
    p = fetch(`${BASE}lex/${shard}.json`).then((r) => (r.ok ? r.json() : {}));
    shards.set(shard, p);
  }
  return p.then((s) => s[lang.fold(lemma)]);
}

const paradigmShards = new Map<string, Promise<Record<string, Paradigm[]>>>();
function paradigms(lemma: string): Promise<Paradigm[]> {
  const shard = shardOf(lemma);
  let p = paradigmShards.get(shard);
  if (!p) {
    p = fetch(`${BASE}para/${shard}.json`).then((r) => (r.ok ? r.json() : {}));
    paradigmShards.set(shard, p);
  }
  return p.then((data) => data[lang.fold(lemma)] ?? []);
}

function readingsHtml(readings: ClientAnalysis[]): string {
  const seen = new Set<string>();
  // An ambiguous reading ("Case=Acc,Nom") lists as one reading per value, so it merges with readings it overlaps.
  const unique = readings.flatMap((reading) => expandMorph(reading[1])).map((morph) => {
    const parsed = parseMorph(morph);
    return {
      morph: lang.describeMorph(morph),
      upos: parsed.upos,
      features: new Map(Object.entries(parsed.feats).map(([name, values]) => [name, values.join(",")])),
    };
  }).filter(({ morph }) => {
    const key = `${morph.pos}:${morph.form}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const groups: (typeof unique)[] = [];
  for (const reading of unique) {
    const group = groups.find((group) => {
      if (group[0]!.morph.pos !== reading.morph.pos) return false;
      const features = [...group.map((item) => item.features), reading.features];
      const keys = new Set(features.flatMap((f) => [...f.keys()]));
      return [...keys].filter((key) => new Set(features.map((f) => f.get(key))).size > 1).length === 1;
    });
    if (group) group.push(reading);
    else groups.push([reading]);
  }
  const severalClasses = new Set(unique.map((reading) => reading.morph.pos)).size > 1;
  const forms = groups.map((group) => {
    const keys = new Set(group.flatMap((reading) => [...reading.features.keys()]));
    const feats = Object.fromEntries([...keys].map((key) => [
      key, [...new Set(group.flatMap((reading) => reading.features.get(key)?.split(",") ?? []))],
    ]));
    const form = lang.describeMorph(formatMorph({ upos: group[0]!.upos, feats })).form;
    return `${severalClasses ? `${group[0]!.morph.pos}: ` : ""}${form}`;
  }).filter(Boolean);
  const first = forms[0] ? `<p class="form">${esc(forms[0])}</p>` : "";
  if (forms.length < 2) return first;
  const others = groups.slice(1).reduce((count, group) => count + group.length, 0);
  return `${first}<details class="other-readings"><summary>other readings (${others})</summary>` +
    `${forms.slice(1).map((form) => `<p class="form">${esc(form)}</p>`).join("")}</details>`;
}

async function showWord(el: HTMLElement) {
  selected?.classList.remove("sel");
  selected = el;
  el.classList.add("sel");
  const ids = (el.dataset.a ?? "").split(" ").filter(Boolean).map(Number);
  const word = sourceText(el);
  title.textContent = word;
  title.setAttribute("lang", lang.code);
  applyScript(title);
  panel.hidden = false;
  document.body.classList.add("panel-open");
  if (!ids.length) {
    const form = encodeURIComponent(word);
    body.innerHTML = `<p class="wp-empty">No analysis is available for this form.</p><p><a href="${BASE}lexicon/?q=${form}">Search the lexicon</a> · <a href="${BASE}search/?q=${form}">Find other passages</a></p>`;
    return;
  }
  const items = ids.map((id) => analyses[id]!).filter(Boolean);
  // One card per lemma and word class: vit the noun and vit the pronoun are different words.
  const grouped = new Map<string, ClientAnalysis[]>();
  for (const item of items) {
    const key = `${item[0]}\t${lang.describeMorph(item[1]).pos}`;
    const readings = grouped.get(key);
    if (readings) readings.push(item);
    else grouped.set(key, [item]);
  }
  const groups = [...grouped.values()];
  const lemmasShown = new Set(items.map((item) => item[0]));
  const editionLemmas = new Set(items.filter((item) => item[2] === "e").map((item) => item[0]));
  // A sandhi or compound token lists its words in order; an Old Norse enclitic form shows as several lemmas.
  const segmented = items.filter((item) => item[5]).length;
  const combined = segmented || editionLemmas.size;
  const enclitic = combined > 1;
  const candidates = items.some((item) => item[2] === "a" || item[2] === "w");
  const blocks = groups.map((readings, i) => {
    const [lemma, , source, lemmaSlug, count] = readings[0]!;
    const words = [...new Set(readings.map((reading) => reading[5]).filter(Boolean))];
    const morphs = readings.map((reading) => lang.describeMorph(reading[1]));
    const pos = [...new Set(morphs.map((m) => m.pos))].join(" / ");
    const props = [...new Set(morphs.flatMap((m) => m.props))];
    const href = lemmaSlug ? `${BASE}lexicon/${encodeURIComponent(lemmaSlug)}/` : "";
    const lemmaHtml = href ? `<a href="${href}">${esc(lemma)}</a>` : esc(lemma);
    const occurs = href && count
      ? `<div class="meta">${count.toLocaleString("en")} occurrence${count === 1 ? "" : "s"} in the reader · ` +
        `<a href="${href}">concordance</a></div>`
      : "";
    const slot = `<div class="dict-slot"><p class="wp-empty">Loading dictionary…</p></div>`;
    const dictionaryBlock = i > 0 && candidates && !enclitic
      ? `<details class="candidate-dictionary"><summary>Dictionary</summary>${slot}</details>`
      : slot;
    const seg = words.length ? `<div class="seg" lang="${lang.code}">${esc(words.join(" / "))}</div>` : "";
    return `<div class="an" data-i="${i}">
      ${seg}<div><span class="lemma" lang="${lang.code}">${lemmaHtml}</span> <span class="pos">${esc(pos)}</span>${site.sourceNotes[source] ?? ""}</div>
      ${readingsHtml(readings)}
      ${props.length ? `<div class="props">${esc(props.join(" · "))}</div>` : ""}
      ${occurs}
      <div class="paradigm-slot"></div>
      ${dictionaryBlock}
    </div>`;
  });
  const note = enclitic
    ? `<p class="props">This written form combines ${combined} grammatical words.</p>`
    : candidates
      ? `<p class="props">Possible analyses (the edition does not annotate this word):</p>`
      : "";
  body.innerHTML = note + blocks.join("");
  applyScript(body);
  const [hits, tableRecords] = await Promise.all([
    Promise.all([...lemmasShown].map(async (lemma) => [lemma, await dictionary(lemma)] as const)).then(
      (entries) => new Map(entries),
    ),
    Promise.all([...lemmasShown].map(async (lemma) => [lemma, lang.tables ? await paradigms(lemma) : []] as const)).then(
      (entries) => new Map(entries),
    ),
  ]);
  const partNames = new Set([...hits.values()].flatMap((hit) => hit?.parts ?? []));
  const parts = new Map(await Promise.all([...partNames].map(async (part) => [part, await dictionary(part)] as const)));
  if (selected !== el) return;
  body.querySelectorAll<HTMLElement>(".an").forEach((block) => {
    const index = Number(block.dataset.i);
    const readings = groups[index]!;
    const [lemma, morph, source] = readings[0]!;
    const tables = lang.tables;
    const paradigm = tables && selectParadigm(tableRecords.get(lemma) ?? [], lemma, tables.kind(morph, lemma));
    if (tables && paradigm) {
      const highlight = readings.flatMap((reading) => tables.cells(reading[1], reading[0]));
      // An enclitic group's segments are fragments (vild + u for vildu), so its spelling is not noted.
      const segments = [...new Set(readings.map((reading) => reading[5]).filter(Boolean))];
      const form = enclitic ? undefined : segments.length === 1 ? segments[0] : word;
      block.querySelector(".paradigm-slot")!.outerHTML =
        `<details class="paradigm-details"${index === 0 ? " open" : ""}><summary>${tables.heading(paradigm.kind)}</summary>`
        + tables.html(paradigm, { id: `word-paradigm-${index}`, highlight, form }) + "</details>";
    } else {
      block.querySelector(".paradigm-slot")!.remove();
    }
    if (paradigm?.label) {
      const props = [...new Set(readings.flatMap((reading) =>
        lang.describeMorph(reading[1], { tableLabel: paradigm.label }).props))];
      const area = block.querySelector<HTMLElement>(".props");
      if (area) {
        area.textContent = props.join(" · ");
        area.hidden = !props.length;
      }
    }
    const content = dictionaryHtml(hits.get(lemma), { lemma, morph, work: slug, parts, properNoun: source === "n" });
    block.querySelector(".dict-slot")!.outerHTML = `<div class="dict">${content}</div>`;
  });
  applyScript(body);
}

function showNote(key: string) {
  selected?.classList.remove("sel");
  selected = null;
  title.textContent = "Translator’s note";
  title.removeAttribute("lang");
  body.innerHTML = `<div class="wp-note">${notes[key] ?? ""}</div><p class="props">${site.noteCredit}</p>`;
  panel.hidden = false;
  document.body.classList.add("panel-open");
}

text.addEventListener("click", (e) => {
  const target = e.target as HTMLElement;
  const w = target.closest<HTMLElement>(".w");
  if (w) return void showWord(w);
  const n = target.closest<HTMLElement>(".note-btn");
  if (n) showNote(n.dataset.note!);
});

// Highlight a word passed from the lexicon (?w=form#row).
const want = new URLSearchParams(location.search).get("w");
if (want && location.hash) {
  const row = document.getElementById(decodeURIComponent(location.hash.slice(1)));
  const hit = [...(row?.querySelectorAll<HTMLElement>(".w") ?? [])].find((w) => sourceText(w) === want);
  if (hit) {
    hit.classList.add("sel");
    selected = hit;
  }
}
