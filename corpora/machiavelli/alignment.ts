// Exception tables for the Prince and the Arte della guerra. The build throws when an entry is unused, as the other
// readers do, so a fix that a reviewed annotation or a replaced alignment has made unnecessary cannot linger.
//
// Lemma corrections belong in the CoNLL-U (the review edits the file, and a fix here would become unused the
// moment it did). Alignment corrections belong in the alignment files (same columns, no code change). An entry
// here is only for a difference the files cannot express.
import type { TextFix } from "./lib/liberliber";

/**
 * Annotation lemma → the lemma shown and looked up. Keyed by the lemma as the CoNLL-U writes it, so one entry
 * changes every token of that lemma. Both works.
 */
export const LEMMA_FIXES: Readonly<Record<string, string>> = {};

// ---- Il Principe ------------------------------------------------------------------------------------------------

/**
 * A bead the alignment file states and the reading must show otherwise: "<unit> <n>" → the English sentence ids
 * (comma-separated, as the file writes en_ids; empty for a sentence left untranslated). Applied before the bead
 * is placed, and only when the file still has the bead.
 */
export const PRINCE_BEAD_OVERRIDES: Readonly<Record<string, string>> = {};

/**
 * A chapter Ricci's 1909 translation does not finish. The note is shown on the first paragraph that has an
 * Italian sentence with no English. The 1921 reprint ends at the same sentence; Vincent's 1935 revision is not used.
 */
export const PRINCE_OMISSIONS: Readonly<Record<string, string>> = {
  "13": "Ricci’s translation (1909) omits the rest of this chapter.",
};

// ---- Dell'arte della guerra -------------------------------------------------------------------------------------

/**
 * Slips of Liber Liber's keying that are not Martelli's text, corrected before the paragraphs are read. "<line>:<col>"
 * → the fix; the line is the download's own, counted from 1, and the column from 0. Each was checked in context
 * (line 74 reads "pianta" where the keying has "planta", and so on): a word that is not Italian, or a word the
 * sentence cannot bear, with the right word attested elsewhere in the file. Readings that are only doubtful
 * (a numeral, "scudi" for "scudati") are left as the file has them. Each fix is applied exactly once or the build stops.
 */
export const ARTE_TEXT_FIXES: Readonly<Record<string, TextFix>> = {
  "74:531": { line: 74, col: 531, from: "planta", to: "pianta", before: "a quale cosa chi ordina, ", after: " arbori sotto l'ombra de'" },
  "142:984": { line: 142, col: 984, from: "punga", to: "pugna", before: "o; e il vincere la prima ", after: " e passare le prime punte" },
  "149:14": { line: 149, col: 14, from: "occororno", to: "occorrono", before: "COSIMO  E' mi ", after: " due dubitazioni; l'una, " },
  "150:2220": { line: 150, col: 2220, from: "rattissimo", to: "rarissimo", before: "lo impeto manchi; il che ", after: " fanno i fanti. Occorre, " },
  "160:167": { line: 160, col: 167, from: "cavalio", to: "cavallo", before: "h'egli avesse mulo e non ", after: ". Permettere'gli bene due" },
  "212:1447": { line: 212, col: 1447, from: "pripinqui", to: "propinqui", before: " i Franciosi, sendo loro ", after: ", come i Viniziani disall" },
  "218:9234": { line: 218, col: 9234, from: "maschino", to: "mastino", before: "ani botoli intorno a uno ", after: ". Annibale, quando venne " },
  "240:5270": { line: 240, col: 5270, from: "aloggiamento", to: "alloggiamento", before: "raccia ne occuperebbe lo ", after: " del capitano) e chiamass" },
};

/**
 * A bead of the alignment that joins sentences of two Italian paragraphs: its first Italian sentence id → the paragraph
 * (of the book) whose row shows its English. Any other such bead stops the build.
 *
 * Farneworth runs Martelli's paragraph 2 of Book I (the narrator, ending "A che Cosimo rispose … Disse dunque") into
 * Cosimo's first turn, paragraph 3, and prints no break and no label between them; his one clause "—You have now
 * introduced a subject, said Cosimo (but to avoid … the name of the several speakers) …" translates the narrator's
 * last three sentences and the turn's first. It stands with the turn, under Cosimo's name, so that the turn reads whole.
 */
export const ARTE_SPANNING_BEADS: Readonly<Record<string, number>> = {
  "1-1-2-16": 3,
};

/**
 * The Italian sentences Farneworth's translation has no English for (the 1-0 beads of the alignment): sentence id →
 * why, from the alignment's notes. The reader shows each in its paragraph with a note on the English side. A 1-0 bead
 * that is not listed, or a listed sentence that has English, stops the build.
 */
export const ARTE_OMISSIONS: Readonly<Record<string, string>> = {
  "1-3-64-3": "the horses and their keep are already covered by the English for the sentence before",
  "2-2-15-17": "the infantry's rare failure to keep order is only implied by “so easily”",
  "2-3-19-23": "Fabrizio's definition of head, back and flanks is left out",
  "2-3-19-24": "Fabrizio's definition of head, back and flanks is left out",
  "3-1-8-27": "the gloss on the ancient officer called the tergiduttore is left out",
  "3-2-13-2": "the sentence introducing the doubt is left out",
  "4-2-7-27": "the sentence that the false-rumour stratagem brought victory is left out",
  "5-1-1-50": "the sentence that the second Colonel acts as rear-guard leader is left out",
  "5-2-9-1": "Fabrizio's opening words of the paragraph are left out",
  "5-2-9-25": "the clause that this made the soldiers thrifty and strong is left out",
  "5-2-15-1": "Fabrizio's answer “Sì, abbiamo.” is left out",
  "6-1-3-104": "a repetition of the sentence at 3-94, which Farneworth's text has once",
  "6-2-7-1": "the introductory sentence is left out",
  "6-2-11-7": "the recapitulation of the march order is left out",
  "7-2-11-7": "a restatement about straight spokes is left out",
  "7-2-11-8": "a restatement about straight spokes is left out",
  "7-2-11-44": "“e però io non ne parlerò altrimenti” is left out",
};
