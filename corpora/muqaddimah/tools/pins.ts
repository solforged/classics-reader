// Rewrites the pin block of sources.ts: the review units in reading order (data/units.json) and the SHA-256 of
// data/units.json, data/wiktionary.json and every data/conllu/<unit>.conllu. Run it after a reviewed CoNLL-U file is
// copied in or the units or the Wiktionary extract change; fetch.ts and the build throw on a file that no longer
// matches. It does not hash data/en: the English is checked row by row against units.json instead.
//
//   bun corpora/muqaddimah/tools/pins.ts
import { join } from "node:path";
import { sha256 } from "../lib/pins";

const DATA = join(import.meta.dir, "..", "data");
const SOURCES = join(import.meta.dir, "..", "sources.ts");

const bytes = async (path: string): Promise<Uint8Array> => new Uint8Array(await Bun.file(path).arrayBuffer());

const unitsBytes = await bytes(join(DATA, "units.json"));
const parsed: { units: { id: string }[] } = JSON.parse(new TextDecoder().decode(unitsBytes));
const units = parsed.units.map((unit) => unit.id);

const conllu = [];
for (const unit of units) conllu.push(`  ${JSON.stringify(unit)}: ${JSON.stringify(sha256(await bytes(join(DATA, "conllu", `${unit}.conllu`))))},`);

const block = `// <pins:begin>
export const UNITS = [${units.map((unit) => JSON.stringify(unit)).join(", ")}] as const;
export type MuqUnit = (typeof UNITS)[number];

/** SHA-256 of data/conllu/<unit>.conllu. */
export const CONLLU_SHA: Readonly<Record<MuqUnit, string>> = {
${conllu.join("\n")}
};

/** SHA-256 of data/units.json. */
export const UNITS_SHA = ${JSON.stringify(sha256(unitsBytes))};

/** SHA-256 of data/wiktionary.json. */
export const WIKTIONARY_SHA = ${JSON.stringify(sha256(await bytes(join(DATA, "wiktionary.json"))))};
// <pins:end>`;

const text = await Bun.file(SOURCES).text();
const begin = text.indexOf("// <pins:begin>");
const end = text.indexOf("// <pins:end>");
if (begin < 0 || end < begin) throw new Error("sources.ts has no pin block (// <pins:begin> … // <pins:end>)");
await Bun.write(SOURCES, text.slice(0, begin) + block + text.slice(end + "// <pins:end>".length));
console.log(`pinned ${units.length} units`);
