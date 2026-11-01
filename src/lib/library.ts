// The combined site, when this reader is built into it (BASE in astro.config.mjs): the library root and the other
// readers, from the citation index scripts/library.ts writes. Undefined in a standalone build.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { CitationIndex } from "./cite";

/** The library's name, shown as the first breadcrumb of every reader. */
export const LIBRARY_NAME = "Classics Reader";

const root = import.meta.env.PUBLIC_LIBRARY ?? "";

export const library: { root: string; index: CitationIndex } | undefined = root
  ? { root, index: JSON.parse(readFileSync(join(process.cwd(), "generated", "library", "public", "citations.json"), "utf8")) }
  : undefined;
