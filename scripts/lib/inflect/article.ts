// The suffixed definite article (hestr → hestrinn): built from a noun's indefinite forms by gender, case and number.
// The article's i drops after an unstressed vowel ending (bogi → boginn, kona → konan, trúa → trúan); after a stressed
// one it stays before a final consonant (tré → tréit, á → áin) and drops before a vowel (ána, trénu, skónum). The
// dative plural drops its m before -num (hestum → hestunum, tám → tánum).
import type { Paradigm } from "../../../src/lib/paradigm";
import { isVowel } from "./phonology";

type Cells = Paradigm["cells"];
export type Gender = "m" | "f" | "n";

/** Article ending per gender and cell: [after a consonant, after a vowel]. */
const ARTICLE: Record<Gender, Record<string, readonly [string, string]>> = {
  m: { ns: ["inn", "nn"], as: ["inn", "nn"], ds: ["inum", "num"], gs: ["ins", "ns"], np: ["nir", "nir"], ap: ["na", "na"], gp: ["nna", "nna"] },
  f: { ns: ["in", "n"], as: ["ina", "na"], ds: ["inni", "nni"], gs: ["innar", "nnar"], np: ["nar", "nar"], ap: ["nar", "nar"], gp: ["nna", "nna"] },
  n: { ns: ["it", "t"], as: ["it", "t"], ds: ["inu", "nu"], gs: ["ins", "ns"], np: ["in", "n"], ap: ["in", "n"], gp: ["nna", "nna"] },
};

/** A final a, i or u that is not the second half of a diphthong (au, ei) is unstressed: kona, bogi, trúa, búi. */
function unstressedEnding(form: string): boolean {
  const last = form.at(-1) ?? "";
  const before = form.at(-2) ?? "";
  return /[aiu]/.test(last) && (!isVowel(before) || /[áéíóúýæœǿ]/.test(before));
}

function definite(form: string, gender: Gender, slot: string): string | undefined {
  if (slot === "dp") return form.endsWith("m") ? `${form.slice(0, -1)}num` : undefined;
  const endings = ARTICLE[gender][slot];
  if (!endings) return undefined;
  // Masculine plurals not ending in r take the full article: menn → menninir, mennina.
  if (gender === "m" && (slot === "np" || slot === "ap") && !isVowel(form.at(-1)) && !form.endsWith("r")) {
    return form + (slot === "np" ? "inir" : "ina");
  }
  if (!isVowel(form.at(-1))) return (form + endings[0]).replace(/nnn/, "nn");
  const [full, short] = endings;
  // A stressed vowel keeps the i only before a final consonant cluster: tréit, áin, but ána, trénu.
  const keepsI = !unstressedEnding(form) && /^i[^aeiou]+$/.test(full);
  return form + (keepsI ? full : short);
}
/** Definite cells (`|nsd` … `|gpd`) derived from the indefinite cells (`|nsi` … `|gpi`) of a noun of this gender. */
export function withArticle(cells: Cells, gender: Gender): Cells {
  const out: Cells = {};
  for (const [key, forms] of Object.entries(cells)) {
    const slot = key.match(/^\|([nadg][sp])i$/)?.[1];
    if (!slot) continue;
    const derived = forms.map((form) => definite(form, gender, slot)).filter((form): form is string => !!form);
    if (derived.length) out[`|${slot}d`] = [...new Set(derived)];
  }
  return out;
}
