// Checks that the vendored English paragraphs are Ricci's text as Project Gutenberg #57037 prints it. The reader
// shows the vendored paragraphs (they are the alignment's coordinate system); this only proves they were taken
// from the pinned file. Line ends are joined, a hyphen at a line end is dropped when the next line continues in
// lower case, and underscore italics are ignored.

/** The Prince, from the dedication through the last chapter, whitespace collapsed and italics unmarked. */
export function princeText(gutenberg: string): string {
  const marker = "NICCOLÒ MACHIAVELLI";
  const first = gutenberg.indexOf(marker);
  const start = gutenberg.indexOf(marker, first + marker.length);
  const end = gutenberg.indexOf("*** END OF THE PROJECT GUTENBERG EBOOK");
  if (first < 0 || start < 0 || end < 0) throw new Error("Gutenberg file has no dedication or no end marker");
  return normalize(gutenberg.slice(start, end));
}

function normalize(text: string): string {
  return text
    .replace(/-\r?\n(?=\p{Ll})/gu, "")
    .replace(/_/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

/**
 * Each paragraph, in order, must occur in the Gutenberg text after the one before it. A paragraph the file does
 * not contain stops the build: the vendored English would no longer be the pinned translation.
 */
export function assertFromGutenberg(gutenberg: string, paragraphs: readonly string[]): void {
  const body = princeText(gutenberg);
  let cursor = 0;
  for (const paragraph of paragraphs) {
    const needle = normalize(paragraph);
    const at = body.indexOf(needle, cursor);
    if (at < 0) throw new Error(`Not in the pinned Gutenberg text: ${JSON.stringify(needle.slice(0, 80))}`);
    cursor = at + needle.length;
  }
}
