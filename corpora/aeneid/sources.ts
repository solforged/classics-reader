// Pinned sources for the Aeneid Reader. Each file is checked against its SHA-256 after download.
//
// LASLA (Laboratoire d'Analyse Statistique des Langues Anciennes, Université de Liège), lemmatized and tagged Aeneid,
// as CIRCSE converted it to CoNLL-U: CC BY-NC-SA 4.0. Release v1.0.1 (Zenodo 10.5281/zenodo.8370759). All twelve books
// are read: book 1 is the text; the others supply candidate analyses and the counts that match LASLA's homographs to
// Frieze's entries.
//
// Perseus canonical-latinLit: Greenough's Latin (1881) and Theodore C. Williams's English (1910), both public domain;
// Perseus's encoding is CC BY-SA 4.0.
//
// Frieze's Aeneid vocabulary (Frieze and Dennison 1902), revised by Dickinson College Commentaries: CC BY-SA 4.0. DCC
// exports it live, so the hash pins the snapshot this build was checked against.
export const LASLA_COMMIT = "d54a3044dabd9367bad38f0b76f8a95269e6da32";
export const PERSEUS_COMMIT = "8b536bdf3ed1f43494055efe112433b4a58eab67";

const LASLA_BOOKS: readonly string[] = [
  "e2228aa0ef17a8e757b4e1fea28cd7dfb414aa35993151f3d1147377b892ea24",
  "a42c61c6661173b1d9029dda3e141941b0083c058851e76bdb4c337ccda34e7c",
  "ad3ad4576ec7dd6b12c43e247ca2d8613b41fa8fa74da44a67fcd9f74aab11dd",
  "f3bde277dea762a896a9e4997fa8e083ed1421876759d0d9d61f3aa3cf93c58c",
  "36a1ebf3f06898cd1fa4500a6b1a5aa4a97d987124ab8626e20be109a54aa79c",
  "ab585c641fdcb263c1971d285ceef6477f5120fe998aca79aef9721ddcbbc099",
  "26b8d37ce3c6dd17c2e360a9f65940f8cba74c000fd4d75f9762441062b22d7f",
  "eb9cc874951b01bed111d588d51827a8c41ee6452d45736d8a8ac3cf1ce90065",
  "24edb23b4068b990f17217dd9c20adb829b21c80c74830735c1bbe45a19b549d",
  "d169bd1f480a9025926414ff79afadc0ad2aa474008936b38fe3c3a926d81c6d",
  "f0d729dfbef02a9227362367ae8c8dc1e3503921e72502de0f150bfcdf09b8d5",
  "2691670fc145f954209e56950b35fefdf430af32fbe3513258dfe201412be331",
];

/** LASLA's file for an Aeneid book, under the cache. */
export const laslaFile = (book: number): string => `lasla/VerAen${String(book).padStart(2, "0")}.conllup`;

const PERSEUS = `https://raw.githubusercontent.com/PerseusDL/canonical-latinLit/${PERSEUS_COMMIT}/data/phi0690/phi003`;

/** Cache path → [URL, SHA-256]. */
export const SOURCES: Readonly<Record<string, readonly [string, string]>> = {
  ...Object.fromEntries(LASLA_BOOKS.map((sha, i) => [
    laslaFile(i + 1),
    [`https://raw.githubusercontent.com/CIRCSE/LASLA/${LASLA_COMMIT}/conllup/Vergilius_Aeneis_VerAen${String(i + 1).padStart(2, "0")}.conllup`, sha],
  ])),
  "greenough.xml": [`${PERSEUS}/phi0690.phi003.perseus-lat2.xml`, "e639e6a0e27427ef28031850c4d73aa2b63b9f2cf8a5cf584b37685c52fb874c"],
  "williams.xml": [`${PERSEUS}/phi0690.phi003.perseus-eng2.xml`, "d90941028d778852a947c492648636de0696c930a8eae8c5305c81a79664d1d3"],
  "frieze.xml": ["https://dcc.dickinson.edu/frieze-export-xml", "3c32219f5c24da02806d8384aedb4fbe10819e2b26a0c5a856d299139d995986"],
};
