// Word analyses carry Universal Dependencies morphology: a UPOS tag, then FEATS, separated by a space, e.g.
// "NOUN Case=Acc|Definite=Ind|Gender=Masc|Number=Sing" or "ADP". Ambiguous values are comma-joined
// ("Case=Acc,Dat"). Language packs convert their sources' tagsets to this form at build time and may add their own
// features (https://universaldependencies.org/u/feat/ and the pack's documentation).

export interface Morph {
  /** Universal part-of-speech tag, e.g. "NOUN"; "" when the analysis has none. */
  upos: string;
  /** Feature → values; several values mean the source left the form ambiguous between them. */
  feats: Record<string, string[]>;
}

export function parseMorph(morph: string): Morph {
  const [upos = "", feats = ""] = morph.split(" ", 2);
  const out: Record<string, string[]> = {};
  for (const pair of feats.split("|")) {
    const eq = pair.indexOf("=");
    if (eq > 0) out[pair.slice(0, eq)] = pair.slice(eq + 1).split(",");
  }
  return { upos, feats: out };
}

const byName = (a: string, b: string) => a.toLowerCase().localeCompare(b.toLowerCase());

/** Canonical string: features sorted by name and values sorted, as CoNLL-U requires, so equal analyses compare equal. */
export function formatMorph({ upos, feats }: Morph): string {
  const pairs = Object.keys(feats)
    .filter((name) => feats[name]!.length)
    .sort(byName)
    .map((name) => `${name}=${[...new Set(feats[name])].sort(byName).join(",")}`);
  return pairs.length ? `${upos} ${pairs.join("|")}` : upos;
}

/** One unambiguous analysis per combination of an ambiguous one's values ("Case=Acc,Nom" → Acc, Nom). */
export function expandMorph(morph: string): string[] {
  const { upos, feats } = parseMorph(morph);
  let out: Record<string, string[]>[] = [{}];
  for (const [name, values] of Object.entries(feats)) {
    out = out.flatMap((partial) => values.map((value) => ({ ...partial, [name]: [value] })));
  }
  return out.length === 1 ? [morph] : out.map((single) => formatMorph({ upos, feats: single }));
}

/** The analysis without one feature, e.g. an occurrence's Clitic flag dropped to index the bare form. */
export function withoutFeature(morph: string, name: string): string {
  const parsed = parseMorph(morph);
  if (!(name in parsed.feats)) return morph;
  delete parsed.feats[name];
  return formatMorph(parsed);
}
