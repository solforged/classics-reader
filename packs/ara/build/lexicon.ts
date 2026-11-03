// The dictionary lookup of the Arabic reader: for a lemma, its CAMeL root and its part of speech, the Lane's Lexicon
// entries (build/lane.ts) and the Wiktionary entries (build/wiktionary.ts) that describe it.
//
// Lane files entries by root, and the corpus's roots are CAMeL Tools': radicals joined by dots, with # for a weak or
// hamza radical it does not resolve (ق.#.ل for قال, #.ن.ن for إنّ). A root is resolved to the Lane roots it can be
// (# is و, ي or a hamza; geminate roots are filed under two letters; a closed-class word's two radicals are its whole
// root). Lane's entries that are the lemma's own are those whose headword has its letters and vowels (vocalKey, build/keys.ts,
// which reads the orthographic variants of a vocalized spelling as one: the fatha before a long vowel, the shadda's order, a tanwin's
// seat alif, the dagger alif; and the lemma's other spellings are tried in turn, the first that finds any wins; a noun, an
// adjective or a name takes no verb for it); when none has, those with its letters that are of its class (Lane's <itype> says
// verb or noun) and double the same letters (`sameShape`); when there are none of either, a noun, adjective or verb
// gets the first entries of its root with an Arabic headword, which are the verbs' (Lane's articles on the derived nouns of a root
// mostly follow the verbs'). Lane writes a verb as 3ms with an object pronoun, unvocalized, with its complement or inflected
// (حَمَاهُ, اغناهُ, دوّن الدَّيوَانَ, اصطفّوا), and a noun with the article (الشَّمْسُ): lane.ts indexes those under the form the
// lemma has (`LaneIndex.verbs`, `phrases`; the article-less noun). Headwords are also looked up across all roots, which finds
// an entry filed under a mistyped root label and a lemma with no Lane root.
import type { Article } from "../../../src/lib/dict";
import { articleOf, glossOf, hasArabicHead, headForms, indexHeadwords, isVerb, lettersOf, radicalsOf, readLane, rootCandidates, type HeadwordIndex, type LaneEntry, type LaneFiles, type LaneIndex, type RootCandidate, type Unconverted } from "./lane";
import { sameShape, skeleton, spellings, vocalKey } from "./keys";
import { Wiktionary, type WiktionaryExtract } from "./wiktionary";

/**
 * Lane's articles for lemmas whose CAMeL root cannot lead to them: [lemma, CAMeL's root as in the CoNLL-U, the Lane root
 * label the lemma's articles are filed under]. The build refuses entries that no lookup used.
 */
// The reviewed CoNLL-U resolves every root that CAMeL left ambiguous where Lane's filing depends on it (تارِيخ is
// أ.ر.خ), so the table is empty; it stays for a later text whose roots have not been read by hand.
const LANE_ROOT_FIXES: readonly (readonly [lemma: string, root: string, laneRoot: string])[] = [];
const fixKey = (lemma: string, root: string | undefined): string => `${lemma}\t${root ?? ""}`;
const FIXED_ROOTS: ReadonlyMap<string, string> = new Map(LANE_ROOT_FIXES.map(([lemma, root, laneRoot]) => [fixKey(lemma, root), laneRoot]));

export interface AraLookup {
  /** The articles found, by dictionary id (packs/ara/dictionaries.ts). */
  entries: { lane?: Article[]; wikt?: Article[] };
  /**
   * How Lane's articles were found: "exact" (headword with the lemma's letters and vowels), "letters" (its letters
   * only), "root" (the lemma has no article of its own; the first articles of its root) or "elsewhere" (the lemma's
   * own article, filed under another root than the CAMeL one). Absent without Lane articles.
   */
  laneMatch?: "exact" | "letters" | "root" | "elsewhere";
  /** A headword the dictionaries use for a lemma spelt another way (Wiktionary's base word for a verbal noun). */
  via?: string;
  /** Short English gloss for the lexicon list. */
  gloss: string;
  /** The root as resolved, radicals dot-joined: ك.و.ن for CAMeL's ك.#.ن; absent for a word without one. */
  root?: string;
}

/** What the word panel says above Lane's articles when `AraLookup.laneMatch` is "root" (DictHit.notes). */
export const LANE_ROOT_NOTE = "Lane has no article for this word; the first articles of its root are shown.";

export interface AraLexiconOptions {
  /** Characters of HTML an article of Lane's keeps (see build/lane.ts). */
  laneLimit: number;
  /** Articles of Lane's for one lemma. */
  laneArticles: number;
  /** Entries of a root given to a lemma that has no entry of its own. */
  rootEntries: number;
}

const DEFAULTS: AraLexiconOptions = { laneLimit: 2400, laneArticles: 3, rootEntries: 2 };

/** The word classes whose root fallback is meaningful. */
const ROOT_CLASSES: Readonly<Record<string, true>> = { NOUN: true, ADJ: true, VERB: true };

/** The word classes that have no root worth showing: a function word's letters are not a root. */
const NO_ROOT_CLASSES: Readonly<Record<string, true>> = {
  ADP: true, CCONJ: true, SCONJ: true, PRON: true, DET: true, PART: true, INTJ: true, AUX: true, PUNCT: true, SYM: true, X: true,
};

/**
 * The word classes of a function word. Lane files a one-letter particle (وَ, فَ, بِ, لِ, كَ) under the letter's own
 * article, "The twenty-seventh letter of the alphabet …" (<itype>alphabetical letter</itype>), and the article on the
 * particle, often in the Supplement, comes after it; a function word's lookup shows the particle's article first.
 */
const FUNCTION_CLASSES: Readonly<Record<string, true>> = { ADP: true, CCONJ: true, SCONJ: true, PART: true, AUX: true, DET: true, PRON: true, INTJ: true };

const isLetter = (entry: LaneEntry): boolean => entry.itype === "alphabetical letter";

/** The entries as they are, except that for a function word the articles on the letter of the alphabet come last (their order otherwise kept). */
function particlesFirst(entries: LaneEntry[], upos: string): LaneEntry[] {
  if (!Object.hasOwn(FUNCTION_CLASSES, upos) || !entries.some(isLetter)) return entries;
  return [...entries.filter((entry) => !isLetter(entry)), ...entries.filter(isLetter)];
}

/** The Arabic letters a Lane root letter is written with in a word: a long vowel's alef is not a hamza radical, but a word-initial one is. */
const WRITTEN: Readonly<Record<string, string>> = { w: "و", y: "ي", Y: "ي", A: "ء", "A^": "ء", "A'": "ء", "'": "ء" };

/**
 * How many letters of a root (Lane's label letters) the word's skeleton has, in order. Weak radicals are often absent
 * from a word (قال is ق.و.ل), so this is evidence for a root and not a test of it.
 */
function spelled(letters: readonly string[], skeleton: string): number {
  let at = 0;
  let score = 0;
  letters.forEach((letter, i) => {
    const written = WRITTEN[letter] ?? radicalsOf([letter]);
    const initialAlef = i === 0 && written === "ء" && skeleton.startsWith("ا");
    let found = initialAlef ? 0 : skeleton.indexOf(written, at);
    // A hamza between an alef and another letter is a long vowel's seat (سائر, قائم: s-y-r, q-w-m), not a radical.
    while (written === "ء" && found > 0 && skeleton[found - 1] === "ا" && found < skeleton.length - 1) found = skeleton.indexOf(written, found + 1);
    if (found >= 0) {
      score++;
      at = found + 1;
    }
  });
  return score;
}

interface Resolution {
  /** The Lane roots the lemma's root can be, that Lane has. */
  existing: RootCandidate[];
  /** The one chosen to show: it has the lemma's own entry, else the evidence of its letters, else the most entries. */
  best?: RootCandidate;
  exact: LaneEntry[];
  letters: LaneEntry[];
  /** The entries came from other roots than the lemma's (a mistyped label in Lane, or a wrong CAMeL root). */
  elsewhere: boolean;
  /**
   * For a lemma with no Lane root (a loanword or a name's noun, whose CAMeL root is absent or one Lane does not have)
   * and no entry of the kind above: the entries, in any root, that have its letters.
   */
  anywhere: LaneEntry[];
}

export class AraLexicon {
  private readonly resolutions = new Map<string, Resolution>();
  private readonly articles = new Map<LaneEntry, Article>();
  private readonly usedFixes = new Set<string>();
  readonly unconverted: Unconverted = new Map();
  /** Articles that were cut to the limit, and the senses left out. */
  cutArticles = 0;
  cutSenses = 0;

  constructor(
    private readonly lane: LaneFiles & LaneIndex,
    private readonly wiktionary: Wiktionary,
    private readonly options: AraLexiconOptions,
  ) {}

  /** Radicals of a CAMeL root, or undefined for a pseudo-root (a particle's letters, a foreign name's "NTWS"). */
  private radicals(root: string | undefined): string[] | undefined {
    const radicals = root?.split(".");
    return radicals && radicals.length >= 2 && radicals.length <= 5 && radicals.every((radical) => radical.length === 1) ? radicals : undefined;
  }

  /** A verb's entries are also found under the forms of Lane's verb headwords that name the verb (`LaneIndex.verbs`, and `phrases` in the verb's own root). */
  private resolve(lemma: string, root: string | undefined, upos: string): Resolution {
    const verb = upos === "VERB";
    const fix = fixKey(lemma, root);
    const cacheKey = verb ? `${fix}\tverb` : fix;
    const cached = this.resolutions.get(cacheKey);
    if (cached) return cached;
    const fixed = FIXED_ROOTS.get(fix);
    if (fixed !== undefined) {
      if (!this.lane.byRoot.has(fixed)) throw new Error(`Lane has no root ${fixed} (LANE_ROOT_FIXES, ${lemma})`);
      this.usedFixes.add(fix);
    }
    const radicals = this.radicals(root);
    let existing: RootCandidate[] = fixed !== undefined
      ? [{ letters: lettersOf(fixed), key: fixed }]
      : (radicals ? rootCandidates(radicals) : []).filter((candidate) => this.lane.byRoot.has(candidate.key));
    // CAMeL gives a quadriliteral root to a noun whose weak letter is Lane's augment (جَدْوَل: ج.د.#.ل, filed under jdl); an
    // initial one is a loanword's vowel (إِقْلِيم, أُسْطُول) and does not make the rest a root.
    if (!existing.length && fixed === undefined && radicals?.length === 4) {
      existing = radicals.flatMap((radical, at) => radical === "#" && at > 0 ? rootCandidates(radicals.filter((_, i) => i !== at)) : [])
        .filter((candidate) => this.lane.byRoot.has(candidate.key));
    }
    const pool = new Set(existing.flatMap((candidate) => this.lane.byRoot.get(candidate.key) ?? []));
    // Across roots a phrase is the entry of whatever its first word is (هَذَا يُمْرِئُ …), so a lookup that ignores roots leaves them out.
    const inRoot = verb ? [this.lane, this.lane.verbs, this.lane.phrases] : [this.lane];
    const anyRoot = verb ? [this.lane, this.lane.verbs] : [this.lane];
    // The spellings of the lemma (a tanwin's alef is the seat of the sign in one spelling, a letter of the word in another): the
    // entries of the first one that has any, so that its own spelling outranks the others.
    const forms = spellings(lemma);
    const vocals = forms.map(vocalKey);
    const skels = forms.map(skeleton);
    const skel = skels[0]!;
    const found = (indexes: readonly HeadwordIndex[], by: keyof HeadwordIndex, keys: readonly string[], keep: (entry: LaneEntry) => boolean): LaneEntry[] => {
      for (const key of keys) {
        const hit = [...new Set(indexes.flatMap((index) => index[by].get(key) ?? []))].filter(keep);
        if (hit.length) return hit;
      }
      return [];
    };
    const inPool = (entry: LaneEntry): boolean => pool.has(entry);
    let exact = found(inRoot, "byVocal", vocals, inPool);
    let letters = found(inRoot, "bySkeleton", skels, (entry) => pool.has(entry) && !exact.includes(entry));
    let elsewhere = false;
    let anywhere: LaneEntry[] = [];
    if (!exact.length && !letters.length) {
      exact = found(anyRoot, "byVocal", vocals, () => true);
      elsewhere = exact.length > 0;
      // A lemma with no Lane root has its letters in whichever root Lane files them; so has a verb of four letters or more, whose
      // letters hardly spell another word by chance (Lane files the form VIII اتّخذ under تخذ, and CAMeL's root for اِتَّخَذ is أ.خ.ذ).
      if (!exact.length && (!existing.length || (verb && skel.length >= 4))) anywhere = found(anyRoot, "bySkeleton", skels, () => true);
    }
    // Which of the possible roots to show: the one that holds the lemma's entry, then the one whose letters the lemma
    // spells in order (see `spelled`; قال has an alef, so it does not tell و from ي: the root with more entries is the likelier), then size.
    const evidence = (candidate: RootCandidate): number => spelled(candidate.letters, skel);
    const holds = (candidate: RootCandidate): number => {
      const entries = this.lane.byRoot.get(candidate.key) ?? [];
      return entries.some((entry) => exact.includes(entry)) ? 2 : entries.some((entry) => letters.includes(entry)) ? 1 : 0;
    };
    const best = [...existing].sort((a, b) => holds(b) - holds(a) || evidence(b) - evidence(a)
      || (this.lane.byRoot.get(b.key)?.length ?? 0) - (this.lane.byRoot.get(a.key)?.length ?? 0))[0];
    const resolution: Resolution = { existing, ...(best ? { best } : {}), exact, letters, elsewhere, anywhere };
    this.resolutions.set(cacheKey, resolution);
    return resolution;
  }

  /**
   * The root to show: dot-joined radicals with # resolved against Lane, "؟" for one it cannot resolve; undefined for a
   * pseudo-root and for a function word (`upos` ADP, CCONJ, SCONJ, PRON, DET, PART, INTJ, AUX, X …: its letters are not
   * a root, whatever CAMeL's root field holds). When the lemma's own entry is filed under another root than CAMeL's (يَد is
   * under yd), Lane's root.
   */
  root(lemma: string, root: string | undefined, upos: string): string | undefined {
    if (Object.hasOwn(NO_ROOT_CLASSES, upos)) return undefined;
    const radicals = this.radicals(root);
    if (!radicals || radicals.length < 3) return undefined;
    const { best, exact, elsewhere } = this.resolve(lemma, root, upos);
    const filed = elsewhere && exact[0]?.roots[0] ? radicalsOf(lettersOf(exact[0].roots[0])) : undefined;
    if (filed && !filed.includes("؟") && filed.split(".").length <= 5) return filed;
    if (best) return radicalsOf(best.letters);
    // No Lane root fits: keep the radicals CAMeL resolved and mark the others.
    return radicals.map((radical) => (radical === "#" ? "؟" : radical)).join(".");
  }

  private article(entry: LaneEntry): Article {
    let article = this.articles.get(entry);
    if (!article) {
      const made = articleOf(entry, { limit: this.options.laneLimit }, this.unconverted);
      article = made.article;
      if (made.cut) {
        this.cutArticles++;
        this.cutSenses += made.cut;
      }
      this.articles.set(entry, article);
    }
    return article;
  }

  /** The entries to show for a lemma, and how they were found. */
  private laneEntries(lemma: string, root: string | undefined, upos: string): { entries: LaneEntry[]; match?: NonNullable<AraLookup["laneMatch"]> } {
    const { exact, letters, best, elsewhere, anywhere } = this.resolve(lemma, root, upos);
    // An entry with the lemma's vowels is taken as it is (إِنَّ is a particle, which CAMeL calls a pseudo-verb), but for a noun, an
    // adjective or a name: the vocal key leaves the sukun out, so that a noun's key is a verb's (نَهْر, نَهَرَ) and a defective noun's
    // a verb's (قاضِي, قَاضَى), and a verb is never the entry of one. One with only its letters must be of the lemma's class: a verb
    // lemma is not a noun's entry nor a noun lemma a verb's (حَسَبَ and حَسَبٌ), nor an adverb's, preposition's … a verb's (غالِباً and
    // the verb غَالَبَهُ); only a particle or an auxiliary may be, since Lane files some as verbs.
    const nominal = upos === "NOUN" || upos === "ADJ" || upos === "PROPN";
    const fits = (entry: LaneEntry): boolean => (upos === "VERB" ? isVerb(entry) : upos === "PART" || upos === "AUX" ? true : !isVerb(entry));
    // Entries of the lemma's class come first, then the others, each in the index's order (a headword's own form before the forms
    // it is also known by); a verb lemma's list starts with Lane's verb, a noun lemma's with the noun.
    const ordered = particlesFirst([...exact.filter(fits), ...exact.filter((entry) => !fits(entry) && !nominal)], upos);
    if (ordered.length) return { entries: ordered.slice(0, this.options.laneArticles), match: elsewhere ? "elsewhere" : "exact" };
    // Letters alone do not make an entry the lemma's: it must double the same letters (sameShape), so that إِلّا is not a word
    // spelt أَلَا, and فَضَّلَ is form II, as Lane's فضّلهُ, and not form I, فَضَلَ.
    const shaped = (entry: LaneEntry): boolean => headForms(entry).some((form) => sameShape(lemma, form, upos === "VERB"));
    const near = particlesFirst(letters.filter((entry) => fits(entry) && shaped(entry)), upos);
    if (near.length) return { entries: near.slice(0, this.options.laneArticles), match: "letters" };
    // A lemma with no Lane root has its letters in whichever root Lane files them. Only a noun, an adjective or a verb is taken so: the
    // letters of a function word are those of a verb or two (كَلّا and the verb كَلَا) and of a name those of a common word (خُتَّل and خِتْلٌ).
    const far = anywhere.filter((entry) => (upos === "VERB" ? isVerb(entry) : (upos === "NOUN" || upos === "ADJ") && !isVerb(entry)) && shaped(entry));
    if (far.length) return { entries: far.slice(0, this.options.laneArticles), match: "letters" };
    if (best && Object.hasOwn(ROOT_CLASSES, upos)) {
      const first = (this.lane.byRoot.get(best.key) ?? []).filter(hasArabicHead).slice(0, this.options.rootEntries);
      if (first.length) return { entries: first, match: "root" };
    }
    return { entries: [] };
  }

  lookup(lemma: string, root: string | undefined, upos: string): AraLookup | undefined {
    const found = this.laneEntries(lemma, root, upos);
    const lane = found.entries.map((entry) => this.article(entry));
    const wikt = this.wiktionary.lookup(lemma, upos);
    if (!lane.length && !wikt) return undefined;
    const gloss = wikt?.gloss || (lane[0] ? glossOf(lane[0]) : "");
    const shownRoot = this.root(lemma, root, upos);
    return {
      entries: { ...(lane.length ? { lane } : {}), ...(wikt ? { wikt: wikt.articles } : {}) },
      ...(lane.length && found.match ? { laneMatch: found.match } : {}),
      ...(wikt?.via ? { via: wikt.via } : {}),
      gloss,
      ...(shownRoot ? { root: shownRoot } : {}),
    };
  }

  /** Root fixes that no lookup used; the build refuses them. */
  unused(): string[] {
    return [...FIXED_ROOTS.keys()].filter((key) => !this.usedFixes.has(key)).map((key) => key.replace("\t", " "));
  }
}

/** Reads Lane's XML (the directory fetch.ts unpacks) and the Wiktionary extract (corpora/muqaddimah/data/wiktionary.json). */
export async function loadAraLexicon(paths: { laneDir: string; wiktionary: string } & Partial<AraLexiconOptions>): Promise<AraLexicon> {
  const { laneDir, wiktionary, ...options } = paths;
  const files = await readLane(laneDir);
  const extract = (await Bun.file(wiktionary).json()) as WiktionaryExtract;
  return new AraLexicon({ ...files, ...indexHeadwords(files.entries) }, new Wiktionary(extract), { ...DEFAULTS, ...options });
}
