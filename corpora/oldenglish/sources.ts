// Pinned sources for the Old English Reader. Each file is checked against its SHA-256 after download.
//
// ISWOC (the Oslo treebank of Old English: Bech and Eide 2014), PROIEL XML, CC BY-NC-SA 4.0 (each file's own
// <license-url>). Apollonius of Tyre (apt) is Goolden's 1958 text, the Gospel of Mark (wscp) Skeat's edition of
// the West-Saxon Gospels. As Syntacticus republishes it, at a commit.
//
// Bosworth–Toller, An Anglo-Saxon Dictionary Online: the CSV of the data dump of 2021-04-09 (v0.1) from LINDAT/CLARIAH-CZ,
// CC BY 4.0, handle http://hdl.handle.net/11234/1-3532.
//
// Benjamin Thorpe's translation of Apollonius (1834), public domain, as the Wikisource transcription of the
// printed pages 37–60 (the pages of the translation up to where the Old English breaks off), each page pinned
// to a revision id and fetched through the MediaWiki API. Wikisource's own text is CC BY-SA 4.0.
//
// The King James Version, public domain (outside the United Kingdom, where the Crown holds the letters patent),
// from Project Gutenberg ebook #10. Gutenberg re-releases texts now and then, so the hash pins this release.
//
// Wiktionary's Old English entries as kaikki.org extracts them, CC BY-SA 4.0. kaikki.org regenerates the file from
// Wiktionary's dumps, so the file at this URL is likely to change: the hash pins the extract this build was made
// with, and the fetch fails when upstream has moved on.
export const ISWOC_COMMIT = "525cee4fb40590d7d514376c11acaed1bdd91c15";

/** Wikisource's revision id of each proofread page of Thorpe's translation (index "…Apollonius of Tyre.djvu"), pages 37–60. */
export const THORPE_REVISIONS: Readonly<Record<number, number>> = {
  37: 12313020, 38: 11961124, 39: 11964626, 40: 12336138, 41: 12336121, 42: 12336123, 43: 12336124, 44: 12336125,
  45: 12336126, 46: 11964662, 47: 11982699, 48: 11982719, 49: 15300262, 50: 12336127, 51: 11982771, 52: 11982773,
  53: 12336128, 54: 12336129, 55: 11982800, 56: 12336130, 57: 12336131, 58: 12336132, 59: 11982830, 60: 11982840,
};

const ISWOC = `https://raw.githubusercontent.com/syntacticus/syntacticus-treebank-data/${ISWOC_COMMIT}/iswoc`;
const THORPE =
  "https://en.wikisource.org/w/api.php?action=query&prop=revisions&rvprop=ids%7Ccontent&rvslots=main&format=json&formatversion=2&revids=" +
  Object.values(THORPE_REVISIONS).join("%7C");

/** Cache path → [URL, SHA-256]. */
export const SOURCES: Readonly<Record<string, readonly [string, string]>> = {
  "iswoc/apt.xml": [`${ISWOC}/apt.xml`, "80d55cfca8102ad5385be420fa2568a57289da1c6cd663500d6847e15d27d806"],
  "iswoc/wscp.xml": [`${ISWOC}/wscp.xml`, "5f22a5feb52500457000f7cad423e1e11c1172f0ce6a7242ececeacfbaa7d4c4"],
  "bosworth-toller.csv": [
    "https://lindat.mff.cuni.cz/repository/server/api/core/bitstreams/3010b742-b2c4-4152-870a-716ce1652e7c/content",
    "1e01962280c33490e869cf65b94012de4cc32b9074e9a1183f37f8b45acae5b1",
  ],
  "thorpe.json": [THORPE, "675e000f81c87da335bc83333b4028552dfb0aa8b4ae4dd520ce8d7dd204e0ae"],
  "kjv.txt": ["https://www.gutenberg.org/cache/epub/10/pg10.txt", "0204adaed1f25700aa854218cae63c7172228c41088f335e99167a071eed83c0"],
  "wiktionary.jsonl": [
    "https://kaikki.org/dictionary/Old%20English/kaikki.org-dictionary-OldEnglish.jsonl",
    "0a2204a8246f4f8adf44ae11ba06a760aa45b62f8f67df4b2747bf4e8dc0802f",
  ],
};
