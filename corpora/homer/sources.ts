// Pinned sources for the Homer Reader. Each file is checked against its SHA-256 after download.
//
// AGDT: the Ancient Greek Dependency Treebank 2.1 (Perseus Digital Library, Tufts University; Celano's 2015 release of
// the 2010–2011 annotation), Iliad and Odyssey, CC BY-SA 3.0 US (the repository's README at this commit). Only
// book 1 of each is used; the files hold the whole poems.
//
// Perseus canonical-greekLit: the Greek text (perseus-grc2: for the Iliad Monro and Allen's Oxford text, the edition
// AGDT annotated; for the Odyssey the Greek of A. T. Murray's Loeb) and A. T. Murray's English prose (perseus-eng3, Loeb
// 1924 and 1919, public domain); Perseus's encoding is CC BY-SA 4.0.
//
// Dictionaries: Autenrieth's Homeric Dictionary (Harper, 1891; Perseus text 1999.04.0073, which Perseus serves only
// from its "hopper" and has no GitHub copy of); the Middle Liddell (canonical-pdlrefwk, CC BY-SA 4.0) and the LSJ
// (PerseusDL/lexica, CC BY-SA 4.0). The hopper gives no stable URL: it answered one request with the file cut off at
// entry n2018, so the fetch retries until the SHA-256 matches, and the build counts the entries. Perseus may change
// the file; the hash then fails and the build stops.
export const AGDT_COMMIT = "bf4334f0af5e13d16b04c1cccd6237e683ac6f5f";
export const PERSEUS_COMMIT = "a6eb0cc3e6f6e382934a2c8b33577d2fb4371e00";
export const REFWK_COMMIT = "02768b0c37d6102be4899fc0eb57f9d348195243";
export const LEXICA_COMMIT = "1c34cdf756c63cf37db61bd366d733431dbd7aa0";
export const AUTENRIETH_URL = "https://www.perseus.tufts.edu/hopper/dltext?doc=Perseus%3Atext%3A1999.04.0073";

const LSJ_FILES: readonly string[] = [
  "96c89b299bd3a81ee8707bd7092e42878d172b3f301da0adfa41d8d09dfbfde9",
  "e711d36e733f6c199afb84819e86ea0f607b92cbaea4ee8a915e77ebc4662ced",
  "2853d7882df86225df5824e63b579f1ac84f72a89f2ae75961a77a443b4958fa",
  "dbe9a65694887bac4e99c41155e48926ab4b840157ce955479642925bdfc029b",
  "ea63fc316565059bc05c338f369f72b1366dc464e3b3d761e1f9ad447416eb3f",
  "ce0111eb40d9b9d720e59e0d6caaa97b3386ff72f46b195d7a238756d1348479",
  "5340dd231acf6bc79d134e57def4c459c71ed9afbcd0ef3ad4457ebcab164c17",
  "94ea07a228bb7a25f1d2cf93fe0f3fa4b72e6b17553fca069ad06ae5bb78f518",
  "7f274c8dce5f6837c55f3f3db5c8e86c84c70c42631bb07b761b196d5c0d4f86",
  "51e496289761bab5fb0c4346eded476f12266ce203a30ed2d0fb7500193a9a81",
  "aefc985475f565798afc59ead25d6afa7175dfbc2ab858ef26cc0f3742b84809",
  "6f58010f38711cdcd2812ec9baaedc6d51f2cc39adb24ae9941371c0f2cc2543",
  "983c54dbb094763cb2b92a130656fdd73454b9e85bcfbd121c578c7f4795d58c",
  "8190b1823958783f4820fa7dbeef590cb7f46a50f366473d3008778dfd260c3c",
  "a5f8cc41fe8a05ad3dc45e105e647f20cadebd46ca5250256fe79913746eedb0",
  "492ce0d174267544388f4938324a4137f21a8d7ae86e5d28dec5beaf1a496b7e",
  "4c02d9b465e684d4d83286c80049492e7c5e81250e3ed8e6b1ca1d3fb21a6dc5",
  "72f346e95bf9cb334d119103ff1cab89e39b0bb2fae1364de51428ac8655f727",
  "867386bbb250dc127d73ba105a92fd3a2115a94702ec3c1ffdea575c77bdca57",
  "b39478b6c607db3750ab71e5c4dc4ff40b688cac3d966f4afe62d5ec281e142b",
  "21e5b7e46964192e520c90a177b2dc5c7893e524afce356ccbf9054d43d03189",
  "953b6c398e460cd633be2fefc144e17399a3a9f111d3388d032023227380149b",
  "36ad46cab32dc131619a902d959893a407f1fcfc743c7e129ea9aee6fbde6597",
  "6d3d8c83110b0a3b94c97cf2f9ddf8ced87a6d740a312de2b8a21a3b224677c7",
  "5ba38f1e6f5886af6ee236028d6aee8e910aec89cb66954ae719a05a6866111d",
  "174f544c0afed660fb0aebf7457da4d78a26889b8d40922533473bdf0a6b5c9e",
  "23bea40e1fe0484c39df438112c9cf728df29f3c97d9c465f1b1aaa194840ab6",
];

/** The LSJ's file for part n (1–27), under the cache. */
export const lsjFile = (n: number): string => `lsj/${n}.xml`;
export const LSJ_PARTS = LSJ_FILES.length;

const AGDT = `https://raw.githubusercontent.com/PerseusDL/treebank_data/${AGDT_COMMIT}/v2.1/Greek/texts`;
const PERSEUS = `https://raw.githubusercontent.com/PerseusDL/canonical-greekLit/${PERSEUS_COMMIT}/data/tlg0012`;

/** Cache path → [URL, SHA-256]. */
export const SOURCES: Readonly<Record<string, readonly [string, string]>> = {
  "agdt-iliad.xml": [`${AGDT}/tlg0012.tlg001.perseus-grc1.tb.xml`, "1a7cacbc9460a7acce4a6c7004007619dd8acf1f6e210b3d9f8a3d3e2518c8d9"],
  "agdt-odyssey.xml": [`${AGDT}/tlg0012.tlg002.perseus-grc1.tb.xml`, "e936cc7d0bb3fe61cd0ca83b047e745b495668d12fefe7d4e434d3818febd31d"],
  "iliad-greek.xml": [`${PERSEUS}/tlg001/tlg0012.tlg001.perseus-grc2.xml`, "ae8b617018c6e5af14cbab9ce6082438c0f103eafd0a4c67bdae4588cca5eaa4"],
  "odyssey-greek.xml": [`${PERSEUS}/tlg002/tlg0012.tlg002.perseus-grc2.xml`, "7d7ffafb6c51f8c230c0af3d6c0a6e5c7613cc0a016cc5681fb6e34972b86088"],
  "iliad-murray.xml": [`${PERSEUS}/tlg001/tlg0012.tlg001.perseus-eng3.xml`, "a7f3aa8c2e34efbd631e2c80a8c6705daa214262e07ccc9dd09ed66b59e8f0ee"],
  "odyssey-murray.xml": [`${PERSEUS}/tlg002/tlg0012.tlg002.perseus-eng3.xml`, "199ed8cda2d5928253639afbed564d6beceee2ed4bd25036a2c1730b4738393b"],
  "autenrieth.xml": [AUTENRIETH_URL, "21489fcb89bd49b8dbc76837cb2b0d2207b804ff7ce5939b87e951b4dc5d29ca"],
  "middle-liddell.xml": [
    `https://raw.githubusercontent.com/PerseusDL/canonical-pdlrefwk/${REFWK_COMMIT}/data/viaf66541464/001/viaf66541464.001.perseus-eng1.xml`,
    "e273dbed7938de7ab9ed4cf4af0e93216141f89226318a697c94b5d43f924cb7",
  ],
  ...Object.fromEntries(LSJ_FILES.map((sha, i) => [
    lsjFile(i + 1),
    [`https://raw.githubusercontent.com/PerseusDL/lexica/${LEXICA_COMMIT}/CTS_XML_TEI/perseus/pdllex/grc/lsj/grc.lsj.perseus-eng${i + 1}.xml`, sha],
  ])),
};
