// Downloads every upstream Edda source into .cache/sources/ (skips files already present).
// Run: READER=edda bun run fetch [--force]
import { mkdir, exists } from "node:fs/promises";
import { dirname, join } from "node:path";
import { ROOT as REPO } from "../../scripts/core/outputs";

const ROOT = join(REPO, ".cache", "sources");
const force = process.argv.includes("--force");
const UA = "EddaReader/1.0 (static parallel-text reader; build-time fetch)";

const wsRender = (host: string, title: string) =>
  `https://${host}/w/index.php?title=${encodeURIComponent(title)}&action=render`;
const wsRaw = (host: string, title: string) =>
  `https://${host}/w/index.php?title=${encodeURIComponent(title)}&action=raw`;

const BRODEUR = "The Prose Edda (1916 translation by Arthur Gilchrist Brodeur)";

export const SOURCES: Record<string, string> = {
  // Poetic Edda, Old Norse: Eddukvæði electronic edition (EAE, 2024), CC BY-SA 4.0
  "eae/codex-regius.xml": "https://menotag.ku.dk/q?o=menotageditionxmldownload&id=7&type=orig",
  "eae/menota-entities.txt": "https://www.menota.org/menota-entities.txt",
  // Poetic Edda, Old Norse, poems outside Codex Regius: Sophus Bugge 1867 (transcription by Tor Gjerde)
  "bugge/vegtams.html": "https://etext.old.no/Bugge/vegtams.html",
  "bugge/rigstula.html": "https://etext.old.no/Bugge/rigstula.html",
  "bugge/hyndlu.html": "https://etext.old.no/Bugge/hyndlu.html",
  "bugge/svipdag1.html": "https://etext.old.no/Bugge/svipdag/svipdag1.html",
  "bugge/svipdag2.html": "https://etext.old.no/Bugge/svipdag/svipdag2.html",
  "bugge/grotta.html": "https://etext.old.no/Bugge/grotta.html",
  "bugge/sigrdrif.html": "https://etext.old.no/Bugge/sigrdrif.html",
  // Poetic Edda, English: Henry Adams Bellows 1923 (Project Gutenberg #73533)
  "bellows/bellows.html": "https://www.gutenberg.org/files/73533/73533-h/73533-h.htm",
  // Prose Edda, Old Norse: Icelandic Wikisource (Guðni Jónsson text via Heimskringla.no)
  "snorra/prologus.wiki": wsRaw("is.wikisource.org", "Snorra Edda/Prologus"),
  "snorra/gylfaginning.wiki": wsRaw("is.wikisource.org", "Snorra Edda/Gylfaginning"),
  "snorra/skaldskaparmal.wiki": wsRaw("is.wikisource.org", "Snorra Edda/Skáldskaparmál"),
  "snorra/hattatal.wiki": wsRaw("is.wikisource.org", "Snorra Edda/Háttatal"),
  // Prose Edda, English: Arthur Gilchrist Brodeur 1916 (English Wikisource)
  "brodeur/prologue.html": wsRender("en.wikisource.org", `${BRODEUR}/Prologue`),
  "brodeur/gylfaginning.html": wsRender("en.wikisource.org", `${BRODEUR}/Gylfaginning`),
  "brodeur/skaldskaparmal.html": wsRender("en.wikisource.org", `${BRODEUR}/Skáldskaparmál`),
  // Dictionaries
  "lex/zoega.json": "https://raw.githubusercontent.com/stscoundrel/old-icelandic-zoega/master/json/zoega.json",
  "lex/cleasby-vigfusson.json":
    "https://raw.githubusercontent.com/stscoundrel/cleasby-vigfusson-dictionary/master/json/cleasby-vigfusson-no-markup.json",
  "lex/wiktionary-non.jsonl": "https://kaikki.org/dictionary/Old%20Norse/kaikki.org-dictionary-OldNorse.jsonl",
};

async function get(rel: string, url: string) {
  const dest = join(ROOT, rel);
  if (!force && (await exists(dest))) return console.log(`cached  ${rel}`);
  await mkdir(dirname(dest), { recursive: true });
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.ok) {
      const buf = new Uint8Array(await res.arrayBuffer());
      await Bun.write(dest, buf);
      return console.log(`fetched ${rel} (${buf.length.toLocaleString()} bytes)`);
    }
    if (attempt >= 3) throw new Error(`${url} → HTTP ${res.status}`);
    await Bun.sleep(1500 * attempt);
  }
}

if (import.meta.main) {
  for (const [rel, url] of Object.entries(SOURCES)) await get(rel, url);
}
