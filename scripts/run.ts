// Runs a corpus step for the reader READER names (src/sites/registry.ts):
//   bun scripts/run.ts fetch [--force]   corpora/<id>/fetch.ts → .cache/sources/
//   bun scripts/run.ts build [args]      corpora/<id>/build.ts → generated/<id>/
import { join } from "node:path";
import { readerId } from "../src/sites/registry";

const [step, ...args] = process.argv.slice(2);
if (step !== "fetch" && step !== "build") {
  console.error("usage: READER=<id> bun scripts/run.ts fetch|build [args]");
  process.exit(2);
}
const script = join(import.meta.dir, "..", "corpora", readerId(), `${step}.ts`);
const child = Bun.spawn([process.execPath, script, ...args], { stdio: ["inherit", "inherit", "inherit"] });
process.exit(await child.exited);
