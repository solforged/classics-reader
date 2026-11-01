// Reads the Unihan database's readings (kDefinition, kMandarin, kCantonese, kXHC1983) and variant relations. Strict:
// a line that is not a comment or "U+XXXX<TAB>field<TAB>value" throws.

export interface UnihanChar {
  /** kDefinition: a short English definition. */
  definition?: string;
  /** kMandarin: the customary pinyin reading. */
  mandarin?: string;
  /** kXHC1983: every modern pinyin reading, from the Xiandai Hanyu Cidian. */
  readings: string[];
  /** kCantonese: Jyutping. */
  cantonese: string[];
}

const FIELDS = ["kDefinition", "kMandarin", "kCantonese", "kXHC1983"];

const char = (code: string): string => String.fromCodePoint(Number.parseInt(code.slice(2), 16));

function* records(source: string): Generator<[char: string, field: string, value: string]> {
  for (const line of source.split("\n")) {
    if (!line || line.startsWith("#")) continue;
    const match = /^(U\+[0-9A-F]{4,6})\t(k\w+)\t(.*)$/u.exec(line);
    if (!match) throw new Error(`Unihan: unexpected line ${line}`);
    yield [char(match[1]!), match[2]!, match[3]!];
  }
}

/** The readings of the characters in `wanted`. */
export function parseUnihanReadings(source: string, wanted: ReadonlySet<string>): Map<string, UnihanChar> {
  const out = new Map<string, UnihanChar>();
  for (const [c, field, value] of records(source)) {
    if (!wanted.has(c) || !FIELDS.includes(field)) continue;
    let entry = out.get(c);
    if (!entry) out.set(c, entry = { readings: [], cantonese: [] });
    if (field === "kDefinition") entry.definition = value;
    else if (field === "kMandarin") entry.mandarin = value.split(" ")[0]!;
    else if (field === "kCantonese") entry.cantonese = value.split(" ");
    // "1192.071:wéi 1199.041:wèi"
    else entry.readings = value.split(" ").map((part) => part.slice(part.indexOf(":") + 1));
  }
  return out;
}

/** Variant relations: character → Unihan variant field → the characters it relates to the character. */
export type UnihanVariants = Map<string, Map<string, Set<string>>>;

export function parseUnihanVariants(source: string): UnihanVariants {
  const out: UnihanVariants = new Map();
  for (const [c, field, value] of records(source)) {
    const related = [...value.matchAll(/U\+[0-9A-F]{4,6}/gu)].map((m) => char(m[0]));
    const fields = out.get(c) ?? new Map<string, Set<string>>();
    fields.set(field, new Set([...(fields.get(field) ?? []), ...related]));
    out.set(c, fields);
  }
  return out;
}

/** The Unihan field relating the two characters in either direction, if any. */
export function variantField(variants: UnihanVariants, a: string, b: string): string | undefined {
  for (const [from, to] of [[a, b], [b, a]] as const) {
    for (const [field, related] of variants.get(from) ?? []) if (related.has(to)) return field;
  }
  return undefined;
}
