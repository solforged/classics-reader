// Pinned sources for the Dante Reader. Every download is checked against its SHA-256; fetch.ts keeps what the build
// reads under .cache/sources/dante.
//
// UD_Italian-Old (Universal Dependencies v2.18, commit below), CC BY-SA 4.0: the whole Commedia in Petrocchi's text
// (1966–67, revised 1994) as the DanteSearch corpus gives it, with lemma, UPOS, features and dependency relations
// for every word, and the canto and line (MISC Canto=, Verso=) of nearly every word. The sentences are spread over
// the train, dev and test files and are put back in order by their ids.
//
// La Divina Commedia di Dante, Project Gutenberg #1012, public domain: an Italian text with the same cantos and lines
// as Petrocchi's and a few dozen other readings. The build uses it only to place the words the treebank leaves
// without a line (lines.ts).
//
// Henry Wadsworth Longfellow's translation (1867), public domain, Project Gutenberg #1004: line for line with the
// Italian in every canto but one (Purgatorio 26, where a footnote translates Arnaut Daniel's Provençal).
//
// Project Gutenberg regenerates its cache/epub files now and then, so the hashes pin the copies this build was checked
// against, and the fetch stops when a file has changed.
//
// Wiktionary's Italian entries (CC BY-SA 4.0 and GFDL) as extracted by Wiktextract and published by kaikki.org. The
// dump is regenerated weekly at a fixed URL (and the post-processed file is to be withdrawn), so the reader uses the
// Internet Archive's capture of 2025-06-21, which does not change.
//
// Paget Toynbee, A Concise Dictionary of Proper Names and Notable Matters in the Works of Dante (1914), public
// domain, as the Internet Archive's OCR text of the University of California copy.
export const UD_COMMIT = "2c1361d621dafa7c465da0947f73765caaf743af";

/** Treebank file → SHA-256 at UD_COMMIT. */
export const UD_FILES: Readonly<Record<string, string>> = {
  "it_old-ud-train.conllu": "9e94e25d826632a005adc2a8a1daa88f46bdd1509d56090b4c82d27779e1a5e0",
  "it_old-ud-dev.conllu": "6c900aecef3abebfe87c4e5d5c9880326cc69b8122e62ec95ef6c50fbe4e6e0b",
  "it_old-ud-test.conllu": "19dc1ecf5bfffd552130be63c3dab02d1dd9b9e6a6d4bc31ace0fe6494ebdf89",
  "LICENSE.txt": "899b1804a12ebc090b96339614eede1b64b686721b650a71430b55b5235f7f79",
};
export const udUrl = (file: string): string =>
  `https://raw.githubusercontent.com/UniversalDependencies/UD_Italian-Old/${UD_COMMIT}/${file}`;

/** Cache path → [URL, SHA-256], for files kept as downloaded. */
export const FILES: Readonly<Record<string, readonly [url: string, sha: string]>> = {
  "gutenberg-italian.txt": [
    "https://www.gutenberg.org/cache/epub/1012/pg1012.txt",
    "568035b4af7bda4f69f8ed5dea160f59bcf5b9371c7f2a62a97f94b826c0c1c6",
  ],
  "longfellow.txt": [
    "https://www.gutenberg.org/cache/epub/1004/pg1004.txt",
    "c233a7ef9444890cb7f16071ff54d997307a3c60dcd6506cfd415bae2430eac2",
  ],
  "toynbee.txt": [
    "https://archive.org/download/concisedictionar00toynrich/concisedictionar00toynrich_djvu.txt",
    "6c1fa13531c4c006b84fde0813d2f686d93129b9130a5f2e6a3c334513e3e0e4",
  ],
};

/**
 * Other addresses of the same files, tried in turn when the first fails: archive.org's download address redirects
 * to one storage server, which may be down while the item's primary server answers.
 */
export const MIRRORS: Readonly<Record<string, readonly string[]>> = {
  "toynbee.txt": ["https://ia800706.us.archive.org/14/items/concisedictionar00toynrich/concisedictionar00toynrich_djvu.txt"],
};

export const KAIKKI: readonly [url: string, sha: string] = [
  "https://web.archive.org/web/20250621125649id_/https://kaikki.org/dictionary/Italian/kaikki.org-dictionary-Italian.jsonl",
  "f89847fdfa315aa414580be949e2c0c10c77281b3d2c17f66c5e64bacbf69dbf",
];

/** What fetch.ts derives from downloads, under .cache/sources/dante. */
export const DERIVED = {
  /** The treebank's three files, sentences in reading order (Inferno, Purgatorio, Paradiso, each by number). */
  treebank: "commedia.conllu",
  /** Wiktionary entries whose headword matches a treebank lemma, and the entries those redirect to (wiktionary.ts). */
  wiktionary: "wiktionary-it.jsonl",
} as const;
