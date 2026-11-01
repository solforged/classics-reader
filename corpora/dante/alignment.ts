// Exceptions for laying out the treebank's text in lines (lines.ts). Each entry is checked: the build throws on a
// difference no entry explains and on an entry that nothing used. Sentence ids are the treebank's without the
// "OldItalian_Dante_" prefix.

/**
 * Treebank lemmas written with an apostrophe for a final accent (cio', carita'), or misspelt: the lemma shown and
 * looked up.
 */
export const LEMMA_FIXES: Readonly<Record<string, string>> = {
  "cio'": "ciò",
  "ciò'": "ciò",
  "carita'": "carità",
  "bonta'": "bontà",
  "chiarita'": "chiarità",
  "benignita'": "benignità",
  "Belzebu'": "Belzebù",
  terrremoto: "terremoto",
};

/**
 * A word whose MISC Verso the Gutenberg text contradicts, and the line it belongs to. Keyed by sentence id, form and
 * the treebank's canto.line.
 */
export const VERSE_FIXES: Readonly<Record<string, number>> = {
  // "Io son la vita di Bonaventura / da Bagnoregio" (Par. 12.127–28): the treebank puts "da" at the end of 127.
  "Paradiso-380 da 12.127": 128,
};

/**
 * Words with no MISC Verso that the Gutenberg text does not place either (it reads otherwise there) and whose
 * neighbours lie on different lines: sentence id and form → canto.line.
 */
export const PLACEMENTS: Readonly<Record<string, string>> = {
  // "rendéli ’l cenno ch’a ciò si conface" (Purg. 21.15), where Gutenberg reads rendéli.
  "Purgatorio-737 rendégli": "21.15",
  // "Qual savesse qual era la pastura" (Par. 21.19), where Gutenberg reads Qual and the treebank Quale.
  "Paradiso-625 Quale": "21.19",
};

/**
 * Marks whose part the general rules get wrong: sentence id, form and occurrence in the sentence (from 1) → how the
 * mark joins its neighbours (lines.ts ItemKind; "word" for an elided article written as a bare apostrophe) and,
 * where the treebank has the wrong mark, the mark printed.
 */
export const MARKS: Readonly<Record<string, { kind: "word" | "hyphen" | "open" | "close"; text: string }>> = {
  // "tra ’ Sardi e ’ Corsi" (Purg. 18.81): the first ’ is the article i, which the treebank files as punctuation.
  "Purgatorio-640 ' 1": { kind: "word", text: "’" },
  // "differente- / mente danzando" (Par. 24.16–17).
  "Paradiso-715 - 1": { kind: "hyphen", text: "-" },
  // Quotations within speeches, which the treebank's Purgatorio marks » … «: printed “ … ”, as in the Inferno.
  "Purgatorio-164 » 1": { kind: "open", text: "“" }, // gridava: “O tu del ciel… (5.105)
  "Purgatorio-165 « 1": { kind: "close", text: "”" }, // …altro governo!” (5.108)
  "Purgatorio-297 » 1": { kind: "open", text: "“" }, // e disse: “I’ son Lucia… (9.55)
  "Purgatorio-297 « 1": { kind: "close", text: "”" }, // …per la sua via” (9.57)
  "Purgatorio-305 » 2": { kind: "open", text: "“" }, // ne disse: “Andate là… (9.92)
  "Purgatorio-305 « 3": { kind: "close", text: "”" }, // …quivi è la porta” (9.93)
  "Purgatorio-458 » 1": { kind: "open", text: "“" }, // gridando a Dio: “Omai più non ti temo!” (13.122)
  "Purgatorio-458 « 1": { kind: "close", text: "”" },
  "Purgatorio-776 » 1": { kind: "open", text: "“" }, // “Per che non reggi tu, o sacra fame… (22.40)
  "Purgatorio-776 « 1": { kind: "close", text: "”" }, // …l’appetito de’ mortali?” (22.41)
  "Purgatorio-783 » 1": { kind: "open", text: "“" }, // quando dicesti: “Secol si rinova… (22.70)
  "Purgatorio-783 « 1": { kind: "close", text: "”" }, // …scende da ciel nova” (22.72)
};
