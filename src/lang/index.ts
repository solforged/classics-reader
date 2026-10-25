// The language pack of the reader being built: astro.config.mjs aliases @reader/pack to packs/<pack>/index.ts
// (src/sites/registry.ts). Shared code (src/lib, src/pages, src/scripts) reaches language-specific behaviour only
// through `lang`, and each site's bundles contain only its own pack.
import { pack } from "@reader/pack";
import { shardFile } from "../lib/shard";
import type { LanguagePack } from "./types";

export const lang: LanguagePack = pack;

/** Shard file name for a lemma; dictionary and table shards share it. */
export const shardOf = (lemma: string) => shardFile(lang.fold(lemma));
