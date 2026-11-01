// The OSHB Hebrew Lexicon's two index files. AugIndex.xml maps the lemma numbers of the OSHB text (Strong's numbers with
// the project's augmentation, "1254a", and the prefix letters "b", "c", "d" …) to entries of LexicalIndex.xml, which
// holds each entry's vocalized headword, transliteration, one-word gloss and the id of its BDB entry.

export interface LexicalEntry {
  id: string;
  /** Vocalized headword. */
  head: string;
  /** Transliteration of the headword. */
  xlit: string;
  /** Part of speech as the index codes it ("N", "V", "Np" …). */
  pos?: string;
  /** One-word or short gloss. */
  gloss?: string;
  /** Id of the entry in BrownDriverBriggs.xml. */
  bdb?: string;
}

const decode = (text: string): string => text.replace(/&amp;/gu, "&").replace(/&lt;/gu, "<").replace(/&gt;/gu, ">");

/** OSHB lemma number → LexicalIndex entry id. */
export function parseAugIndex(xml: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const [, aug, id] of xml.matchAll(/<w aug="([^"]+)">([^<]+)<\/w>/gu)) map.set(aug!, id!);
  const count = xml.match(/<w aug=/gu)?.length ?? 0;
  if (!map.size || map.size !== count) throw new Error(`Parsed ${map.size} of ${count} AugIndex entries`);
  return map;
}

export function parseLexicalIndex(xml: string): Map<string, LexicalEntry> {
  const map = new Map<string, LexicalEntry>();
  for (const [, id, body] of xml.matchAll(/<entry id="([^"]+)">([^]*?)<\/entry>/gu)) {
    const w = /<w xlit="([^"]*)">([^<]*)<\/w>/u.exec(body!);
    if (!w) throw new Error(`LexicalIndex entry ${id} without a headword`);
    const xref = /<xref ([^>]*)\/>/u.exec(body!)?.[1] ?? "";
    const gloss = /<def>([^<]*)<\/def>/u.exec(body!)?.[1];
    map.set(id!, {
      id: id!, head: w[2]!, xlit: decode(w[1]!),
      pos: /<pos>([^<]*)<\/pos>/u.exec(body!)?.[1],
      gloss: gloss === undefined ? undefined : decode(gloss).replace(/\s+/gu, " ").trim(),
      bdb: /\bbdb="([^"]*)"/u.exec(xref)?.[1],
    });
  }
  const count = xml.match(/<entry id=/gu)?.length ?? 0;
  if (!map.size || map.size !== count) throw new Error(`Parsed ${map.size} of ${count} LexicalIndex entries`);
  return map;
}
