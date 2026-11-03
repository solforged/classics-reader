// Pinned sources for the Machiavelli Reader. Downloads are checked against their SHA-256; fetch.ts keeps what the
// build reads under .cache/sources/machiavelli. The morphology is not downloaded for either work: the CoNLL-U is
// checked into data/ (the tagger is a service, and a build must not depend on it).
//
// Morphology: UDPipe 2, model italian-isdt-ud-2.17-251125, whose output the service marks CC BY-NC-SA. The CoNLL-U
// in data/ is that output, checked word by word. PRINCE_CONLLU_SHA and ARTE_SHA.conllu are the hashes of those
// files; the build throws if a file does not match, so a reviewed replacement is a copy into data/ and an update of
// the pin here.
//
// ---- Il Principe ----
// Italian: it.wikisource.org, the anonymous "Italia, 1814" imprint, proofread against the scan (CC BY-SA 3.0 and
// GFDL). One file per division; the dedication has an empty rubric line, then the address and the letter. The
// paragraph text is recovered from the CoNLL-U # text lines and checked against data/text-manifest.json (oldid,
// rubric, paragraph text SHA-256 of that extract).
//
// English: Luigi Ricci, The Prince (Oxford, 1909), public domain, Project Gutenberg #57037. Gutenberg regenerates
// its cache files, so the hash pins the copy this build was checked against.
//
// The sentence alignment (data/alignment/) is Luigi Ricci's sentences against the Italian paragraphs. It names
// sentence ids; the sentences themselves are data/it-sent/, data/en/ and data/en-sent/, which the build reads.
// A later alignment replaces those files.
//
// ---- Dell'arte della guerra ----
// Italian: Mario Martelli's edition (Niccolò Machiavelli, Tutte le opere, Sansoni, Firenze 1971) in Liber Liber's
// transcription (progetto Manuzio, 1997). The download is a ZIP; fetch.ts decodes its text file (Windows-1252) to
// UTF-8 and keeps it. The build derives the paragraphs from it with ARTE_TEXT_FIXES and checks them against the
// CoNLL-U # text lines, so the pins below are the whole chain from the download to the page.
//
// English: Ellis Farneworth's translation (1762) as the English Wikisource transcribes the 1775 printing of The Works
// of Nicholas Machiavel, vol. 4 (transcription CC BY-SA 4.0 and PD-old, every page proofread once). Farneworth's text
// is not downloaded either. data/arte/en/ (one paragraph per line) and data/arte/en-sent/ (its clauses) are the text
// that the 239 Page: revisions of data/arte/wikisource.json give after the apparatus is stripped (running heads,
// catchwords, speaker labels moved to metadata, footnotes moved to data/arte/notes/); the hand-checked sentence
// alignment is data/arte/alignment/. All of it is pinned by hash below.
//
// Wiktionary's Italian entries (CC BY-SA 4.0 and GFDL), the same kaikki.org capture the Dante Reader pins.
import textManifest from "./data/text-manifest.json";
import wikisource from "./data/arte/wikisource.json";
import type { ArteBook } from "./lib/liberliber";

export const MODEL = "italian-isdt-ud-2.17-251125";
export const MODEL_SERVICE = "https://lindat.mff.cuni.cz/services/udpipe/";

/** The Dante Reader's kaikki.org capture. One dump serves both Italian readers. */
export const KAIKKI: readonly [url: string, sha: string] = [
  "https://web.archive.org/web/20250621125649id_/https://kaikki.org/dictionary/Italian/kaikki.org-dictionary-Italian.jsonl",
  "f89847fdfa315aa414580be949e2c0c10c77281b3d2c17f66c5e64bacbf69dbf",
];

/** What fetch.ts derives, under .cache/sources/machiavelli. */
export const DERIVED = {
  /** Wiktionary entries whose headword matches an annotation lemma, and the entries those redirect to. */
  wiktionary: "wiktionary-it.jsonl",
  /** The lemma keys wiktionary-it.jsonl was extracted for, one per line: the next fetch keeps it while they cover the annotation. */
  wiktionaryKeys: "wiktionary-it.keys.txt",
  /** The Arte's Liber Liber text file, decoded to UTF-8. */
  arteText: "liberliber-arte.txt",
} as const;

// ---- Il Principe ------------------------------------------------------------------------------------------------

/** The work page the chapter transclusions belong to. */
export const PRINCE_WIKISOURCE_OLDID = 3702248;
export const PRINCE_WIKISOURCE_URL = `https://it.wikisource.org/w/index.php?title=Il_Principe&oldid=${PRINCE_WIKISOURCE_OLDID}`;

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

export const PRINCE_TEXT = textManifest.units as Record<string, TextPin>;

/** Dedication, then chapters 01–26. Row order and citation numbers follow this. */
export const PRINCE_UNITS = ["dedica", ...Array.from({ length: 26 }, (_, i) => String(i + 1).padStart(2, "0"))] as const;
export type PrinceUnit = (typeof PRINCE_UNITS)[number];

/** The dedication is chapter 0, so Prin. 0 cites it and Prin. 18 cites chapter 18. */
export const chapterOf = (unit: string): number => (unit === "dedica" ? 0 : Number(unit));

/**
 * SHA-256 of data/<unit>.conllu: the UDPipe output after the word-by-word review (nine reviewers, one slice each), a
 * consistency pass across the slices, and nine follow-up edits from the Arte's consistency pass (ne' as in + i,
 * arbore, ugualmente, secondo che, tale che).
 * The build throws on a file that does not match.
 */
export const PRINCE_CONLLU_SHA: Readonly<Record<PrinceUnit, string>> = {
  dedica: "2bcf238f4c60f233516bc5468df2a472ecb7a479610a10d640368a5b93a2db55",
  "01": "d80c67d7fe486a51c05609e2f575ad4b2b06fa1f6f7d8185dcf951029353e910",
  "02": "fcef59fd1a41b4137d7abbb7d46d59567d5e183950f0fdb33025f24024d45f6d",
  "03": "28e58c756a7872a896f5b72feffaea3afff5461b68f79a9f2baa859c8f4927cb",
  "04": "393f0b4ebd361283bf554d05c02011ae11b30870baebbe67356a2d4f5469dec3",
  "05": "1dbb7e4cb09b828a15557e2075a8a1d34fb50fe5f1574af04b4cd580aa49c386",
  "06": "d3257290c42cd91d2a8917b139632a67d414175a9fdb13335c538532ef6bd5b0",
  "07": "5d74097496df4b38ec79896acb26aef6493ba4f76a4a7d7567b17e95cdf9167d",
  "08": "03488d7c5b537efe2405db3269b58e69b63b14bdb6533f089fbc62dcf1054b73",
  "09": "190a863eb68f37460d1583e741499d148e2ddd55990fa24eb8726e0485229c2a",
  "10": "089c2c18d98f688968a6808498aba4efeecc76e45a6b9d972c6c763f3c558d1a",
  "11": "7c0f9807b132754f345f238bf9a2a71770e1f75175b2fd9094fdcbcc3a2b7ec6",
  "12": "caed1169084c63e3f8db57d0cfe67ca9ea17848f968c8207f42a5a163d14c66f",
  "13": "18829c905bec6961db8d06e09b918c9243dc416ffcd6a5255b75ee40be19e7d5",
  "14": "d521588618208365b7821d997c8d53f81f508f396ba421e67c0d406e1a2e0723",
  "15": "5f4bc3f128fb7793fb66579bc83e5752e94cff924baf0fe77c133e10d98e46c2",
  "16": "d37d19772158afe538d3082dfb65d265e0b44110d66728ebc1cb99bc4dde5348",
  "17": "4766dd9b66ce0edfc1e34a6e452f697c60e74aa26b87002d18d0281f9348ae76",
  "18": "3e3a1d29581b421da875307f0a14c88828a86821777db138489b858b513edee4",
  "19": "70b7d711af5a4ae20784977be69ec63f99ce621f379d1de3edbf61190e580f78",
  "20": "e4e22b06b089f0e856e2a98130c6e165e642491ad138106705561aca5133c32e",
  "21": "de42dc6159201894b4df5884e61ee28079e455729bedb780fe0073160172793d",
  "22": "2db170573041e8d899eda93fcca2c135c6fc887411bb26a7bd75fac125e7ae28",
  "23": "0e2e3aa545c1f4372a483fb7086231518e475532744f85a43e60fe3b90a65573",
  "24": "c37439e9a7002441cff972a95d7a7b9bb701055ffe2978bd82eabbbc96d2cd4c",
  "25": "34e3d01a4079815c71bfa1816d44edf5ddcf12f7df2f29241841b5754bc7d466",
  "26": "21384eabaf4d61aea8848c68a51deac92503289cd84fa81e218f0ac87cc43e75",
};

export const GUTENBERG: readonly [url: string, sha: string] = [
  "https://www.gutenberg.org/cache/epub/57037/pg57037.txt",
  "45e0ad8b224d74b3f535b1c36b0264a702c6f644f73438f0d2fc602ef35f4382",
];

// ---- Dell'arte della guerra -------------------------------------------------------------------------------------

/**
 * The annotation's units: the proemio, then each book cut at paragraph boundaries into slices of about 4,000 words
 * ("<book>-<slice>"). Row order follows this.
 */
export const ARTE_UNITS = [
  "p", "1-1", "1-2", "1-3", "2-1", "2-2", "2-3", "2-4", "3-1", "3-2", "3-3", "4-1", "4-2", "5-1", "5-2", "6-1", "6-2", "6-3",
  "7-1", "7-2", "7-3",
] as const;
export type ArteUnit = (typeof ARTE_UNITS)[number];

/** The proemio ("p") and the seven books, as the annotation and Farneworth's files name them. */
export const ARTE_BOOKS: readonly ArteBook[] = ["p", "1", "2", "3", "4", "5", "6", "7"];

/** The book a unit belongs to. */
export const bookOf = (unit: ArteUnit): ArteBook => (unit === "p" ? "p" : (unit[0] as ArteBook));

/** The proemio is book 0, as the Prince's dedication is chapter 0: AdG. 0.1 is the proemio, AdG. 3.12 is book III, paragraph 12. */
export const bookNumber = (book: ArteBook): number => (book === "p" ? 0 : Number(book));

/** Liber Liber's download. `textSha` is the text file's SHA-256 once decoded to UTF-8 (CRLF line ends kept). */
export const LIBERLIBER = {
  url: "https://www.liberliber.eu/mediateca/libri/m/machiavelli/dell_arte_della_guerra/txt/dell_art.zip",
  zipSha: "bd7aada88856177b337b1801cf36a765adbb2f3f54f9d709e6ef09d42f6c84ed",
  member: "dell_art.txt",
  encoding: "windows-1252",
  textSha: "ddac547b1d13c0d71c1a2202f2a300521d0b538c1e32c23311519713542e08b4",
} as const;

/** The English Wikisource revisions Farneworth's text was taken from (data/arte/wikisource.json). */
export const ARTE_WIKISOURCE = wikisource as {
  index: { title: string; revid: number };
  parents: { id: string; title: string; revid: number; pages: [number, number] | null; sha256: string }[];
  pages: Record<string, { revid: number; sha256: string }>;
};

/**
 * SHA-256 of every vendored file of the Arte, by kind: data/arte/<kind>/<name>.<extension>. The build and fetch throw on
 * a file that does not match.
 *   conllu     the annotation (UDPipe 2 ISDT, hand-checked word by word, then a consistency pass across units): data/arte/conllu/<unit>.conllu
 *   alignment  Farneworth's clauses against the annotation's sentences, hand-checked bead by bead: alignment/<unit>.tsv
 *   en         Farneworth's paragraphs, one per line (the first line is the heading): en/<book>.txt
 *   en-sent    the same text cut into clauses, with the ids the alignment names: en-sent/<book>.tsv
 *   notes      Farneworth's footnotes, with the clause each follows: notes/<book>.tsv
 * and `wikisource`, the hash of data/arte/wikisource.json.
 */
export const ARTE_SHA = {
  conllu: {
    "p": "678a21a603b722cc9e5987f0576e8f3e9ce5e8dfa5cc144516f9956e86a17159",
    "1-1": "f4985897e932722b2158c4ff7db6e017604ac730a93dfc816dbab6f5eba6b5fe",
    "1-2": "c8d4e7086cfc6abb7652ca80fec2df9b86f3405ddd4ca91498e14d97c0593d70",
    "1-3": "55421a7e181917115210b2803be0ceb520072d340a0dc349ad3683b07981e8a7",
    "2-1": "9cf073522a70932178b51df54bdb932c322d3530d0771292e99219a24b1b685b",
    "2-2": "c76a77f0aa25965e9fdc0d4b87d63846cdde685e23a0b04803a997b35d0a5564",
    "2-3": "8695b12e73a43ce8012e376dfdd01d050f12029f6e7575787a3e332bb27798be",
    "2-4": "848be96993439442c1f23b02a3bbd05ec62b27bea5478c81381aad8702f84472",
    "3-1": "fa420364d856203cfb922ffcc011ffcebf2c8e2e869e825de12b6a968054712f",
    "3-2": "7421d68ad2403fc5e20d8ef2977e1ca5e888585a06c6c30fa2a12387c41225ca",
    "3-3": "53dc56895f2b9c3a0afa3519304ec7eefdb6f31f55e4e4624755e6b9bec1f67d",
    "4-1": "d7deb71b00d5897bec8c97908ecd2da2113ad27e139e4b1ffd711c2b8c35bcef",
    "4-2": "e72ae2c8d9ca21b067d6937a2414d2f54da1228b000fd84e0644763b0f97c488",
    "5-1": "137f63959028bf57c5906c5b236b6c1392e1b2cfb2929f29a92519de058675e9",
    "5-2": "63382b8c9da341cdea4f1fe0f397e50cf6e8274a46bdeb9c57aa1eb618b6b715",
    "6-1": "e40438ebd6f028bbf6f7f82bb6725e9dae46198da9c8870fc1e5bff217a72991",
    "6-2": "20805f11d9a43008a99174138ac4180ea9c8b9395660038b83345364e9565c72",
    "6-3": "f0fc1640d6a38ca22be5c15ee9c902b7164ff1a09d0e4a1849f45082b19583ed",
    "7-1": "f7c13e3cc123ec51d9736a0a349ceb713fed40fede1b61ce087a56cc769a7544",
    "7-2": "7908a6cce7c795dab371733150c97584e3cca114f710ad06ce4e10f01fa810cd",
    "7-3": "e181ed4e2d83147768fede22b1730293361ba760ffffe3b556b2c0c3337c9c9e",
  } as Readonly<Record<ArteUnit, string>>,
  alignment: {
    "p": "188041dcf73e2d78418a73737f8cc21a5227b4d5aae3288aa9d9bee6c0142394",
    "1-1": "b2c2baee047f0958bac1990b64750624f378bf736bbd7d74935750f7f92fed0c",
    "1-2": "87e69cd32eb60b7603c93f6af554e03f97650b552451cb726edd1a58a5d05eab",
    "1-3": "723f1886cb26900be306204cf546591895017acb05870af520b7c2921a8e5685",
    "2-1": "9b8bcf0d92349758fa974bec45e0eeb7fe3eb13e8d4d818f15ed5e1e47310aa6",
    "2-2": "b6178b53df2e12117fcfc2c17a583c1e16ad48bbe66e2d6ea4046a9555dc9ba6",
    "2-3": "20a5ef9779f01759fc1aad1b4fb24404c02dcfe226f0097ea83eeddd826a723d",
    "2-4": "c00568336625f3422d597f9c5d71a37db6390f60293ab08db50f9c7ac8a75433",
    "3-1": "5eff94790446aa1d7fee2dd728d4c800e6751f4bf58dde2efb8255fbbad7ab7a",
    "3-2": "cc6f8392f1727744ed70b23f0c0c4bfdf9ef45df79a8daa96a1b98f021db05df",
    "3-3": "c054b576ea25b9cc2e067a1543c7d012e9beebbde23b00110014f00e9606f0e6",
    "4-1": "361d501a6abe956849fa57aeab97b9eec550e7e16f0069be9046b3ddb5baef48",
    "4-2": "42e3abc1cf068dc2a6a98ae7b70f4a3dbdb7aaa6bccaad64330ab03270246a88",
    "5-1": "0e4695a913f7e226de3f0146b393a351f3aae360795a4c95b1706e1bd1d76d94",
    "5-2": "04bbae812cc614515bbfd81f09c2809cddde4234ee952bd2cb3e9e2e664ec50d",
    "6-1": "cdf587b6b99ff919d30b02d1d2b7e47d8a39505970db958857502144eadae823",
    "6-2": "764c16ad7cf74dfb755b1cb964956a355a3c98e53a9c5e0384d8c981285a50f3",
    "6-3": "57fac01014e82ed77c54b7b6458ac99ed9d23b6e82856b07a23839b635d460f1",
    "7-1": "3b0cdacfd2f71ca12402ab17c6b13a69f54ec9f5bde52a25d4362ea3fbac7bc9",
    "7-2": "d507cfd90a129b55d9ea98a61166f5591c511090b6c96be6882e76246a0791f1",
    "7-3": "5b642b3e917ce3a769a857e56f2ae641202f9aec7d22a2578dafbbd11b062f72",
  } as Readonly<Record<ArteUnit, string>>,
  en: {
    "p": "a669e8e87090d8ce8bce9df79315b539a7b57b02842ef3d1934a95076bbc4475",
    "1": "d79403050c22d9779ea73866e0480ba3e186c47fc9d1259e5d0e9128e7d5967f",
    "2": "78e89aa3c58c00999d883313a3343e491de7bab6ebca5fe8107141a7ca9c43ca",
    "3": "7a2695c489e206efd39682396d9249bd31789386659b518c8a6ea70d12ba0c40",
    "4": "cf1ec7b5c1d7ac8c93f65329f34b50e65f8b5e6a298d8722c1cb67b0de5887c4",
    "5": "2a6a0c1b5f8c6e02ef60e7d2ca66d67d73ad4ce550a89aafa666d4f7897260c0",
    "6": "d5465717d8d1cb42b27933e6aec23e5707bc493d8e8d03ac277523f445be105d",
    "7": "0672929ae70d94c7726416640cad59b4daa816d719866329fda62b4bb908d9cb",
  } as Readonly<Record<ArteBook, string>>,
  "en-sent": {
    "p": "1aba348ba4d8ba6a50d020a75053205cdbd8b4a95d8be9d2fe451d2c565a898a",
    "1": "11221b33d9cac765629c6064bde19053031b153a1366aca7033b15272a49d81f",
    "2": "010202cbdddeda2850e053b62627f23d1e8a503e9c9590da5f59a92361665453",
    "3": "fee3c3b2620051d9d8e91da4505a950682ef8c7decccc276cf313c410c9bae79",
    "4": "8aff98a1ce315a49cb558256bd62c7de446acb7b34c9fb5b36b55277a30ac9b4",
    "5": "05ee935f0cce16190f68e2c4edadb98d46ef416ed6a49fd4774c5e9bf0f35f15",
    "6": "e8fe89d98a9d16bcdd90601673c54e5525b77f84429743980690d0ae98a7f023",
    "7": "d714de9582828b47826493f100c5488589827d7ea47cea000b22f3aa1de1a6c1",
  } as Readonly<Record<ArteBook, string>>,
  notes: {
    "p": "6fd861aaa6333033eff669e9855dad015576f5558a98932aa0de4696e638111b",
    "1": "6c8e04c3283d5e3e20b90fd25d72fccecdbbd820d42836659c1a1daef56dd3f2",
    "2": "7571732753fbed6c723343a53e80a3fccf4b0460fc21027a9dd12d9d0277a27b",
    "3": "4ec79db64bc5faa8253780ccde44d2f8703049be50ac825552c5112715db274d",
    "4": "bd8d4d1f1171b409412593d0aef7d1ff0ad3b81a8cd0e6eef3a4d4361c0d41b2",
    "5": "6fd861aaa6333033eff669e9855dad015576f5558a98932aa0de4696e638111b",
    "6": "40b7c21a2d480542c72fbf6643d0fc8a9f7cb9eafc615a6ff39167700b8635bc",
    "7": "186044e1a0edb09a8e8605a615f0c7e4af2ba96aacf2339e8481582dbcf008ea",
  } as Readonly<Record<ArteBook, string>>,
  wikisource: "599affea612448f5844d07112a727e32133c261abdeadcad4fbbfea88c868227",
} as const;
