// Every reader site. A site `id` lives in corpora/<id>/ (site.ts, Sources.astro, build.ts, fetch.ts) and reads its
// language through packs/<pack>/. READER picks the site for the data build (scripts/run.ts) and for Astro
// (astro.config.mjs, which aliases @reader/site, @reader/pack and @reader/sources to the chosen files).
export const READERS = {
  edda: { pack: "non" },
  gita: { pack: "san" },
  aeneid: { pack: "lat" },
  homer: { pack: "grc" },
  oldenglish: { pack: "ang" },
  analects: { pack: "lzh" },
  genesis: { pack: "hbo" },
} as const satisfies Readonly<Record<string, { pack: string }>>;

export type ReaderId = keyof typeof READERS;

/** The reader READER names (default "edda"); throws on an unknown id. */
export function readerId(id: string = process.env.READER ?? "edda"): ReaderId {
  if (!Object.hasOwn(READERS, id)) throw new Error(`unknown reader "${id}"; expected one of ${Object.keys(READERS).join(", ")}`);
  return id as ReaderId;
}
