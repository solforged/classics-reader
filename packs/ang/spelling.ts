// Old English lookup keys ignore what editions and dictionaries print differently: length marks (macrons in this
// reader, acute accents in Bosworth–Toller), letter case, eth and thorn (ð and þ are one letter), wynn and yogh.
export const fold = (text: string): string =>
  text.normalize("NFD").replace(/\p{M}/gu, "").normalize("NFC").toLowerCase()
    .replace(/ð/gu, "þ").replace(/ƿ/gu, "w").replace(/ȝ/gu, "g");

/**
 * Search key: the lookup key spelled in ASCII, so a query typed on an ordinary keyboard finds the text: `thaet`
 * finds þæt and ðæt, `and` finds the ampersand the manuscripts use for it. A letter may become two characters;
 * the search page maps matches back to the text.
 */
export const searchKey = (text: string): string =>
  fold(text).replace(/þ/gu, "th").replace(/æ/gu, "ae").replace(/&/gu, "and");
