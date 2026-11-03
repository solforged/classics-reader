// One member of a ZIP archive, read from its central directory. Enough for the single text file the Liber Liber download
// carries beside its images: stored or deflated entries, no encryption, no ZIP64. Anything else throws.
import { inflateRawSync } from "node:zlib";

const EOCD = 0x06054b50;
const CENTRAL = 0x02014b50;
const LOCAL = 0x04034b50;

/** The bytes of the member `name`, inflated and checked against the size the directory states. */
export function zipMember(zip: Uint8Array, name: string): Uint8Array {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  let end = zip.length - 22;
  while (end >= 0 && view.getUint32(end, true) !== EOCD) end--;
  if (end < 0) throw new Error("not a ZIP archive: no end-of-directory record");
  const count = view.getUint16(end + 10, true);
  let at = view.getUint32(end + 16, true);
  const decoder = new TextDecoder();
  for (let i = 0; i < count; i++) {
    if (view.getUint32(at, true) !== CENTRAL) throw new Error("ZIP central directory is damaged");
    const method = view.getUint16(at + 10, true);
    const packed = view.getUint32(at + 20, true);
    const size = view.getUint32(at + 24, true);
    const nameLength = view.getUint16(at + 28, true);
    const extraLength = view.getUint16(at + 30, true);
    const commentLength = view.getUint16(at + 32, true);
    const local = view.getUint32(at + 42, true);
    const entry = decoder.decode(zip.subarray(at + 46, at + 46 + nameLength));
    at += 46 + nameLength + extraLength + commentLength;
    if (entry !== name) continue;
    if (packed === 0xffffffff || size === 0xffffffff) throw new Error(`${name}: ZIP64 entries are not supported`);
    if (view.getUint32(local, true) !== LOCAL) throw new Error(`${name}: ZIP local header is damaged`);
    const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    const data = zip.subarray(start, start + packed);
    const bytes = method === 0 ? data : method === 8 ? inflateRawSync(data) : undefined;
    if (!bytes) throw new Error(`${name}: ZIP compression method ${method} is not supported`);
    if (bytes.length !== size) throw new Error(`${name}: ${bytes.length} bytes, the directory says ${size}`);
    return bytes;
  }
  throw new Error(`ZIP archive has no member ${name}`);
}
