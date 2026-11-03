import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import { READERS, readerId } from "./src/sites/registry.ts";

// READER picks the site (src/sites/registry.ts); its data build writes generated/<reader>/ first. BASE, set by
// scripts/site.ts, builds the reader into the combined site instead: BASE=/edda/ serves it at /edda/ beside the
// library, which lives at the base's parent (the library root, "/").
const reader = readerId(process.env.READER);
const file = (path) => fileURLToPath(new URL(path, import.meta.url));
const base = process.env.BASE;
if (base !== undefined && !base.endsWith(`/${reader}/`)) throw new Error(`BASE must end with /${reader}/, got "${base}"`);
const library = base === undefined ? "" : base.slice(0, -reader.length - 1);

export default defineConfig({
  site: "https://classics-reader.solforged.io",
  base,
  trailingSlash: "always",
  publicDir: `generated/${reader}/public`,
  outDir: base === undefined ? `dist/${reader}` : `dist/site${base}`,
  // Stylesheets are linked, not inlined: inlined, the shared page styles were repeated in every one of the lexicon's
  // thousands of pages (about 30–60% of each), while a linked file is fetched once and cached.
  build: { format: "directory", inlineStylesheets: "never" },
  vite: {
    define: {
      "import.meta.env.PUBLIC_READER": JSON.stringify(reader),
      "import.meta.env.PUBLIC_LIBRARY": JSON.stringify(library),
    },
    resolve: {
      alias: {
        "@reader/site": file(`./corpora/${reader}/site.ts`),
        "@reader/pack": file(`./packs/${READERS[reader].pack}/index.ts`),
        "@reader/sources": file(`./corpora/${reader}/Sources.astro`),
      },
    },
  },
});
