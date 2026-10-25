// The language pack this site is built for. Shared code (src/lib, src/pages, src/scripts) reaches language-specific
// behaviour only through `lang`.
import { oldNorse } from "./non";
import type { LanguagePack } from "./types";

export const lang: LanguagePack = oldNorse;

/** Shard file name for a lemma: the first character of its fold key, as hex. Dictionary and table shards share it. */
export const shardOf = (lemma: string) => lang.fold(lemma).codePointAt(0)?.toString(16) ?? "0";
