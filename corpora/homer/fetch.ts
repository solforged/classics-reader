// Downloads the pinned Homer sources (sources.ts) into .cache/sources/homer and checks each file's SHA-256. Perseus's
// hopper truncates a download now and then, so a file whose hash differs is fetched again before the fetch fails.
import { exists, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { ROOT } from "../../scripts/core/outputs";
import { SOURCES } from "./sources";

export const CACHE = join(ROOT, ".cache", "sources", "homer");
const ATTEMPTS = 4;

async function get(rel: string, url: string, sha: string, force: boolean): Promise<void> {
  const dest = join(CACHE, rel);
  if (!force && await exists(dest)) return console.log(`cached  homer/${rel}`);
  let problem = "";
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    const response = await fetch(url, { headers: { "User-Agent": "HomerReader/1.0 (static parallel-text reader; build-time fetch)" } });
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    const actual = new Bun.CryptoHasher("sha256").update(bytes).digest("hex");
    if (actual === sha) {
      await mkdir(dirname(dest), { recursive: true });
      await Bun.write(dest, bytes);
      return console.log(`fetched homer/${rel} (${bytes.length.toLocaleString()} bytes)`);
    }
    problem = `${url}: SHA-256 ${actual} (${bytes.length.toLocaleString()} bytes), expected ${sha}`;
    console.log(`retry   homer/${rel}: ${problem}`);
  }
  throw new Error(`${problem}; the source changed upstream or its download stays incomplete`);
}

if (import.meta.main) {
  const force = process.argv.includes("--force");
  for (const [rel, [url, sha]] of Object.entries(SOURCES)) await get(rel, url, sha, force);
}
