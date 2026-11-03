// Il Principe, built into one Work: the dedication and the 26 chapters.
//
// The Italian is the checked-in CoNLL-U: its # text lines are the edition, checked against the manifest's
// paragraph hashes, and its lemmas and features (converted to the pack's conventions) are the word panel.
// Each body paragraph is a row, cited Prin. <chapter>.<paragraph>; the rubric is the chapter heading on the
// first row, and the dedication's address, which has no rubric, is that heading. Ricci's sentences are placed
// by data/alignment/<unit>.tsv. The English heading is that sentence in title case, the chapter number set off.
import { join } from "node:path";
import { AnalysisTable } from "../../scripts/core/analyses";
import type { Row, SourceUnit, TextUnit, Work } from "../../scripts/core/types";
import { PRINCE_BEAD_OVERRIDES, PRINCE_OMISSIONS } from "./alignment";
import { readCached } from "./fetch";
import { alignPath, cover, DATA, parseBeads, parseSentences, placeEnglish, proseBlocks, type Bead } from "./lib/align";
import type { Annotator } from "./lib/annotate";
import { paragraphFile, parseUnit, type Sentence } from "./lib/conllu";
import { assertFromGutenberg } from "./lib/gutenberg";
import { sha256 } from "./lib/pins";
import { titleCase } from "./lib/title";
import { chapterOf, PRINCE_CONLLU_SHA, PRINCE_TEXT, PRINCE_UNITS, type PrinceUnit } from "./sources";

const esc = (text: string): string => text.replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;");

/**
 * Ricci's all-caps heading as a title (lib/title.ts). A chapter is "Chapter I. The Various Kinds…"; the dedication's
 * address is title case too.
 */
function displayHeading(text: string, chapter: number): string {
  if (chapter === 0) return titleCase(text);
  const match = text.match(/^CHAPTER\s+([IVXLCDM]+)\s+([\s\S]+)$/u);
  if (!match) throw new Error(`chapter ${chapter}: English heading is not "CHAPTER <numeral> <title>": ${text.slice(0, 80)}`);
  const trailed = match[2]!.endsWith(".");
  const title = trailed ? match[2]!.slice(0, -1) : match[2]!;
  return `Chapter ${match[1]}. ${titleCase(title)}${trailed ? "." : ""}`;
}

export async function buildPrince(an: Annotator): Promise<Work> {
  an.begin("principe");
  const table = new AnalysisTable();
  const rows: Row[] = [];
  const workNotes: Record<string, string> = {};
  const gutenbergParagraphs: string[] = [];
  let unaligned = 0;

  function withOverrides(beads: readonly Bead[], unit: PrinceUnit): Bead[] {
    return beads.map((bead) => {
      const key = `${unit} ${bead.n}`;
      const replacement = PRINCE_BEAD_OVERRIDES[key];
      if (replacement === undefined) return bead;
      an.used.add(`PRINCE_BEAD_OVERRIDES ${key}`);
      const enIds = replacement ? replacement.split(",") : [];
      return { ...bead, enIds, kind: `${bead.itIds.length}-${enIds.length}` };
    });
  }

  for (const unit of PRINCE_UNITS) {
    const source = await Bun.file(join(DATA, `${unit}.conllu`)).text();
    const hash = sha256(source);
    const pinned = PRINCE_CONLLU_SHA[unit];
    if (hash !== pinned) throw new Error(`${unit}: CoNLL-U SHA-256 ${hash}, pin ${pinned}`);
    const sentences = parseUnit(source, unit);
    const pin = PRINCE_TEXT[unit]!;
    const file = paragraphFile(sentences, pin.rubric === "");
    const fileHash = sha256(file);
    if (fileHash !== pin.sha256) throw new Error(`${unit}: paragraph text SHA-256 ${fileHash}, manifest ${pin.sha256}`);

    const byPar = new Map<number, Sentence[]>();
    for (const sentence of sentences) {
      const list = byPar.get(sentence.par) ?? [];
      list.push(sentence);
      byPar.set(sentence.par, list);
    }
    const bodyPars = [...byPar.keys()].filter((par) => par > 0).sort((a, b) => a - b);
    if (bodyPars.length !== pin.paragraphs) throw new Error(`${unit}: ${bodyPars.length} body paragraphs, manifest says ${pin.paragraphs}`);

    const italian = parseSentences(await Bun.file(join(DATA, "it-sent", `${unit}.tsv`)).text(), unit, "Italian");
    const english = parseSentences(await Bun.file(join(DATA, "en-sent", `${unit}.tsv`)).text(), unit, "English");
    const enLines = (await Bun.file(join(DATA, "en", `${unit}.txt`)).text()).replace(/\n$/u, "").split("\n");
    gutenbergParagraphs.push(...enLines);
    for (const [par, group] of byPar) {
      cover(group.map((sentence) => sentence.text).join(" "), italian.filter((row) => row.par === par).map((row) => row.text), `${unit} Italian ${par}`);
    }
    for (const par of new Set(english.map((row) => row.par))) {
      const line = enLines[par];
      if (line === undefined) throw new Error(`${unit}: English paragraph ${par} has no line`);
      cover(line, english.filter((row) => row.par === par).map((row) => row.text), `${unit} English ${par}`);
    }
    const beads = withOverrides(parseBeads(await Bun.file(alignPath(unit)).text(), unit), unit);
    const placed = placeEnglish(beads, italian, english, unit);
    unaligned += placed.unaligned;
    // Paragraphs whose Italian sentences the translation simply does not contain. The note goes on the first.
    const omitted = new Set(beads.filter((bead) => bead.itIds.length && !bead.enIds.length).flatMap((bead) => bead.itIds.map((id) => Number(id.split(".")[0]))));
    if (omitted.size && !(unit in PRINCE_OMISSIONS)) throw new Error(`${unit}: Italian sentences with no English, and no omission note`);
    let noted = false;

    const chapter = chapterOf(unit);
    const addressIsHeading = !byPar.has(0);
    for (const par of bodyPars) {
      const first = par === bodyPars[0];
      const sourceUnits: SourceUnit[] = [];
      const translation: TextUnit[] = [];
      if (first) {
        const headSentences = addressIsHeading ? byPar.get(par)! : byPar.get(0)!;
        sourceUnits.push({
          key: `it-${chapter}-h`,
          kind: "head",
          label: chapter === 0 ? "Dedica" : String(chapter),
          lines: [an.pieces(headSentences, table)],
        });
        const headEnglish = addressIsHeading ? (placed.body.get(par) ?? []) : placed.rubric;
        translation.push({
          key: `en-${chapter}-h`,
          kind: "head",
          lines: headEnglish.length ? [displayHeading(headEnglish.map((row) => row.text).join(" "), chapter)] : [],
        });
      }
      if (!(first && addressIsHeading)) {
        sourceUnits.push({ key: `it-${chapter}.${par}`, kind: "prose", lines: [an.pieces(byPar.get(par)!, table)] });
        proseBlocks(placed.body.get(par) ?? []).forEach((text, index) => {
          translation.push({ key: `en-${chapter}.${par}-${index}`, kind: "prose", lines: [text] });
        });
      }
      if (omitted.has(par) && !noted) {
        const key = `omit-${unit}`;
        workNotes[key] = `<p>${esc(PRINCE_OMISSIONS[unit]!)}</p>`;
        an.used.add(`PRINCE_OMISSIONS ${unit}`);
        noted = true;
        const last = translation.at(-1);
        if (last) last.notes = [key];
        else translation.push({ key: `en-${chapter}.${par}-note`, kind: "prose", lines: [], notes: [key] });
      }
      rows.push({ id: `${chapter}.${par}`, sides: { it: sourceUnits, en: translation } });
    }
  }

  assertFromGutenberg(await readCached("ricci.txt"), gutenbergParagraphs);
  console.log(`principe: English sentences with no Italian sentence, shown with the paragraph before them: ${unaligned}`);
  return { slug: "principe", rows, analyses: table.list, notes: workNotes };
}
