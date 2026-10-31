// Downloads the pinned Aeneid sources (sources.ts) into .cache/sources/aeneid and checks each file's SHA-256.
import { exists, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { ROOT } from "../../scripts/core/outputs";
import { SOURCES } from "./sources";

export const CACHE = join(ROOT, ".cache", "sources", "aeneid");

async function get(rel: string, url: string, sha: string, force: boolean): Promise<void> {
  const dest = join(CACHE, rel);
  if (!force && await exists(dest)) return console.log(`cached  aeneid/${rel}`);
  const response = await fetch(url, { headers: { "User-Agent": "AeneidReader/1.0 (static parallel-text reader; build-time fetch)" } });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const actual = new Bun.CryptoHasher("sha256").update(bytes).digest("hex");
  if (actual !== sha) throw new Error(`${url}: SHA-256 ${actual}, expected ${sha}; the source changed upstream`);
  await mkdir(dirname(dest), { recursive: true });
  await Bun.write(dest, bytes);
  console.log(`fetched aeneid/${rel} (${bytes.length.toLocaleString()} bytes)`);
}

if (import.meta.main) {
  const force = process.argv.includes("--force");
  for (const [rel, [url, sha]] of Object.entries(SOURCES)) await get(rel, url, sha, force);
}
