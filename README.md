# Classics Reader

Static parallel-text readers modelled on [The Aristotle Reader](https://aristotle.johnhboyer.com).
Each reader is one site built from the same pages: the original language sits beside a
public-domain English translation, one aligned stanza, verse, chapter or paragraph per row.

- **The Edda Reader**: the Poetic and Prose Eddas in Old Norse.
- **The Gītā Reader**: the Bhagavadgītā, all 18 chapters, in Sanskrit (IAST or Devanagari).
- **The Aeneid Reader**: Vergil's Aeneid, book 1, in Latin.
- **The Old English Reader**: *Apollonius of Tyre* and the West-Saxon Gospel of Mark.
- **The Homer Reader**: the Iliad and the Odyssey, book 1 of each, in Greek.
- **The Genesis Reader**: Genesis 1–11 in Hebrew.
- **The Analects Reader**: the Analects of Confucius, all 20 books, in Classical Chinese.
- **The Dante Reader**: the Divine Comedy, all 100 cantos, in Dante's Italian.
- **The Machiavelli Reader**: *Il Principe*, the dedication and all 26 chapters, and *Dell'arte della guerra*, the proemio and all seven books, in Italian.

## Navigation

- **Library.** The combined site (`bun run build:site`) serves every reader from one server: the
  library page at `/` lists the readers by language, takes a citation of any work in its go-to box,
  and offers to continue at the latest place read in any reader. Each reader lives at `/<id>/`.
- **Breadcrumbs.** Library › reader › collection › work. Each crumb's ▾ lists the other items at its
  level; the reader's crumb lists the other readers. The library crumb appears only on the combined
  site. The collection level appears only in a reader with several collections: the Edda has pages
  for the Poetic Edda (`/poetic-edda/`) and the Prose Edda (`/prose-edda/`).
- **Go-to.** The box in a work's toolbar takes a place in the open work (`45`, `1 23`, `1:23`) or a
  citation of any work in the reader (`Háv 77`, `BhG 2.47`, `Aen. 1.157`; accents and case are
  optional). On the combined site it also reaches the other readers (`Gen 3:1` from the Edda): the
  reader's own works come first, so `Od 5` in the Edda is Oddrúnargrátr, while `Od 1.33`, which a
  stanza number cannot hold, is the Odyssey. Anything else with words opens search.
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

## The Old English Reader

Both texts and their annotation come from the ISWOC treebank (Kristin Bech, University of Oslo), whose
lemma and morphology were reviewed by hand for every sentence: **CC BY-NC-SA 4.0**, so the reader's
Old English data is for non-commercial use only. *Apollonius of Tyre* is ISWOC's text, which follows
Goolden's edition (1958); its 22 chapters face Benjamin Thorpe's literal translation (1834), cut by
hand at the Old English chapter openings, with the passages Thorpe supplied from the Latin left out.
The Gospel of Mark is Skeat's text, one verse per row beside the King James Version; the seven verses
the edition lacks show the English alone. `packs/ang/build/morph.ts` converts ISWOC's PROIEL tags to
UD; a value ISWOC leaves undecided (accusative or dative) is shown as such. Written forms of two
words (*næs*, *nolde*) open two cards. Lemmas show Bosworth–Toller's headwords with macrons
(*hālig*); its entries (CC BY 4.0) cover 99.8% of the words that are not names, Wiktionary most of
the rest, and a hand-written glossary (`corpora/oldenglish/names.ts`) the 98 names. Search ignores
length marks and case and accepts *th* for þ and ð and *ae* for æ (`thaet` finds *þæt*). There are
no inflection tables. Credits are in `corpora/oldenglish/Sources.astro`.

## The Homer Reader

Iliad 1 and Odyssey 1 in the Monro–Allen text from Perseus, with lemma and morphology from the
Ancient Greek Dependency Treebank 2.1 (CC BY-SA 3.0 US), which annotates that text. The treebank's
line citations are unreliable in Odyssey 1.95–269, so `corpora/homer/alignment.ts` pairs words by
sequence; `annotation.ts` lists the 23 tokens the treebank leaves untagged or splits wrongly and the
lemmas it misspells, and the build stops on an entry it does not use. Each row is a Loeb page (a
Perseus card), with A. T. Murray's prose translation of the same page (1924 and 1919, public domain);
Murray's five-line marks fall mid-sentence and are not used. Lines are numbered as in the Aeneid
(`Il. 1.33`). *οὐδέ* and *μηδέ*, which the treebank divides, open two cards. The dictionaries are
Autenrieth's Homeric dictionary, the Middle Liddell and LSJ (Perseus, CC BY-SA), with LSJ's longest
entries cut after a whole sense; 45 lemmas are found only by ignoring an accent and say so. Search
ignores accents, breathings and case (`μηνιν` finds *μῆνιν*). Credits are in
`corpora/homer/Sources.astro`.

## The Genesis Reader

Genesis 1–11, one verse per row, in the Westminster Leningrad Codex with the lemma and morphology of
the Open Scriptures Hebrew Bible (CC BY 4.0), beside the Jewish Publication Society's translation
(1917). The Hebrew keeps its vowel points and drops the cantillation marks; it reads right to left
(`LanguagePack.dir`), with the English in the left column. A written word holds one to four
morphemes (preposition, article, conjunction, stem, pronominal suffix) and opens a card for each.
Lemmas are Brown–Driver–Briggs headwords through the Open Scriptures Hebrew Lexicon; 85 entries that
have no definition there (mostly names) show the lexicon's gloss. Where the text is read otherwise than
written, the reader prints the reading (qere) and its panel names the written form (ketiv). Chapters
form the outline, and go-to accepts `Gen 3:1`, `3.1` or a bare chapter number.
Search ignores points and accents and folds final letters (`בראשית` finds *בְּרֵאשִׁית*). Credits
are in `corpora/genesis/Sources.astro`.

## The Analects Reader

All 20 books of the Analects, one work per book and one row per chapter of James Legge's
translation (1861; 2nd ed. 1893), in the text of the Kyoto University treebank for Classical
Chinese (Universal Dependencies, CC BY-SA 4.0), which supplies the word division, lemma, part of
speech and a gloss for every word. Kyoto prints no punctuation; the reader carries Legge's across
by aligning the two Chinese texts character by character (`corpora/analects/alignment.ts` lists the
differences), and prints each Kyoto sentence on its own line. The word panel shows the word's
pinyin and Middle Chinese reading, Kyoto's gloss for that occurrence, then Wiktionary and Unihan
entries; names have only Kyoto's gloss. Variant characters are interchangeable in lookup and
search (*為* finds *爲*). Citations read `An. 2.4`. Credits are in `corpora/analects/Sources.astro`.

## The Dante Reader

The whole Commedia, one work per canto and one row per tercet, in Petrocchi's text with the lemma
and morphology of UD_Italian-Old (Universal Dependencies 2.18, CC BY-SA 4.0, from the DanteSearch
corpus), beside Longfellow's translation (1867), which keeps the Italian's lines and tercets in
every canto. The treebank gives nearly every word its canto and line; `corpora/dante/lines.ts`
places the rest (punctuation, and 1,250 words of the Paradiso) by aligning the treebank's words with
Project Gutenberg's Italian text, and `alignment.ts` lists the few places where that needs help. The
treebank records spacing fully only in the Inferno, so the reader spaces by rules that reproduce
the Inferno's. A written word that joins two (*del*, *dimmi*, *meco*) opens a card for each.
Lemmas are modern citation forms (*loco* under *luogo*) and are looked up in Wiktionary's Italian
entries (a capture of kaikki.org's file), following Wiktionary from Dante's spellings to the modern
word (*surgere* to *sorgere*); names also show Paget Toynbee's *Concise Dictionary of Proper Names
and Notable Matters in the Works of Dante* (1914), parsed from the Internet Archive's OCR text by
`packs/ita/build/toynbee.ts`. The three cantiche are collections; citations read `Inf. 5.121`.
Search ignores accents and apostrophes (`perche` finds *perché*). The library shelves the reader
under Medieval Italian. Credits are in `corpora/dante/Sources.astro`.

## The Machiavelli Reader

Two works, one collection. *Il Principe* is the Italian Wikisource transcription of the anonymous
"Italia, 1814" printing (CC BY-SA 3.0 and GFDL, proofread against the scan), one row per Italian
paragraph, beside Luigi Ricci's translation (Oxford, 1909; Project Gutenberg #57037).
*Dell'arte della guerra* is Mario Martelli's text (Sansoni, 1971) in Liber Liber's transcription
(CC BY-NC-SA 4.0; the file says *DIRITTI D'AUTORE: no*, and a critical edition's right lasts twenty
years under art. 85-quater of law 633/1941), one row per Martelli paragraph, beside Ellis
Farneworth's translation (1762) as English Wikisource transcribes the 1775 *Works* (PD-old; the
transcription is CC BY-SA 4.0 and proofread once, not validated). No hand-annotated text of
Machiavelli exists, so the morphology is machine-tagged: UDPipe 2 with the UD_Italian-ISDT model
(`italian-isdt-ud-2.17-251125`; the service marks its output CC BY-NC-SA), then checked by hand
word by word (lemma, part of speech, features, splitting of *del*, *de'* and enclitic clusters); the Art of
War's annotation then got a consistency pass across its units. The tagger is a web service, so the
hand-checked CoNLL-U is vendored in `corpora/machiavelli/data/` (the Prince's) and `data/arte/conllu/` and
pinned by hash. `lib/morph.ts` rewrites ISDT's conventions into
those `packs/ita/morph.ts` labels (the gerund, the past historic). Each English translation is
aligned to the Italian sentences by a length-based pass corrected by hand (`data/alignment/`,
`data/arte/alignment/`), which places the English at the Italian paragraph breaks; Ricci leaves out
the close of chapter 13, and the reader says so there, and Farneworth leaves out 17 Italian sentences,
each noted. The Arte's Italian is derived at build time from the pinned Liber Liber download
(`fetch.ts` decodes its Windows-1252 text; `lib/liberliber.ts` strips the colophon, reads the
headings and speaker labels, and applies the eight corrections of `ARTE_TEXT_FIXES`) and must equal,
character for character, the text of the CoNLL-U. Farneworth's English (`data/arte/en*/`) is the
Wikisource extract with its apparatus stripped, pinned by hash with the Wikisource revisions it was
taken from; his clause ids are what the alignment names. A paragraph that opens a speaker's turn in
the dialogue shows the speaker (*Fabrizio*, *Cosimo*, *Zanobi*, *Batista*, *Luigi*) as a small-caps
cue on both sides (`SourceUnit.speaker`, drawn by `WorkPage.astro`, outside the words and the search
text); Farneworth's footnotes are translator's notes. Lemmas are looked up in Wiktionary as in the
Dante Reader. Citations read `Prin. 18.2` (chapter, paragraph; the dedication is `Prin. 0`) and
`AdG. 3.12` (book, Martelli's paragraph within it; the proemio is `AdG. 0`). The reader shares the
Medieval Italian shelf. Credits are in `corpora/machiavelli/Sources.astro`.

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

READER=oldenglish bun run fetch  # ISWOC, Bosworth–Toller, Wiktionary, Thorpe, KJV (about 230 MB)
READER=homer bun run fetch       # AGDT, Perseus Greek and English, Autenrieth, Middle Liddell, LSJ (about 335 MB)
READER=genesis bun run fetch     # OSHB, Open Scriptures lexicon, JPS 1917
READER=analects bun run fetch    # Kyoto treebank, Legge, Unihan, Wiktionary
READER=dante bun run fetch       # UD_Italian-Old, Gutenberg Italian and Longfellow, Toynbee, Wiktionary (streams 650 MB)
READER=machiavelli bun run fetch # Ricci, Liber Liber's Arte, Wiktionary (streams 650 MB); the CoNLL-U and Farneworth are in the repo
# then READER=<id> bun run data and bun run build:<id> for each

bun run build:site     # every reader's data and site, and the library → dist/site/
bun run build:site -- --no-data   # the same without the data builds
bun run preview:site   # serve dist/site/ (library at /, readers at /<id>/)
```

`READER` picks the reader for every step and defaults to `edda`; `bun run all` runs the steps for
the reader `READER` names. `build:site` needs every reader's sources fetched first.
`bun test` runs the unit tests (`src/lib/cite.test.ts`: citation formatting and parsing).

## Layout

```text
src/                 shared pages, word panel, search, lexicon, script toggle
library/             the combined site's library page (astro.library.mjs)
packs/<lang>/        a language: runtime pack (index.ts) and build helpers (build/)
corpora/<id>/        a reader site: site.ts, Sources.astro, fetch.ts, build.ts, alignment data
scripts/core/        what every build shares: outputs, data types, analysis table, HTML helpers
```

- `src/sites/registry.ts` lists the readers and each one's pack. `READER` picks one;
  `astro.config.mjs` aliases `@reader/site`, `@reader/pack` and `@reader/sources` to its files,
  so each browser bundle ships only its own pack. `scripts/run.ts` runs a reader's `fetch.ts`
  or `build.ts`.
- The combined site: `scripts/site.ts` (`build:site`) writes the citation index with
  `scripts/library.ts` (`generated/library/public/citations.json`: every reader's works and
  abbreviations; it fails if two readers share an abbreviation), builds the library page with
  `astro.library.mjs` into `dist/site/`, then each reader with `BASE=/<id>/` into `dist/site/<id>/`.
  `BASE` sets Astro's `base` and tells the reader where the library is (`src/lib/library.ts`): its
  breadcrumb starts at the library, and its go-to box fetches `citations.json` for citations it
  cannot resolve itself. Standalone builds are unchanged.
- `src/sites/types.ts` is the site contract. A site lists its columns as `sides`, each a source
  text (words with analyses, in the pack's language) or a translation; rows store their units per
  side id, and the reader's column toggle, the search filter and `search.json` follow the list.
  Each work names its citation `levels`, outermost first (`["Stanza"]`, or `["Book", "Line"]` with
  row ids like `1.23`); a listed level (a prose work's chapters) is the work's outline, listed by
  heading or, with `opening`, by the division's first words, and the
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
  morphology labels, dictionary list, optional inflection tables and scripts, and `dir` for a
  right-to-left script); `src/lang/index.ts` exposes the reader's pack as `lang`. A dictionary
  record may carry a `reading` (Chinese pinyin), shown beside the lemma.
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
- `packs/ang/`: Old English. Lookup folds length marks, case, ð to þ and ƿ to w. The build helpers
  read ISWOC's PROIEL XML (`iswoc.ts`), convert its tags to UD (`morph.ts`), parse Bosworth–Toller
  (`bt.ts`) and Wiktionary (`wiktionary.ts`), and map ISWOC lemmas to headwords (`lemmas.ts`).
- `packs/grc/`: Ancient Greek. The build helpers read the AGDT (`agdt.ts`, tags to UD), convert
  Beta Code (`beta.ts`), parse the three Perseus lexica (`lexica.ts`) and find headwords
  (`headwords.ts`).
- `packs/hbo/`: Biblical Hebrew. The build helpers read OSHB (`oshb.ts`), convert its morphology
  codes to UD (`morph.ts`) and resolve lemmas to BDB (`lexicon.ts`, `bdb.ts`).
- `packs/lzh/`: Classical Chinese. The build helpers read Kyoto CoNLL-U (`conllu.ts`), label its
  features (`morph.ts`) and build entries from Unihan and Wiktionary (`unihan.ts`,
  `wiktionary.ts`, `dictionary.ts`).
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
- `corpora/oldenglish/`, `corpora/homer/`, `corpora/genesis/`, `corpora/analects/`,
  `corpora/machiavelli/`: the same shape as the Aeneid (pinned `sources.ts`, `fetch.ts`, parsers in
  `lib/`, exception tables in `alignment.ts`, plus `names.ts` for Old English names and
  `annotation.ts` for Homer's treebank repairs; Machiavelli's build is `build.ts`, which runs
  `principe.ts` and `arte.ts`, one per work). Each build stops on an unexplained difference
  between its texts, on a morphology value with no English label, and on an exception it does not
  use.
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
