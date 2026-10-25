import { defineConfig } from "astro/config";

// READER picks the site (src/sites); its data build writes generated/<reader>/ first.
const reader = process.env.READER ?? "edda";

export default defineConfig({
  site: "https://eddas.example.org",
  trailingSlash: "always",
  publicDir: `generated/${reader}/public`,
  outDir: `dist/${reader}`,
  build: { format: "directory" },
  vite: { define: { "import.meta.env.PUBLIC_READER": JSON.stringify(reader) } },
});
