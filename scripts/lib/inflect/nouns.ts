// Conservative Zoëga noun declensions, validated cell-by-cell against complete Wiktionary noun tables.
// Enabled broad patterns clear 95% completely correct lemmas; smaller classes require explicit principal parts.
// Unmarked masculine a-/i-stems, general feminine ō-/i-stems, unmarked weak-feminine genitive plurals,
// ambiguous j-/v-stems and unspecified contraction are intentionally refused. Definite forms are not inferred.
import type { DictEntry } from "../../../src/lib/dict";
import { fold } from "../../../src/lang/non/spelling";
import type { Paradigm } from "../../../src/lib/paradigm";
import { grammarNotes, type Generated, type GrammarNote } from "./zoega";
import { isVowel, syllables, syncopate, uUmlaut } from "./phonology";

type Cells = Generated["cells"];
interface NoteForms {
  forms: Record<string, string[]>;
}

/** The nominative's -r, including its assimilated -l/-n, is not part of an a-/i-stem. */
function masculineStem(word: string): string {
  if (/([ln])\1$/.test(word)) return word.slice(0, -1);
  if (word.endsWith("r")) return word.slice(0, -1);
  return word;
}

function nominalCells(forms: (string | string[])[], pluralOnly = false): Cells {
  const keys = pluralOnly ? ["npi", "api", "dpi", "gpi"] : ["nsi", "asi", "dsi", "gsi", "npi", "api", "dpi", "gpi"];
  return Object.fromEntries(keys.map((key, i) => {
    const form = forms[i]!;
    return [`|${key}`, typeof form === "string" ? [form] : form];
  }));
}

function expand(form: string, word: string, stem: string): string | undefined {
  if (/^[\p{L}]+$/u.test(form)) return form;
  if (!/^[-~][\p{L}]+$/u.test(form)) return undefined;
  const suffix = form.slice(1);
  if (form.startsWith("~")) return word + suffix;
  if (/^(?:rs|rar|ra)$/.test(suffix) && word.endsWith("r")) return word.slice(0, -1) + suffix;
  if (!/^(?:s|ar|ir|is|i|a|u|ur|um|jar|ja|ju|jum|endr|jendr)$/.test(suffix)) return undefined;
  return stem + suffix;
}

/** Accept complete case-labelled clauses and the dictionary's compact genitive/plural pair, nothing else. */
function parseNote(note: GrammarNote, word: string, stem: string): NoteForms | undefined {
  const text = note.paren.replace(/\bdat(?=\s)/g, "dat.").replace(/\bpl,(?=\s)/g, "pl.");
  if (!text) return { forms: {} };
  const forms: Record<string, string[]> = {};
  if (/^-[\p{L}]+, -[\p{L}]+$/u.test(text)) {
    const [gen, plural] = text.split(", ");
    const g = expand(gen!, word, stem);
    const p = expand(plural!, word, stem);
    return g && p ? { forms: { gsi: [g], npi: [p] } } : undefined;
  }
  let number = "s";
  let rest = text;
  while (rest) {
    const marker = rest.match(
      /^((?:gen|dat|acc|nom)\. pl\.|dat\. and acc\.|acc\. and dat\.|(?:gen|dat|acc|nom|pl)\.)\s*/,
    );
    if (!marker) return undefined;
    rest = rest.slice(marker[0].length);
    const next = rest.search(/[,;]\s*(?=(?:gen|dat|acc|nom|pl)\.)/);
    const value = (next < 0 ? rest : rest.slice(0, next)).trim();
    rest = next < 0 ? "" : rest.slice(next + 1).trim();
    const tag = marker[1]!;
    if (tag === "pl.") number = "p";
    const n = tag.includes(" pl.") ? "p" : number;
    const cases = tag === "pl." ? ["n"] : tag.startsWith("dat. and") || tag.startsWith("acc. and")
      ? ["d", "a"] : [tag[0]!];
    const values = value.split(/\s+(?:or|and)\s+|,\s*/).map((f) => expand(f, word, stem));
    if (!values.length || values.some((f) => !f)) return undefined;
    for (const c of cases) forms[`${c}${n}i`] = values as string[];
  }
  return { forms };
}

function override(cells: Cells, forms: Record<string, string[]>): void {
  for (const [key, values] of Object.entries(forms)) cells[`|${key}`] = values;
}

function generate(word: string, note: GrammarNote): Generated | undefined {
  const gender = note.pos[0];
  const pluralOnly = note.pos.includes("pl.") && !note.paren;
  if (!/^[mfn]\.(?: pl\.)?$/.test(note.pos)) return undefined;
  if (note.pos.includes("pl.") && note.paren) return undefined;
  let stem = gender === "m" || (gender === "f" && word.endsWith("r")) ? masculineStem(word) : word;
  if (gender === "m" && word.endsWith("i")) stem = word.slice(0, -1);
  if (gender === "f" && word.endsWith("a")) stem = word.slice(0, -1);
  if (gender === "n" && /[ia]$/.test(word)) stem = word.slice(0, -1);
  if (gender === "m" && /ir$/.test(word)) stem = word.slice(0, -2);
  const parsed = parseNote(note, word, stem);
  if (!parsed) return undefined;
  const explicit = parsed.forms;
  if (gender === "m" && explicit.gsi?.[0]?.endsWith("s") && !/[i]r?$/.test(word)) {
    stem = explicit.gsi[0].slice(0, -1);
  }
  let label: string;
  let cells: Cells;
  if (pluralOnly) {
    if (gender === "m" && word.endsWith("ar")) {
      stem = word.slice(0, -2);
      cells = nominalCells([word, word.slice(0, -1), uUmlaut(stem) + "um", stem + "a"], true);
      label = "masculine plural-only -ar";
    } else return undefined;
  } else if (gender === "n") {
    if (word.endsWith("a")) {
      if (!explicit.gpi) return undefined;
      const plural = explicit.npi ?? [uUmlaut(stem) + "u"];
      cells = nominalCells([word, word, word, word, plural, plural, uUmlaut(stem) + "um", stem + "na"]);
      label = "weak neuter -a";
    } else if (word.endsWith("i")) {
      // Loan nouns in -eri/-ýni and velar/geminate stems have ambiguous weak or j-less inflection.
      if (/(?:eri|ýni|kki|ngi)$/.test(word)) return undefined;
      const j = /(?<!k)k$|(?<!n)g$/.test(stem) ? "j" : "";
      cells = nominalCells([word, word, word, stem + "is", word, word, uUmlaut(stem) + j + "um", stem + j + "a"]);
      if (Object.entries(explicit).some(([key, values]) =>
        values.some((value) => !cells[`|${key}`]?.includes(value)))) return undefined;
      label = "neuter ja-stem -i";
    } else if (!isVowel(word.at(-1))) {
      // These endings also belong to contracted, consonant, v- and ja-stems; a bare gender cannot decide.
      if (!note.paren && /(?:arn|al|in|að|ak|höfuð|högg|kyn|mið|nef|gg|[st]|ráð|rán)$/.test(word)) {
        return undefined;
      }
      const oblique = explicit.dsi?.[0]?.endsWith("i") ? explicit.dsi[0].slice(0, -1) : word;
      const plural = explicit.npi ?? [uUmlaut(word)];
      const pluralStems = explicit.gpi?.map((g) => g.replace(/a$/, "")) ?? [oblique];
      if (explicit.gpi && !pluralStems.every((s) => s === word + "j" || s === oblique)) return undefined;
      if (explicit.gsi?.some((g) => g !== word + "s")) return undefined;
      if (note.paren.includes("gen. pl. -")) return undefined;
      const hasV = oblique === word + "v";
      const dativeStems = !explicit.gpi && explicit.npi && oblique === word
        ? explicit.npi : pluralStems.map((s) => uUmlaut(s));
      cells = nominalCells([word, word, oblique + "i", word.endsWith("ss") || word.endsWith("x") ? word : word + "s",
        plural, plural, hasV ? word + "um" : dativeStems.map((s) => s + "um"),
        pluralStems.map((s) => s + "a")]);
      label = explicit.gpi ? "neuter explicit plural stem"
        : oblique === word ? "neuter a-stem" : "neuter a-stem, explicit oblique";
    } else return undefined;
  } else if (gender === "m" && word.endsWith("i")) {
    if (/(?:andi|bóndi|frændi|fjándi|ari|vi|agi)$/.test(word) || isVowel(stem.at(-1))) return undefined;
    if (!note.paren && /ri$/.test(word)) return undefined;
    const jStem = explicit.npi?.some((p) => p.endsWith("jar")) || explicit.gsi?.some((g) => g.endsWith("ja"));
    if (jStem) stem += "j";
    const oblique = stem + "a";
    const plurals = explicit.npi ?? [stem + "ar"];
    if (!plurals.every((p) => p.endsWith("ar"))) return undefined;
    const pluralStems = plurals.map((p) => p.slice(0, -2));
    cells = nominalCells([word, oblique, oblique, oblique, plurals, pluralStems.map((s) => s + "a"),
      pluralStems.map((s) => uUmlaut(s) + "um"), stem + "a"]);
    label = jStem ? "weak masculine -i, j-stem" : "weak masculine -i";
  } else if (gender === "m" && word.endsWith("ir")) {
    if (word.endsWith("eyrir") && !explicit.npi) return undefined;
    if (explicit.gsi && !explicit.gsi.every((g) => g.endsWith("is"))) return undefined;
    const plural = explicit.npi ?? [stem + (/[gk]$/.test(stem) ? "jar" : "ar")];
    const pluralStems = plural.map((p) => p.replace(/ar$/, ""));
    cells = nominalCells([word, stem + "i", stem + "i", stem + "is", plural,
      pluralStems.map((s) => s + "a"), pluralStems.map((s) => uUmlaut(s) + "um"), pluralStems.map((s) => s + "a")]);
    label = "masculine ja-stem -ir";
  } else if (gender === "m") {
    if (explicit.gsi?.every((g) => g.endsWith("ar")) && explicit.dsi && explicit.npi
      && explicit.npi.every((p) => /r$/.test(p) && !/[ai]r$/.test(p))) {
      const bases = explicit.gsi.map((g) => g.slice(0, -2));
      cells = nominalCells([word, stem, explicit.dsi, explicit.gsi, explicit.npi, explicit.npi,
        bases.map((s) => uUmlaut(s) + "um"), bases.map((s) => s + "a")]);
      override(cells, explicit);
      return { cells, label: "masculine consonant stem, explicit principal parts", note: note.text };
    }
    if (explicit.gsi?.every((g) => g === stem + "s") && explicit.dsi?.every((d) => d === stem || d === stem + "i")
      && explicit.npi?.every((p) => p === stem + "ar" || p === stem + "ir")) {
      const plurals = explicit.npi;
      cells = nominalCells([word, stem, explicit.dsi, explicit.gsi, plurals,
        plurals.map((p) => p.slice(0, -1)), uUmlaut(stem) + "um", stem + "a"]);
      override(cells, explicit);
      return { cells, label: "masculine explicit a/i principal parts", note: note.text };
    }
    if (/(?:maðr|friðr|viðr|naðr|sk[ae]pr|fótr|eyrir)$/.test(word) && !note.paren) return undefined;
    const contracts = /(?:[aiu]ll|[aiu]nn|[au]rr)$/.test(word) && !/(?:ei|au|ey)[ln][ln]$/.test(word);
    const oblique = explicit.dsi?.[0]?.endsWith("i") ? explicit.dsi[0].slice(0, -1)
      : contracts ? syncopate(stem) : stem;
    const genitive = explicit.gsi ?? [/[sx]$/.test(stem) ? stem : stem + "s"];
    const plural = explicit.npi ?? [oblique + "ar"];
    const isU = !!explicit.api?.some((p) => p.endsWith("u"));
    const isI = !isU && plural.some((p) => p.endsWith("ir"));
    if (isI && (!/^-(?:s|ar), -ir$/.test(note.paren) || syllables(stem) !== 1)) return undefined;
    if (!plural.every((p) => /[ai]r$/.test(p))) return undefined;
    if (contracts) {
      if (!explicit.dsi || !explicit.npi) return undefined;
      const contracted = syncopate(stem);
      if (!explicit.dsi.every((d) => d === contracted + "i")
        || !explicit.npi.every((p) => p === contracted + "ar")) return undefined;
    }
    if (isU && (!explicit.gsi?.every((g) => g.endsWith("ar")) || !explicit.npi)) return undefined;
    const genStem = isI && /[eiyæœ]l?g$/.test(stem) ? stem + "j"
      : genitive.find((g) => g.endsWith("jar"))?.slice(0, -2)
        ?? (isU ? genitive[0]!.replace(/ar$/, "") : oblique);
    const pluralStem = plural[0]!.replace(/[ai]r$/, "");
    const aStem = !isI && !isU ? pluralStem : genStem;
    const dative = isU ? plural.map((p) => p.slice(0, -1)) : [isI ? stem : oblique + "i"];
    if (isU && explicit.dsi?.some((d) => !dative.includes(d))) return undefined;
    cells = nominalCells([word, isU ? uUmlaut(genStem) : stem, dative, genitive, plural,
      plural.map((p) => p.slice(0, -1)), uUmlaut(aStem) + "um", aStem + "a"]);
    label = isU ? "masculine u-stem, explicit" : isI ? "masculine i-stem"
      : contracts ? "masculine a-stem, explicit syncope"
        : note.paren === "-s, -ar" ? "masculine a-stem, explicit -s/-ar"
          : /(?:leikr|dómr|[iu]ngr)$/.test(word) ? "masculine productive a-stem suffix" : "";
  } else if (word.endsWith("a")) {
    if (isVowel(stem.at(-1)) || word.endsWith("kona")) return undefined;
    const oblique = explicit.gsi?.[0] ?? uUmlaut(stem, /ast$/.test(stem)) + "u";
    const plural = explicit.npi ?? [oblique.slice(0, -1) + "ur"];
    const jStem = stem.endsWith("j") && !/[gk]j$/.test(stem);
    if (!explicit.gpi && !jStem) return undefined;
    cells = nominalCells([word, oblique, oblique, oblique, plural, plural, oblique.slice(0, -1) + "um",
      jStem ? word : stem.replace(/j$/, "") + "na"]);
    label = "weak feminine -a, explicit/regular genitive plural";
  } else {
    if (!/(?:ing|ung)$/.test(word)) return undefined;
    const genitive = explicit.gsi ?? [stem + "ar"];
    const base = genitive[0]!.replace(/ar$/, "");
    const plural = explicit.npi ?? [base + "ar"];
    cells = nominalCells([word, word, word + "u", genitive, plural, plural, uUmlaut(base) + "um", base + "a"]);
    label = "feminine -ing/-ung";
  }
  if (!label) return undefined;
  override(cells, explicit);
  if (gender === "n" || gender === "f") {
    if (explicit.npi && !explicit.api) cells["|api"] = explicit.npi;
  }
  return { cells, label, note: note.text };
}

/** Decline a single unambiguous Zoëga noun section, refusing notes/classes that cannot be inferred safely. */
export function inflectNoun(
  headword: string,
  entry: DictEntry,
  attested?: Paradigm["attested"],
): Generated | undefined {
  if (!/^[\p{L}]+$/u.test(headword) || /^[A-ZÁÉÍÓÚÝÞÆÖ]/.test(headword)) return undefined;
  const notes = grammarNotes(entry).filter((note) => /^[mfn]\./.test(note.pos));
  if (notes.length !== 1) return undefined;
  const generated = generate(headword, notes[0]!);
  if (!generated) return undefined;
  for (const [key, forms] of Object.entries(attested ?? {})) {
    const expected = generated.cells[key];
    // Definite cells are deliberately not generated; their attestations cannot disprove an indefinite cell.
    if (!expected) continue;
    if (Object.keys(forms).some((form) => !expected.some((value) =>
      fold(form.replace(/ǿ/g, "œ")) === fold(value.replace(/ǿ/g, "œ"))))) return undefined;
  }
  return generated;
}
