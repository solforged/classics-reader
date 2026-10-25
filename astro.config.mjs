import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import { READERS, readerId } from "./src/sites/registry.ts";

// READER picks the site (src/sites/registry.ts); its data build writes generated/<reader>/ first.
const reader = readerId(process.env.READER);
const file = (path) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  site: "https://eddas.example.org",
  trailingSlash: "always",
  publicDir: `generated/${reader}/public`,
  outDir: `dist/${reader}`,
  build: { format: "directory" },
  vite: {
    define: { "import.meta.env.PUBLIC_READER": JSON.stringify(reader) },
    resolve: {
      alias: {
        "@reader/site": file(`./corpora/${reader}/site.ts`),
        "@reader/pack": file(`./packs/${READERS[reader].pack}/index.ts`),
        "@reader/sources": file(`./corpora/${reader}/Sources.astro`),
      },
    },
  },
});
