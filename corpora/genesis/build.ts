// Builds Genesis 1–11 into generated/genesis/. Run `READER=genesis bun run fetch` first.
// The Hebrew is the Westminster Leningrad Codex as OSHB encodes it, one row per verse; each written word has one
// analysis per morpheme (prefixes, stem, suffixes). JPS's 1917 English follows the verses one for one.
import { join } from "node:path";
import type { Article, DictHit } from "../../src/lib/dict";
import { formatMorph, parseMorph } from "../../src/lib/morph";
import { pack as hebrew } from "../../packs/hbo";
import { bdbArticle, bdbGloss, parseBdb } from "../../packs/hbo/build/bdb";
import { parseAugIndex, parseLexicalIndex } from "../../packs/hbo/build/lexicon";
import { oshbMorphemes, SUFFIX_MORPHEMES } from "../../packs/hbo/build/morph";
import { parseOshb } from "../../packs/hbo/build/oshb";
import { fold, stripAccents } from "../../packs/hbo/spelling";
import { AnalysisTable } from "../../scripts/core/analyses";
import { Concordance, Outputs, statsLine } from "../../scripts/core/outputs";
import type { Piece, Row, SourceUnit, TextUnit, Work } from "../../scripts/core/types";
import { EXCEPTION_KEYS, EXCEPTIONS, KETIV_QERE } from "./alignment";
import { CACHE } from "./fetch";
import { parseJps } from "./lib/jps";
import { site } from "./site";

const CHAPTERS = 11;
const read = (rel: string) => Bun.file(join(CACHE, rel)).text();
const esc = (text: string) => text.replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;");

const verses = parseOshb(await read("oshb/Gen.xml"), "Gen", new Set(Array.from({ length: CHAPTERS }, (_, i) => i + 1)));
const jps = parseJps(await read("jps/02-GENengjps.usfm")).filter((verse) => verse.chapter <= CHAPTERS);
const ids = (list: readonly { chapter: number; verse: number }[]) => list.map((v) => `${v.chapter}.${v.verse}`);
if (ids(verses).join() !== ids(jps).join()) {
  throw new Error(`OSHB has ${verses.length} verses and JPS ${jps.length}; they differ at ${ids(verses).find((id, i) => id !== ids(jps)[i])}`);
}

const lexicalIndex = parseLexicalIndex(await read("lexicon/LexicalIndex.xml"));
const augIndex = parseAugIndex(await read("lexicon/AugIndex.xml"));
const bdb = parseBdb(await read("lexicon/BrownDriverBriggs.xml"));

// ---------------------------------------------------------------- morphemes of every word
const used = new Set<string>();
const morphemes = verses.map((verse) => verse.items.map((item) => (item.kind === "word" ? oshbMorphemes(item.word, EXCEPTIONS, used) : [])));
const keys = [...new Set(morphemes.flat(2).map((m) => m.lemma))];
const unusedExceptions = EXCEPTION_KEYS.filter((key) => !used.has(key));
if (unusedExceptions.length) throw new Error(`Unused alignment exceptions: ${unusedExceptions.join(", ")}`);

// Ketiv and qere: exactly the words alignment.ts lists.
const ketivs = Object.fromEntries(verses.flatMap((verse) => verse.items
  .flatMap((item) => (item.kind === "word" && item.word.ketiv ? [[`${verse.chapter}.${verse.verse}`, item.word.ketiv]] : []))));
if (JSON.stringify(ketivs) !== JSON.stringify(KETIV_QERE)) {
  throw new Error(`Ketiv/qere words ${JSON.stringify(ketivs)} differ from alignment.ts ${JSON.stringify(KETIV_QERE)}`);
}

// ---------------------------------------------------------------- lemmas as shown
// A lexicon key is an OSHB lemma number ("1254a"), a prefix letter ("b") or a suffix morpheme ("S:he"); it shows as the
// headword of its lexical-index entry. Entries that share a headword (אֵת "mark of the accusative" and "with") get a
// superscript number in the order of their Strong's numbers.
const entryOf = (key: string) => {
  const id = augIndex.get(key);
  const entry = id ? lexicalIndex.get(id) : undefined;
  if (!entry) throw new Error(`Lemma ${key} is not in the Open Scriptures lexicon`);
  return entry;
};
const strongOrder = (a: string, b: string) => {
  const [, an = "", al = ""] = /^(\d*)(.*)$/u.exec(a)!;
  const [, bn = "", bl = ""] = /^(\d*)(.*)$/u.exec(b)!;
  return Number(an) - Number(bn) || al.localeCompare(bl);
};
const headOf = (key: string) => SUFFIX_MORPHEMES[key]?.lemma ?? entryOf(key).head;
const entriesByHead = new Map<string, string[]>();
for (const key of [...keys].sort(strongOrder)) {
  const head = fold(headOf(key));
  const sharing = entriesByHead.get(head) ?? [];
  // Two keys for the same lexical-index entry are one lemma.
  if (!sharing.some((other) => !SUFFIX_MORPHEMES[key] && !SUFFIX_MORPHEMES[other] && entryOf(other).id === entryOf(key).id)) sharing.push(key);
  entriesByHead.set(head, sharing);
}
const SUPERSCRIPT = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const shown = new Map<string, string>();
for (const key of keys) {
  const head = fold(headOf(key));
  const sharing = entriesByHead.get(head)!;
  const own = sharing.find((other) => other === key || (!SUFFIX_MORPHEMES[key] && !SUFFIX_MORPHEMES[other] && entryOf(other).id === entryOf(key).id))!;
  const number = sharing.length > 1 ? [...String(sharing.indexOf(own) + 1)].map((digit) => SUPERSCRIPT[Number(digit)]).join("") : "";
  shown.set(key, `${head}${number}`);
}
if (new Set(shown.values()).size !== new Set(keys.map((key) => SUFFIX_MORPHEMES[key] ? key : entryOf(key).id)).size) {
  throw new Error("Two lemmas share one displayed form");
}

// ---------------------------------------------------------------- the Hebrew rows
const labelled = new Set<string>();
const table = new AnalysisTable();
let written = 0;
let parts = 0;
const SEGS = { maqqef: "־", "sof-pasuq": "׃", paseq: "׀", pe: "{פ}", samekh: "{ס}" } as const;
const lines = verses.map((verse, v): Piece[] => {
  const line: Piece[] = [];
  const push = (piece: Piece, space: boolean) => {
    if (space && line.length) line.push(" ");
    line.push(piece);
  };
  verse.items.forEach((item, i) => {
    if (item.kind === "seg") return push(SEGS[item.type], item.space);
    const list = morphemes[v]![i]!;
    written++;
    parts += list.length;
    const ids = list.map((m, j) => {
      let morph = m.morph;
      if (j === 0 && item.word.ketiv) {
        const parsed = parseMorph(morph);
        morph = formatMorph({ upos: parsed.upos, feats: { ...parsed.feats, Ketiv: [item.word.ketiv] } });
      }
      if (!labelled.has(morph)) {
        hebrew.describeMorph(morph); // Throws on any word class, feature or value without an English label.
        labelled.add(morph);
      }
      const lemma = shown.get(m.lemma)!;
      return table.add(list.length > 1 ? [lemma, morph, "e", stripAccents(m.text)] : [lemma, morph, "e"]);
    });
    push([stripAccents(item.word.text.replaceAll("/", "")), ids], item.space);
  });
  return line;
});
// Adjacent plain pieces are one: the text between two words.
const merged = lines.map((line) => line.reduce<Piece[]>((out, piece) => {
  const last = out.at(-1);
  if (typeof piece === "string" && typeof last === "string") out[out.length - 1] = last + piece;
  else out.push(piece);
  return out;
}, []));

const rows: Row[] = verses.map((verse, v) => {
  const id = `${verse.chapter}.${verse.verse}`;
  const opening = verse.verse === 1 ? [{ key: `c${verse.chapter}`, kind: "head" as const, label: String(verse.chapter), lines: [] }] : [];
  const label = String(verse.verse);
  const hebrewUnit: SourceUnit = { key: `hbo-${id}`, kind: "stanza", label, lines: [merged[v]!] };
  const englishUnit: TextUnit = { key: `jps-${id}`, kind: "stanza", label, lines: [jps[v]!.text] };
  return { id, sides: { hbo: [...opening, hebrewUnit], en: [...opening, englishUnit] } };
});
const work: Work = { slug: "genesis", rows, analyses: table.list, notes: {} };
if (site.works.length !== 1 || site.works[0]!.slug !== work.slug) throw new Error("The site lists other works than Genesis 1–11");

// ---------------------------------------------------------------- dictionary records and glosses
const records = new Map<string, DictHit>();
const glosses = new Map<string, string>();
const lexiconCounts = { bdb: 0, indexGloss: 0, noBdb: 0, pseudo: 0 };
for (const key of keys) {
  const lemma = shown.get(key)!;
  const pseudo = SUFFIX_MORPHEMES[key];
  const articles: Record<string, Article[]> = {};
  if (pseudo) {
    articles.lexicon = [{ head: lemma, sections: [{ grammar: "suffix", senses: [{ gloss: `${esc(pseudo.gloss)}. ${esc(pseudo.note)}` }] }] }];
    glosses.set(lemma, pseudo.gloss);
    lexiconCounts.pseudo++;
  } else {
    const entry = entryOf(key);
    const strong = /^\d/u.test(key) ? `Strong’s H${key}` : "";
    const gloss = entry.gloss;
    if (!gloss && !entry.bdb) throw new Error(`Lemma ${key} (${entry.head}) has neither a gloss nor a BDB entry`);
    articles.lexicon = [{
      head: lemma,
      sections: [{ grammar: esc([entry.xlit, strong].filter(Boolean).join(" · ")), senses: gloss ? [{ gloss: esc(gloss) }] : [] }],
    }];
    const element = entry.bdb ? bdb.get(entry.bdb) : undefined;
    if (entry.bdb && !element) throw new Error(`BDB entry ${entry.bdb} for ${key} is missing`);
    if (element) {
      articles.bdb = [bdbArticle(element, gloss)];
      lexiconCounts.bdb++;
      if (!element.getElementsByTagName("def").length) lexiconCounts.indexGloss++;
    } else lexiconCounts.noBdb++;
    glosses.set(lemma, (element && bdbGloss(element)) || gloss || "");
  }
  records.set(fold(lemma), { entries: articles });
}
const glossFor = (lemma: string) => glosses.get(lemma) ?? "";

const outputs = new Outputs(site.id);
await outputs.reset();
const concordance = new Concordance(site.sides, { markPosition: true });
await outputs.writeWork(work);
const stats = concordance.addWork(work.slug, work.rows, work.analyses);
await outputs.writeShards("lex", records);
await concordance.write(outputs, glossFor);
console.log(statsLine(work.slug, work.rows.length, stats));
console.log(`verses: ${verses.length} (JPS ${jps.length}); written words: ${written}; morphemes: ${parts}; ketiv/qere words: ${Object.keys(ketivs).length}`);
console.log(`labelled morphologies: ${labelled.size}; lemmas: ${keys.length} (${lexiconCounts.bdb} with a BDB entry, of which ` +
  `${lexiconCounts.indexGloss} have no definition and show the lexical-index gloss; ${lexiconCounts.noBdb} without a BDB entry; ` +
  `${lexiconCounts.pseudo} suffix morphemes); concordance lemmas: ${concordance.size}`);
