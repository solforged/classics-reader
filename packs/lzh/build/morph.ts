// Converts a Kyoto treebank token to the reader's morphology string (src/lib/morph.ts): its UPOS and UD features, the
// token's English gloss as the pack feature `Gloss`, and the treebank's own tag below its top level as `Xpos`
// ("v,動詞,行為,動作" → "動詞-行為-動作"). packs/lzh/morph.ts labels both.
import { formatMorph } from "../../../src/lib/morph";
import type { KyotoToken } from "./conllu";

export function kyotoMorph(token: KyotoToken): string {
  const [, ...levels] = token.xpos.split(",");
  const feats: Record<string, string[]> = { Gloss: [token.gloss] };
  for (const [name, value] of Object.entries(token.feats)) feats[name] = [value];
  const xpos = levels.filter((level) => level !== "*").join("-");
  if (xpos) feats.Xpos = [xpos];
  return formatMorph({ upos: token.upos, feats });
}
