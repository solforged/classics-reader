import { defineConfig } from "astro/config";

// The library page of the combined site (scripts/site.ts): it lists the readers, whose own builds sit beside it under
// dist/site/<reader>/. Run `bun scripts/library.ts` first; it writes the citation index the page reads and publishes.
// SITE_BASE is the path the host serves the site under ("/" by default), SITE the origin, as in astro.config.mjs.
export default defineConfig({
  site: process.env.SITE ?? "https://classics-reader.solforged.io",
  base: process.env.SITE_BASE ?? "/",
  srcDir: "library",
  publicDir: "generated/library/public",
  outDir: "dist/site",
  trailingSlash: "always",
  build: { format: "directory", inlineStylesheets: "never" },
});
