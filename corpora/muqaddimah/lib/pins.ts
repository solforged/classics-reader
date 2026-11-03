// SHA-256 of vendored and downloaded files, and the read that refuses a file that does not match its pin.
import { createHash } from "node:crypto";

export const sha256 = (data: string | Uint8Array): string => createHash("sha256").update(data).digest("hex");

/** A vendored file's text, after its bytes are checked against the pin. `label` names the file in the error. */
export async function readPinned(path: string, sha: string, label: string): Promise<string> {
  const bytes = new Uint8Array(await Bun.file(path).arrayBuffer());
  const actual = sha256(bytes);
  if (actual !== sha) throw new Error(`${label}: SHA-256 ${actual}, pin ${sha}`);
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}
