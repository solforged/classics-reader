// Builds the combined site for GitHub Pages and publishes it (.github/workflows/pages.yml).
//   bun scripts/deploy-pages.ts            data builds, site build, upload, deploy
//   bun scripts/deploy-pages.ts --no-data  skip the data builds (generated/<reader>/ is current)
// The site is served under the repository's path (https://solforged.github.io/classics-reader/); SITE and SITE_BASE
// override the origin and the path, e.g. SITE=https://classics-reader.solforged.io SITE_BASE=/ for a custom domain.
// Needs the GitHub CLI, signed in with access to the repository. The archive goes to the `site` release, which holds
// only that one file; the workflow deploys it unchanged.
import { join } from "node:path";
import { ROOT } from "./core/outputs";

const env = {
  SITE: process.env.SITE ?? "https://solforged.github.io",
  SITE_BASE: process.env.SITE_BASE ?? "/classics-reader/",
};

async function run(command: string[], quiet = false): Promise<string> {
  const child = Bun.spawn(command, {
    cwd: ROOT, env: { ...process.env, ...env }, stdio: ["inherit", quiet ? "pipe" : "inherit", "inherit"],
  });
  const out = quiet ? await new Response(child.stdout).text() : "";
  if ((await child.exited) !== 0) throw new Error(`${command.join(" ")} failed`);
  return out;
}

await run([process.execPath, join(ROOT, "scripts", "site.ts"), ...process.argv.slice(2)]);
const archive = join(ROOT, "dist", "site.tar.gz");
await run(["tar", "-czf", archive, "-C", join(ROOT, "dist", "site"), "."]);
const releases = await run(["gh", "release", "list", "--json", "tagName", "--jq", ".[].tagName"], true);
if (!releases.split("\n").includes("site")) {
  await run(["gh", "release", "create", "site", "--title", "Built site", "--latest=false",
    "--notes", "The combined site as last deployed to GitHub Pages (scripts/deploy-pages.ts)."]);
}
await run(["gh", "release", "upload", "site", archive, "--clobber"]);
await run(["gh", "workflow", "run", "pages.yml", "--ref", "main"]);
console.log(`deploying to ${env.SITE}${env.SITE_BASE}: gh run watch to follow it`);
