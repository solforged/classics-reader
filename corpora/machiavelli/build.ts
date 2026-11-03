// Builds the Machiavelli Reader into generated/machiavelli/. Run `READER=machiavelli bun run fetch` first.
//
// Two works share one dictionary and one concordance: Il Principe (principe.ts) and Dell'arte della guerra (arte.ts).
// Each builder turns its checked-in annotation and its English into rows; this file looks every lemma up in Wiktionary
// (as the Dante Reader does), measures the coverage, refuses exception-table entries that nothing used, and writes the
// work files, the dictionary shards, the search index and the lexicon.
import { Wiktionary } from "../../packs/ita/build/wiktionary";
import { fold } from "../../packs/ita/spelling";
import { Concordance, Outputs, statsLine } from "../../scripts/core/outputs";
import type { Work } from "../../scripts/core/types";
import type { DictHit } from "../../src/lib/dict";
import { parseMorph } from "../../src/lib/morph";
import { ARTE_OMISSIONS, ARTE_SPANNING_BEADS, ARTE_TEXT_FIXES, LEMMA_FIXES, PRINCE_BEAD_OVERRIDES, PRINCE_OMISSIONS } from "./alignment";
import { buildArte } from "./arte";
import { readCached } from "./fetch";
import { Annotator, type Tally } from "./lib/annotate";
import { buildPrince } from "./principe";
import { site } from "./site";
import { DERIVED } from "./sources";

/**
 * Share of each work's words, names and foreign words apart, whose lemma must have a Wiktionary entry. Measured 99.76%
 * for the Prince and 99.68% for the Arte; what is missing is the period's own vocabulary (<i>deletto</i>, <i>triario</i>,
 * <i>disavvantaggio</i>, numerals written as one word). The floor fails a build whose Wiktionary extract was made for other
 * lemmas, a stale cache: fetch again.
 */
const MIN_COVERAGE = 0.99;

const an = new Annotator(new Wiktionary(await readCached(DERIVED.wiktionary)));
const works: Work[] = [await buildPrince(an), await buildArte(an)];
if (site.works.map((work) => work.slug).join() !== works.map((work) => work.slug).join()) {
  throw new Error("The site lists other works than the two built");
}

const records = new Map<string, DictHit>();
const glosses = new Map<string, string>();
const redirects = new Map<string, string>();
for (const [lemma, classes] of an.lemmaClasses) {
  const hit: DictHit = records.get(fold(lemma)) ?? { entries: {} };
  for (const upos of classes) {
    const found = an.wiktionary.lookup(lemma, upos);
    if (!found) continue;
    const have = new Set((hit.entries.wikt ?? []).map((article) => article.head));
    hit.entries.wikt = [...hit.entries.wikt ?? [], ...found.articles.filter((article) => !have.has(article.head))];
    if (found.via && !hit.via) {
      hit.via = found.via;
      redirects.set(lemma, found.via);
    }
    const glossKey = `${lemma} ${upos === "PROPN"}`;
    if (found.gloss && !glosses.has(glossKey)) glosses.set(glossKey, found.gloss);
  }
  if (Object.keys(hit.entries).length) records.set(fold(lemma), hit);
}

const glossFor = (lemma: string, morph: string): string => {
  const name = parseMorph(morph).upos === "PROPN";
  return glosses.get(`${lemma} ${name}`) ?? glosses.get(`${lemma} ${!name}`) ?? "";
};

const tables = { LEMMA_FIXES, PRINCE_BEAD_OVERRIDES, PRINCE_OMISSIONS, ARTE_TEXT_FIXES, ARTE_SPANNING_BEADS, ARTE_OMISSIONS };
const unused = Object.entries(tables).flatMap(([name, table]) => Object.keys(table).map((key) => `${name} ${key}`)).filter((key) => !an.used.has(key));
if (unused.length) throw new Error(`Exception tables that nothing used: ${unused.join(", ")}`);

const topMissing = (tally: Tally, count: number): [string, number][] => [...tally.missing].sort((a, b) => b[1] - a[1]).slice(0, count);
for (const [slug, tally] of an.tallies) {
  const coverage = tally.commonWithEntry / tally.common;
  if (coverage < MIN_COVERAGE) {
    const top = topMissing(tally, 40).map(([lemma, n]) => `${lemma} (${n})`).join(", ");
    throw new Error(`${slug}: only ${(100 * coverage).toFixed(2)}% of common words have a Wiktionary entry; most frequent without: ${top}`);
  }
}

const outputs = new Outputs(site.id);
await outputs.reset();
const concordance = new Concordance(site.sides, { markPosition: true });
for (const work of works) {
  await outputs.writeWork(work);
  console.log(statsLine(work.slug, work.rows.length, concordance.addWork(work.slug, work.rows, work.analyses)));
}
await outputs.writeShards("lex", records);
await concordance.write(outputs, glossFor);

for (const [slug, tally] of an.tallies) {
  const missing = topMissing(tally, 15).map(([lemma, n]) => `${lemma} ${n}`).join(", ");
  console.log(`${slug}: words ${tally.words} (${tally.multiword} written as one with another), names ${tally.names}, foreign ${tally.foreign}`);
  console.log(`${slug}: common words with a Wiktionary entry: ${tally.commonWithEntry} of ${tally.common} (${((100 * tally.commonWithEntry) / tally.common).toFixed(2)}%); ` +
    `lemmas ${tally.covered.size} of ${tally.lemmas.size} (${((100 * tally.covered.size) / tally.lemmas.size).toFixed(2)}%)`);
  console.log(`${slug}: lemmas without an entry: ${tally.missing.size}, most frequent: ${missing}`);
}
console.log(`reached by a Wiktionary redirect: ${redirects.size}, e.g. ${[...redirects].slice(0, 8).map(([lemma, via]) => `${lemma} → ${via}`).join(", ")}`);
console.log(`morphology: gerund ${an.stats.gerund}, past historic ${an.stats.pastHistoric}, imperfect ${an.stats.imperfect}, ` +
  `dropped ${Object.entries(an.stats.dropped).map(([name, n]) => `${name} ${n}`).join(", ") || "none"}; labelled ${an.stats.labelled}`);
console.log(`rows: ${works.reduce((sum, work) => sum + work.rows.length, 0)}; dictionary records: ${records.size}; concordance lemmas: ${concordance.size}`);
