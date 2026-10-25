// Old Norse spelling keys, shared by the build scripts and the browser.

/** Lookup key for Old Norse spellings: case-folded, with ǫ/ø/ǿ → ö, œ/ǽ/ę → æ, hyphens and dots dropped. */
export function fold(s: string): string {
  return s
    .normalize("NFC")
    .toLowerCase()
    .replace(/[ǫøǿ]/g, "ö")
    .replace(/[œǽę]/g, "æ")
    .replace(/[-‑·.]/g, "")
    .trim();
}

/** Search key: fold() plus accents and Old Norse letters reduced to plain Latin, so "voluspa" finds "Völuspá". */
export function searchKey(s: string): string {
  return fold(s)
    .replace(/þ/g, "th")
    .replace(/ð/g, "d")
    .replace(/æ/g, "ae")
    .replace(/ö/g, "o")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}
