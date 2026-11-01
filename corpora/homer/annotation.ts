// Where AGDT's annotation of Iliad 1 and Odyssey 1 is incomplete or wrong. The build throws on a token with no lemma or
// tag that is not listed here, and on an entry that is never used.
import type { AgdtWord } from "../../packs/grc/build/agdt";

/** A repair to one token: the fields it replaces. */
export interface Patch {
  lemma?: string;
  postag?: string;
}

/**
 * Tokens the annotators left untagged or tagged wrongly (Iliad 1: 6 untagged of 4,563; Odyssey 1: 10 of 3,180), by
 * "poem book.line printed-word" (the printed line of the edition; AGDT's own line citations are off in the Odyssey):
 * one patch per token of the printed word (null: the token is fine). A tag is nine positions (agdt.ts); each is
 * assigned from the word's form and context, as the treebank's own tags for the same words elsewhere in the poem
 * (ῥʼ is ἄρα, as the next line's ῥʼ ἄρα; Φθίῃ, Φθίην and Ἄϊδι are Φθίη and Ἅιδης). Where AGDT gives both parts of
 * οὐδέ or μηδέ the lemma of the whole word, they are tagged as the same parts are elsewhere: οὐ + δέ, μή + δέ.
 */
export const TAG_PATCHES: Readonly<Record<string, readonly (Patch | null)[]>> = {
  // Iliad 1
  "Il. 1.3 Ἄϊδι": [{ lemma: "Ἅιδης", postag: "n-s---md-" }],
  "Il. 1.8 τίς": [{ postag: "p-s---mn-" }], // tagged "x" (irregular)
  "Il. 1.108 οὔτʼ": [{ lemma: "οὐ" }, null], // lemma "οὔτι"
  "Il. 1.115 οὐδὲ": [{ lemma: "οὐ", postag: "d--------" }, null], // lemma "οὐδέ"
  "Il. 1.155 Φθίῃ": [{ lemma: "Φθίη", postag: "n-s---fd-" }],
  "Il. 1.165 πολυάϊκος": [{ lemma: "πολυάϊξ", postag: "a-s---mg-" }], // the lemma was "πολυ"
  "Il. 1.169 Φθίην": [{ lemma: "Φθίη", postag: "n-s---fa-" }],
  "Il. 1.403 Βριάρεων": [{ lemma: "Βριάρεως", postag: "n-s---ma-" }],
  // Odyssey 1
  "Od. 1.26 παρήμενος": [{ lemma: "πάρημαι" }],
  "Od. 1.47 καὶ": [{ lemma: "καί" }],
  "Od. 1.59 οὐδέ": [{ lemma: "οὐ", postag: "d--------" }, { lemma: "δέ", postag: "g--------" }],
  "Od. 1.118 μεθήμενος": [{ lemma: "μέθημαι", postag: "v-sppemn-" }],
  "Od. 1.126 ῥʼ": [{ lemma: "ἄρα", postag: "g--------" }],
  "Od. 1.166 οὐδέ": [{ lemma: "οὐ", postag: "d--------" }, { lemma: "δέ", postag: "g--------" }],
  "Od. 1.207 εἰς": [{ lemma: "εἰς", postag: "r--------" }],
  "Od. 1.243 οὐδέ": [{ lemma: "οὐ", postag: "d--------" }, null],
  "Od. 1.246 Δουλιχίῳ": [{ lemma: "Δουλίχιον", postag: "n-s---nd-" }],
  "Od. 1.296 οὐδέ": [{ lemma: "οὐ", postag: "d--------" }, { lemma: "δέ", postag: "g--------" }],
  "Od. 1.369 μηδὲ": [{ lemma: "μή", postag: "g--------" }, { lemma: "δέ", postag: "g--------" }],
};

/**
 * Lemmas AGDT gets wrong (a form for a lemma, or a spelling no dictionary has), by AGDT's lemma: the lemma the
 * dictionaries know. Applied to every token with that lemma.
 */
export const LEMMA_FIXES: Readonly<Record<string, string>> = {
  "ἀπρίατος": "ἀπριάτην", // the dictionaries list the adverb (ἀπριάτην ἀνάποινον, 1.99) under this form, not under ἀπρίατος
  "Αἰγείδην": "Αἰγείδης", // a form for the lemma
  "καθέζετο": "καθέζομαι", // a form for the lemma
  "ἀργυρόπεζος": "ἀργυρόπεζα", // Thetis's epithet: the dictionaries list the feminine
  "τοῖον": "τοῖος", // a form for the lemma
  "Ὤπς": "Ὦψ", // Ops, the father of Peisenor
  "πάτηρ": "πατήρ", // misaccented
  "ἤτορ": "ἦτορ", // misaccented
  "Ποσειδεών": "Ποσειδάων", // Poseidon (Ποσειδεών is an Athenian month)
  "μάκαρος": "μάκαρ", // a form for the lemma
  "σοί": "σύ", // a form for the lemma
  "αἶσις": "αἶσα", // αἴσῃ (1.286 ἐπ᾽ αἴσῃ), a form of αἶσα
  "ἀπόλλων": "Ἀπόλλων", // the capital lost to a stray mark in the treebank (a mark before the lemma)
  "Ἑκάεργος": "ἑκάεργος", // Apollo's epithet, an adjective, as the treebank has it in its other occurrence
  "πύλος": "Πύλος", // the town (Od. 1.284), capitalized in the treebank's other occurrences
};

/** Lemmas that no dictionary here lists, with the reason; the build throws on any other, and on one that is listed. */
export const NO_ENTRY: Readonly<Record<string, string>> = {};

/** True when the token has no usable lemma or part of speech. */
export const untagged = (token: AgdtWord): boolean => !token.lemma || token.postag[0] === "-" || token.postag[0] === "x";
