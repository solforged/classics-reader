import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://eddas.example.org",
  trailingSlash: "always",
  build: { format: "directory" },
});
