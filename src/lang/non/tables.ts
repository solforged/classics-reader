// Old Norse inflection tables for the word panel and the lemma pages.
import type { Paradigm } from "../../lib/paradigm";
import type { TableOptions } from "../types";
import { fold } from "./spelling";

const CASES = [["n", "nominative"], ["a", "accusative"], ["d", "dative"], ["g", "genitive"]] as const;
const GENDERS = [["m", "masculine"], ["f", "feminine"], ["n", "neuter"]] as const;
const MODES = [
  ["str", "strong"], ["wk", "weak"], ["comp", "comparative"],
  ["str_sup", "superlative strong"], ["wk_sup", "superlative weak"],
] as const;
const PERSONS = [["1", "1st"], ["2", "2nd"], ["3", "3rd"], ["r", "reflexive"]] as const;
const DEFAULT_PERSON: Record<string, string> = { ek: "1", þú: "2", hann: "3", hon: "3", sik: "r", sín: "r" };
const VERB_ROWS = ["1sg", "2sg", "3sg", "1pl", "2pl", "3pl"] as const;
const esc = (value: string): string => value.replace(/&/g, "&amp;").replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** Shared, framework-free inflection tables. Switches use native radios and CSS; no client script is needed. */
export function paradigmHtml(paradigm: Paradigm, options: TableOptions): string {
  const highlighted = new Set(options.highlight ?? []);
  const written = options.form?.trim();
  const writtenKey = written ? fold(written.replace(/ǿ/g, "œ")) : "";
  const spelled = (value: string) => fold(value.replace(/ǿ/g, "œ")) === writtenKey;
  // The written form is noted once, on the first highlighted cell, and only when no highlighted cell displays it.
  let noted = !written || [...highlighted].some((key) =>
    (paradigm.cells[key]?.length ? paradigm.cells[key]! : Object.keys(paradigm.attested[key] ?? {})).some(spelled));
  const keys = [...new Set([...Object.keys(paradigm.cells), ...Object.keys(paradigm.attested)])];
  const has = (key: string): boolean => Boolean(paradigm.cells[key]?.length)
    || Object.values(paradigm.attested[key] ?? {}).some((count) => count > 0);
  const hasPrefix = (prefix: string): boolean => keys.some((key) => key.startsWith(prefix) && has(key));

  function cell(cellKeys: string | readonly string[], tag = "td", attributes = ""): string {
    const names = typeof cellKeys === "string" ? [cellKeys] : cellKeys;
    const forms = [...new Set(names.flatMap((key) => paradigm.cells[key] ?? []))];
    const attested: Record<string, number> = {};
    for (const key of names) {
      for (const [form, count] of Object.entries(paradigm.attested[key] ?? {})) {
        attested[form] = (attested[form] ?? 0) + count;
      }
    }
    const attestedForms = Object.keys(attested);
    const shown = forms.length ? forms : attestedForms;
    const count = Object.values(attested).reduce((sum, value) => sum + value, 0);
    const note = count ? `attested ${count}× in the Eddas: ${attestedForms.join(", ")}` : "";
    const title = [shown.join(" / "), note].filter(Boolean).join("\n");
    const current = names.some((key) => highlighted.has(key));
    const classes = ["para-cell", current ? "is-current" : "", !shown.length ? "is-empty" : ""]
      .filter(Boolean).join(" ");
    const marker = count ? `<span class="para-attested" aria-label="${esc(note)}">·</span>` : "";
    const form = shown.length ? shown.slice(0, 2).map(esc).join(" / ") : "—";
    const here = current && !noted ? `<small class="para-here">here: <span lang="non">${esc(written!)}</span></small>` : "";
    if (here) noted = true;
    return `<${tag} class="${classes}" data-cell="${esc(names.join(" "))}" title="${esc(title)}"${attributes}>`
      + `${current ? '<span class="para-sr">Clicked reading: </span>' : ""}`
      + `<span lang="non">${form}</span>${marker}${here}</${tag}>`;
  }

  /** A table; inside a disclosure whose summary names it, the caption is left out. */
  function table(caption: string, columns: readonly string[], rows: string): string {
    return `<table class="para-table">${caption ? `<caption>${esc(caption)}</caption>` : ""}<thead><tr>`
      + `<th scope="col"><span class="para-sr">Case or person</span></th>`
      + columns.map((column) => `<th scope="col">${column}</th>`).join("")
      + `</tr></thead><tbody>${rows}</tbody></table>`;
  }

  function tabs(
    name: string,
    choices: readonly (readonly [string, string])[],
    selected: string,
    content: (value: string) => string,
  ): string {
    if (choices.length === 1) return content(choices[0]![0]);
    return `<div class="para-tabs" role="group" aria-label="${esc(name)}">`
      + choices.map(([value, label]) => {
        const id = `${options.id}-${value}`;
        return `<label class="para-tab" for="${esc(id)}"><input type="radio" id="${esc(id)}" `
          + `name="${esc(options.id)}" value="${esc(value)}"${value === selected ? " checked" : ""}>`
          + `<span>${esc(label)}</span></label><div class="para-variant">${content(value)}</div>`;
      }).join("") + "</div>";
  }

  function noun(definiteness: string): string {
    // Names often have no plural; drop a number column with no forms at all.
    const filled = (number: string) => CASES.some(([code]) => {
      const key = `|${code}${number}${definiteness}`;
      return (paradigm.cells[key]?.length ?? 0) > 0 || Object.keys(paradigm.attested[key] ?? {}).length > 0;
    });
    const numbers = (["s", "p"] as const).filter(filled);
    const shown = numbers.length ? numbers : (["s", "p"] as const);
    return table(definiteness === "d" ? "With article" : "Without article",
      shown.map((number) => (number === "s" ? "singular" : "plural")),
      CASES.map(([code, label]) => `<tr><th scope="row">${label}</th>`
        + shown.map((number) => cell(`|${code}${number}${definiteness}`)).join("") + "</tr>").join(""));
  }

  function genderTables(mode: string): string {
    return ["s", "p"].map((number) => table(number === "s" ? "Singular" : "Plural",
      GENDERS.map(([code, label]) => `<abbr title="${label}">${code}</abbr>`),
      CASES.map(([code, label]) => {
        const prefix = `${mode}|${code}${number}`;
        const cells = number === "p" && (code === "d" || code === "g")
          ? cell([prefix, ...GENDERS.map(([gender]) => `${prefix}${gender}`)], "td", ' colspan="3"')
          : GENDERS.map(([gender]) => cell(`${prefix}${gender}`)).join("");
        return `<tr><th scope="row">${label}</th>${cells}</tr>`;
      }).join(""))).join("");
  }

  function verb(mode: string): string {
    const principal = [
      ["infinitive", "infinitive"], ["pres_ind_3sg", "3sg present"], ["past_ind_3sg", "3sg past"],
      ["past_ind_3pl", "3pl past"], ["past_part", "past participle"],
    ];
    const parts = `<dl class="para-principal">${principal.map(([key, label]) =>
      `<div><dt>${label}</dt>${cell(`${mode}|${key}`, "dd")}</div>`).join("")}</dl>`;
    const focus = [...highlighted].map((key) => {
      if (mode === "act" && key.startsWith("pp_")) return "part";
      if (!key.startsWith(`${mode}|`)) return undefined;
      const code = key.slice(mode.length + 1);
      if (code.endsWith("_part")) return "part";
      if (code.startsWith("pres_")) return "pres";
      if (code.startsWith("past_")) return "past";
      if (code.startsWith("impr_")) return "impr";
      return undefined;
    }).find(Boolean) ?? "pres";
    const section = (key: string, label: string, content: string) =>
      `<details class="para-block" data-block="${key}"${focus === key ? " open" : ""}>`
      + `<summary>${label}</summary>${content}</details>`;
    const tenses = (["pres", "past"] as const).map((tense) => {
      const label = tense === "pres" ? "Present" : "Past";
      return section(tense, label, table("", ["indicative", "subjunctive"], VERB_ROWS.map((person) =>
        `<tr><th scope="row">${person.replace("sg", " sg").replace("pl", " pl")}</th>`
          + cell(`${mode}|${tense}_ind_${person}`) + cell(`${mode}|${tense}_sub_${person}`) + "</tr>").join("")));
    }).join("");
    const imperativeRows = VERB_ROWS.filter((person) =>
      person === "2sg" || person === "1pl" || person === "2pl" || has(`${mode}|impr_${person}`));
    const imperative = `<div class="para-extra"><dl>`
      + imperativeRows.map((person) => `<div><dt>${person}</dt>${cell(`${mode}|impr_${person}`, "dd")}</div>`)
        .join("") + "</dl></div>";
    const declensions = mode === "act" ? ([["pp_str", "strong"], ["pp_wk", "weak"]] as const)
      .filter(([key]) => hasPrefix(`${key}|`)).map(([key, label]) =>
        `<details class="para-participle"${[...highlighted].some((cell) => cell.startsWith(`${key}|`)) ? " open" : ""}>`
        + `<summary>Past participle · ${label}</summary>${genderTables(key)}</details>`).join("") : "";
    const participles = `<div class="para-extra"><dl>`
      + `<div><dt>present</dt>${cell(`${mode}|pres_part`, "dd")}</div>`
      + `<div><dt>past</dt>${cell(`${mode}|past_part`, "dd")}</div></dl></div>${declensions}`;
    return parts + tenses + section("impr", "Imperative", imperative) + section("part", "Participles", participles);
  }

  function personal(person: string): string {
    if (person === "3") {
      return (["s", "p"] as const).map((number) => table(number === "s" ? "Singular" : "Plural",
        GENDERS.map(([code, label]) => `<abbr title="${label}">${code}</abbr>`),
        CASES.map(([code, label]) => `<tr><th scope="row">${label}</th>`
          + GENDERS.map(([gender]) => cell(`|3${code}${number}${gender}`)).join("") + "</tr>").join("")))
        .join("");
    }
    return table(person === "r" ? "Reflexive" : `${person === "1" ? "First" : "Second"} person`,
      ["singular", "dual", "plural"], CASES.map(([code, label]) => `<tr><th scope="row">${label}</th>`
        + ["s", "d", "p"].map((number) => cell(`|${person}${code}${number}`)).join("") + "</tr>").join(""));
  }

  let html: string;
  if (paradigm.kind === "noun") {
    const definite = keys.some((key) => /^\|[nadg][sp]d$/.test(key) && has(key));
    const open = [...highlighted].some((key) => /^\|[nadg][sp]d$/.test(key));
    html = noun("i") + (definite ? `<details class="para-article"${open ? " open" : ""}>`
      + `<summary>with article</summary>${noun("d")}</details>` : "");
  } else if (paradigm.kind === "adj") {
    const modes = MODES.filter(([mode]) => hasPrefix(`${mode}|`));
    const selected = modes.find(([mode]) => [...highlighted].some((key) => key.startsWith(`${mode}|`)))?.[0]
      ?? modes[0]?.[0] ?? "str";
    html = tabs("Adjective inflection", modes, selected, genderTables);
  } else if (paradigm.kind === "verb") {
    const voices = ([["act", "active"], ["mpass", "middle"]] as const)
      .filter(([mode]) => mode === "act" || hasPrefix(`${mode}|`));
    const selected = voices.find(([mode]) => [...highlighted].some((key) => key.startsWith(`${mode}|`)))?.[0]
      ?? (hasPrefix("act|") ? "act" : voices.at(-1)![0]);
    html = tabs("Verb voice", voices, selected, verb);
  } else if (paradigm.kind === "personal") {
    const persons = PERSONS.filter(([person]) => hasPrefix(`|${person}`));
    const selected = persons.find(([person]) => [...highlighted].some((key) => key.startsWith(`|${person}`)))?.[0]
      ?? persons.find(([person]) => person === DEFAULT_PERSON[paradigm.lemma])?.[0]
      ?? persons[0]?.[0] ?? "1";
    html = tabs("Personal pronoun", persons, selected, personal);
  } else {
    html = genderTables("");
  }
  const label = paradigm.label ? `<p class="para-label">${esc(paradigm.label)}</p>` : "";
  const source = paradigm.source === "edition"
    ? "Forms attested in the Eddas; no full table available"
    : paradigm.source === "zoega"
      ? `Generated from Zoëga’s entry${paradigm.note ? `: <span lang="non">${esc(paradigm.note)}</span>` : "."} `
        + "Forms without a dot are not attested in the annotated poems; check them against a grammar."
      : paradigm.source === "name"
        ? `Generated from the name’s ending and gender${paradigm.note ? ` (${esc(paradigm.note)})` : ""}. `
          + "Forms without a dot are not attested in the annotated poems; check them against a grammar."
        : "Table: Wiktionary";
  return `<div class="paradigm" data-kind="${paradigm.kind}">${label}${html}`
    + `<p class="para-source">${source}</p></div>`;
}
