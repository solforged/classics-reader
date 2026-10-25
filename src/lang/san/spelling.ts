// IAST remains intact in lookup keys; only search ignores diacritics.
export const fold = (text: string): string => text.normalize("NFC").toLowerCase();

export const searchKey = (text: string): string =>
  fold(text).normalize("NFD").replace(/\p{M}/gu, "").normalize("NFC");
