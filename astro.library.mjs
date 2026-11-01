import { defineConfig } from "astro/config";

// The library page of the combined site (scripts/site.ts): it lists the readers, whose own builds sit beside it under
// dist/site/<reader>/. Run `bun scripts/library.ts` first; it writes the citation index the page reads and publishes.
export default defineConfig({
  site: "https://classics-reader.solforged.io",
  srcDir: "library",
  publicDir: "generated/library/public",
  outDir: "dist/site",
  trailingSlash: "always",
  build: { format: "directory" },
});
