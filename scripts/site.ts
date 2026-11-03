// Builds the combined site into dist/site/: the library page at / and every reader at /<reader>/.
//   bun scripts/site.ts            data build and site build for each reader, then the library
//   bun scripts/site.ts --no-data  skip the data builds (generated/<reader>/ is current)
// Each reader's sources must be fetched first (READER=<id> bun run fetch). A host that serves the site under a path
// sets it in SITE_BASE (SITE_BASE=/classics-reader/), and its origin in SITE; the files stay at dist/site/.
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { READERS } from "../src/sites/registry";
import { ROOT } from "./core/outputs";

const data = !process.argv.includes("--no-data");
const prefix = process.env.SITE_BASE ?? "/";
if (!prefix.startsWith("/") || !prefix.endsWith("/")) throw new Error(`SITE_BASE must start and end with "/", got "${prefix}"`);

async function run(command: string[], env: Record<string, string> = {}): Promise<void> {
  const child = Bun.spawn(command, { cwd: ROOT, env: { ...process.env, ...env }, stdio: ["inherit", "inherit", "inherit"] });
  const code = await child.exited;
  if (code !== 0) throw new Error(`${Object.entries(env).map(([k, v]) => `${k}=${v} `).join("")}${command.join(" ")} exited ${code}`);
}

const astro = [process.execPath, join(ROOT, "node_modules", "astro", "bin", "astro.mjs"), "build", "--silent"];
await run([process.execPath, join(ROOT, "scripts", "library.ts")]);
await rm(join(ROOT, "dist", "site"), { recursive: true, force: true });
// The library first: its build owns dist/site/, and each reader then writes only its own directory in it.
await run([...astro, "--config", "astro.library.mjs"]);
for (const reader of Object.keys(READERS)) {
  if (data) await run([process.execPath, join(ROOT, "scripts", "run.ts"), "build"], { READER: reader });
  await run(astro, { READER: reader, BASE: `${prefix}${reader}/` });
  console.log(`built /${reader}/`);
}
console.log("dist/site/ is ready: bun run preview:site");
