# The Edda Reader and the Gītā Reader

Static parallel-text readers modelled on [The Aristotle Reader](https://aristotle.johnhboyer.com).
Each reader is one site built from the same pages: the original language sits beside a
public-domain English translation, one aligned stanza, verse or chapter per row.

- **The Edda Reader**: the Poetic and Prose Eddas in Old Norse.
- **The Gītā Reader**: the Bhagavadgītā, all 18 chapters, in Sanskrit (IAST or Devanagari).

## The Edda Reader

- Click any Old Norse word for its lemma, morphology and dictionary entries (Zoëga,
  Cleasby–Vigfússon, Wiktionary), or, for names, Bellows's index of proper names.
- The panel also shows the word's declension or conjugation table, with the clicked form
  highlighted and the forms attested in the Eddas marked.
- Bellows's notes open from the `n` markers beside his stanzas.
- Every row has a stable anchor (`/voluspa/#45`); the margin number copies a link.
- Full-text search covers both languages, and accents are optional (`thorr` finds *Þórr*).
- The lexicon lists 4,600 lemmas with frequency by work and a concordance.
- Views: Old Norse, both, or English; night mode; print; continue reading.

### Texts

| Side | Poetic Edda | Snorri's Edda |
|---|---|---|
| Old Norse | Codex Regius, EAE electronic edition (2024, CC BY-SA 4.0), with per-word lemma and morphology; Bugge (1867) for poems outside the Codex Regius and for Sigrdrífumál 30–37 | Guðni Jónsson's text via Icelandic Wikisource (CC BY-SA 4.0) |
| English | Bellows (1923) | Brodeur (1916). Brodeur did not translate Háttatal, so it is shown in Old Norse only |

See `src/components/sources/Edda.astro` (served at `/sources/`) for full credits and licences.

Codex Regius words use the edition's own annotation. Other texts get *candidate*
analyses: spellings the edition annotates elsewhere (most frequent first), then
Wiktionary inflection tables, then Bellows's name index for capitalized words.
Lookup bridges the prose's middle-voice *-st* to Wiktionary's *-sk*, and Bugge's
unaccented manuscript spellings match accented and unaccented forms alike.
About 80–93% of those words get a candidate.

Dictionary lookup bridges the edition's spellings to the dictionaries' headwords
(*loft*/*lopt*, *ǿði*/*œði*) and splits unlisted compounds into listed parts
(`scripts/build-data.ts`). The panel renders Zoëga's entries as numbered senses and
opens the homograph section that fits the reading (`src/lib/entry.ts`). Enclitic
suffixes (*-a*, *-at*, *-gi*) get their own short entries rather than the folded
homograph *a*/*at*/*gi*.

Inflection tables count each word of an enclitic group by its own written part,
so *skulu*'s table lists *skal* for *skalat*, not the whole written form. Verb
tables open the block holding the clicked form, decline past participles where
Wiktionary gives the participle's table, and note the text's spelling when the
table spells the form differently (*skoðask*, here *skoðast*).

## The Gītā Reader

The Sanskrit of all 700 verses uses the lemma and morphology of the Digital Corpus of Sanskrit
(Oliver Hellwig, CC BY 4.0); the English is Annie Besant's fourth edition (1922), aligned verse by
verse. Chapters 1 and 2 show Besant's sandhied Devanagari text, transliterated into IAST and aligned
to the DCS analyses; chapters 3–18 retain the DCS surface text. A written form that joins words by
sandhi or in a compound (*parayopetāste*) opens one card per word, each with its segmented form,
grammar and entry from the DCS dictionary. Of the thirteen written forms DCS leaves unannotated (Besant's
extra speaker captions, *vidhīyate* at 2.67, four words in chapter 13), all but *tajjyotis* show
*candidate* analyses that DCS gives the same form elsewhere. Search ignores IAST diacritics (`sraddha` finds *śraddhā*)
and accepts Devanagari (`श्रद्धा` finds *śraddhā* too), in the search page and the lexicon filter. It treats
anusvāra and a class nasal before a stop as the same letter (`saṃjaya` finds *sañjaya*).
The top-bar toggle shows the Sanskrit in Devanagari on every page (`src/lang/san/script.ts`,
`src/scripts/script.ts`); text is still stored, searched and linked in IAST. Credits are in
`src/components/sources/Gita.astro`.

## Building

```sh
bun install
bun run fetch          # Edda sources into .cache/sources (about 85 MB)
bun run data           # parse, align, index → generated/edda/
bun run build          # static site → dist/edda/
bun run preview

bun run fetch:gita     # DCS chapters, DCS dictionary, Besant pages → .cache/sources/gita
bun run data:gita      # → generated/gita/
bun run build:gita     # → dist/gita/ (READER=gita astro build)
```

`bun run all` and `bun run all:gita` run all three steps.

## Layout

- `src/sites/`: one config per reader (`edda.ts`, `gita.ts`): names, works, credits, labels. The
  `READER` environment variable picks the site (`astro.config.mjs`); `types.ts` is the contract.
- `src/lang/`: language packs. `types.ts` is the contract the shared code uses (spelling fold,
  search key, morphology labels, dictionary list, optional inflection tables); `non/` is Old Norse,
  `san/` is Sanskrit; `index.ts` picks the reader's pack, so each browser bundle ships only its own.
- `src/lib/morph.ts`: the analysis format. Word analyses carry Universal Dependencies morphology,
  e.g. `NOUN Case=Acc|Definite=Ind|Gender=Masc|Number=Sing`.
- `src/lib/entry.ts`: renders dictionary articles for the word panel and the lemma pages.
  `src/lib/paradigm.ts` is the inflection table record; packs with tables draw them
  (`src/lang/non/tables.ts`).
- `scripts/core/outputs.ts`: what every reader's build writes under `generated/<reader>/`: works,
  lexicon and concordance, search index, dictionary and table shards.
- `scripts/build-data.ts`, `scripts/catalog.ts`, `scripts/lib/`: the Edda build. Parsers (`eae.ts`,
  `bugge.ts`, `bellows.ts`, `snorra.ts`), the form index (`analyses.ts`), dictionary loading
  (`lexicon.ts`), Bellows's name index (`names.ts`), Wiktionary tables (`paradigms.ts`), tables
  generated from Zoëga's grammar notes and from proper names (`inflect/`, validated against
  Wiktionary), Menota tags to UD morphology (`menota.ts`) and structured dictionary articles
  (`articles.ts`). It fails if an alignment misses or repeats a unit.
- `scripts/gita/`: the Gītā build: pinned sources (`sources.ts`), CoNLL-U and DCS dictionary parsers,
  DCS tags to UD, Besant's pages, and the exceptions: DCS blocks without verse numbers, recovered and
  unanalysed words (`alignment.ts`), and Besant's extra verse 13.1 (`english-alignment.ts`). It fails if a
  verse is missing or repeated on either side, or on a morphology value with no English label.
- `alignment/<slug>.json`: the curated row-by-row crosswalk between the two sides of the Eddas.
- `src/pages/`: home, reader (`[slug]`), search, lexicon, sources.

## Edda alignment

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
