// Reads one member of a zip archive (stored or deflated), for the Unihan download.
import { inflateRawSync } from "node:zlib";

/** The named member's bytes; throws when the archive lacks it or compresses it another way. */
export function unzipMember(zip: Uint8Array, name: string): Uint8Array {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  // The end-of-central-directory record is the last 22+ bytes: signature 0x06054b50.
  let end = zip.length - 22;
  while (end >= 0 && view.getUint32(end, true) !== 0x06054b50) end--;
  if (end < 0) throw new Error("Not a zip archive: no end-of-central-directory record");
  const entries = view.getUint16(end + 10, true);
  let at = view.getUint32(end + 16, true);
  const decoder = new TextDecoder();
  for (let i = 0; i < entries; i++) {
    if (view.getUint32(at, true) !== 0x02014b50) throw new Error("Corrupt zip central directory");
    const method = view.getUint16(at + 10, true);
    const size = view.getUint32(at + 20, true);
    const nameLength = view.getUint16(at + 28, true);
    const extraLength = view.getUint16(at + 30, true);
    const commentLength = view.getUint16(at + 32, true);
    const local = view.getUint32(at + 42, true);
    const entry = decoder.decode(zip.subarray(at + 46, at + 46 + nameLength));
    at += 46 + nameLength + extraLength + commentLength;
    if (entry !== name) continue;
    if (view.getUint32(local, true) !== 0x04034b50) throw new Error(`Corrupt zip local header for ${name}`);
    const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    const data = zip.subarray(start, start + size);
    if (method === 0) return data;
    if (method === 8) return new Uint8Array(inflateRawSync(data));
    throw new Error(`${name}: zip compression method ${method} is not supported`);
  }
  throw new Error(`${name} is not in the archive`);
}
