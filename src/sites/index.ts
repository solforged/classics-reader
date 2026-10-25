// The reader site being built: READER picks it (src/sites/registry.ts), and astro.config.mjs aliases @reader/site to
// corpora/<id>/site.ts. Shared pages and scripts read everything site-specific from `site`.
export { site } from "@reader/site";
