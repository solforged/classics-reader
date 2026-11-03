// Checks data/conllu against the OpenITI paragraphs and data/units.json, without any pin: run it after annotate.py
// and before tools/pins.ts. It throws on the first group of differences it lists.
//
//   bun corpora/muqaddimah/tools/check.ts [--source FILE]
//
//   - every unit of units.json has a CoNLL-U file whose `# newpar id` lines are exactly the unit's pids, in order;
//   - the `# text` lines of a row, joined by a space, are the row's text (verse rows: the lines joined by a space);
//   - the words of a row (units.json `words`, summed) are the words of those lines;
//   - every syntactic word has a UPOS and a LEMMA, and FEATS keys and values are within the agreed inventory
//     (packs/ara describeMorph throws on anything else); multiword-token lines carry only the surface form.
import { join } from "node:path";
import { ROOT } from "../../../scripts/core/outputs";
import { countWords, parseOpenITI } from "../lib/openiti";
import { DERIVED } from "../sources";

const DATA = join(import.meta.dir, "..", "data");

const FEATS: Record<string, string[]> = {
  Aspect: ["Perf", "Imp"], Case: ["Nom", "Acc", "Gen"], Definite: ["Def", "Ind", "Cons"], Gender: ["Masc", "Fem"],
  Mood: ["Ind", "Sub", "Jus", "Imp"], Number: ["Sing", "Dual", "Plur"], Person: ["1", "2", "3"], Voice: ["Act", "Pass"],
  VerbForm: ["Fin", "Part", "Vnoun"], PronType: ["Prs", "Dem", "Rel", "Int"], NumForm: ["Word", "Digit"], Abbr: ["Yes"], Polarity: ["Neg"],
};
const UPOS = new Set(["ADJ", "ADP", "ADV", "AUX", "CCONJ", "DET", "INTJ", "NOUN", "NUM", "PART", "PRON", "PROPN", "PUNCT", "SCONJ", "SYM", "VERB", "X"]);

const at = process.argv.indexOf("--source");
const source = at > 0 ? process.argv[at + 1]! : join(ROOT, ".cache", "sources", "muqaddimah", DERIVED.openiti);
const works = parseOpenITI(await Bun.file(source).text());
const rows = new Map(works.flatMap((work) => work.rows).map((row) => [row.pid, row]));
const units: { id: string; pids: string[]; words: number }[] = JSON.parse(await Bun.file(join(DATA, "units.json")).text()).units;

const problems: string[] = [];
let tokens = 0;
for (const unit of units) {
  const where = `${unit.id}.conllu`;
  const pars = new Map<string, string[]>();
  let current: string[] | undefined;
  const lines = (await Bun.file(join(DATA, "conllu", where)).text()).split("\n");
  for (const [index, line] of lines.entries()) {
    const here = `${where}:${index + 1}`;
    if (line.startsWith("# newpar id = ")) {
      const pid = line.slice("# newpar id = ".length);
      if (pars.has(pid)) problems.push(`${here}: ${pid} twice`);
      current = [];
      pars.set(pid, current);
    } else if (line.startsWith("# text = ")) {
      if (!current) problems.push(`${here}: text before any newpar`);
      else current.push(line.slice("# text = ".length));
    } else if (line && !line.startsWith("#")) {
      const cols = line.split("\t");
      if (cols.length !== 10) { problems.push(`${here}: ${cols.length} columns`); continue; }
      if (/^\d+-\d+$/u.test(cols[0]!)) {
        if (cols.slice(2, 9).some((col) => col !== "_") || !/^(_|SpaceAfter=No)$/u.test(cols[9]!)) problems.push(`${here}: multiword token with analysis columns`);
        continue;
      }
      tokens++;
      if (!UPOS.has(cols[3]!)) problems.push(`${here}: UPOS ${cols[3]}`);
      if (!cols[2] || cols[2] === "_") problems.push(`${here}: no lemma for ${cols[1]}`);
      if (cols[5] !== "_") {
        for (const pair of cols[5]!.split("|")) {
          const [key, value] = pair.split("=");
          if (!FEATS[key!]?.includes(value!)) problems.push(`${here}: FEATS ${pair} is outside the inventory`);
        }
      }
    }
  }
  if ([...pars.keys()].join() !== unit.pids.join()) problems.push(`${where}: newpar ids differ from units.json (${pars.size} against ${unit.pids.length})`);
  let words = 0;
  for (const pid of unit.pids) {
    const row = rows.get(pid);
    if (!row) { problems.push(`${where}: ${pid} is not a row of the edition`); continue; }
    const text = (pars.get(pid) ?? []).join(" ");
    const expected = row.kind === "verse" ? row.lines!.join(" ") : row.text;
    if (text !== expected) problems.push(`${where}: ${pid} text differs\n    conllu   ${text.slice(0, 120)}\n    edition  ${expected.slice(0, 120)}`);
    words += countWords(expected);
  }
  if (words !== unit.words) problems.push(`${where}: ${words} words in the rows, units.json says ${unit.words}`);
}
if (problems.length) throw new Error(`${problems.length} problems:\n${problems.slice(0, 40).join("\n")}`);
console.log(`ok: ${units.length} units, ${units.reduce((sum, unit) => sum + unit.pids.length, 0)} rows, ${units.reduce((sum, unit) => sum + unit.words, 0)} words, ${tokens} syntactic words`);
