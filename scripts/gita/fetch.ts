// DCS text, annotation and dictionary: Oliver Hellwig, CC BY 4.0.
// Besant's fourth edition (1922): public-domain English, transcribed on Wikisource.
// The discourse is a transclusion, so its Page: sources also need revision pins.
import { exists, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { ROOT } from "../core/outputs";
import { SOURCES } from "./sources";

export { CHAPTERS, DCS_COMMIT, SOURCES } from "./sources";

export const CACHE = join(ROOT, ".cache", "sources", "gita");

async function get(rel: string, url: string, force: boolean): Promise<void> {
  const dest = join(CACHE, rel);
  if (!force && await exists(dest)) return console.log(`cached  gita/${rel}`);
  // Hundreds of Page: transclusions otherwise trigger Wikimedia's HTTP 429 limit.
  if (url.startsWith("https://en.wikisource.org/")) await Bun.sleep(1000);
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
