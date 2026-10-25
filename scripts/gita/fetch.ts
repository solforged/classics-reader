// DCS text, annotation and dictionary: Oliver Hellwig, CC BY 4.0.
// Besant's fourth edition (1922): public-domain English, transcribed on Wikisource.
// The discourse is a transclusion, so its Page: sources also need revision pins.
import { exists, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { ROOT } from "../core/outputs";

export const CACHE = join(ROOT, ".cache", "sources", "gita");
export const DCS_COMMIT = "8aeed5a1343d0e48b64eb32af8c00e8c6eb29359";
export const DISCOURSE_OLDID = 9815155;
export const BESANT_PAGES = [
  [188, 9824423], [189, 9824453], [190, 9825486], [191, 9893624],
  [192, 9894962], [193, 9895000], [194, 9895117], [195, 9953772],
] as const;

const raw = (title: string, oldid: number) =>
  `https://en.wikisource.org/w/index.php?title=${encodeURIComponent(title)}&oldid=${oldid}&action=raw`;
const dcs = `https://raw.githubusercontent.com/OliverHellwig/sanskrit/${DCS_COMMIT}/dcs/data/conllu`;

export const SOURCES: Readonly<Record<string, string>> = {
  "chapter-12.conllu": `${dcs}/files/${encodeURIComponent("Mahābhārata")}/${encodeURIComponent("Mahābhārata-0894-MBh, 6, BhaGī 12-7701.conllu")}`,
  "dictionary.csv": `${dcs}/lookup/dictionary.csv`,
  "discourse-12.wiki": raw("Bhagavad-Gita (Besant 4th)/Discourse 12", DISCOURSE_OLDID),
  ...Object.fromEntries(BESANT_PAGES.map(([page, oldid]) => [
    `besant/${page}.wiki`, raw(`Page:Bhagavad Gita - Annie Besant 4th edition.djvu/${page}`, oldid),
  ])),
};

async function get(rel: string, url: string, force: boolean): Promise<void> {
  const dest = join(CACHE, rel);
  if (!force && await exists(dest)) return console.log(`cached  gita/${rel}`);
  const response = await fetch(url, { headers: { "User-Agent": "GitaReader/1.0 (static parallel-text reader; build-time fetch)" } });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  await mkdir(dirname(dest), { recursive: true });
  await Bun.write(dest, bytes);
  console.log(`fetched gita/${rel} (${bytes.length.toLocaleString()} bytes)`);
}

if (import.meta.main) {
  const force = process.argv.includes("--force");
  for (const [rel, url] of Object.entries(SOURCES)) await get(rel, url, force);
}
