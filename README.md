# The Edda Reader, the Gītā Reader and the Aeneid Reader

Static parallel-text readers modelled on [The Aristotle Reader](https://aristotle.johnhboyer.com).
Each reader is one site built from the same pages: the original language sits beside a
public-domain English translation, one aligned stanza, verse, chapter or paragraph per row.

- **The Edda Reader**: the Poetic and Prose Eddas in Old Norse.
- **The Gītā Reader**: the Bhagavadgītā, all 18 chapters, in Sanskrit (IAST or Devanagari).
- **The Aeneid Reader**: Vergil's Aeneid, book 1, in Latin.

## Navigation

- **Breadcrumbs.** Reader › collection › work. Each crumb's ▾ lists the other items at its level.
  The collection level appears only in a reader with several collections: the Edda has pages
  for the Poetic Edda (`/poetic-edda/`) and the Prose Edda (`/prose-edda/`).
- **Go-to.** The box in a work's toolbar takes a place in the open work (`45`, `1 23`, `1:23`) or a
  citation of any work in the reader (`Háv 77`, `BhG 2.47`, `Aen. 1.157`; accents and case are
  optional). Anything else with words opens search.
- **Outline.** The rail beside the text (or the Outline sheet on narrower screens) lists a prose
  work's chapters with their headings, or an epic's paragraphs by first line and opening words, and
  then the other works of the collection. It marks where the reader is.
- **Position bar.** It holds the previous and next outline entry, progress through the work, and the
  previous and next work.
- **Word panel.** Its back button returns to the word shown before.

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

See `corpora/edda/Sources.astro` (served at `/sources/`) for full credits and licences.

Codex Regius words use the edition's own annotation. Other texts get *candidate*
analyses: spellings the edition annotates elsewhere (most frequent first), then
Wiktionary inflection tables, then Bellows's name index for capitalized words.
Lookup bridges the prose's middle-voice *-st* to Wiktionary's *-sk*, and Bugge's
unaccented manuscript spellings match accented and unaccented forms alike.
About 80–93% of those words get a candidate. A Wiktionary headword that is only
another spelling of a word the edition lemmatizes (*ec*, *enginn*, *sunr*) reads
as that word (*ek*, *engi*, *sonr*). When the edition annotates a word only in its
own spelling (*að* for the prose's *at*), those readings come before Wiktionary's,
and Wiktionary-only readings are ordered by how often the edition uses the word.
Name readings get case and number when the written form matches the name's table.

Dictionary lookup bridges the edition's spellings to the dictionaries' headwords
(*loft*/*lopt*, *ǿði*/*œði*) and splits unlisted compounds into listed parts
(`corpora/edda/build.ts`). The panel renders Zoëga's entries as numbered senses and
opens the homograph section that fits the reading (`src/lib/entry.ts`). Enclitic
suffixes (*-a*, *-at*, *-gi*) get their own short entries rather than the folded
homograph *a*/*at*/*gi*.

Inflection tables count each word of an enclitic group by its own written part,
so *skulu*'s table lists *skal* for *skalat*, not the whole written form. Verb
tables open the block holding the clicked form, decline past participles where
Wiktionary gives the participle's table, and note the text's spelling when the
table spells the form differently (*skoðask*, here *skoðast*). Comparatives the
edition files under their own headword (*betri*, *meiri*) use the positive's
table, so superlatives such as *beztr* land on a cell, and compound adjectives and
nouns without a table are declined like their last part (*ósnjallr* like
*snjallr*, *árdagr* like *dagr*). Where every attested form of a cell is spelled
differently from the table (*álfa* against Wiktionary's *alfa*), the cell shows
the edition's spelling and keeps the table's in its tooltip.

The edition tags pronouns without their kind, so the build adds it from the lemma
(personal, reflexive, demonstrative, article, possessive, interrogative,
indefinite); possessives name their personal pronoun (*minn*, possessive of *ek*).
The lexicon gives a spelling one page per word class when it is clearly two words
(*vit* "consciousness" and *vit* "we two" at `/lexicon/vit-pron/`), and each page's
gloss comes from the dictionary section for that class.

## The Gītā Reader

The Sanskrit of all 700 verses uses the lemma and morphology of the Digital Corpus of Sanskrit
(Oliver Hellwig, CC BY 4.0); the English is Annie Besant's fourth edition (1922), aligned verse by
verse. Chapters 1 and 2 show Besant's sandhied Devanagari text, transliterated into IAST and aligned
to the DCS analyses; chapters 3–18 retain the DCS surface text. A written form that joins words by
sandhi or in a compound (*parayopetāste*) opens one card per word, each with its segmented form,
grammar and entry from the DCS dictionary; a single word whose written form sandhi changed (*mano*) shows
its segmented form (*manaḥ*) too. Of the thirteen written forms DCS leaves unannotated (Besant's
extra speaker captions, *vidhīyate* at 2.67, four words in chapter 13), all but *tajjyotis* show
*candidate* analyses that DCS gives the same form elsewhere. Search ignores IAST diacritics (`sraddha` finds *śraddhā*)
and accepts Devanagari (`श्रद्धा` finds *śraddhā* too), in the search page and the lexicon filter. It treats
anusvāra and a class nasal before a stop as the same letter (`saṃjaya` finds *sañjaya*). Queries also match
the words as DCS segments them, so `"parayā upetāḥ"` finds *parayopetāste* and `manah` finds *mano*;
`search.json` carries those segmentations per verse (`scripts/core/outputs.ts`). Old Norse forms the edition
splits into a word and an enclitic (*vildu*, segmented *vild u*) match the same way.
The top-bar toggle shows the Sanskrit in Devanagari on every page (`packs/san/script.ts`,
`src/scripts/script.ts`); text is still stored, searched and linked in IAST. Credits are in
`corpora/gita/Sources.astro`.

## The Aeneid Reader

The Latin is Greenough's text (1881) from Perseus, one row per paragraph of his, beside Theodore C.
Williams's blank-verse English (1910), whose paragraphs Perseus numbers by the same Latin lines. Every
fifth line is numbered; the go-to box and links accept a line inside a paragraph (`/aeneid-1/#1.23`), and
the concordance cites lines. Lemma and morphology come from the LASLA corpus (Université de Liège, via
CIRCSE), **CC BY-NC-SA 4.0**: the Aeneid Reader's Latin data is for non-commercial use only. LASLA
follows another edition, so `corpora/aeneid/alignment.ts` pairs each printed word with LASLA's word on
the same line: other spellings (*ruunt*, LASLA *ruont*) keep LASLA's annotation, and the fourteen words
where Greenough prints another reading (`READINGS`) get candidate analyses LASLA gives the same form
elsewhere in the Aeneid; five of them have none. Words joined by *-que*, *-ne* or *-ve* open one card
per word. The dictionary is Frieze's Aeneid vocabulary as revised by Dickinson College Commentaries (CC
BY-SA 4.0), which DCC keyed to LASLA's lemmas; lemmas show its headword form (*canō*, *vir*), and
where a lemma has several entries (*ut*), each LASLA homograph takes the entry with its Aeneid count and
the panel opens the entries for the word's class. Search ignores macrons, case, and v/u and j/i
(`uirum` finds *virum*). There are no inflection tables yet. Credits are in
`corpora/aeneid/Sources.astro`.

## Building

```sh
bun install
bun run fetch          # Edda sources into .cache/sources (about 85 MB)
bun run data           # parse, align, index → generated/edda/
bun run build          # static site → dist/edda/
bun run preview

READER=gita bun run fetch   # DCS chapters, DCS dictionary, Besant pages → .cache/sources/gita
READER=gita bun run data    # → generated/gita/
bun run build:gita          # → dist/gita/ (READER=gita astro build)

READER=aeneid bun run fetch # LASLA's 12 Aeneid books, Perseus Latin and English, Frieze → .cache/sources/aeneid
READER=aeneid bun run data  # → generated/aeneid/
bun run build:aeneid        # → dist/aeneid/
```

`READER` picks the reader for every step and defaults to `edda`; `bun run all` runs all three.
`bun test` runs the unit tests (`src/lib/cite.test.ts`: citation formatting and parsing).

## Layout

```text
src/                 shared pages, word panel, search, lexicon, script toggle
packs/<lang>/        a language: runtime pack (index.ts) and build helpers (build/)
corpora/<id>/        a reader site: site.ts, Sources.astro, fetch.ts, build.ts, alignment data
scripts/core/        what every build shares: outputs, data types, analysis table, HTML helpers
```

- `src/sites/registry.ts` lists the readers and each one's pack. `READER` picks one;
  `astro.config.mjs` aliases `@reader/site`, `@reader/pack` and `@reader/sources` to its files,
  so each browser bundle ships only its own pack. `scripts/run.ts` runs a reader's `fetch.ts`
  or `build.ts`.
- `src/sites/types.ts` is the site contract. A site lists its columns as `sides`, each a source
  text (words with analyses, in the pack's language) or a translation; rows store their units per
  side id, and the reader's column toggle, the search filter and `search.json` follow the list.
  Each work names its citation `levels`, outermost first (`["Stanza"]`, or `["Book", "Line"]` with
  row ids like `1.23`); a listed level (a prose work's chapters) is the work's outline, and the
  go-to box accepts `1.23`, `1 23` or `1:23`. A source unit with `firstLine` is
  numbered stichic verse (an epic paragraph): its lines carry their numbers, every fifth shows one,
  the outline lists its paragraphs, and the go-to box, `#1.23` links and concordance citations reach
  a line inside its row. A translation unit marked `stichic` is continuous verse too, without the
  alternate indent. Works belong to one of the site's `collections` by id; with more than one, each
  collection gets a page at `/<id>/`, and `src/lib/site.ts` fails the build if an id is also a
  work slug.
- `src/lib/cite.ts`: citations as printed (`formatCite`: `Vsp 45`, `BhG 12.47`, `Aen. 1.742`) and
  as typed (`resolveCite`, for the go-to box).
- `src/lang/types.ts` is the pack contract the shared code uses (spelling fold, search key,
  morphology labels, dictionary list, optional inflection tables and scripts); `src/lang/index.ts`
  exposes the reader's pack as `lang`.
- `src/lib/morph.ts`: the analysis format. Word analyses carry Universal Dependencies morphology,
  e.g. `NOUN Case=Acc|Definite=Ind|Gender=Masc|Number=Sing`.
- `src/lib/entry.ts`: renders dictionary articles for the word panel and the lemma pages. A section
  that lists `classes` (word classes from the build) opens only for readings of those classes.
  `src/lib/paradigm.ts` is the inflection table record; packs with tables draw them
  (`packs/non/tables.ts`).
- `scripts/core/outputs.ts`: what every reader's build writes under `generated/<reader>/`: works,
  lexicon and concordance, search index, dictionary and table shards. `scripts/core/analyses.ts`
  deduplicates a work's analyses and tags candidates from whatever lookup the build supplies.
- `packs/non/`: Old Norse. The build helpers hold the form index for unannotated words
  (`forms.ts`), dictionary loading (`lexicon.ts`), Wiktionary tables (`paradigms.ts`), tables
  generated from Zoëga's grammar notes and from proper names (`inflect/`, validated against
  Wiktionary), Menota tags to UD morphology (`menota.ts`) and structured dictionary articles
  (`articles.ts`).
- `packs/san/`: Sanskrit. The build helpers read DCS CoNLL-U (`conllu.ts`) and the DCS dictionary
  (`dictionary.ts`), convert DCS tags to UD (`morph.ts`) and repair damaged characters (`repair.ts`).
- `packs/lat/`: Latin. Lookup folds macrons, case, v/u and j/i. The build helpers read LASLA
  CoNLL-UP (`lasla.ts`), adjust its UD features (`morph.ts`: noun gender dropped, deponents marked)
  and read Frieze's vocabulary from DCC (`frieze.ts`).
- `corpora/edda/`: the Edda build (`build.ts`, `catalog.ts`) and its parsers (`lib/`: `eae.ts`,
  `bugge.ts`, `bellows.ts`, `snorra.ts`, Bellows's name index `names.ts`). It fails if an
  alignment misses or repeats a unit. `alignment/<slug>.json` is the curated row-by-row crosswalk
  between the two sides of the Eddas.
- `corpora/gita/`: the Gītā build: pinned sources (`sources.ts`), Besant's pages (`lib/`), and the
  exceptions: DCS blocks without verse numbers, recovered and unanalysed words (`alignment.ts`),
  Besant's extra verse 13.1 (`english-alignment.ts`) and his Devanagari against DCS
  (`surface-alignment.ts`). It fails if a verse is missing or repeated on either side, or on a
  morphology value with no English label.
- `corpora/aeneid/`: the Aeneid build: pinned and hash-checked sources (`sources.ts`), Perseus TEI
  for Greenough and Williams (`lib/perseus.ts`), and the word-by-word pairing with LASLA
  (`alignment.ts`). It fails if a line's word count differs from LASLA's, if Greenough's and
  Williams's paragraphs differ, or if a listed reading is no longer in the text.
- `src/pages/`: home, works and collection pages (`[slug]`, rendering `src/components/WorkPage.astro`
  or `CollectionPage.astro`), search, lexicon, sources.

## Edda alignment

Each `corpora/edda/alignment/<slug>.json` lists rows of unit keys:

```json
{ "rows": [{ "id": "intro", "on": ["h1", "p2"], "en": ["p1"] }, { "on": ["s3"], "en": ["s1"] }],
  "omit": { "en": ["c42.s30"] } }
```

Rows follow the Old Norse order. Where Bellows moves a stanza, his stanza sits beside the Old
Norse stanza it translates. Every unit appears once, either in a row or in `omit`.
To review or edit one:

```sh
bun run data --raw voluspa                 # refresh .cache/raw/voluspa.json only
bun run align dump voluspa                 # list both sides' units
bun run align check voluspa                # validate and print the rows side by side
bun run data                               # rebuild everything with the edited alignment
```

Unit keys come from the source snapshots. If an upstream source changes (a Wikisource edit,
for example), `bun run data` stops with the unit keys that no longer match.
