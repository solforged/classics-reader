// Conservative conjugation from Zoëga's principal parts, validated against the cached Wiktionary conjugations.
// Enabled active patterns: -að (127/129 fully matching), -ða (30/31), class 2 (22/23); the other accepted
// dental suffixes and explicit short stems matched every cell. Classes 1 (without dental endings), 3 (i-stems),
// 4–5 and 6 have smaller samples but supply all four principal parts; their remaining endings are regular.
// The rare -sta/-pta/-nda notes repeat the stem's final cluster and use the same validated dental-suffix endings.
// Unknown/defective notes, unresolved d/ð and consonant-cluster variants, i-presents, reduplication and ambiguous
// homographs are deliberately refused. Middle -að passed separately (119/120); all other middle rules are disabled.
// Validation compares only available cells, folding ǿ as œ first, and skips tables lacking core finite forms.
import type { DictEntry } from "../../../src/lib/dict";
import { fold } from "../../../src/lang/non/spelling";
import type { Paradigm } from "../../../src/lib/paradigm";
import { dictionaryHeadword } from "../lexicon";
import { grammarNotes, type Generated, type GrammarNote } from "./zoega";
import { dentalCluster, iUmlaut, imperativeStem, verbUEnding, withPastT, withR, withSk } from "./phonology";

const PERSONS = ["1sg", "2sg", "3sg", "1pl", "2pl", "3pl"] as const;
const SUB_ENDINGS = ["a", "ir", "i", "im", "ið", "i"];
const WEAK_ENDINGS = ["a", "ir", "i", "um", "uð", "u"];

type Cells = Paradigm["cells"];
interface Parts {
  pattern: string;
  present: string;
  past: string;
  pastPlural?: string;
  participles: string[];
  weak: boolean;
  umlautPast: boolean;
}

/** A hyphenated note can repeat the stem's final consonants: beit + -tta → beitta, send + -nda → senda. */
function expand(stem: string, ending: string): string {
  let overlap = Math.min(stem.length, ending.length - 1);
  while (overlap && !stem.endsWith(ending.slice(0, overlap))) overlap--;
  return stem + ending.slice(overlap);
}

function principalParts(word: string, note: GrammarNote): Parts | undefined {
  const stem = word.slice(0, -1);
  const paren = note.paren.replace(/ø/g, "ö");
  if (paren === "að") return {
    pattern: "weak -að", present: word, past: `${word}ð`, participles: [`${word}ðr`], weak: true, umlautPast: false,
  };
  const suffix = paren.match(/^(-[ðdtnrlpmksf]+a), (-[ðdtnrlpmksf]+r|-t|-tt)$/);
  if (suffix) {
    const bare = stem.replace(/j$/, "");
    if (!["-da", "-ða", "-ta", "-dda", "-tta", "-sta", "-pta", "-nda"].includes(suffix[1]!)) return undefined;
    // The notes do not resolve variable d/ð after ng and diphthong+m, or the competing nn/k/g + t spellings.
    if (suffix[1] === "-da" && /(?:ng|(?:au|ei|ey)m)$/.test(bare)) return undefined;
    if (suffix[1] === "-ta" && /(?:g|nn|[æœ]k)$/.test(bare)) return undefined;
    const past = dentalCluster(expand(bare.replace(/v$/, ""), suffix[1]!.slice(1)).slice(0, -1));
    return {
      pattern: `weak dental suffix ${suffix[1]}`, present: `${bare}i`, past,
      participles: [`${past}r`], weak: true, umlautPast: false,
    };
  }
  const parts = paren.split(/\s*[;,]\s*/);
  if (parts.length === 4 && parts.every((s) => /^[a-záðéíóúýþæœö]+$/.test(s)) && parts[2]!.endsWith("um")) {
    if (!parts[3]!.endsWith("inn")) return undefined;
    const bare = stem.replace(/[jv]$/, "");
    if (parts[0] !== iUmlaut(bare) && parts[0] !== bare && parts[0] !== `${bare}i`) return undefined;
    const pattern = /í[^aeiouyáéíóúýæœö]*$/.test(stem) && /ei[^aeiouyáéíóúýæœö]*$/.test(parts[1]!)
      ? "strong class 1"
      : /au[^aeiouyáéíóúýæœö]*$/.test(parts[1]!) ? "strong class 2"
      : /[ó][^aeiouyáéíóúýæœö]*$/.test(parts[1]!) ? "strong class 6"
      : /á[^aeiouyáéíóúýæœö]*um$/.test(parts[2]!) ? "strong classes 4–5"
      : /u[^aeiouyáéíóúýæœö]*um$/.test(parts[2]!) ? "strong class 3"
      : "strong reduplicating or irregular";
    // Reduplication, broken class-3 stems and dental class-1 endings did not meet the full-table accuracy gate.
    if (pattern === "strong reduplicating or irregular") return undefined;
    if (pattern === "strong class 1" && stem.endsWith("t")) return undefined;
    if (pattern === "strong class 3" && !/i[^aeiouyáéíóúýæœö]*$/.test(stem)) return undefined;
    if (/[áéíóúý][^aeiouyáéíóúýæœö]{2}inn$/.test(parts[3]!)) return undefined;
    return {
      pattern, present: parts[0]!, past: parts[1]!,
      pastPlural: parts[2]!.slice(0, -2), participles: [parts[3]!], weak: false, umlautPast: true,
    };
  }
  const weak = paren.match(/^([a-záðéíóúýþæœö]+)[;,] ([a-záðéíóúýþæœö]+)[;,] (.+)$/);
  if (!weak || !/[ðdt][ai]$/.test(weak[2]!)) return undefined;
  const bare = stem.replace(/[jv]$/, "");
  // Excludes preterite-presents and defective notes, whose present singular does not follow either regular stem.
  if (![bare, `${bare}i`, iUmlaut(bare), `${iUmlaut(bare)}i`].includes(weak[1]!)) return undefined;
  const printed = weak[3]!.split(/, | or | and /);
  if (!printed.every((s) => /^[a-záðéíóúýþæœö]+(?:r|t|inn)$/.test(s))) return undefined;
  const participles = printed.map((s) => s.replace(/it$/, "iðr").replace(/at$/, "aðr").replace(/(?<![r])t$/, "tr"));
  // Explicit i-presents and these short-stem subclasses remain below the gate (missing/variable principal parts).
  if (weak[1] !== bare || /[aeiouyáéíóúýæœö]$/.test(bare)) return undefined;
  if (/[kt]t[ai]$/.test(weak[2]!) || /kt[ai]$/.test(weak[2]!)) return undefined;
  if (printed.length === 1 && printed[0]!.endsWith("inn")) return undefined;
  return {
    pattern: "weak short stem", present: weak[1]!,
    past: weak[2]!.slice(0, -1), participles, weak: true, umlautPast: true,
  };
}

function active(word: string, p: Parts): Cells {
  const stem = word.slice(0, -1);
  const iStem = stem.replace(/j$/, "");
  const pastPlural = p.pastPlural ?? p.past;
  const pastSub = p.umlautPast ? iUmlaut(p.pastPlural ?? p.past) : p.past;
  const cells: Cells = {};
  const add = (code: string, form: string | string[]) => {
    cells[`act|${code}`] = typeof form === "string" ? [form] : form;
  };
  add("infinitive", word);
  add("pres_part", `${stem}andi`);
  add("past_part", p.participles);
  const present = [
    p.present, withR(p.present), withR(p.present), verbUEnding(stem, "um"), `${iStem}ið`, word,
  ];
  const past = p.weak ? WEAK_ENDINGS.map((ending, i) => i >= 3
    ? verbUEnding(pastPlural, ending, p.pattern === "weak -að") : `${p.past}${ending}`)
    : [
      p.past, withPastT(p.past), p.past,
      verbUEnding(pastPlural, "um"), verbUEnding(pastPlural, "uð"), verbUEnding(pastPlural, "u"),
    ];
  for (const [i, person] of PERSONS.entries()) {
    add(`pres_ind_${person}`, present[i]!);
    add(`past_ind_${person}`, past[i]!);
    add(`pres_sub_${person}`, i === 0 ? word : `${iStem}${SUB_ENDINGS[i]}`);
    add(`past_sub_${person}`, `${pastSub}${SUB_ENDINGS[i]}`);
  }
  const bare = stem.replace(/[jv]$/, "");
  const imperative = p.pattern === "weak -að" ? word : p.weak ? bare : imperativeStem(bare);
  add("impr_2sg", imperative);
  add("impr_1pl", present[3]!);
  add("impr_2pl", present[4]!);
  return cells;
}

/** Only weak -að passed the independent middle-voice gate; other classes remain active-only. */
function middle(cells: Cells): void {
  for (const [key, forms] of Object.entries(cells)) {
    const code = key.slice(4);
    cells[`mpass|${code}`] = forms.map((form) => {
      if (code.endsWith("1sg")) {
        const plural = code.startsWith("pres") ? "act|pres_ind_1pl" : "act|past_ind_1pl";
        return `${cells[plural]![0]}k`;
      }
      if (code === "past_part") return withSk(form.replace(/r$/, ""));
      if (code === "pres_ind_2sg" || code === "pres_ind_3sg") return withSk(cells["act|pres_ind_1sg"]![0]!);
      if (code.endsWith("2sg") && code !== "impr_2sg") return withSk(form.replace(/r$/, ""));
      return withSk(form);
    });
  }
}

function agrees(cells: Cells, attested: Paradigm["attested"]): boolean {
  for (const [key, forms] of Object.entries(attested)) {
    const generated = cells[key];
    if (!generated) continue; // An ungenerated middle voice is unknown, not an active-table contradiction.
    const allowed = new Set(generated.map((form) => fold(form.replace(/ǿ/g, "œ"))));
    if (Object.keys(forms).some((form) => !allowed.has(fold(form.replace(/ǿ/g, "œ"))))) return false;
  }
  return true;
}

/** Refuses uncertain notes and contradictory attestations; an ungenerated middle voice remains edition-only. */
export function inflectVerb(
  headword: string,
  entry: DictEntry,
  attested?: Paradigm["attested"],
): Generated | undefined {
  const word = dictionaryHeadword(headword).toLowerCase().replace(/ø/g, "ö");
  if (!/^[a-záðéíóúýþæœö]+a$/.test(word)) return undefined;
  const notes = grammarNotes(entry).filter((note) => note.pos.startsWith("v."));
  if (notes.length !== 1 || notes[0]!.pos !== "v.") return undefined;
  const note = notes[0]!;
  const parts = principalParts(word, note);
  if (!parts) return undefined;
  const cells = active(word, parts);
  if (parts.pattern === "weak -að") middle(cells);
  if (attested && !agrees(cells, attested)) return undefined;
  return { cells, label: parts.pattern, note: note.text };
}
