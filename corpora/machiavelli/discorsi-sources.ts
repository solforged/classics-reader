// Pinned sources of the Discorsi sopra la prima Deca di Tito Livio (discorsi.ts). This module imports only JSON and
// defines constants, so Sources.astro can import it under Node; lib/discorsi-text.ts reads the files.
//
// Italian: Mario Martelli's edition (Niccolò Machiavelli, Tutte le opere, Sansoni, Firenze 1971) in Liber Liber's
// transcription, in its ODT edition. fetch.ts downloads the ODT and checks it against DISCORSI_SOURCE.odt. The build
// derives the paragraphs from the ODT's content.xml (lib/discorsi-text.ts), corrected by data/discorsi/text/fixes.tsv,
// and stops unless they match the canonical text in data/discorsi/text/manifest.json record for record.
// data/discorsi/text/<unit>.txt holds the same text split by annotation unit.
//
// Morphology: UDPipe 2, model MODEL (sources.ts), one request per paragraph, in data/discorsi/conllu/<unit>.conllu.
// The text is split into 37 units of about 4,000 syntactic words, cut at paragraph boundaries ("<book>-<n>"; the
// dedication is "0-1"). Sentence ids are disc-<book>-<chapter>-<par>-<n> and stay the same when unit boundaries move.
//
// English: Ninian Hill Thomson's translation (London: Kegan Paul, Trench & Co., 1883), public domain, Project
// Gutenberg #10827. fetch.ts downloads the Gutenberg file and checks its pin, but the build does not read it. The
// English is vendored, one section per chapter ("<book>-<chapter>"; the proemi are chapter 0):
//   en/<section>.txt         Thomson's paragraphs, one per line; the first line is the heading. en/front.txt is his
//                            title page, his dedication to Pasquale Villari and the contents, which are not shown.
//                            Machiavelli's dedication ("0-0") has no English.
//   en-sent/<section>.tsv    the same text cut into clauses, with the ids the alignment names
//   alignment/<section>.tsv  Thomson's clauses against the annotation's sentence ids, checked bead by bead
//   notes/notes.tsv          his 17 footnotes, each with the clause it follows
//
// data/discorsi/pins.json (DISCORSI_SHA) has the SHA-256 of every vendored file, by kind and name. The build and
// fetch.ts throw on a file that does not match, and fetch.ts throws on a file that has no pin or a pin with no file.
import manifest from "./data/discorsi/text/manifest.json";
import pins from "./data/discorsi/pins.json";

export const DISCORSI_SOURCE = {
  odt: {
    url: "https://www.liberliber.eu/mediateca/libri/m/machiavelli/discorsi_sopra_la_prima_deca_di_tito_livio/odt/machiavelli_discorsi_sopra_la_prima_deca_di_tito_livio.odt",
    sha: "a06e6dc5157d85f120000e95685190b352cd544c2c01fa1abc0eaef309dafd80",
    bytes: 558936,
  },
  thomson: {
    url: "https://www.gutenberg.org/cache/epub/10827/pg10827.txt",
    sha: "493418264546852a8e6eca715062769eb003020b2c24dad75baf949f869e901f",
    bytes: 834413,
    ebook: 10827,
  },
} as const;

/** The downloads, as fetch.ts keeps them under .cache/sources/machiavelli. */
export const DISCORSI_CACHE = {
  odt: "liberliber-discorsi.odt",
  thomson: "thomson.txt",
} as const;

/** The annotation's units, in reading order: the dedication, then each book cut at paragraph boundaries. */
export const DISCORSI_UNITS = [
  "0-1",
  "1-1", "1-2", "1-3", "1-4", "1-5", "1-6", "1-7", "1-8", "1-9", "1-10", "1-11", "1-12", "1-13",
  "2-1", "2-2", "2-3", "2-4", "2-5", "2-6", "2-7", "2-8", "2-9", "2-10", "2-11",
  "3-1", "3-2", "3-3", "3-4", "3-5", "3-6", "3-7", "3-8", "3-9", "3-10", "3-11", "3-12",
] as const;
export type DiscorsiUnit = (typeof DISCORSI_UNITS)[number];

const chapters = (book: number, first: number, last: number): string[] =>
  Array.from({ length: last - first + 1 }, (_, i) => `${book}-${first + i}`);

/**
 * The sections the English files and the alignment use, in reading order: "<book>-<chapter>". "0-0" is the
 * dedication, "1-0" and "2-0" are the proemi, and Book III has no proemio.
 */
export const DISCORSI_SECTIONS: readonly string[] = ["0-0", ...chapters(1, 0, 60), ...chapters(2, 0, 33), ...chapters(3, 1, 49)];

/**
 * SHA-256 of every vendored file, data/discorsi/<kind>/<name>.<extension>:
 *   conllu     <unit>.conllu: the annotation, UDPipe 2's output for each paragraph
 *   text       <unit>.txt, the canonical text by unit (headings marked "# "); manifest.json, the canonical records;
 *              fixes.tsv, the 16 corrections to Liber Liber's text
 *   alignment  <section>.tsv
 *   en         <section>.txt and front.txt
 *   en-sent    <section>.tsv
 *   notes      notes.tsv
 * A reviewed annotation replaces conllu/<unit>.conllu. Where it merges or splits sentences, it also replaces the
 * alignment/<section>.tsv files that name the renumbered ids. The pins of the replaced files change in pins.json;
 * nothing else changes.
 */
export const DISCORSI_SHA = pins as {
  readonly conllu: Readonly<Record<DiscorsiUnit, string>>;
  readonly text: Readonly<Record<DiscorsiUnit | "manifest" | "fixes", string>>;
  readonly alignment: Readonly<Record<string, string>>;
  readonly en: Readonly<Record<string, string>>;
  readonly "en-sent": Readonly<Record<string, string>>;
  readonly notes: { readonly notes: string };
};
export type DiscorsiKind = keyof typeof DISCORSI_SHA;

/**
 * A correction to Liber Liber's text, from data/discorsi/text/fixes.tsv. `line` is the ODT block, counted from 1
 * (every text:p and text:h of the document, the colophon and contents included). `col` and `end` give the position of
 * `from` in that block's text before normalisation, counted from 0. `occurrence` says which occurrence of `from` on
 * the line it is. The fix applies only where `before` and `after` surround it.
 */
export interface DiscorsiFix {
  line: number;
  col: number;
  end: number;
  occurrence: number;
  from: string;
  to: string;
  before: string;
  after: string;
  /** The witnesses and the reason, as the check of the transcription recorded them. */
  evidence: string;
}

/** The fixes the canonical text was made with, in the table's order. lib/discorsi-text.ts applies fixes.tsv and checks it against these. */
export const DISCORSI_FIXES: readonly DiscorsiFix[] = manifest.fixes.map((fix) => ({
  line: Number(fix.line),
  col: Number(fix.col_start),
  end: Number(fix.col_end),
  occurrence: Number(fix.occurrence_on_line),
  from: fix.from,
  to: fix.to,
  before: fix.context_before,
  after: fix.context_after,
  evidence: fix.evidence,
}));
