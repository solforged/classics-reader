// An all-caps or mixed-case English heading as a title, on the model of corpora/analects/build.ts titleCase.

/** Short function words left lowercase in a title, except as its first word. "di" is the name particle. */
const MINOR = new Set(["a", "an", "the", "and", "but", "or", "nor", "for", "of", "in", "on", "at", "to", "by", "from", "with", "as", "into", "over", "upon", "against", "after", "under", "than", "di"]);

/** Every word capitalised after the first except the minor ones; a hyphenated word capitalises each part. */
export function titleCase(title: string): string {
  let first = true;
  return title.toLowerCase().replace(/[^\s]+/gu, (word) => {
    const bare = word.replace(/^[^\p{L}']+|[^\p{L}']+$/gu, "");
    const cap = first || !MINOR.has(bare);
    first = false;
    if (!cap) return word;
    return word.replace(/(^|-)(\p{L})/gu, (_, before: string, letter: string) => before + letter.toUpperCase());
  });
}
