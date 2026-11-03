// What happens to each syntactic word of the CoNLL-U on its way to the page: its morphology is checked against the
// pack's labels, its (lemma, root, class) is looked up in Lane and Wiktionary (once per distinct triple), and the
// coverage of the lookups is counted per work. A written word is one clickable piece with one analysis per syntactic
// word (a clitic cluster: conjunction, preposition, noun, pronoun suffix), and every analysis carries the word's own
// vocalized form as its segmented form, since the edition prints no vowels.
import { pack } from "../../../packs/ara";
import type { AraLexicon, AraLookup } from "../../../packs/ara/build/lexicon";
import type { AnalysisTable } from "../../../scripts/core/analyses";
import type { Analysis, Piece } from "../../../scripts/core/types";
import { formatMorph, parseMorph } from "../../../src/lib/morph";
import type { Sentence, Token } from "./conllu";

/** One work's word counts and dictionary coverage. */
export interface Tally {
  /** Written words (clickable pieces) and the syntactic words in them. */
  written: number;
  words: number;
  /** Written words that join several syntactic words. */
  multiword: number;
  names: number;
  foreign: number;
  /** Words that are neither names nor foreign nor numerals in digits, and those among them whose lemma has an entry. */
  common: number;
  commonWithEntry: number;
  lemmas: Set<string>;
  covered: Set<string>;
  /** Lemma → occurrences, for the common words with no entry. */
  missing: Map<string, number>;
}

/** A distinct (lemma, root, class) of the annotation and what the dictionaries say about it. */
export interface Occurrence {
  lemma: string;
  root: string | undefined;
  upos: string;
  count: number;
  lookup: AraLookup | undefined;
}

export class Annotator {
  readonly tallies = new Map<string, Tally>();
  /** Keyed "<lemma>\t<root>\t<class>". */
  readonly occurrences = new Map<string, Occurrence>();
  private readonly labelled = new Set<string>();
  private tally!: Tally;

  constructor(readonly lexicon: AraLexicon) {}

  /** Starts counting for a work; its figures are in `tallies`. */
  begin(slug: string): void {
    this.tally = {
      written: 0, words: 0, multiword: 0, names: 0, foreign: 0, common: 0, commonWithEntry: 0,
      lemmas: new Set(), covered: new Set(), missing: new Map(),
    };
    this.tallies.set(slug, this.tally);
  }

  /** One syntactic word's analysis: lemma, morphology in the pack's labels, "e" (the edition's own), and its vocalized form. */
  analysis(word: Token, where: string): Analysis {
    const tally = this.tally;
    const morph = formatMorph(parseMorph(word.feats ? `${word.upos} ${word.feats}` : word.upos));
    if (!this.labelled.has(morph)) {
      try {
        pack.describeMorph(morph); // Throws on any word class, feature or value without an English label.
      } catch (error) {
        throw new Error(`${where}: ${(error as Error).message}`);
      }
      this.labelled.add(morph);
    }
    const key = `${word.lemma}\t${word.root ?? ""}\t${word.upos}`;
    let occurrence = this.occurrences.get(key);
    if (!occurrence) {
      occurrence = { lemma: word.lemma, root: word.root, upos: word.upos, count: 0, lookup: this.lexicon.lookup(word.lemma, word.root, word.upos) };
      this.occurrences.set(key, occurrence);
    }
    occurrence.count++;
    tally.words++;
    const digits = word.feats.split("|").includes("NumForm=Digit");
    if (word.upos === "PROPN") tally.names++;
    else if (word.upos === "X") tally.foreign++;
    else if (!digits) {
      tally.common++;
      tally.lemmas.add(word.lemma);
      if (occurrence.lookup) {
        tally.commonWithEntry++;
        tally.covered.add(word.lemma);
      } else tally.missing.set(word.lemma, (tally.missing.get(word.lemma) ?? 0) + 1);
    }
    return [word.lemma, morph, "e", word.diac ?? word.form];
  }

  /** The pieces of sentences read as one line: the written words, and between them the text the annotation leaves. */
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
        if (!surface.words.length) {
          pushText(surface.form);
          return;
        }
        this.tally.written++;
        if (surface.words.length > 1) this.tally.multiword++;
        const ids = surface.words.map((word) => table.add(this.analysis(word, `${sentence.id} ${word.form}`)));
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
