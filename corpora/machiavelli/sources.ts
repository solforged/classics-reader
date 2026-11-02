// Pinned sources for the Machiavelli Reader. Downloads are checked against their SHA-256; fetch.ts keeps what the
// build reads under .cache/sources/machiavelli. The Italian text and its morphology are not downloaded: the CoNLL-U
// is checked into data/ (the tagger is a service, and a build must not depend on it), and the paragraph text is
// recovered from the # text lines and checked against the hashes below.
//
// Italian: it.wikisource.org, Il Principe, the anonymous "Italia, 1814" imprint, proofread against the scan
// (CC BY-SA 3.0 and GFDL). One file per division; the dedication has an empty rubric line, then the address and
// the letter. data/text-manifest.json is that extract's manifest (oldid, rubric, paragraph text SHA-256).
//
// Morphology: UDPipe 2, model italian-isdt-ud-2.17-251125, whose output the service marks CC BY-NC-SA. The CoNLL-U
// in data/ is that output, checked word by word. CONLLU_SHA is the hash of those files; the build throws if a
// file does not match, so a reviewed replacement is a copy into data/ and an update of the pin here.
//
// English: Luigi Ricci, The Prince (Oxford, 1909), public domain, Project Gutenberg #57037. Gutenberg regenerates
// its cache files, so the hash pins the copy this build was checked against.
//
// The sentence alignment (data/alignment/) is Luigi Ricci's sentences against the Italian paragraphs. It names
// sentence ids; the sentences themselves are data/it-sent/, data/en/ and data/en-sent/, which the build reads.
// A later alignment replaces those files.
//
// Wiktionary's Italian entries (CC BY-SA 4.0 and GFDL), the same kaikki.org capture the Dante Reader pins.
import textManifest from "./data/text-manifest.json";

export const MODEL = "italian-isdt-ud-2.17-251125";
export const MODEL_SERVICE = "https://lindat.mff.cuni.cz/services/udpipe/";

/** The work page the chapter transclusions belong to. */
export const WIKISOURCE_OLDID = 3702248;
export const WIKISOURCE_URL = `https://it.wikisource.org/w/index.php?title=Il_Principe&oldid=${WIKISOURCE_OLDID}`;

export interface TextPin {
  title: string;
  url: string;
  oldid: number;
  pages: string;
  /** Empty for the dedication, which prints no rubric. */
  rubric: string;
  paragraphs: number;
  words: number;
  /** SHA-256 of the paragraph file: a blank line, then one paragraph per line, when the rubric is empty. */
  sha256: string;
}

export const TEXT = textManifest.units as Record<string, TextPin>;

/** Dedication, then chapters 01–26. Row order and citation numbers follow this. */
export const UNITS = ["dedica", ...Array.from({ length: 26 }, (_, i) => String(i + 1).padStart(2, "0"))] as const;
export type UnitId = (typeof UNITS)[number];

/** The dedication is chapter 0, so Prin. 0 cites it and Prin. 18 cites chapter 18. */
export const chapterOf = (unit: string): number => (unit === "dedica" ? 0 : Number(unit));

/**
 * SHA-256 of data/<unit>.conllu: the UDPipe output after the word-by-word review (nine reviewers, one slice each).
 * The build throws on a file that does not match.
 */
export const CONLLU_SHA: Readonly<Record<UnitId, string>> = {
  dedica: "4c5701b2b33fd971c2fb39afebc4c503abf152e19d2a5f06d6696477903a5cea",
  "01": "de6ae13ccfed5e1d6dd4488c8ff95cd9bdd238bc21b0068849912d51aff58097",
  "02": "79fc0c41ae58c1568096962b45f8c486eb190f453a317e605a6243dae1f06104",
  "03": "542a0793d074404e78c68e5eeb3cc30e2511ea308651566109ee076b1e40b089",
  "04": "d2dfeee41d13ed53c35d2cf6034f0df09eb8c6cc916ffdd1828ea39f39dacad8",
  "05": "90fdf47d3fde68c97d4f9bb809c00edc0227a395ce0e457747c588e60274b55d",
  "06": "fd3cb63ca4bb2dd21b16d4d9132caafb347797d68e6d3ac561d82077079b0209",
  "07": "7d4eabad420a89345041f7237c1d6860bf3fd4f7c43484b72384b374b31cd1dd",
  "08": "e4569d5a38688933c0bdd8216bb1180eecee0289b1e9e45db9140e79c084a3c0",
  "09": "ba9742bcfe52439270d35bab0abf8f9624a371999bf39378c39f01ea3d0eaf1d",
  "10": "54b787d73d7efa1bd58b77f06fbfeddbb19d7724d98b02bc196b33dc0cf60efe",
  "11": "29eced3698d46f7eceb105b071806873c98060620823103cb0a8ef168983c9aa",
  "12": "c95a48977a4d79c59bd1cefa859f3f6ea6a8cc4590cbc39bb228178f6f5a3c8b",
  "13": "1a70155884e325db2c8fbfc9e5c4abf03629e6e3778c889c74b67f78680b0ff1",
  "14": "4b3cd00631fba0be2daae373e01d3f8941990be4b77f8d4c873a63d981eae326",
  "15": "0586ed9c4800d5ee9f934c48e8db8a38199cc97a91a7bdd984452cfb20e517ef",
  "16": "275bd3d3785196487c7fbc8dcda7f8e832b8ce2c06669286bf438c3a85444313",
  "17": "20eeb8afd389089e5d22351fe843f3a6d407aa533a821a0ff5e7bac3246e7a15",
  "18": "89a66c138c58a21128c60a917bed8f05be0ae433c92d6ec1da337a0c77ccc88c",
  "19": "e4b6d81bce774a5a2880998c5194583669fb036e0ef539ac86012db81f1abba9",
  "20": "06eb9cc95606d63b0253db3aaf24a40baf307e7a0bc44f10dc01a9bfe404da51",
  "21": "2b99173a77fc165c2f5e1e1fea154e79ad833be30c9d675e128aefb2e51bc64e",
  "22": "27d2e419d6c1cb30dcd7b220c1be2a9b6b34c20f49f5d1beee9915d41554f8ca",
  "23": "974df662975db648a194f2e6c4a6cabc36c9032c53af03137fb04c26a75a6972",
  "24": "3d351dc9237319a71e24e504a7de47b91fa24121fad7ddfd6256873ba3d50060",
  "25": "8e3ab3eeebce0207b358d5eac7f7ad7fd00639d212c109d8af08aff4200af549",
  "26": "953b79ab7281f87048b656936e821670895444d29769be44a1a219a67c50d589",
};

export const GUTENBERG: readonly [url: string, sha: string] = [
  "https://www.gutenberg.org/cache/epub/57037/pg57037.txt",
  "45e0ad8b224d74b3f535b1c36b0264a702c6f644f73438f0d2fc602ef35f4382",
];

/** The Dante Reader's kaikki.org capture. One dump serves both Italian readers. */
export const KAIKKI: readonly [url: string, sha: string] = [
  "https://web.archive.org/web/20250621125649id_/https://kaikki.org/dictionary/Italian/kaikki.org-dictionary-Italian.jsonl",
  "f89847fdfa315aa414580be949e2c0c10c77281b3d2c17f66c5e64bacbf69dbf",
];

/** What fetch.ts derives, under .cache/sources/machiavelli. */
export const DERIVED = {
  /** Wiktionary entries whose headword matches an annotation lemma, and the entries those redirect to. */
  wiktionary: "wiktionary-it.jsonl",
} as const;
