// Compound declension copies a complete head table; variable contraction and lexicalized -samr stay disabled.
// Complete Wiktionary tables agree for 32/33 noun/other prefixes, 7/7 negatives and 7/7 participles.
import type { DictEntry } from "../../../../src/lib/dict";
import type { NorseParadigm } from "../../paradigm";
import { fold } from "../../spelling";
import { inflectAdjective, inflectPastParticiple } from "./adjectives";
import { inflectNoun } from "./nouns";
import { grammarNotes, type Generated } from "./zoega";

type Cells = NorseParadigm["cells"];
interface Head {
  word: string;
  cells: Cells;
  participle: boolean;
}
interface Table {
  word: string;
  kind: NorseParadigm["kind"];
  label?: string;
  cells: Cells;
}
const spelling = (word: string) => fold(word.replace(/ǿ/g, "œ"));

/** Wiktionary adjective and participle heads, with conservative Zoëga generation for missing adjective heads. */
export class CompoundAdjectives {
  private readonly heads = new Map<string, Head[]>();
  private readonly generated = new Map<string, Head | undefined>();

  constructor(tables: Iterable<Table>, private readonly zoegaFor: (word: string) => DictEntry[] | undefined) {
    const participles = new Set<string>();
    for (const table of tables) {
      if (table.kind === "adj") {
        // A defective Wiktionary adjective is not evidence for a complete generated head.
        if (!this.heads.has(spelling(table.word))) this.heads.set(spelling(table.word), []);
        this.add({ ...table, participle: false });
      }
      if (table.kind !== "verb") continue;
      const cells = Object.fromEntries(Object.entries(table.cells)
        .filter(([cell]) => /^pp_(?:str|wk)\|/.test(cell)).map(([cell, forms]) => [cell.slice(3), forms]));
      for (const word of cells["str|nsm"] ?? []) this.add({ word, cells, participle: true });
      for (const word of table.cells["act|past_part"] ?? []) participles.add(word);
    }
    for (const word of participles) {
      if (this.heads.get(spelling(word))?.some((head) => head.participle)) continue;
      const cells = inflectPastParticiple(word);
      if (cells) this.add({ word, cells, participle: true });
    }
  }

  private add(head: Head): void {
    if (Object.keys(head.cells).filter((cell) => /^(?:str|wk)\|/.test(cell)).length !== 40) return;
    const key = spelling(head.word);
    if (!head.cells["str|nsm"]?.some((form) => spelling(form) === key)) return;
    const heads = this.heads.get(key) ?? [];
    heads.push(head);
    this.heads.set(key, heads);
  }

  private find(word: string): Head[] {
    const key = spelling(word);
    const known = this.heads.get(key);
    if (known) return known;
    if (!this.generated.has(key)) {
      let head: Head | undefined;
      for (const entry of this.zoegaFor(word) ?? []) {
        if (spelling(entry.w) !== key) continue;
        const table = inflectAdjective(entry.w, entry);
        if (!table?.cells["str|nsm"]?.length || !table.cells["wk|nsm"]?.length) continue;
        head = { word: entry.w, cells: table.cells, participle: false };
        break;
      }
      this.generated.set(key, head);
    }
    const head = this.generated.get(key);
    return head ? [head] : [];
  }

  /** Longest final head first; only negative ó-/ú- may be a one-letter prefix. */
  inflect(lemma: string, attested: NorseParadigm["attested"] = {}): Generated | undefined {
    if (!/^[a-záéíóúýæœöøǫǿðþ]+$/.test(lemma)) return undefined;
    for (let at = 1; at < lemma.length - 2; at++) {
      const prefix = lemma.slice(0, at);
      if (prefix.length < 2 && !/^[óú]$/.test(prefix)) continue;
      if (!/[aeiouyáéíóúýæœöøǫǿ]/.test(prefix)) continue;
      const heads = this.find(lemma.slice(at));
      if (!heads.length) continue;
      // Do not seek a shorter, accidental suffix when the actual head is unsupported or contradicted.
      for (const head of heads) {
        if (spelling(head.word) === "samr") continue;
        // Lexical -inn adjectives and jafn- participles do not reliably retain the verbal accusative.
        if (head.word.endsWith("inn") && (!head.participle || prefix === "jafn")) continue;
        // Compounds do not consistently inherit a head's optional contraction or consonant loss.
        if (Object.entries(head.cells).some(([cell, forms]) => /^(?:str|wk)\|/.test(cell)
          && new Set(forms.map((form) => spelling(form).length)).size > 1)) continue;
        const regular = (head.cells["comp|nsm"] ?? []).every((form) => form.endsWith("ari"))
          && (head.cells["str_sup|nsm"] ?? []).every((form) => form.endsWith("astr"));
        const cells = Object.fromEntries(Object.entries(head.cells)
          .filter(([cell]) => /^(?:str|wk)\|/.test(cell) || regular && /^(?:comp|str_sup|wk_sup)\|/.test(cell))
          .map(([cell, forms]) => [cell, forms.map((form) => prefix + form)]));
        if (Object.entries(attested).some(([cell, forms]) => cells[cell]
          && Object.keys(forms).some((form) => !cells[cell]!.some((value) => spelling(value) === spelling(form))))) continue;
        return { cells, label: "strong and weak adjective", note: `declined like ${head.word}` };
      }
      return undefined;
    }
    return undefined;
  }
}

type Gender = "m" | "f" | "n";
interface NounHead {
  word: string;
  cells: Cells;
  gender: Gender;
  label: string;
}

/** Complete noun heads; a Wiktionary counterexample disables transfer of that head's table. */
export class CompoundNouns {
  private readonly heads = new Map<string, NounHead[]>();
  private readonly refused = new Set<NounHead>();

  constructor(tables: Iterable<Table>, private readonly zoegaFor: (word: string) => DictEntry[] | undefined) {
    const nouns = [...tables].filter((table) => table.kind === "noun" && /^[a-záéíóúýæœöøǫǿðþ]+$/.test(table.word));
    for (const table of nouns) {
      const head = this.complete(table);
      if (!head) continue;
      const key = spelling(head.word);
      this.heads.set(key, [...(this.heads.get(key) ?? []), head]);
    }
    // Optional variants, lexicalized compounds and accidental suffixes are not transferable paradigms.
    for (const table of nouns) {
      const compound = this.complete(table);
      const split = compound && this.split(compound.word);
      if (!compound || !split) continue;
      for (const head of split.heads) {
        if (head.gender !== compound.gender) continue;
        const keys = new Set([...Object.keys(head.cells), ...Object.keys(compound.cells)]);
        if ([...keys].some((key) => {
          const expected = new Set(compound.cells[key]?.map(spelling));
          const forms = new Set(head.cells[key]?.map((form) => spelling(split.prefix + form)));
          return expected.size !== forms.size || [...expected].some((form) => !forms.has(form));
        })) this.refused.add(head);
      }
    }
  }

  private complete(table: Table): NounHead | undefined {
    const gender = table.label?.match(/\b(masculine|feminine|neuter)\b/)?.[1]?.[0] as Gender | undefined
      ?? this.gender(table.word);
    if (!gender) return undefined;
    const cells = Object.fromEntries(Object.entries(table.cells).filter(([key]) => /^\|[nadg][sp][id]$/.test(key)));
    const numbers = ["s", "p"].filter((number) => cells[`|n${number}i`]?.length);
    if (!numbers.length || numbers.some((number) =>
      [..."nadg"].some((c) => [..."id"].some((d) => !cells[`|${c}${number}${d}`]?.length)))) return undefined;
    if (!numbers.some((number) => cells[`|n${number}i`]!.some((form) => spelling(form) === spelling(table.word)))) {
      return undefined;
    }
    return { word: table.word, cells, gender, label: table.label ?? `${gender === "m" ? "masculine" : gender === "f" ? "feminine" : "neuter"} noun` };
  }

  private gender(word: string): Gender | undefined {
    const genders = new Set((this.zoegaFor(word) ?? []).flatMap((entry) => grammarNotes(entry))
      .flatMap((note) => /^[mfn]\./.test(note.pos) ? [note.pos[0] as Gender] : []));
    return genders.size === 1 ? [...genders][0] : undefined;
  }

  private find(word: string): NounHead[] {
    const key = spelling(word);
    const known = this.heads.get(key);
    if (known) return known;
    const heads: NounHead[] = [];
    for (const entry of this.zoegaFor(word) ?? []) {
      if (spelling(entry.w) !== key) continue;
      const generated = inflectNoun(entry.w, entry);
      const head = generated && this.complete({ word: entry.w, kind: "noun", ...generated });
      if (head) heads.push(head);
    }
    this.heads.set(key, heads);
    return heads;
  }

  private split(lemma: string): { prefix: string; heads: NounHead[] } | undefined {
    for (let at = 2; at < lemma.length - 2; at++) {
      const prefix = lemma.slice(0, at);
      if (!/[aeiouyáéíóúýæœöøǫǿ]/.test(prefix)) continue;
      const heads = this.find(lemma.slice(at));
      if (heads.length) return { prefix, heads };
    }
    return undefined;
  }

  inflect(lemma: string, attested: NorseParadigm["attested"] = {}, editionGender?: Gender): Generated | undefined {
    if (!/^[a-záéíóúýæœöøǫǿðþ]+$/.test(lemma)) return undefined;
    const dictionaryGender = this.gender(lemma);
    if (dictionaryGender && editionGender && dictionaryGender !== editionGender) return undefined;
    const gender = dictionaryGender ?? editionGender;
    const split = gender && this.split(lemma);
    if (!split) return undefined;
    for (const head of split.heads) {
      if (head.gender !== gender || this.refused.has(head)) continue;
      const cells = Object.fromEntries(Object.entries(head.cells)
        .map(([key, forms]) => [key, forms.map((form) => split.prefix + form)]));
      if (Object.entries(attested).some(([key, forms]) => /^\|[nadg][sp][id]$/.test(key)
        && Object.keys(forms).some((form) => !cells[key]?.some((value) => spelling(value) === spelling(form))))) continue;
      return { cells, label: head.label, note: `declined like ${head.word}` };
    }
    return undefined;
  }
}
