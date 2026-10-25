// Reader page behaviour: column view, word panel, translator's notes, go-to, citation links, reading position.
import { decodeMsa, fold, shardOf } from "../lib/norse";

type ClientAnalysis = [lemma: string, msa: string, source: "e" | "a" | "w", slug: string, count: number];
interface DictHit {
  z?: { w: string; d: string[] }[];
  c?: { w: string; d: string[] }[];
  w?: { pos: string; glosses: string[] }[];
}

const BASE = import.meta.env.BASE_URL.replace(/\/?$/, "/");
const json = <T,>(id: string): T => JSON.parse(document.getElementById(id)?.textContent ?? "null") as T;
const analyses = json<ClientAnalysis[]>("analyses");
const notes = json<Record<string, string>>("notes");
const rowIds = new Set(json<string[]>("row-ids"));
const text = document.querySelector<HTMLElement>(".text")!;
const slug = text.dataset.slug!;
const abbr = text.dataset.abbr!;

// ------------------------------------------------------------ view toggle
const VIEW_KEY = "edda-view";
function setView(view: string) {
  document.body.classList.remove("view-on", "view-both", "view-en");
  document.body.classList.add(`view-${view}`);
  for (const b of document.querySelectorAll<HTMLButtonElement>("[data-view]"))
    b.setAttribute("aria-pressed", String(b.dataset.view === view));
  localStorage.setItem(VIEW_KEY, view);
}
if (document.querySelector("[data-view]")) setView(localStorage.getItem(VIEW_KEY) ?? "both");
for (const b of document.querySelectorAll<HTMLButtonElement>("[data-view]"))
  b.addEventListener("click", () => setView(b.dataset.view!));

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
  const want = input.value.trim();
  if (!want) return;
  // Exact row id, else the row containing a stanza with that label.
  if (rowIds.has(want) && jump(want)) return;
  for (const lab of text.querySelectorAll<HTMLElement>(".col.on .slabel, .col.on .chap, .col.en .slabel")) {
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
    if (top) localStorage.setItem("edda-last", JSON.stringify({ slug, row: (top.target as HTMLElement).id }));
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
  return p.then((s) => s[fold(lemma)]);
}

const SOURCE_NOTE: Record<ClientAnalysis[2], string> = {
  e: "",
  a: `<span class="badge" title="Not annotated here; this spelling is annotated this way elsewhere in the Codex Regius edition">candidate</span>`,
  w: `<span class="badge" title="Not annotated here; candidate from Wiktionary inflection tables">candidate</span>`,
};

function dictHtml(hit: DictHit | undefined): string {
  if (!hit) return `<div class="dict"><p class="wp-empty">No dictionary entry found.</p></div>`;
  const parts: string[] = [];
  if (hit.z?.length)
    parts.push(
      `<h4>Zoëga</h4>${hit.z.map((e) => `<p><b>${esc(e.w)}</b> ${e.d.join(" ")}</p>`).join("")}`,
    );
  if (hit.w?.length && !hit.z?.length)
    parts.push(`<h4>Wiktionary</h4>${hit.w.map((e) => `<p><i>${esc(e.pos)}</i> ${esc(e.glosses.join("; "))}</p>`).join("")}`);
  if (hit.c?.length)
    parts.push(
      `<details><summary>Cleasby–Vigfússon</summary>${hit.c.map((e) => `<p><b>${esc(e.w)}</b> ${esc(e.d.join(" "))}</p>`).join("")}</details>`,
    );
  return `<div class="dict">${parts.join("")}</div>`;
}

async function showWord(el: HTMLElement) {
  selected?.classList.remove("sel");
  selected = el;
  el.classList.add("sel");
  const ids = (el.dataset.a ?? "").split(" ").filter(Boolean).map(Number);
  title.textContent = el.textContent ?? "";
  panel.hidden = false;
  document.body.classList.add("panel-open");
  if (!ids.length) {
    const form = encodeURIComponent(el.textContent ?? "");
    body.innerHTML = `<p class="wp-empty">No analysis is available for this form.</p><p><a href="${BASE}lexicon/?q=${form}">Search the lexicon</a> · <a href="${BASE}search/?q=${form}">Find other passages</a></p>`;
    return;
  }
  const items = ids.map((id) => analyses[id]!).filter(Boolean);
  const blocks = items.map(([lemma, msa, source, lemmaSlug, count], i) => {
    const m = decodeMsa(msa);
    const lemmaHtml = lemmaSlug ? `<a href="${BASE}lexicon/${encodeURIComponent(lemmaSlug)}/">${esc(lemma)}</a>` : esc(lemma);
    const occurs = lemmaSlug && count ? `<div class="meta">${count.toLocaleString("en")} occurrence${count === 1 ? "" : "s"} in the reader · <a href="${BASE}lexicon/${encodeURIComponent(lemmaSlug)}/">concordance</a></div>` : "";
    return `<div class="an" data-i="${i}">
      <div><span class="lemma">${lemmaHtml}</span> <span class="pos">${esc(m.pos)}</span>${SOURCE_NOTE[source]}</div>
      ${m.form ? `<p class="form">${esc(m.form)}</p>` : ""}
      ${m.props.length ? `<div class="props">${esc(m.props.join(" · "))}</div>` : ""}
      ${occurs}
      <div class="dict-slot"><p class="wp-empty">Loading dictionary…</p></div>
    </div>`;
  });
  const note =
    items.length > 1 && items.every((a) => a[2] === "e")
      ? `<p class="props">This written form combines ${items.length} grammatical words.</p>`
      : items.some((a) => a[2] !== "e")
        ? `<p class="props">Possible analyses (the edition does not annotate this word):</p>`
        : "";
  body.innerHTML = note + blocks.join("");
  // Several analyses can share a lemma; fetch each dictionary entry once.
  const unique = [...new Set(items.map((a) => a[0]))];
  const hits = new Map(await Promise.all(unique.map(async (l) => [l, await dictionary(l)] as const)));
  if (selected !== el) return;
  const shown = new Set<string>();
  body.querySelectorAll<HTMLElement>(".an").forEach((block) => {
    const lemma = items[Number(block.dataset.i)]![0];
    const slot = block.querySelector(".dict-slot")!;
    if (shown.has(lemma)) slot.remove();
    else slot.outerHTML = dictHtml(hits.get(lemma));
    shown.add(lemma);
  });
}

function showNote(key: string) {
  selected?.classList.remove("sel");
  selected = null;
  title.textContent = "Translator’s note";
  body.innerHTML = `<div class="wp-note">${notes[key] ?? ""}</div><p class="props">Henry Adams Bellows, The Poetic Edda (1923).</p>`;
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
  const hit = [...(row?.querySelectorAll<HTMLElement>(".w") ?? [])].find((w) => w.textContent === want);
  if (hit) {
    hit.classList.add("sel");
    selected = hit;
  }
}
