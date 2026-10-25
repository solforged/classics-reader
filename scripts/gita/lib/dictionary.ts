import type { Article } from "../../../src/lib/dict";
import { fold } from "../../../src/lang/san/spelling";
import { repairSpelling } from "./repair";

export interface DictionaryRow {
  id: string;
  word: string;
  grammar: string;
  preverbs: string;
  meanings: string[];
}

export interface DcsDictionary {
  byId: Map<string, DictionaryRow>;
  byWord: Map<string, DictionaryRow[]>;
}

/** Five tab-separated columns, with occasional unquoted newlines inside a field. Numeric ids start records. */
export function parseDictionary(source: string): DcsDictionary {
  const lines = source.split(/\r?\n(?=\d+\t)/u);
  if (lines.shift() !== "id\tword\tgrammar\tpreverbs\tmeanings") throw new Error("Unexpected DCS dictionary header");
  const byId = new Map<string, DictionaryRow>();
  const byWord = new Map<string, DictionaryRow[]>();
  for (const line of lines) {
    if (!line) continue;
    const cols = line.split("\t");
    if (cols.length !== 5) throw new Error(`Expected five DCS dictionary columns: ${line}`);
    const [id, word, grammar, preverbs, meanings] = cols as [string, string, string, string, string];
    if (byId.has(id)) throw new Error(`Duplicate DCS dictionary id ${id}`);
    const row = { id, word: repairSpelling(word), grammar, preverbs, meanings: meanings.split(";").map((sense) => sense.trim()).filter(Boolean) };
    byId.set(id, row);
    const key = fold(row.word);
    const group = byWord.get(key) ?? [];
    group.push(row);
    byWord.set(key, group);
  }
  return { byId, byWord };
}

const esc = (text: string) => text.replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;").replace(/"/gu, "&quot;");

export function dictionaryArticle(row: DictionaryRow): Article | undefined {
  if (!row.meanings.length) return undefined;
  const grammar = [row.grammar, row.preverbs ? `preverbs: ${row.preverbs}` : ""].filter(Boolean).join("; ");
  return {
    head: row.word,
    sections: [{
      grammar: esc(grammar),
      // DCS meanings are short glosses of one sense each; one line reads better than a column of single words.
      senses: [{ gloss: esc(row.meanings.join("; ")) }],
    }],
  };
}
