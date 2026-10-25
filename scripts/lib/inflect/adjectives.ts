// Zoëga adjective principal parts. Unsupported or contradictory notes deliberately produce no table.
// Gates use complete Wiktionary positive tables and fold-equivalent headwords, not spelling-bridge-only pairs.
// The regular consonant and assimilated classes clear 95% whole-table agreement; regular -ari/-astr comparison
// is gated separately. Smaller -ill, -all/-ull and explicitly marked ja/wa classes are regular ending patterns:
// their principal parts select the stem, with 100% agreement in the available examples.
// Unmarked -inn/-ig/-ug, vowel contraction, long-á umlaut and ambiguous ja/wa classes remain disabled below.
import type { DictEntry } from "../../../src/lib/dict";
import { fold } from "../../../src/lib/norse";
import type { Paradigm } from "../../../src/lib/paradigm";
import { isVowel, syncopate, syllables, uUmlaut, withT } from "./phonology";
import { grammarNotes, type Generated, type GrammarNote } from "./zoega";

type Cells = Paradigm["cells"];
interface Parts {
  feminine?: string;
  neuter?: string;
  accusative?: string[];
  comparative?: string[];
  superlative?: string[];
}
interface Stems {
  pattern: string;
  stem: string;
  vowel: string;
  u: string;
  r: string;
  feminine: string;
  neuter: string;
  accusative: string[];
  nominativePlural: string;
}

const FORM = "[a-záéíóúýæœöøǫǿðþ~’-]+";
const forms = (text: string): string[] => text.split(/\s+(?:or|and)\s+/).map((s) => s.trim());
const spelling = (s: string): string => s.normalize("NFC").replace(/[ǫø]/g, "ö").replace(/ǿ/g, "œ");

function principalParts(note: GrammarNote, headword: string): Parts | undefined {
  const parts: Parts = {};
  if (!note.paren) return parts;
  let rest = spelling(note.paren);
  const comparison = new RegExp(`(?:comp(?:ar)?\\.|compar\\.)\\s*(${FORM}(?: or ${FORM})*)`, "g");
  rest = rest.replace(comparison, (_: string, value: string) => {
    parts.comparative = forms(value).map((form) => form.startsWith("~") ? headword + form.slice(1) : form);
    return "";
  });
  rest = rest.replace(new RegExp(`superl\\.\\s*(${FORM}(?: or ${FORM})*)`, "g"), (_: string, value: string) => {
    parts.superlative = forms(value).map((form) => form.startsWith("~") ? headword + form.slice(1) : form);
    return "";
  });
  rest = rest.replace(new RegExp(`acc(?:us)?\\.\\s*(${FORM}(?: (?:or|and) ${FORM})*)`, "g"),
    (_: string, value: string) => {
      parts.accusative = forms(value).map((form) => {
        if (form.startsWith("~")) return headword + form.slice(1);
        if (form.startsWith("-")) return headword.slice(0, -1) + form.slice(1);
        return form;
      });
      return "";
    });
  rest = rest.replace(new RegExp(`neut\\.\\s*(${FORM})`, "g"), (_: string, value: string) => {
    parts.neuter = value;
    return "";
  });
  rest = rest.replace(/^[\s,;]+|[\s,;]+$/g, "");
  if (rest) {
    const pair = rest.match(new RegExp(`^(${FORM})[,.;]\\s*(${FORM})$`));
    if (!pair) return undefined;
    if (!pair[2]!.endsWith("t") && !pair[2]!.endsWith("str")) return undefined;
    if (pair[1]!.endsWith("ri") && pair[2]!.endsWith("str")) {
      parts.comparative = [pair[1]!];
      parts.superlative = [pair[2]!];
    } else {
      parts.feminine = pair[1]!;
      parts.neuter = pair[2]!;
    }
  }
  return parts;
}

function stems(headword: string, parts: Parts): Stems | undefined {
  if (!/^[a-záéíóúýæœöðþ]+$/.test(headword)) return undefined;
  let stem: string;
  let pattern: string;
  if (/(?:ill|all|ull|inn)$/.test(headword) && !/(?:einn|auinn)$/.test(headword)
    && syllables(headword) > 1) {
    stem = headword.slice(0, -1);
    pattern = headword.endsWith("inn") ? "inn" : headword.endsWith("ill") ? "ill" : "all-ull";
  } else if (/(?:ll|nn|ss)$/.test(headword)) {
    stem = headword.slice(0, -1);
    pattern = "assimilated";
  } else if (headword.endsWith("r")) {
    stem = /(?:fagr|magr|dapr|snotr)$/.test(headword) || /^(?:vitr|ítr)$/.test(headword)
      ? headword : headword.slice(0, -1);
    if (parts.accusative?.[0] === headword + "an") stem = headword;
    pattern = isVowel(stem.at(-1)) ? "vowel" : "consonant";
  } else if (/[ln]$/.test(headword) && !isVowel(headword.at(-2))) {
    stem = headword;
    pattern = "consonant";
  } else return undefined;
  // Short-vowel ss and urr/yrr are genuine stem consonants, not an assimilated nominative ending.
  if ((/ss$/.test(headword) && !/(?:[áéíóúýæœ]|au|ei|ey)ss$/.test(headword))
    || /(?:[uy]rr|þverr)$/.test(headword)) stem = headword;
  let vowel = stem;
  if (["inn", "ill", "all-ull"].includes(pattern)
    || (/[iu]g$/.test(stem) && !/lig$/.test(stem) && syllables(stem) > 1)) vowel = syncopate(stem);
  if (headword.endsWith("lítill")) vowel = vowel.slice(0, -4) + "litl";
  if (parts.accusative?.[0]?.endsWith("an") && !/[jv]an$/.test(parts.accusative[0])) {
    vowel = parts.accusative[0].slice(0, -2);
  }
  const r = isVowel(stem.at(-1)) ? stem + "rr"
    : /(?:rr|ss)$/.test(stem) ? stem
    : /[lnsr]$/.test(stem) && stem.at(-1) !== stem.at(-2) ? headword : stem + "r";
  let neuter = withT(stem);
  if (stem.endsWith("góð")) neuter = stem.slice(0, -3) + "gott";
  if (pattern === "inn" || pattern === "ill") neuter = stem.slice(0, -1) + "t";
  if (stem.endsWith("að")) neuter = stem.slice(0, -1) + "t";
  let accusative = [vowel + "an"];
  if (pattern === "ill") accusative = [stem.slice(0, -1) + "nn"];
  let nominativePlural = vowel + "ir";
  let u = uUmlaut(vowel, /(?:að|ast)$/.test(vowel));
  if (parts.accusative?.some((f) => /[jv]an$/.test(f))) {
    const accStem = parts.accusative.find((f) => /[jv]an$/.test(f))!.slice(0, -2);
    vowel = accStem;
    pattern = accStem.endsWith("j") ? "ja" : "wa";
    // Short-vowel wa-stems lose v before u; ja-stems retain j. nýr has nýir, not nýjir.
    u = accStem.endsWith("j") ? uUmlaut(accStem) : uUmlaut(stem);
    nominativePlural = headword.endsWith("ýr") ? stem + "ir" : vowel + "ir";
    if (pattern === "ja" && !isVowel(stem.at(-1))) nominativePlural = stem + "ir";
  }
  return {
    pattern, stem, vowel, u, r,
    feminine: parts.feminine ?? uUmlaut(stem, pattern === "all-ull" || /(?:að|ast)$/.test(stem)),
    neuter: parts.neuter ?? neuter,
    accusative: parts.accusative ?? accusative,
    nominativePlural,
  };
}

function positive(headword: string, s: Stems, strong = "str", weak = "wk"): Cells {
  const cells: Cells = {};
  const put = (mode: string, code: string, form: string | string[]) => {
    cells[`${mode}|${code}`] = typeof form === "string" ? [form] : form;
  };
  const str: Record<string, string | string[]> = {
    nsm: headword, nsf: s.feminine, nsn: s.neuter,
    asm: s.accusative, asf: s.vowel + "a", asn: s.neuter,
    dsm: s.u + "um", dsf: s.r + "i", dsn: s.u + "u",
    gsm: s.stem.replace(/rr$/, "r") + "s", gsf: s.r + "ar",
    gsn: s.stem.replace(/rr$/, "r") + "s",
    npm: s.nominativePlural, npf: s.vowel + "ar", npn: s.feminine,
    apm: s.vowel + "a", apf: s.vowel + "ar", apn: s.feminine,
    dp: s.u + "um", gp: s.r + "a",
  };
  for (const [code, form] of Object.entries(str)) put(strong, code, form);
  for (const c of "nadg") for (const n of "sp") {
    for (const g of n === "p" && /[dg]/.test(c) ? [""] : ["m", "f", "n"]) {
      const code = c + n + g;
      const form = code === "dp" ? s.u + "um" : n === "p" ? s.u + "u"
        : g === "f" ? c === "n" ? s.vowel + "a" : s.u + "u"
        : code === "nsm" ? (s.pattern === "ja" && !isVowel(s.stem.at(-1)) ? s.stem : s.vowel) + "i"
        : s.vowel + "a";
      put(weak, code, form);
    }
  }
  return cells;
}

function comparative(headword: string): Cells | undefined {
  if (!/ri$/.test(headword)) return undefined;
  const stem = headword.slice(0, -1);
  const u = uUmlaut(stem, /arr?$/.test(stem)).replace(/v(?=ur$)/, "");
  const cells: Cells = {};
  for (const c of "nadg") for (const n of "sp") {
    for (const g of n === "p" && /[dg]/.test(c) ? [""] : ["m", "f", "n"]) {
      const code = c + n + g;
      cells[`comp|${code}`] = [code === "dp" ? u + "um"
        : n === "p" || g === "f" || code === "nsm" ? headword : stem + "a"];
    }
  }
  return cells;
}

function checkedTable(
  cells: Cells,
  label: string,
  note: GrammarNote,
  attested: Paradigm["attested"] | undefined,
): Generated | undefined {
  for (const [key, forms] of Object.entries(attested ?? {})) {
    const generated = cells[key];
    if (!generated) continue;
    if (Object.keys(forms).some((form) => !generated.some((candidate) =>
      fold(candidate.replace(/ǿ/g, "œ")) === fold(form.replace(/ǿ/g, "œ"))))) return undefined;
  }
  return { cells, label, note: note.text };
}

/** Generate only inflecting adjectives with a recognized Zoëga grammar note and consistent edition evidence. */
export function inflectAdjective(
  headword: string,
  entry: DictEntry,
  attested?: Paradigm["attested"],
): Generated | undefined {
  headword = spelling(headword.toLowerCase());
  const notes = grammarNotes(entry).filter((n) => n.pos === "a.");
  if (!notes.length || new Set(notes.map((n) => n.paren)).size > 1) return undefined;
  const note = notes[0]!;
  const parts = principalParts(note, headword);
  if (!parts) return undefined;
  const degree = entry.d.join(" ").replace(/<[^>]+>/g, "").match(/\ba\.\s*(compar\.|superl\.)/)?.[1];
  if (degree === "compar.") {
    const cells = comparative(headword);
    return cells ? checkedTable(cells, "comparative adjective", note, attested) : undefined;
  }
  const s = stems(headword, parts);
  if (!s) return undefined;
  if (degree === "superl.") {
    return checkedTable(positive(headword, s, "str_sup", "wk_sup"), "superlative adjective", note, attested);
  }
  // -inn's accusative and neuter alternatives did not clear the validation gate. Neither did unmarked
  // ja/wa-stems, vowel contraction, variable -ig/-ug syncope or the historical long-á umlaut classes.
  if ((s.pattern === "vowel" && !parts.accusative)
    || s.pattern === "inn"
    || (/[iu]gr$/.test(headword) && !/ligr$/.test(headword) && syllables(headword) > 1 && !parts.accusative)
    || /(?:annarr|saðr|ölr|kykr|styggr|eygr|tólfvetr|harðgörr)$/.test(headword)
    || /^(?:ríkr|miðr)$/.test(headword)
    || /(?:[uy]rr|err|énn)$/.test(headword)
    || /á[^aeiouyáéíóúýæœö]*r$/.test(headword)
    || (s.stem.endsWith("að") && syllables(s.stem) === 1 && !parts.neuter)
    || (s.pattern === "wa" && s.stem.endsWith("gg"))
    || parts.superlative?.some((form) => !/(?:rstr|astr)$/.test(form))
    || (s.pattern === "ja" && parts.accusative?.some((f) => !f.endsWith("jan")))) return undefined;
  const cells = positive(headword, s);
  // Regular comparison is separate from positive declension. Known inherited/suppletive classes require
  // a comparison explicitly printed by Zoëga; a regular positive table never licenses an irregular degree.
  const regularComparison = !/(?:góðr|langr|rangr|öngr|vándr|margr|mærr|sœmr|frægr)$/.test(headword)
    && !/(?:skammr|fjölmennr|gamall|ill|nn)$/.test(headword) && !/^(?:allr|sumr|slíkr)$/.test(headword);
  const comparison = parts.comparative ?? (regularComparison ? [s.vowel + "ari"] : []);
  for (const form of comparison) {
    const generated = comparative(form);
    if (!generated) continue;
    for (const [key, values] of Object.entries(generated)) {
      cells[key] = [...new Set([...(cells[key] ?? []), ...values])];
    }
  }
  const superlatives = parts.superlative
    ?? (parts.comparative || !regularComparison ? [] : [s.vowel + "astr"]);
  for (const form of superlatives) {
    const sup = stems(form, {});
    if (!sup) continue;
    if (s.pattern === "wa" && form.endsWith("vastr")) {
      sup.u = s.u + "ust";
      sup.feminine = sup.u;
    }
    for (const [key, values] of Object.entries(positive(form, sup, "str_sup", "wk_sup"))) {
      cells[key] = [...new Set([...(cells[key] ?? []), ...values])];
    }
  }
  return checkedTable(cells, `strong and weak adjective (${s.pattern})`, note, attested);
}
