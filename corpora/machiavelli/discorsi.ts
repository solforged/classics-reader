// The Discorsi: one work per book and a separate dedication, with paragraph rows.
// Review-unit boundaries never become reader divisions: chapters and paragraphs come from the ODT manifest.
// Thomson's checked beads name the stable Italian sentence ids, not review units or token indices, so annotation
// review can change lemmas, features and segmentation without changing either the text or its alignment.
import { AnalysisTable } from "../../scripts/core/analyses";
import type { Row, SourceUnit, TextUnit, Work } from "../../scripts/core/types";
import { DISCORSI_UNITS } from "./discorsi-sources";
import { cover, englishBlocks, parseBeads, parseSegments, placeEnglish, type SentRow } from "./lib/align";
import type { Annotator } from "./lib/annotate";
import { parseUnit, type Sentence } from "./lib/conllu";
import { getDiscorsiText, readDiscorsi } from "./lib/discorsi-text";

const ID = /^(?:disc-[0-3]-\d+-\d+-\d+|E[1-3]-\d+-\d+-\d+)$/u;
const esc = (text: string): string => text.replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;");

// These three indivisible English clauses straddle Italian paragraph boundaries. Keep each with the earlier
// paragraph; splitting or repeating it would change Thomson's text. Every entry must be used exactly once.
const SPANNING: Readonly<Record<string, number>> = {
  "disc-2-30-1-8": 1,
  "disc-3-1-1-44": 1,
  "disc-3-6-4-48": 4,
};
const REPEATED_QUOTE = "disc-3-10-2-13";

interface Chapter {
  key: string;
  book: number;
  chapter: number;
  paragraphs: Map<number, Sentence[]>;
  sentences: Sentence[];
}

export async function buildDiscorsi(an: Annotator): Promise<Work[]> {
  const canonical = await getDiscorsiText();
  const chapters = new Map<string, Chapter>();
  const paragraphs: { book: string; chapter: number; par: number; sentences: Sentence[] }[] = [];
  let sentenceCount = 0;
  for (const unit of DISCORSI_UNITS) {
    for (const sentence of parseUnit(await readDiscorsi("conllu", unit, "conllu"), unit)) {
      const book = Number(sentence.book);
      const chapter = sentence.chapter;
      if (!Number.isInteger(book) || book < 0 || book > 3 || chapter === undefined || !Number.isInteger(chapter) || chapter < 0) {
        throw new Error(`${sentence.id}: invalid book/chapter`);
      }
      if (sentence.id !== `disc-${book}-${chapter}-${sentence.par}-${sentence.n}`) throw new Error(`${sentence.id}: inconsistent citation metadata`);
      const key = `${book}-${chapter}`;
      let section = chapters.get(key);
      if (!section) {
        section = { key, book, chapter, paragraphs: new Map(), sentences: [] };
        chapters.set(key, section);
      }
      section.sentences.push(sentence);
      const group = section.paragraphs.get(sentence.par);
      if (group) group.push(sentence);
      else {
        const sentences = [sentence];
        section.paragraphs.set(sentence.par, sentences);
        paragraphs.push({ book: String(book), chapter, par: sentence.par, sentences });
      }
      sentenceCount++;
    }
  }
  if (paragraphs.length !== canonical.length) throw new Error(`Discorsi: annotation has ${paragraphs.length} paragraphs, text has ${canonical.length}`);
  paragraphs.forEach((paragraph, index) => {
    const expected = canonical[index]!;
    if (String(expected.book) !== paragraph.book || expected.chapter !== paragraph.chapter || expected.par !== paragraph.par ||
      expected.text !== paragraph.sentences.map((sentence) => sentence.text).join(" ")) {
      throw new Error(`Discorsi: annotation differs from canonical ODT text at ${paragraph.book}.${paragraph.chapter}.${paragraph.par}`);
    }
  });

  const noteText = await readDiscorsi("notes", "notes", "tsv");
  const noteLines = noteText.trimEnd().split("\n");
  if (noteLines.shift() !== "unit\tpar\tsegment\toffset\tmarker\ttext\tfirst_line\tlast_line") throw new Error("Discorsi: unexpected footnotes header");
  const footnotes = noteLines.map((line) => {
    const cols = line.split("\t");
    if (cols.length !== 8) throw new Error("Discorsi: footnote does not have eight columns");
    const [unit, par, segment, offset, marker, text] = cols as [string, string, string, string, string, string, string, string];
    return { unit, par: Number(par), segment, offset: Number(offset), marker, text };
  });
  const seenNotes = new Set<string>();
  const usedSpanning = new Set<string>();
  let omissions = 0;
  let unaligned = 0;
  let beadCount = 0;
  const works: Work[] = [];
  for (const book of [0, 1, 2, 3]) {
    const slug = book === 0 ? "discorsi-dedication" : `discorsi-${book}`;
    an.begin(slug);
    const table = new AnalysisTable();
    const rows: Row[] = [];
    const notes: Record<string, string> = {};
    const sections = [...chapters.values()].filter((chapter) => chapter.book === book);
    for (const section of sections) {
      const italian: SentRow[] = section.sentences.map((sentence) => ({ id: sentence.id, par: sentence.par, sent: sentence.n, text: sentence.text }));
      const english = section.book === 0 ? [] : parseSegments(await readDiscorsi("en-sent", section.key, "tsv"), section.key);
      const englishLines = section.book === 0 ? [] : (await readDiscorsi("en", section.key, "txt")).replace(/\n$/u, "").split("\n");
      if (section.book !== 0) {
        if (!englishLines[0]?.startsWith("# ")) throw new Error(`Discorsi ${section.key}: missing English heading`);
        englishLines[0] = englishLines[0]!.slice(2);
        const pars = new Set(english.map((segment) => segment.par));
        if (pars.size !== englishLines.length || Math.max(...pars) !== englishLines.length - 1) throw new Error(`Discorsi ${section.key}: English paragraph coverage differs`);
        for (const par of pars) cover(englishLines[par]!, english.filter((segment) => segment.par === par).map((segment) => segment.text), `Discorsi ${section.key} English ${par}`);
      }
      const beads = parseBeads(await readDiscorsi("alignment", section.key, "tsv"), section.key, ID);
      beadCount += beads.length;
      if (beads.flatMap((bead) => bead.itIds).join() !== italian.map((sentence) => sentence.id).join()) throw new Error(`Discorsi ${section.key}: Italian sentences not aligned once each in order`);
      if (beads.flatMap((bead) => bead.enIds).join() !== english.map((segment) => segment.id).join()) throw new Error(`Discorsi ${section.key}: English segments not aligned once each in order`);
      const placed = placeEnglish(beads, italian, english, section.key, (bead, pars) => {
        const first = bead.itIds[0]!;
        const target = SPANNING[first];
        if (target === undefined || !pars.includes(target)) throw new Error(`Discorsi ${section.key}: unlisted cross-paragraph bead ${first}`);
        usedSpanning.add(first);
        return target;
      });
      unaligned += placed.unaligned;
      const missing = new Map<number, string[]>();
      for (const bead of beads) {
        if (bead.enIds.length) continue;
        for (const id of bead.itIds) {
          if (section.book !== 0 && id !== REPEATED_QUOTE) throw new Error(`Discorsi: unlisted omission ${id}`);
          const sentence = section.sentences.find((sentence) => sentence.id === id)!;
          missing.set(sentence.par, [...missing.get(sentence.par) ?? [], sentence.text]);
          omissions++;
        }
      }
      const shown = new Map<string, TextUnit>();
      for (const [par, sentences] of section.paragraphs) {
        if (par === 0) continue;
        // The dedication is book 0 with no chapter level: Disc. 0.1. Proemi remain chapters 1.0 and 2.0.
        const address = section.book === 0 ? String(par) : `${section.book}.${section.chapter}.${par}`;
        const source: SourceUnit[] = [];
        const translation: TextUnit[] = [];
        if (par === 1 && section.paragraphs.has(0)) {
          source.push({ key: `it-${address}-h`, kind: "head", lines: [an.pieces(section.paragraphs.get(0)!, table)] });
          if (placed.rubric.length) translation.push({ key: `en-${address}-h`, kind: "head", lines: [placed.rubric.map((segment) => segment.text).join(" ")] });
        }
        source.push({ key: `it-${address}`, kind: "prose", lines: [an.pieces(sentences, table)] });
        englishBlocks(placed.body.get(par) ?? []).forEach((block, index) => {
          const target: TextUnit = { key: `en-${address}-${index}`, kind: "prose", lines: [block.text] };
          translation.push(target);
          for (const segment of block.rows) shown.set(segment.id, target);
        });
        if (section.book === 0 || missing.has(par)) {
          const key = `omit-${address}`;
          notes[key] = section.book === 0 ? "<p>Thomson’s translation omits Machiavelli’s dedication to Zanobi Buondelmonti and Cosimo Rucellai.</p>" :
            `<p>Thomson’s English has nothing for this repeated quotation from Livy: <i>${esc(missing.get(par)!.join(" "))}</i></p>`;
          const target = translation.at(-1) ?? { key: `en-${address}-omission`, kind: "prose" as const, lines: [] };
          target.notes = [...target.notes ?? [], key];
          if (!translation.includes(target)) translation.push(target);
        }
        rows.push({ id: address, sides: { it: source, en: translation } });
      }
      for (const note of footnotes.filter((note) => note.unit === section.key)) {
        const target = shown.get(note.segment);
        const parts = english.filter((segment) => segment.par === note.par);
        let cursor = 0;
        let anchored = false;
        for (const part of parts) {
          const end = cursor + [...part.text].length;
          if (part.id === note.segment) anchored = note.offset > cursor && note.offset <= end;
          cursor = end + 1;
        }
        if (!target || !anchored || seenNotes.has(note.marker)) throw new Error(`Discorsi footnote ${note.marker}: invalid or repeated segment/offset anchor`);
        const key = `fn-${note.marker}`;
        notes[key] = `<p>${esc(note.text)}</p>`;
        target.notes = [...target.notes ?? [], key];
        seenNotes.add(note.marker);
      }
    }
    works.push({ slug, rows, analyses: table.list, notes });
  }
  if (seenNotes.size !== footnotes.length) throw new Error("Discorsi: unplaced footnotes");
  if (usedSpanning.size !== Object.keys(SPANNING).length) throw new Error("Discorsi: unused cross-paragraph exceptions");
  if (omissions !== 23) throw new Error(`Discorsi: ${omissions} omissions, expected the dedication's 22 sentences and one repeated quotation`);
  console.log(`discorsi: ${chapters.size} sections, ${paragraphs.length} paragraphs including rubrics, ${sentenceCount} sentences, ${beadCount} beads, ${seenNotes.size} footnotes, ${omissions} Italian sentences with no English, ${unaligned} English segments with no Italian`);
  return works;
}
