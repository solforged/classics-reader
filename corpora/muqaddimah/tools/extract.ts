// Derives data/wiktionary.json, the vendored Wiktionary extract: the entries of kaikki.org's Arabic dump (sources.ts
// KAIKKI) whose spelling, without vowel signs, or whose vocalized head word matches a lemma of the corpus, plus the
// entries their form-of / alt-of senses point to. The filter is packs/ara/build/wiktionary.ts (extractWiktionary); this
// file only collects the corpus's lemmas from data/conllu and hands them over.
//
//   bun corpora/muqaddimah/tools/extract.ts [--kaikki FILE]     writes data/wiktionary.json
//
// kaikki.org has deprecated its Arabic file, so the extract is checked into data/ and pinned (WIKTIONARY_SHA); fetch.ts
// --kaikki calls deriveWiktionary() to prove that the pinned file is what the dump gives, when the dump can still be had.
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { ROOT } from "../../../scripts/core/outputs";
import { extractWiktionary, formatExtract } from "../../../packs/ara/build/wiktionary";
import { DERIVED } from "../sources";

const DATA = join(import.meta.dir, "..", "data");

/** Every distinct LEMMA of the syntactic words (not the multiword-token lines) of data/conllu, punctuation left out. */
export async function corpusLemmas(): Promise<string[]> {
  const lemmas = new Set<string>();
  const dir = join(DATA, "conllu");
  for (const name of (await readdir(dir)).filter((file) => file.endsWith(".conllu")).sort()) {
    for (const line of (await Bun.file(join(dir, name)).text()).split("\n")) {
      if (!line || line.startsWith("#")) continue;
      const cols = line.split("\t");
      if (cols.length !== 10 || cols[0]!.includes("-")) continue;
      if (cols[3] === "PUNCT" || cols[3] === "SYM" || cols[3] === "X" || cols[2] === "_") continue;
      lemmas.add(cols[2]!);
    }
  }
  return [...lemmas].sort();
}

/** The text of data/wiktionary.json that the kaikki.org dump at `kaikkiPath` gives for the corpus's lemmas. */
export async function deriveWiktionary(kaikkiPath: string): Promise<string> {
  return formatExtract(await extractWiktionary(kaikkiPath, await corpusLemmas()));
}

if (import.meta.main) {
  const at = process.argv.indexOf("--kaikki");
  const kaikki = at > 0 ? process.argv[at + 1]! : join(ROOT, ".cache", "sources", "muqaddimah", DERIVED.kaikki);
  const text = await deriveWiktionary(kaikki);
  await Bun.write(join(DATA, "wiktionary.json"), text);
  console.log(`wrote data/wiktionary.json (${text.split("\n").length - 3} entries, ${text.length} bytes)`);
}
