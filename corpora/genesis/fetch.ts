// Downloads the pinned Genesis sources (sources.ts) into .cache/sources/genesis and checks each file's SHA-256.
import { exists, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { inflateRawSync } from "node:zlib";
import { ROOT } from "../../scripts/core/outputs";
import { SOURCES, type Source } from "./sources";

export const CACHE = join(ROOT, ".cache", "sources", "genesis");

/** One member of a zip archive, read through its central directory. */
function zipMember(zip: Uint8Array, name: string): Uint8Array {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  let end = zip.length - 22;
  while (end >= 0 && view.getUint32(end, true) !== 0x06054b50) end--;
  if (end < 0) throw new Error("Not a zip archive");
  const entries = view.getUint16(end + 10, true);
  let at = view.getUint32(end + 16, true);
  for (let i = 0; i < entries; i++) {
    if (view.getUint32(at, true) !== 0x02014b50) throw new Error("Damaged zip directory");
    const method = view.getUint16(at + 10, true);
    const size = view.getUint32(at + 20, true);
    const [nameLength, extraLength, commentLength] = [28, 30, 32].map((offset) => view.getUint16(at + offset, true));
    const local = view.getUint32(at + 42, true);
    const entryName = new TextDecoder().decode(zip.subarray(at + 46, at + 46 + nameLength!));
    if (entryName === name) {
      const data = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
      const packed = zip.subarray(data, data + size);
      if (method === 0) return packed;
      if (method === 8) return inflateRawSync(packed);
      throw new Error(`Zip member ${name}: compression method ${method}`);
    }
    at += 46 + nameLength! + extraLength! + commentLength!;
  }
  throw new Error(`${name} is not in the zip archive`);
}

async function get(rel: string, source: Source, force: boolean): Promise<void> {
  const dest = join(CACHE, rel);
  if (!force && await exists(dest)) return console.log(`cached  genesis/${rel}`);
  const response = await fetch(source.url, { headers: { "User-Agent": "GenesisReader/1.0 (static parallel-text reader; build-time fetch)" } });
  if (!response.ok) throw new Error(`${source.url}: HTTP ${response.status}`);
  let bytes: Uint8Array = new Uint8Array(await response.arrayBuffer());
  if (source.member) bytes = zipMember(bytes, source.member);
  const actual = new Bun.CryptoHasher("sha256").update(bytes).digest("hex");
  if (actual !== source.sha256) {
    throw new Error(`${source.url}${source.member ? ` (${source.member})` : ""}: SHA-256 ${actual}, expected ${source.sha256}; the source changed upstream`);
  }
  await mkdir(dirname(dest), { recursive: true });
  await Bun.write(dest, bytes);
  console.log(`fetched genesis/${rel} (${bytes.length.toLocaleString()} bytes)`);
}

if (import.meta.main) {
  const force = process.argv.includes("--force");
  for (const [rel, source] of Object.entries(SOURCES)) await get(rel, source, force);
}
