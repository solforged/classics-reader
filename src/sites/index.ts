// The reader site being built, chosen by READER (astro.config.mjs passes it to pages and browser code as
// PUBLIC_READER). Shared pages and scripts read everything site-specific from `site`.
import { edda } from "./edda";
import type { ReaderSite } from "./types";

const SITES: Readonly<Record<string, ReaderSite>> = { edda };

const id = import.meta.env.PUBLIC_READER ?? "edda";
const chosen = SITES[id];
if (!chosen) throw new Error(`unknown reader "${id}"; expected one of ${Object.keys(SITES).join(", ")}`);

export const site: ReaderSite = chosen;
