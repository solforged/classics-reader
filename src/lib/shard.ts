/**
 * Shard file name for a folded lemma key: its first character, as hex. Dictionary (public/lex) and table
 * (public/para) shards share it.
 */
export const shardFile = (key: string) => key.codePointAt(0)?.toString(16) ?? "0";
