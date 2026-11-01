// Writes the combined site's citation index, generated/library/public/citations.json: every reader in
// src/sites/registry.ts with its works' abbreviations and citation levels. The library page lists the readers from
// it, and each reader's go-to box fetches it to reach a work in another reader (src/scripts/reader.ts).
//   bun scripts/library.ts
import { cp, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import type { LanguagePack } from "../src/lang/types";
import { citeKey, type CitationIndex } from "../src/lib/cite";
import { READERS, type ReaderId } from "../src/sites/registry";
import type { ReaderSite } from "../src/sites/types";
import { ROOT } from "./core/outputs";

const index: CitationIndex = { readers: [], works: [] };
for (const id of Object.keys(READERS) as ReaderId[]) {
  // The registry names the readers, so their modules are chosen at run time.
  const { site } = (await import(join(ROOT, "corpora", id, "site.ts"))) as { site: ReaderSite };
  const { pack } = (await import(join(ROOT, "packs", READERS[id].pack, "index.ts"))) as { pack: LanguagePack };
  if (site.id !== id) throw new Error(`corpora/${id}/site.ts names itself "${site.id}"`);
  index.readers.push({ id, name: site.name, shortName: site.shortName, language: pack.name, eyebrow: site.eyebrow });
  for (const w of site.works) index.works.push({ reader: id, slug: w.slug, abbr: w.abbr, title: w.title, levels: w.levels });
}

// Two readers with the same abbreviation would make a citation's work depend on where it is typed. Abbreviations
// that only begin alike ("Od" and "Od. 1") are told apart by resolveCite.
const seen = new Map<string, string>();
for (const w of index.works) {
  const key = citeKey(w.abbr);
  const other = seen.get(key);
  if (other && other !== w.reader) throw new Error(`citation abbreviation "${w.abbr}" is used by ${other} and ${w.reader}`);
  seen.set(key, w.reader);
}

const out = join(ROOT, "generated", "library", "public");
await rm(join(ROOT, "generated", "library"), { recursive: true, force: true });
await mkdir(out, { recursive: true });
await cp(join(ROOT, "static"), out, { recursive: true });
await Bun.write(join(out, "citations.json"), JSON.stringify(index));
console.log(`citations.json: ${index.readers.length} readers, ${index.works.length} works`);
