import { parseConllu, type DcsSentence, type DcsSourceSentence, type DcsToken } from "./lib/conllu";

export const DCS_VERSE_COUNTS: readonly number[] = [
  47, 72, 43, 42, 29, 47, 30, 28, 34, 42, 55, 20, 34, 27, 20, 24, 28, 78,
];

/*
 * All DCS evidence below is pinned to 8aeed5a1343d0e48b64eb32af8c00e8c6eb29359:
 * https://github.com/OliverHellwig/sanskrit/tree/8aeed5a1343d0e48b64eb32af8c00e8c6eb29359/dcs/data/conllu/files/Mahābhārata
 * Chapter 1: Mahābhārata-0883-MBh, 6, BhaGī 1-7242.conllu
 * Chapter 2: Mahābhārata-0884-MBh, 6, BhaGī 2-7243.conllu
 * Chapter 13: Mahābhārata-0895-MBh, 6, BhaGī 13-7702.conllu
 * Sentence IDs and exact #text below identify each exception in those files.
 * Besant's numbered Sanskrit confirms the recovered citations:
 * https://en.wikisource.org/wiki/Bhagavad-Gita_(Besant_4th)/Discourse_1
 * https://en.wikisource.org/wiki/Bhagavad-Gita_(Besant_4th)/Discourse_2
 * The Page revision pins for these transclusions are in sources.ts.
 *
 * DCS has 700 numbered verses. Besant has 701: his 13.1 is Arjuna's question,
 * "prakṛtiṃ puruṣaṃ caiva ...", absent from DCS. DCS 13.1 starts "idaṃ śarīraṃ
 * kaunteya ...", which Besant numbers 13.2. Thus DCS 13.N = Besant 13.(N+1).
 * Both numbered Sanskrit verses are on Besant Page 196, revision 9953933:
 * https://en.wikisource.org/w/index.php?oldid=9953933
 * english-alignment.ts owns that crosswalk and the English-only extra row.
 */

/** [resolved verse, resolved source-line ordinal, exact source #text]. */
type MissingCitation = readonly [number, number, string];

// These 22 revised blocks lack BOTH counters. Their texts, the remaining
// numbered neighbours, and Besant's numbered Sanskrit supply the citations.
// Revisions are not reconstructed into sandhied forms or forced into half-verses.
export const DCS_MISSING_CITATIONS: Readonly<Record<number, Readonly<Record<string, MissingCitation>>>> = {
  1: {
    // The opening speaker and full verse precede numbered 1.2 (230584-230586).
    "230581_1": [1, 1, "dhṛtarāṣṭraḥ uvāca"],
    "230583_1": [1, 2, "dharma kṣetre kurukṣetre samavetāḥ yuyutsavaḥ māmakāḥ pāṇḍavāḥ ca eva kim akurvata saṃjaya"],
  },
  2: {
    // Four opening verses precede numbered 2.5 (230688-230689).
    "230677_1": [1, 1, "saṃjayaḥ uvāca"],
    "230679_1": [1, 2, "tam tathā kṛpayā āviṣṭam aśru pūrṇa ākula īkṣaṇam viṣīdantam idam vākyam uvāca madhusūdanaḥ"],
    "230680_1": [2, 1, "śrī bhagavān uvāca"],
    "230681_1": [2, 2, "kutas tvā kaśmalam idam viṣame samupasthitam an ārya juṣṭam a svargyam a kīrti karam arjuna"],
    // The first half of 2.3 was split into two sentences; its second half is third.
    "230683_1": [3, 1, "klaibyam mā sma gamaḥ pārtha"],
    "230683_2": [3, 2, "na etat tvayi upapadyate"],
    "230684_1": [3, 3, "kṣudram hṛdaya daurbalyam tyaktvā uttiṣṭha paraṃtapa"],
    "230685_1": [4, 1, "arjunaḥ uvāca"],
    "230687_1": [4, 2, "katham bhīṣmam aham saṃkhye droṇam ca madhusūdana iṣubhiḥ pratiyotsyāmi pūjā arhau ari sūdana"],
    // 230696 remains the numbered 2.9 speaker; 230701 is the 2.11 speaker.
    "230698_1": [9, 2, "evam uktvā hṛṣīkeśam guḍākeśaḥ paraṃtapa na yotsye iti govindam uktvā tūṣṇīm babhūva ha"],
    "230699_1": [10, 1, "tam uvāca hṛṣīkeśaḥ prahasan iva bhārata senayoḥ ubhayoḥ madhye viṣīdantam idam vacaḥ"],
    // 230702 retains 2.11's first half, so this revised half is its third part.
    "230703_1": [11, 3, "gatāsūn a gatāsūn ca na anuśocanti paṇḍitāḥ"],
    // Between numbered 2.19 and 2.23: two halves of 20, second half of 21,
    // full verse 22, then two sentences replacing the first half of 23.
    // The missing first half of 21 is recovered separately below.
    "230720_1": [20, 1, "na jāyate mriyate vā kadācid na ayam bhūtvā bhavitā vā na bhūyas"],
    "230721_1": [20, 2, "ajaḥ nityaḥ śāśvataḥ ayam purāṇaḥ na hanyate hanyamāne śarīre"],
    "230723_1": [21, 2, "katham sa puruṣaḥ pārtha kam ghātayati hanti kam"],
    "230725_1": [22, 1, "vāsāṃsi jīrṇāni yathā vihāya navāni gṛhṇāti naraḥ aparāṇi tathā śarīrāṇi vihāya jīrṇāni anyāni saṃyāti navāni dehī"],
    "230726_1": [23, 1, "na enam chindanti śastrāṇi"],
    "230726_2": [23, 2, "na enam dahati pāvakaḥ"],
    // Between numbered 2.54 and 2.56: speaker and one full-verse sentence.
    "230791_1": [55, 1, "śrī bhagavān uvāca"],
    "230793_1": [55, 2, "prajahāti yadā kāmān sarvān pārtha manaḥ gatān ātmani eva ātmanā tuṣṭaḥ sthita prajñaḥ tadā ucyate"],
  },
};

// 230726's two revised sentences occupy ordinals 1 and 2. The unchanged second
// half 230727 still says sent_subcounter=2; retain it as the THIRD source line.
const RENUMBERED_PARTS: Readonly<Record<number, Readonly<Record<string, {
  verse: number; sourcePart: number; part: number; text: string;
}>>>> = {
  2: {
    "230727": {
      verse: 23, sourcePart: 2, part: 3,
      text: "na cainaṃ kledayantyāpo na śoṣayati mārutaḥ",
    },
  },
};

interface LineStructure {
  heads: readonly string[];
  lines: readonly string[];
}

// All other verses have two source sentences, plus an optional initial speaker.
// Whole-verse revised sentences remain one line. Split first halves remain two
// separate lines, followed by their second half. No metrical resegmentation.
export const DCS_LINE_STRUCTURES: Readonly<Record<number, Readonly<Record<number, LineStructure>>>> = {
  1: {
    1: { heads: ["230581_1"], lines: ["230583_1"] },
  },
  2: {
    1: { heads: ["230677_1"], lines: ["230679_1"] },
    2: { heads: ["230680_1"], lines: ["230681_1"] },
    3: { heads: [], lines: ["230683_1", "230683_2", "230684_1"] },
    4: { heads: ["230685_1"], lines: ["230687_1"] },
    9: { heads: ["230696"], lines: ["230698_1"] },
    10: { heads: [], lines: ["230699_1"] },
    22: { heads: [], lines: ["230725_1"] },
    23: { heads: [], lines: ["230726_1", "230726_2", "230727"] },
    55: { heads: ["230791_1"], lines: ["230793_1"] },
  },
};

interface Supplement {
  chapter: number;
  id: string;
  before: string;
  verse: number;
  part: number;
  text: string;
  surface: string;
  occurrenceIds: readonly string[];
}

// The base 2.20b ends at OccId 3608505, and 2.21b starts at 3608518.
// The missing 2.21a is present with seven genuine analyses in the SAME commit:
// https://github.com/OliverHellwig/sanskrit/blob/8aeed5a1343d0e48b64eb32af8c00e8c6eb29359/dcs/data/conllu/files/Mahābhārata/Mahābhārata-0884-MBh%2C%206%2C%20BhaGī%202-7243.conllu_parsed
// Keep its own sentence ID, FORM values, word IDs, and annotations. Only its
// absent citation is supplied. Its #text has one source trailing space.
const SUPPLEMENTS: readonly Supplement[] = [{
  chapter: 2, id: "229134_1_0", before: "230723_1", verse: 21, part: 1,
  text: "veda avināśinam nityam yaḥ enam ajam avyayam ",
  surface: "veda avināśinam nityam yaḥ enam ajam avyayam",
  occurrenceIds: ["3608511", "3608512", "3608513", "3608514", "3608515", "3608516", "3608517"],
}];

interface UnanalysedInsertion {
  chapter: number;
  verse: number;
  part: number;
  id: string;
  sourceSurface: string;
  text: string;
  afterTokens: number;
  forms: readonly string[];
}

// The base chapter 13 #text retains these four written forms, but its integer
// rows omit their analyses. Insert exactly those forms at their #text positions,
// explicitly unanalysed. Never fabricate lemmas or reuse an unrelated analysis.
// The same-commit chapter 13 .conllu_parsed is NOT a usable annotation witness:
// sentence 230035 puts FORM proktam over yat+atas and ajñānaṃ on anyathā;
// sentence 230046 puts FORM tajjyotis over param+ucyate. Those words instead
// survive with coherent FORM/ranges in the base .conllu, which we keep intact.
export const DCS_UNANALYSED_INSERTIONS: readonly UnanalysedInsertion[] = [
  {
    chapter: 13, verse: 11, part: 2, id: "231624",
    sourceSurface: "etajjñānamiti yadato 'nyathā",
    text: "etajjñānamiti proktam ajñānaṃ yadato 'nyathā",
    afterTokens: 1, forms: ["proktam", "ajñānaṃ"],
  },
  {
    chapter: 13, verse: 17, part: 1, id: "231635",
    sourceSurface: "jyotiṣāmapi paramucyate",
    text: "jyotiṣāmapi tajjyotis tamasaḥ paramucyate",
    afterTokens: 1, forms: ["tajjyotis", "tamasaḥ"],
  },
];

function assertChapter(chapter: number, source: string): void {
  const headers = [...source.matchAll(/^## chapter: MBh, 6, BhaGī (\d+)\r?$/gmu)];
  if (headers.length !== 1 || Number(headers[0]![1]) !== chapter) {
    throw new Error(`DCS source does not identify chapter ${chapter}`);
  }
}

function surface(sentence: DcsSourceSentence): string {
  return sentence.tokens.map((token) => token.form).join(" ");
}

function isSpeaker(sentence: DcsSentence): boolean {
  const last = sentence.tokens.at(-1)?.words.at(-1);
  return last?.lemma === "vac" && last.misc.Unsandhied === "uvāca"
    && sentence.tokens.reduce((count, token) => count + token.words.length, 0) <= 3;
}

/** Resolve only documented exceptions, then reject verse/part gaps and duplicates. */
export function readDcsChapter(
  chapter: number,
  source: string,
  supplement?: string,
): Map<number, { heads: DcsSentence[]; lines: DcsSentence[] }> {
  const count = DCS_VERSE_COUNTS[chapter - 1];
  if (!Number.isInteger(chapter) || count === undefined) throw new Error(`Unknown DCS chapter ${chapter}`);
  assertChapter(chapter, source);
  const missingCitations = DCS_MISSING_CITATIONS[chapter] ?? {};
  const renumbered = RENUMBERED_PARTS[chapter] ?? {};
  const sourceIds = new Set<string>();
  const sentences: DcsSentence[] = [];
  for (const raw of parseConllu(source)) {
    sourceIds.add(raw.id);
    let { verse, part } = raw;
    const missing = missingCitations[raw.id];
    const renumber = renumbered[raw.id];
    if (missing) {
      if (verse !== null || part !== null || raw.text !== missing[2]) {
        throw new Error(`Changed DCS missing-citation exception ${chapter}:${raw.id}`);
      }
      [verse, part] = missing;
    } else if (renumber) {
      if (verse !== renumber.verse || part !== renumber.sourcePart || raw.text !== renumber.text) {
        throw new Error(`Changed DCS part-number exception ${chapter}:${raw.id}`);
      }
      part = renumber.part;
    }
    if (verse === null || part === null) throw new Error(`Unlisted DCS citation gap ${chapter}:${raw.id}`);
    const sentence: DcsSentence = { ...raw, verse, part };
    const insertion = DCS_UNANALYSED_INSERTIONS.find((entry) => entry.chapter === chapter && entry.id === raw.id);
    if (insertion) {
      if (verse !== insertion.verse || part !== insertion.part || raw.text !== insertion.text
        || surface(raw) !== insertion.sourceSurface) {
        throw new Error(`Changed DCS unanalysed-form exception ${chapter}:${raw.id}`);
      }
      const tokens: DcsToken[] = insertion.forms.map((form) => ({ form, words: [], unanalysed: true }));
      sentence.tokens.splice(insertion.afterTokens, 0, ...tokens);
    }
    if (surface(sentence) !== sentence.text) throw new Error(`DCS FORM/#text mismatch ${chapter}:${raw.id}`);
    sentences.push(sentence);
  }
  for (const id of [...Object.keys(missingCitations), ...Object.keys(renumbered)]) {
    if (!sourceIds.has(id)) throw new Error(`Missing expected DCS exception ${chapter}:${id}`);
  }
  for (const insertion of DCS_UNANALYSED_INSERTIONS) {
    if (insertion.chapter === chapter && !sourceIds.has(insertion.id)) {
      throw new Error(`Missing expected DCS unanalysed-form exception ${chapter}:${insertion.id}`);
    }
  }

  const recoveries = SUPPLEMENTS.filter((entry) => entry.chapter === chapter);
  if (recoveries.length) {
    if (!supplement) throw new Error(`DCS chapter ${chapter} requires chapter-${chapter}-parsed.conllu`);
    assertChapter(chapter, supplement);
    // Other parsed-witness blocks use different segmentation and sometimes
    // corrupt FORM assignments. Read ONLY the explicitly selected recovery.
    const blocks = supplement.trim().split(/\r?\n\s*\r?\n/u);
    for (const recovery of recoveries) {
      const selected = blocks.filter((block) => /^# sent_id\s*=\s*(.+)$/mu.exec(block)?.[1] === recovery.id);
      if (selected.length !== 1) throw new Error(`Missing or duplicate DCS supplement ${recovery.id}`);
      const parsed = parseConllu(selected[0]!);
      const recovered = parsed[0];
      if (parsed.length !== 1 || !recovered || recovered.verse !== null || recovered.part !== null
        || recovered.text !== recovery.text || surface(recovered) !== recovery.surface) {
        throw new Error(`Changed DCS supplement ${recovery.id}`);
      }
      const words = recovered.tokens.flatMap((token) => token.words);
      if (words.length !== recovery.occurrenceIds.length
        || words.some((word, index) => word.misc.OccId !== recovery.occurrenceIds[index])
        || sourceIds.has(recovery.id)) {
        throw new Error(`Changed or duplicate DCS supplement words ${recovery.id}`);
      }
      const before = sentences.findIndex((sentence) => sentence.id === recovery.before);
      if (before < 0) throw new Error(`Missing DCS supplement anchor ${recovery.before}`);
      sentences.splice(before, 0, { ...recovered, verse: recovery.verse, part: recovery.part });
      sourceIds.add(recovery.id);
    }
  } else if (supplement !== undefined) {
    throw new Error(`Unlisted DCS supplement for chapter ${chapter}`);
  }

  const verses = new Map<number, { heads: DcsSentence[]; lines: DcsSentence[] }>();
  let currentVerse = 0;
  for (const sentence of sentences) {
    if (sentence.verse < 1 || sentence.verse > count) throw new Error(`Out-of-range DCS verse ${chapter}.${sentence.verse}`);
    let group = verses.get(sentence.verse);
    if (!group) {
      if (sentence.verse !== currentVerse + 1) throw new Error(`Missing or out-of-order DCS verse after ${chapter}.${currentVerse}`);
      currentVerse = sentence.verse;
      group = { heads: [], lines: [] };
      verses.set(sentence.verse, group);
    } else if (sentence.verse !== currentVerse) {
      throw new Error(`Repeated DCS verse ${chapter}.${sentence.verse}`);
    }
    const expectedPart = group.heads.length + group.lines.length + 1;
    if (sentence.part !== expectedPart) {
      throw new Error(`Missing or duplicate DCS part ${chapter}.${sentence.verse}.${expectedPart}: got ${sentence.part}`);
    }
    if (isSpeaker(sentence)) {
      if (expectedPart !== 1) throw new Error(`Unexpected DCS speaker position ${chapter}:${sentence.id}`);
      group.heads.push(sentence);
    } else {
      group.lines.push(sentence);
    }
  }
  if (verses.size !== count) throw new Error(`Expected ${count} DCS verses in chapter ${chapter}, got ${verses.size}`);
  for (const [verse, group] of verses) {
    const structure = DCS_LINE_STRUCTURES[chapter]?.[verse];
    if (structure) {
      if (group.heads.length !== structure.heads.length || group.lines.length !== structure.lines.length
        || group.heads.some((sentence, index) => sentence.id !== structure.heads[index])
        || group.lines.some((sentence, index) => sentence.id !== structure.lines[index])) {
        throw new Error(`Changed DCS line-structure exception ${chapter}.${verse}`);
      }
    } else if (group.lines.length !== 2) {
      throw new Error(`Unlisted DCS line structure ${chapter}.${verse}: ${group.lines.length} lines`);
    }
  }
  return verses;
}
