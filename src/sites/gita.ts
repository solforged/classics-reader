// The Gītā Reader: all eighteen Bhagavadgītā chapters in Sanskrit (DCS) with Annie Besant's English.
import type { ReaderSite } from "./types";

const GROUPS = ["Chapters 1–6", "Chapters 7–12", "Chapters 13–18"] as const;
const DISCOURSES: readonly (readonly [string, string])[] = [
  ["The despondency of Arjuna",
    "Arjuna surveys the opposing armies and loses heart at the prospect of fighting his relatives, teachers and friends."],
  ["Yoga by the Sankhya",
    "Krishna distinguishes the enduring self from the mortal body and teaches disciplined action without attachment to its fruits."],
  ["The yoga of action",
    "Krishna explains action, sacrifice and duty. He describes desire as an obstacle to knowledge."],
  ["The yoga of wisdom",
    "Krishna describes the transmission of his teaching and his appearances in the world. He relates knowledge, action and sacrifice."],
  ["The yoga of the renunciation of action",
    "Krishna compares renunciation with disciplined action and describes freedom from attachment."],
  ["The yoga of self-subdual",
    "Krishna teaches meditation, restraint and balanced living. Arjuna asks how the restless mind can be disciplined."],
  ["The yoga of discriminative knowledge",
    "Krishna explains his relation to nature and living beings, and describes different kinds of devotion."],
  // Wikisource's transcription of Besant's colophon reads "indesctructible".
  ["The yoga of the indestructible supreme eternal",
    "Krishna answers questions about the imperishable, action and the divine. He describes remembrance at death and the paths beyond it."],
  ["The yoga of the kingly science and the kingly secret",
    "Krishna describes his sustaining presence in the universe and the devotion through which he is approached."],
  ["The yoga of sovereignty",
    "Krishna names manifestations of his power throughout the world, in response to Arjuna's request."],
  ["The yoga of the vision of the universal form",
    "Arjuna receives divine sight and sees Krishna's universal form. Overwhelmed by its splendour and destruction, he asks to see Krishna's familiar form again."],
  ["The yoga of devotion",
    "Arjuna asks about devotion to the personal and the unmanifested. Krishna describes the path of devotion and the devotee dear to him."],
  ["The yoga of the distinction between the field and the knower of the field",
    "Krishna distinguishes the body as the field from the knower of the field, and explains nature, spirit and knowledge."],
  ["The yoga of separation from the three qualities",
    "Krishna describes the three qualities of nature, how they bind embodied beings, and how they may be transcended."],
  ["The yoga of attaining the supreme spirit",
    "Krishna compares worldly existence to an inverted tree and distinguishes the perishable, the imperishable and the supreme spirit."],
  ["The yoga of division between the divine and the demoniacal",
    "Krishna contrasts divine and demoniacal dispositions. He identifies desire, anger and greed as destructive paths."],
  ["The yoga of the division of threefold faith",
    "Krishna relates faith, food, sacrifice, austerity and gifts to the three qualities of nature."],
  ["The yoga of liberation by renunciation",
    "Krishna brings together teachings on action, renunciation, duty and devotion. Arjuna resolves to act, and Sanjaya concludes the dialogue."],
];

export const gita: ReaderSite = {
  id: "gita",
  name: "The Gītā Reader",
  shortName: "Gītā Reader",
  homeTitle: "The Gītā Reader: the Bhagavadgītā in Sanskrit and English",
  description: "Read all eighteen chapters of the Bhagavadgītā in Sanskrit with Annie Besant’s English translation, " +
    "word-by-word grammar, a DCS dictionary and full-text search.",
  eyebrow: "Bhagavadgītā · Eighteen chapters",
  lede: "The Bhagavadgītā in Sanskrit with a facing English translation, across all eighteen chapters. " +
    "Click any Sanskrit word for its lemma, grammar and dictionary entry, including the words joined by sandhi or in compounds.",
  credits: "Sanskrit annotation, chapters 3–18 text and dictionary: Oliver Hellwig, Digital Corpus of Sanskrit (2010–2024), " +
    '<a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. ' +
    "DCS morphology has been adapted for this reader, and three lemmas with damaged encoding are repaired. " +
    "English and chapters 1–2 Sanskrit: Annie Besant, The Bhagavad-Gita, fourth edition (1922), public domain, via Wikisource. " +
    "The English wording is retained; translator’s footnotes are omitted.",
  corpus: "the Gītā",
  searchHint: "IAST diacritics are optional: <i>sraddha</i> finds <i>śraddhā</i>, <i>samnyasya</i> finds " +
    "<i>saṃnyasya</i>. Devanagari works too: <i lang=\"sa-Deva\">श्रद्धा</i> finds <i>śraddhā</i>. Anusvāra and " +
    "class nasals match each other: <i>saṃjaya</i> finds <i>sañjaya</i>.",
  searchPlaceholder: "e.g. arjuna, धर्म, devotion",
  countNote: "Counts use DCS annotation. Each written token counts once for each lemma it contains, including " +
    "words joined by sandhi or in compounds. Forms DCS leaves unannotated count as probable when all their candidate " +
    "analyses agree on one lemma. Glosses come from the DCS dictionary (Oliver Hellwig, CC BY 4.0).",
  translation: "English",
  groups: GROUPS,
  works: DISCOURSES.map(([english, summary], index) => ({
    slug: `bhagavad-gita-${index + 1}`,
    abbr: `BhG ${index + 1}`,
    title: `Bhagavadgītā, chapter ${index + 1}`,
    english,
    summary,
    collection: "Mahābhārata, Bhīṣmaparvan",
    group: GROUPS[Math.floor(index / 6)]!,
    prose: false,
    unit: "Verse",
    sources: {
      on: "Digital Corpus of Sanskrit (Hellwig), CC BY 4.0",
      en: "Annie Besant (4th ed., 1922)",
    },
  })),
  sourceNotes: {
    a: `<span class="badge" title="Not annotated here; DCS annotates this written form this way elsewhere in the Gītā">candidate</span>`,
  },
};
