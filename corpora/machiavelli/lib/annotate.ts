// What the Machiavelli works share when their CoNLL-U becomes pieces and analyses: the Wiktionary lookup that measures
// each lemma's coverage, the morphology conversion (lib/morph.ts), and exception-table bookkeeping. Figures are kept
// per work, and lemma classes together, because one dictionary serves the corpus.
import type { Wiktionary } from "../../../packs/ita/build/wiktionary";
import type { AnalysisTable } from "../../../scripts/core/analyses";
import type { Analysis, Piece } from "../../../scripts/core/types";
import { LEMMA_FIXES } from "../alignment";
import type { Sentence, Token } from "./conllu";
import { toPackMorph, type MorphStats } from "./morph";

/** One work's word counts and Wiktionary coverage. */
export interface Tally {
  words: number;
  /** Written words that join several syntactic words (del, de', dilettarsi). */
  multiword: number;
  names: number;
  foreign: number;
  /** Words that are neither names nor foreign, and those among them whose lemma has a Wiktionary entry. */
  common: number;
  commonWithEntry: number;
  lemmas: Set<string>;
  covered: Set<string>;
  /** Lemma → occurrences, for the common words with no entry. */
  missing: Map<string, number>;
}

export class Annotator {
  /** The exception-table entries something used, as "<TABLE> <key>". */
  readonly used = new Set<string>();
  /** Lemma → the word classes it is tagged with, over all works. */
  readonly lemmaClasses = new Map<string, Set<string>>();
  readonly stats: MorphStats = { gerund: 0, pastHistoric: 0, imperfect: 0, dropped: {}, labelled: 0 };
  readonly tallies = new Map<string, Tally>();
  private readonly labelled = new Set<string>();
  private tally!: Tally;

  constructor(readonly wiktionary: Wiktionary) {}

  /** Starts counting for a work; its figures are in `tallies`. */
  begin(slug: string): void {
    this.tally = { words: 0, multiword: 0, names: 0, foreign: 0, common: 0, commonWithEntry: 0, lemmas: new Set(), covered: new Set(), missing: new Map() };
    this.tallies.set(slug, this.tally);
  }

  private lemmaOf(lemma: string): string {
    const fixed = LEMMA_FIXES[lemma];
    if (fixed === undefined) return lemma;
    this.used.add(`LEMMA_FIXES ${lemma}`);
    return fixed;
  }

  /** One syntactic word's analysis: its lemma, morphology in the pack's labels, "e" (the edition's own), and the word when written joined. */
  analysis(word: Token, where: string, segment?: string): Analysis {
    const tally = this.tally;
    const lemma = this.lemmaOf(word.lemma);
    const morph = toPackMorph(word.upos, word.feats, where, this.stats, this.labelled);
    const classes = this.lemmaClasses.get(lemma) ?? new Set<string>();
    classes.add(word.upos);
    this.lemmaClasses.set(lemma, classes);
    const foreign = word.upos === "X" || word.feats.includes("Foreign=");
    if (word.upos === "PROPN") tally.names++;
    else if (foreign) tally.foreign++;
    else {
      tally.common++;
      tally.lemmas.add(lemma);
      if (this.wiktionary.lookup(lemma, word.upos)) {
        tally.commonWithEntry++;
        tally.covered.add(lemma);
      } else tally.missing.set(lemma, (tally.missing.get(lemma) ?? 0) + 1);
    }
    return segment === undefined ? [lemma, morph, "e"] : [lemma, morph, "e", segment];
  }

  /** One paragraph's pieces. Spaces follow the annotation inside a sentence and a single space between sentences. */
  pieces(sentences: readonly Sentence[], table: AnalysisTable): Piece[] {
    const out: Piece[] = [];
    const pushText = (text: string) => {
      if (typeof out.at(-1) === "string") out[out.length - 1] += text;
      else out.push(text);
    };
    sentences.forEach((sentence, sentenceIndex) => {
      if (sentenceIndex) pushText(" ");
      sentence.surfaces.forEach((surface, index) => {
        if (index && sentence.surfaces[index - 1]!.spaceAfter) pushText(" ");
        const words = surface.words.filter((word) => word.upos !== "PUNCT");
        if (!words.length) {
          pushText(surface.form);
          return;
        }
        if (words.length !== surface.words.length) throw new Error(`${sentence.id}: ${surface.form} joins punctuation and words`);
        this.tally.words++;
        if (words.length > 1) this.tally.multiword++;
        const ids = words.map((word) => table.add(this.analysis(word, `${sentence.id} ${word.form}`, words.length > 1 ? word.form : undefined)));
        out.push([surface.form, ids]);
      });
    });
    const plain = out.map((piece) => (typeof piece === "string" ? piece : piece[0])).join("");
    const expected = sentences.map((sentence) => sentence.text).join(" ");
    if (plain !== expected) {
      throw new Error(`${sentences[0]?.id}: pieces rebuild ${JSON.stringify(plain.slice(0, 80))}, not ${JSON.stringify(expected.slice(0, 80))}`);
    }
    return out;
  }
}
