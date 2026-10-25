// The language pack of the reader being built (READER, see astro.config.mjs). Shared code (src/lib, src/pages,
// src/scripts) reaches language-specific behaviour only through `lang`. Browser bundles import this module rather than
// src/sites, and the reader id is a build-time constant, so each site ships only its own pack.
import { shardFile } from "../lib/shard";
import { oldNorse } from "./non";
import type { LanguagePack } from "./types";

export const lang: LanguagePack = oldNorse;

/** Shard file name for a lemma; dictionary and table shards share it. */
export const shardOf = (lemma: string) => shardFile(lang.fold(lemma));
