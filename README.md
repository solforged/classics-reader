# The Edda Reader

A static parallel-text reader for the Poetic and Prose Eddas, modelled on
[The Aristotle Reader](https://aristotle.johnhboyer.com). Old Norse sits beside a
public-domain English translation, one aligned stanza (or chapter) per row.

- Click any Old Norse word for its lemma, morphology and dictionary entries (Zoëga,
  Cleasby–Vigfússon, Wiktionary).
- Bellows's notes open from the `n` markers beside his stanzas.
- Every row has a stable anchor (`/voluspa/#45`); the margin number copies a link.
- Full-text search covers both languages, and accents are optional (`thorr` finds *Þórr*).
- The lexicon lists 4,600 lemmas with frequency by work and a concordance.
- Views: Old Norse, both, or English; night mode; print; continue reading.

## Texts

| Side | Poetic Edda | Snorri's Edda |
|---|---|---|
| Old Norse | Codex Regius, EAE electronic edition (2024, CC BY-SA 4.0), with per-word lemma and morphology; Bugge (1867) for poems outside the Codex Regius and for Sigrdrífumál 30–37 | Guðni Jónsson's text via Icelandic Wikisource (CC BY-SA 4.0) |
| English | Bellows (1923) | Brodeur (1916). Brodeur did not translate Háttatal, so it is shown in Old Norse only |

See `src/pages/sources.astro` (served at `/sources/`) for full credits and licences.

Codex Regius words use the edition's own annotation. Other texts get *candidate*
analyses: spellings the edition annotates elsewhere, then Wiktionary inflection
tables. About 80–92% of those words get a candidate.

## Building

```sh
bun install
bun run fetch      # download sources into .cache/sources (about 85 MB)
bun run data       # parse, align, index → src/data, public/lex, public/search.json
bun run build      # static site → dist/
bun run preview
```

`bun run all` runs all three steps.

## Layout

- `scripts/catalog.ts`: the works, their groups and which source sections make up each side.
- `scripts/lib/`: parsers (`eae.ts`, `bugge.ts`, `bellows.ts`, `snorra.ts`), the form index
  (`analyses.ts`) and dictionary loading (`lexicon.ts`).
- `scripts/build-data.ts`: builds every output; fails if an alignment misses or repeats a unit.
- `alignment/<slug>.json`: the curated row-by-row crosswalk between the two sides.
- `src/lib/norse.ts`: spelling fold, search key and Menota morphology decoding, shared by the
  build and the browser.
- `src/pages/`: home, reader (`[slug]`), search, lexicon, sources.

## Alignment

Each `alignment/<slug>.json` lists rows of unit keys:

```json
{ "rows": [{ "id": "intro", "on": ["h1", "p2"], "en": ["p1"] }, { "on": ["s3"], "en": ["s1"] }],
  "omit": { "en": ["c42.s30"] } }
```

Rows follow the Old Norse order. Where Bellows moves a stanza, his stanza sits beside the Old
Norse stanza it translates. Every unit appears once, either in a row or in `omit`.
To review or edit one:

```sh
bun scripts/build-data.ts --raw voluspa    # refresh .cache/raw/voluspa.json only
bun run align dump voluspa                 # list both sides' units
bun run align check voluspa                # validate and print the rows side by side
bun run data                               # rebuild everything with the edited alignment
```

Unit keys come from the source snapshots. If an upstream source changes (a Wikisource edit,
for example), `bun run data` stops with the unit keys that no longer match.
