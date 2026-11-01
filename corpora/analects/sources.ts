// Pinned sources for the Analects Reader. Every download is checked against its SHA-256; fetch.ts keeps only what the
// build reads (see CACHE) under .cache/sources/analects.
//
// Kyoto University Treebank for Classical Chinese, as released in UD_Classical_Chinese-Kyoto (Universal Dependencies
// v2.18, commit below): lemma, UPOS, XPOS, features, English gloss and dependency relation for every token. The
// Analects are the documents KR1h0004_001 … KR1h0004_020, spread over the treebank's train, dev and test files by
// book. The repository's README metadata says "PD" while its LICENSE.txt says CC BY-SA 4.0; the reader follows the
// licence file. The underlying text is Kanripo KR1h0004 (CHANT).
//
// James Legge, The Chinese Classics, vol. 1: Confucian Analects (1861, 2nd ed. 1893), Project Gutenberg #4094, with
// Legge's Chinese interleaved: public domain. Project Gutenberg regenerates cache/epub files; the hash pins the
// copy this build was checked against.
//
// Unicode Unihan database 18.0.0 (kDefinition, kMandarin, kCantonese, variant relations): Unicode Terms of Use.
//
// Wiktionary's Chinese entries (CC BY-SA 4.0 and GFDL) as extracted by Wiktextract and published by kaikki.org. The
// dump is regenerated roughly weekly and not versioned, so the hash below is a snapshot (Last-Modified 2026-10-30):
// when kaikki.org publishes a new one, `fetch` stops with the new hash and the reader must be re-checked against it.
export const KYOTO_COMMIT = "59ee9e05a0ad55514e03b443411e69f45af64b7e";

/** Treebank file → SHA-256 of the file at KYOTO_COMMIT. */
export const KYOTO_FILES: Readonly<Record<string, string>> = {
  "lzh_kyoto-ud-train.conllu": "ce1202b74d176440a8a94d959e7ccd22496de49c80ca70bcda283bbc49191b68",
  "lzh_kyoto-ud-dev.conllu": "b67614202e30006f9cada1abccbd8f04371f50bd9821791db4c3932a3fd6b3a7",
  "lzh_kyoto-ud-test.conllu": "e492ba5f5054ee560c33197e1681a5c18c3f21adff7dca82be3ed4af09cbf1e5",
  "LICENSE.txt": "899b1804a12ebc090b96339614eede1b64b686721b650a71430b55b5235f7f79",
};
export const kyotoUrl = (file: string): string =>
  `https://raw.githubusercontent.com/UniversalDependencies/UD_Classical_Chinese-Kyoto/${KYOTO_COMMIT}/${file}`;

/** Document ids of the Analects in the treebank: KR1h0004_001 … _020. */
export const ANALECTS_DOC = /^KR1h0004_(\d{3})$/u;

export const LEGGE: readonly [url: string, sha: string] = [
  "https://www.gutenberg.org/cache/epub/4094/pg4094.txt",
  "e92780d776ce096aac09e8416a70e1d421d3074de9e35c852c0565b456e42d30",
];

export const UNICODE_VERSION = "18.0.0";
export const UNIHAN: { url: string; sha: string; members: Readonly<Record<string, string>> } = {
  url: `https://www.unicode.org/Public/${UNICODE_VERSION}/ucd/Unihan.zip`,
  sha: "4c93ea9c1f636451729a840978f1667a53886af37ba854fdcce109721c63d43e",
  /** Zip member → SHA-256 of the unpacked file. */
  members: {
    "Unihan_Readings.txt": "9d39995b5de714e8ce93716ed5d15eaa0792d68e407cdf8a0add2893b8f4150b",
    "Unihan_Variants.txt": "4ccfd34b08ac7b9c14353f6668ba43e3796d85c4cdce7952b635be16015aafa2",
  },
};

export const KAIKKI: readonly [url: string, sha: string] = [
  "https://kaikki.org/dictionary/Chinese/kaikki.org-dictionary-Chinese.jsonl",
  "abb01fd0088353df84d8696af049b94b99acfc28ad2d640c72267afc5463947c",
];

/** What fetch.ts leaves under .cache/sources/analects. */
export const CACHE = {
  /** The Analects' documents from all three treebank files, sorted by document id. */
  kyoto: "kyoto-analects.conllu",
  legge: "legge-analects.txt",
  readings: "unihan-readings.txt",
  variants: "unihan-variants.txt",
  /** Wiktionary entries for the headwords the treebank uses, reduced to the fields the build reads (wiktionary.ts). */
  wiktionary: "wiktionary-zh.jsonl",
} as const;
