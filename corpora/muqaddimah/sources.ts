// Pinned sources for the Muqaddimah Reader (Ibn Khaldūn, al-Muqaddima: the author's preface, the Introduction, the Book
// One preface and the six prefatory discussions, lines 39–3204 of the OpenITI file). Downloads are checked against
// their SHA-256; fetch.ts keeps what the build reads under .cache/sources/muqaddimah. The morphology is not downloaded:
// the CoNLL-U is checked into data/ (the tagger is a model, and a build must not depend on it).
//
// Arabic: Khalīl Shaḥāda's edition (revised by Suhayl Zakkār, Dār al-Fikr, Beirut 1988), typed for al-Maktaba
// al-Shāmila #12320 and carried into OpenITI (release 2025.1.9, Zenodo 10.5281/zenodo.17767721) as mARkdown, CC BY-NC-SA
// 4.0. The file has no vowel marks. lib/openiti.ts derives the paragraphs from the download (page, folio and footnote
// markers stripped, verse and headings kept as rows); the CoNLL-U # text lines, joined by a space within a paragraph,
// must be those paragraphs, so these pins are the whole chain from the download to the page.
//
// Morphology: CAMeL Tools 1.6.0, the BERT-unfactored MSA disambiguator over the calima-msa-r13 analyser database (the
// database is GPL-2: lemma, root, part of speech and features are kept, CAMeL's English glosses are not). The CoNLL-U
// in data/conllu is that output, converted to Universal Dependencies by tools/annotate.py (clitic clusters as
// multiword tokens, a patch table for the words CAMeL cannot analyse) and then, REVIEW_STATUS says, checked by hand.
// CONLLU_SHA are the hashes of those files; the build throws if a file does not match, so a reviewed replacement is a
// copy into data/conllu and a run of tools/pins.ts, which rewrites the pin block below.
//
// English: a new translation made from the Arabic and checked against de Slane's French. data/en/<unit>.tsv (one line per
// Arabic row) and data/notes.tsv are vendored, not downloaded; they are not hashed, and the build checks them row by row
// against units.json.
//
// Dictionaries: Lane's Arabic–English Lexicon in the Perseus TEI as amended by laneslexicon (free distribution with the
// credit "Text provided by Perseus Digital Library, with funding from The U.S. Department of Education and The Max
// Planck Society" and the availability statement intact), and the Wiktionary Arabic entries (CC BY-SA 4.0 and GFDL) of
// kaikki.org's extract. kaikki.org has deprecated its Arabic file, so the build reads data/wiktionary.json, the entries
// of the corpus's lemmas and what they redirect to, pinned by WIKTIONARY_SHA. tools/extract.ts re-derives that file from
// the pinned dump (KAIKKI) and the corpus's lemmas in data/conllu, byte for byte, and `bun corpora/muqaddimah/fetch.ts
// --kaikki` checks the result against the pin whenever the dump can still be had.

/** The OpenITI file (commit of OpenITI/0825AH). */
export const OPENITI = {
  url: "https://raw.githubusercontent.com/OpenITI/0825AH/bae1fba53712c020fe43e3e60b37dfe61f2b64a8/data/0808IbnKhaldun/0808IbnKhaldun.Tarikh/0808IbnKhaldun.Tarikh.Shamela0012320-ara1.mARkdown",
  sha256: "581ef74982d8b208361f286a5a446dcf7be7df9008aed529cc952e12bd9729a5",
  bytes: 14_129_313,
} as const;

/** Lane's Lexicon, laneslexicon/lexicon_xml at f3c19fb. The tarball's one top directory is dropped when it is unpacked. */
export const LANE = {
  url: "https://github.com/laneslexicon/lexicon_xml/archive/f3c19fb29f2cf2e12de3f97b7ce2b7a0d6682ea6.tar.gz",
  sha256: "630d8bcdddf59bec019516631cb1290d26d016abdb378f3611df7b99cf190177",
  credit: "Text provided by Perseus Digital Library, with funding from The U.S. Department of Education and The Max Planck Society",
} as const;

/** kaikki.org's Arabic Wiktionary dump (868 MB), the source of data/wiktionary.json. Only fetched on request. */
export const KAIKKI = {
  url: "https://kaikki.org/dictionary/Arabic/kaikki.org-dictionary-Arabic.jsonl",
  sha256: "19eee17681c23b3da039878ee7c970d93b75a339989a17a842f14aa7f44ea236",
} as const;

/** What fetch.ts derives, under .cache/sources/muqaddimah (names relative to that directory). */
export const DERIVED = {
  /** The OpenITI file as downloaded. */
  openiti: "openiti.mARkdown",
  /** Lane's XML, one file per letter, unpacked. */
  lane: "lane",
  /** The full kaikki.org dump; present only after `fetch.ts --kaikki`. */
  kaikki: "kaikki-Arabic.jsonl",
} as const;

/** The tagger, for the credits. */
export const ANNOTATOR = { tool: "CAMeL Tools 1.6.0", model: "BERT-unfactored MSA", db: "calima-msa-r13" } as const;

/**
 * Where the review of data/conllu stands: "machine-tagged" (CAMeL's output after tools/annotate.py and its patch table,
 * not yet read by a person) or "reviewed" (every word read and corrected, one reviewer per unit, then a consistency
 * pass across units).
 */
export const REVIEW_STATUS: "machine-tagged" | "reviewed" = "reviewed";

// The pin block below is rewritten by `bun corpora/muqaddimah/tools/pins.ts`: the review units in reading order and the
// SHA-256 of every vendored file. Do not edit it by hand.
// <pins:begin>
export const UNITS = ["preface", "introduction-1", "introduction-2", "book-one", "discussion-1", "discussion-2-1", "discussion-2-2", "discussion-2-3", "discussion-3", "discussion-4", "discussion-5", "discussion-6-1", "discussion-6-2", "discussion-6-3"] as const;
export type MuqUnit = (typeof UNITS)[number];

/** SHA-256 of data/conllu/<unit>.conllu. */
export const CONLLU_SHA: Readonly<Record<MuqUnit, string>> = {
  "preface": "263ad96f364a3810786d22b817b37cb78954f5f6d79fb59e42b91b7795ad2d8d",
  "introduction-1": "16d059b8cec8181833c42c6b9ba7c1de1552c83360cd741dd3e89b6afb110d46",
  "introduction-2": "61ce91008dd20ddaac90115bb9932e18bf205ecef58f4fed57c442942495b5ff",
  "book-one": "68d0e881262d77737f67dac15fd98c8721f9dc6362071a8e91f059b6a136a66c",
  "discussion-1": "582d8f2f99bf374aa9935f406bf6e7c9c084f9dde6abedd63d3e860a1d150803",
  "discussion-2-1": "fbcaefe3ff285d4a50ed9598b41e5c396b8ce4cda80366a7b18655b344376e78",
  "discussion-2-2": "64fb274bc1813c04c2b9f7cf8d29eae01727e6dc0b775bd5a6ceea5155df8fd8",
  "discussion-2-3": "d5bae953914f3ec2f8bec1616ca2baa70df2609d6550d48166fb26541fcbf3a1",
  "discussion-3": "9c0d1aa2a4ea4efce5fb780208aba1c2460dd81c5c9481722327c4e84663e0ac",
  "discussion-4": "90de00720ddbe60eb5a4c63bf36cd6e61b9dcdfdc5960371c1b0b724f968c92e",
  "discussion-5": "dd1164f54973a417bcf0ca45ba485d81e69457a26ea4ffdc8e27b1b368f4eaa3",
  "discussion-6-1": "08632fe5e131ff14dc3f0d1692aa359386daf8e8190a91df8f84ce38999dd219",
  "discussion-6-2": "801840157205a6e9aec97a918346e59342d9c8a0e2fec3320af2b26e604dd747",
  "discussion-6-3": "da71728b1f4b168494d9e059e3ce884ca7d1692eebbaff0715892b819379f439",
};

/** SHA-256 of data/units.json. */
export const UNITS_SHA = "29fd89c7cb058cedc8659c69e754234e5fb2b8b573e1717fdb7cddfd491f4a0c";

/** SHA-256 of data/wiktionary.json. */
export const WIKTIONARY_SHA = "0b1282f33ea4ffbe5ff55232d31a969c7a000b85340ef83395b141869949ead5";
// <pins:end>
