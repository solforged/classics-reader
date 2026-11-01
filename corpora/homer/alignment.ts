// Joins the printed Greek words (Perseus) to AGDT's annotated tokens by sequence, not by AGDT's line citations, which
// are off by a line for Odyssey 1.95–269. The editions agree word for word once accents, breathings, elision marks,
// capitals and the final sigma are ignored (AGDT's forms are mistyped in places: ἄλγἐ for ἄλγεʼ, ἄῤ for ἄρʼ), with
// one difference of tokenization: AGDT splits οὐδέ, μηδέ and οὔτε into two tokens (οὐ + δέ) where the text prints
// one word. A printed word thus takes one, two or three consecutive tokens whose spellings, joined, are its own.
import type { AgdtWord } from "../../packs/grc/build/agdt";
import { searchKey } from "../../packs/grc/spelling";
import type { GreekLine } from "./lib/perseus";

export interface AlignedWord {
  /** The word as printed. */
  surface: string;
  /** The AGDT tokens that annotate it, in order. */
  tokens: AgdtWord[];
}

/** A word's letters alone: no accents, breathings, elision marks or capitals, and one sigma. */
export const skeleton = searchKey;

const WORD = /[\p{L}\p{M}]+/gu;
const MAX_TOKENS = 3;

/** The printed words of a line. */
export const wordsOf = (text: string): string[] => text.match(WORD) ?? [];

/**
 * Pairs every printed word of the lines with its tokens. `tokens` are AGDT's tokens of the book in order,
 * punctuation included; throws at the first word that no run of tokens spells, and when tokens remain.
 */
export function alignLines(lines: readonly GreekLine[], tokens: readonly AgdtWord[], what: string): AlignedWord[][] {
  const real = tokens.filter((token) => /\p{L}/u.test(token.form));
  let next = 0;
  const aligned = lines.map((line): AlignedWord[] => wordsOf(line.text).map((surface) => {
    const want = skeleton(surface);
    let spelled = "";
    for (let length = 1; length <= MAX_TOKENS && next + length <= real.length; length++) {
      spelled += skeleton(real[next + length - 1]!.form);
      if (spelled === want) {
        const run = real.slice(next, next + length);
        next += length;
        return { surface, tokens: run };
      }
    }
    const around = real.slice(next, next + MAX_TOKENS).map((token) => `${token.form} (${token.at})`).join(" ");
    throw new Error(`${what} ${line.n}: "${surface}" is not spelled by AGDT's tokens: ${around}`);
  }));
  if (next !== real.length) throw new Error(`${what}: ${real.length - next} AGDT tokens remain after the last line`);
  return aligned;
}

/**
 * The parts of a written word that its tokens spell (οὐδʼ → οὐ, δʼ): each token takes the letters of its own
 * spelling; marks and elision stay with the letters before them, and the last part takes whatever follows.
 */
export function segments(surface: string, tokens: readonly AgdtWord[]): string[] {
  const rest = [...surface];
  const parts = tokens.map((token, i) => {
    const want = skeleton(token.form).length;
    let part = "";
    let got = 0;
    while (rest.length && (got < want || (i === tokens.length - 1) || skeleton(rest[0]!) === "")) {
      const char = rest.shift()!;
      part += char;
      got += skeleton(char).length;
    }
    return part;
  });
  if (parts.join("") !== surface || parts.some((part) => !part)) throw new Error(`Cannot divide ${surface} between its tokens`);
  return parts;
}
