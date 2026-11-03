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
 * SHA-256 of data/<unit>.conllu: the UDPipe output after the word-by-word review (nine reviewers, one slice each) and a
 * consistency pass across the slices.
 * The build throws on a file that does not match.
 */
export const CONLLU_SHA: Readonly<Record<UnitId, string>> = {
  dedica: "2bcf238f4c60f233516bc5468df2a472ecb7a479610a10d640368a5b93a2db55",
  "01": "d80c67d7fe486a51c05609e2f575ad4b2b06fa1f6f7d8185dcf951029353e910",
  "02": "fcef59fd1a41b4137d7abbb7d46d59567d5e183950f0fdb33025f24024d45f6d",
  "03": "28e58c756a7872a896f5b72feffaea3afff5461b68f79a9f2baa859c8f4927cb",
  "04": "393f0b4ebd361283bf554d05c02011ae11b30870baebbe67356a2d4f5469dec3",
  "05": "1dbb7e4cb09b828a15557e2075a8a1d34fb50fe5f1574af04b4cd580aa49c386",
  "06": "1ef9773a4fbcc92e262679fa4df7d8f2dd35d090d3ed84f90221ba2f874f8f54",
  "07": "5d74097496df4b38ec79896acb26aef6493ba4f76a4a7d7567b17e95cdf9167d",
  "08": "03488d7c5b537efe2405db3269b58e69b63b14bdb6533f089fbc62dcf1054b73",
  "09": "190a863eb68f37460d1583e741499d148e2ddd55990fa24eb8726e0485229c2a",
  "10": "089c2c18d98f688968a6808498aba4efeecc76e45a6b9d972c6c763f3c558d1a",
  "11": "7c0f9807b132754f345f238bf9a2a71770e1f75175b2fd9094fdcbcc3a2b7ec6",
  "12": "03d1527978d3620e54b052cd92827930aee300fc745be2e87594c7bcbd01391d",
  "13": "293e6f6b3d363e3e50cbe6d25d5ab3c343a616dcde619b5d433bb1f529b117cb",
  "14": "8b737c5e25fa9e145223887b9b844f3174795627be5955833e06d9cb0c821eb0",
  "15": "5f4bc3f128fb7793fb66579bc83e5752e94cff924baf0fe77c133e10d98e46c2",
  "16": "d37d19772158afe538d3082dfb65d265e0b44110d66728ebc1cb99bc4dde5348",
  "17": "4766dd9b66ce0edfc1e34a6e452f697c60e74aa26b87002d18d0281f9348ae76",
  "18": "e02fda685828fa7e00e9212abd820355fa92be5beacb02fa6531e14075c6c27d",
  "19": "70b7d711af5a4ae20784977be69ec63f99ce621f379d1de3edbf61190e580f78",
  "20": "e4e22b06b089f0e856e2a98130c6e165e642491ad138106705561aca5133c32e",
  "21": "de42dc6159201894b4df5884e61ee28079e455729bedb780fe0073160172793d",
  "22": "2db170573041e8d899eda93fcca2c135c6fc887411bb26a7bd75fac125e7ae28",
  "23": "0e2e3aa545c1f4372a483fb7086231518e475532744f85a43e60fe3b90a65573",
  "24": "c37439e9a7002441cff972a95d7a7b9bb701055ffe2978bd82eabbbc96d2cd4c",
  "25": "406459cf2dc97062d411e1fb24e85e8cd3e9d4cb8d87f762db2f17f6f2048320",
  "26": "21384eabaf4d61aea8848c68a51deac92503289cd84fa81e218f0ac87cc43e75",
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
