// Pinned sources for the Genesis Reader. Each file is checked against its SHA-256 after download.
//
// Open Scriptures Hebrew Bible (OSHB, morphhb): the Westminster Leningrad Codex text (public domain) with the OSHB
// Parsing Project's lemma and morphology for every word (CC BY 4.0), pinned to the commit below.
//
// Open Scriptures Hebrew Lexicon: Brown–Driver–Briggs (1906, public domain) and Strong (1894, public domain) as the
// project encoded them, with the index files that join the OSHB lemma numbers to BDB entries (CC BY 4.0 on the
// compilation), pinned to the commit below.
//
// JPS TaNaKH 1917, the Jewish Publication Society's translation (public domain), from eBible.org. eBible regenerates
// its zip files, so the zip itself cannot be hashed: the hash pins the book file extracted from it, and the build
// stops if eBible changes the text.
export const OSHB_COMMIT = "3d15126fb1ef74867fc1434be1942e837932691f";
export const LEXICON_COMMIT = "21c9add13bc727d3a951361778e97e3ff7afd1ce";

export interface Source {
  url: string;
  /** SHA-256 of the file, or of the member of the zip archive at `url`. */
  sha256: string;
  /** The member of a zip archive. */
  member?: string;
}

const OSHB = `https://raw.githubusercontent.com/openscriptures/morphhb/${OSHB_COMMIT}`;
const LEXICON = `https://raw.githubusercontent.com/openscriptures/HebrewLexicon/${LEXICON_COMMIT}`;

/** Cache path → source. */
export const SOURCES: Readonly<Record<string, Source>> = {
  "oshb/Gen.xml": { url: `${OSHB}/wlc/Gen.xml`, sha256: "0526e5c9a5fb4d907847645f954ed3d1268fa69decbd872056cedd2668d86449" },
  "lexicon/AugIndex.xml": { url: `${LEXICON}/AugIndex.xml`, sha256: "e7217ca8ff8ff3f21f9cf1bbe87411adf55f6aa88bcf5ed9ddc886cc6b160c5d" },
  "lexicon/LexicalIndex.xml": { url: `${LEXICON}/LexicalIndex.xml`, sha256: "8f7a605c58899d2f44430149c143c00903976e1e91232476677972a69e5bc85f" },
  "lexicon/BrownDriverBriggs.xml": { url: `${LEXICON}/BrownDriverBriggs.xml`, sha256: "2b52658a4323d91674cda4090ab8b3ebddfff640f4f18143c28300e80b2c38f8" },
  "jps/02-GENengjps.usfm": {
    url: "https://ebible.org/Scriptures/engjps_usfm.zip", member: "02-GENengjps.usfm",
    sha256: "885bdcabcdca76ceba4d0cf4e11ae73bc83a306985779cf0b0476e9d85e2edc7",
  },
};
