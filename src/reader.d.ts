// Modules astro.config.mjs aliases to the files of the reader being built (src/sites/registry.ts). Ambient
// declarations cannot import relative modules, so the types are referenced inline.
declare module "@reader/site" {
  export const site: import("./sites/types").ReaderSite;
}
declare module "@reader/pack" {
  export const pack: import("./lang/types").LanguagePack;
}
declare module "@reader/sources" {
  const Sources: import("astro/runtime/server/index.js").AstroComponentFactory;
  export default Sources;
}
