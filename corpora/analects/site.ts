// The Analects Reader: the twenty books of the Analects in Classical Chinese (the Kyoto University Treebank's text, with
// its lemmas, parts of speech and glosses) beside James Legge's English, one chapter of Legge's per row.
import type { ReaderSite } from "../../src/sites/types";

/**
 * The books in order. `zh` is the book's first words, which name it; `legge` is the heading Legge prints, as
 * build.ts reads it from his text.
 */
export const BOOKS: readonly { zh: string; pinyin: string; legge: string; summary: string }[] = [
  { zh: "學而", pinyin: "Xué ér", legge: "Hsio R.",
    summary: "Learning, filial conduct, good faith and the making of the gentleman, in sayings of Confucius and of his disciples Youzi, Zengzi and Zixia." },
  { zh: "為政", pinyin: "Wéi zhèng", legge: "Wei Chang.",
    summary: "Government by virtue, filial piety, learning and reflection, and Confucius’s account of his own progress from fifteen to seventy." },
  { zh: "八佾", pinyin: "Bā yì", legge: "Pa Yih.",
    summary: "Ritual and music: the Ji family’s use of royal ceremonies, the meaning of sacrifice, and Confucius on the Odes and on benevolence." },
  { zh: "里仁", pinyin: "Lǐ rén", legge: "Le Jin.",
    summary: "Benevolence as the place to dwell, the gentleman and the petty man, serving one’s parents, and the single thread that runs through the Way." },
  { zh: "公冶長", pinyin: "Gōngyě Cháng", legge: "Kung-Ye Ch'ang.",
    summary: "Confucius’s judgements of his disciples and of statesmen of his day, among them Gongye Chang, Zigong, Zilu and Yan Hui." },
  { zh: "雍也", pinyin: "Yōng yě", legge: "Yung Yey.",
    summary: "More judgements of disciples, Yan Hui’s love of learning, and sayings on the Mean and on the wise and the benevolent." },
  { zh: "述而", pinyin: "Shù ér", legge: "Shu R.",
    summary: "Confucius on himself: transmitting rather than creating, his way of teaching, his tastes and his conduct." },
  { zh: "泰伯", pinyin: "Tàibó", legge: "T'ai-Po.",
    summary: "Virtue and rule in the ancient sages Taibo, Yao, Shun and Yu, and the last words of Zengzi." },
  { zh: "子罕", pinyin: "Zǐ hǎn", legge: "Tsze Han.",
    summary: "What Confucius seldom spoke of, praise and grief for Yan Hui, and the sayings at the river and on the pine in winter." },
  { zh: "鄉黨", pinyin: "Xiāng dǎng", legge: "Heang Tang.",
    summary: "Confucius’s bearing at home, at court and at ritual, his dress, food and manners: a description more than a book of sayings." },
  { zh: "先進", pinyin: "Xiān jìn", legge: "Hsien Tsin.",
    summary: "Disciples early and late, the death of Yan Hui, questions on serving the spirits and on death, and four disciples’ wishes." },
  { zh: "顏淵", pinyin: "Yán Yuān", legge: "Yen Yuan.",
    summary: "Benevolence, self-mastery and ritual, government and friendship, in answers to Yan Yuan, Zhonggong, Zigong and rulers." },
  { zh: "子路", pinyin: "Zǐlù", legge: "Tsze-Lu.",
    summary: "Government and the rectification of names, the example of the ruler, and the qualities of the true scholar-official." },
  { zh: "憲問", pinyin: "Xiàn wèn", legge: "Hsien Wan.",
    summary: "Shame, benevolence and conduct in office, judgements on statesmen such as Guan Zhong, and sayings on learning for oneself." },
  { zh: "衛靈公", pinyin: "Wèi Líng Gōng", legge: "Wei Ling Kung.",
    summary: "The gentleman in adversity, reciprocity, and sayings on learning, speech and friendship, beginning with the Duke of Wei’s question on warfare." },
  { zh: "季氏", pinyin: "Jì shì", legge: "Ke She.",
    summary: "The Ji family’s planned attack on Zhuanyu, three kinds of friends and of pleasures that help or harm, and the three things the gentleman fears." },
  { zh: "陽貨", pinyin: "Yáng Huò", legge: "Yang Ho.",
    summary: "Offers of office from Yang Huo and others, the nature of men, and sayings on the Odes and on Confucius’s wish to be silent." },
  { zh: "微子", pinyin: "Wēi zǐ", legge: "Wei Tsze.",
    summary: "Worthies and recluses: Weizi, Jizi and Bigan, the Madman of Chu, Changju and Jieni, and Confucius’s departures from Qi and Lu." },
  { zh: "子張", pinyin: "Zǐzhāng", legge: "Tsze-Chang.",
    summary: "Sayings of Confucius’s disciples after his death, Zizhang, Zixia, Ziyou, Zengzi and Zigong, ending with Zigong’s defence of the Master." },
  { zh: "堯曰", pinyin: "Yáo yuē", legge: "Yao Yueh.",
    summary: "Yao’s charge to Shun and the founders of the Shang and Zhou, and Confucius on the qualities of government and on knowing destiny, ritual and words." },
];

const GROUPS = ["Books 1–10", "Books 11–20"] as const;

export const site: ReaderSite = {
  id: "analects",
  name: "The Analects Reader",
  shortName: "Analects Reader",
  homeTitle: "The Analects Reader: Confucius’s Analects in Classical Chinese and English",
  description: "Read all twenty books of the Analects (論語) in Classical Chinese with James Legge’s English, " +
    "word-by-word parts of speech and glosses from the Kyoto University Treebank, Wiktionary and Unihan, and full-text search.",
  eyebrow: "論語 · Lúnyǔ · Twenty books",
  lede: "The Analects in Classical Chinese with James Legge’s English, chapter by chapter, across all twenty books. " +
    "Click any word for its lemma, part of speech, pinyin and dictionary entries.",
  credits: "Chinese text, lemmas, parts of speech and glosses: the Kyoto University Treebank for Classical Chinese " +
    "(Institute for Research in Humanities, Kyoto University; Koichi Yasuoka, Christian Wittern and others), as released in " +
    'Universal Dependencies 2.18, <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>: this ' +
    "reader’s Chinese data may be reused only under the same licence. Punctuation and chapter divisions: James Legge’s " +
    "Chinese text. English: James Legge, <i>The Chinese Classics</i>, vol. 1 (1861; 2nd ed. 1893), public domain, via " +
    "Project Gutenberg. Dictionaries: Wiktionary (via kaikki.org), " +
    '<a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>, and the Unicode Unihan database ' +
    '(<a href="https://www.unicode.org/copyright.html">Unicode Terms of Use</a>).',
  corpus: "the Analects",
  searchHint: "Variant forms are interchangeable (<span lang=\"lzh-Hant\">為</span> finds <span lang=\"lzh-Hant\">為</span> and " +
    "<span lang=\"lzh-Hant\">爲</span>) and punctuation is ignored, so <span lang=\"lzh-Hant\">學而時習之</span> finds the first chapter of book 1.",
  searchPlaceholder: "e.g. 君子, 學而時習之, filial",
  countNote: "Counts use the Kyoto treebank’s lemmas, one entry for each lemma and part of speech. Glosses are the " +
    "treebank’s own (CC BY-SA 4.0), with the pinyin of the lemma from Wiktionary and Unihan.",
  sides: [{ id: "lzh", role: "source", label: "Chinese" }, { id: "en", role: "translation", label: "English", lang: "en" }],
  collections: [{ id: "analects", title: "Confucius, Analects", subtitle: "論語" }],
  groups: GROUPS,
  works: BOOKS.map(({ zh, pinyin, legge, summary }, index) => ({
    slug: `analects-${index + 1}`,
    abbr: `An. ${index + 1}`,
    title: `${zh} ${pinyin}`,
    summary,
    english: `Book ${index + 1} · Legge: ${legge.replace("'", "’")}`,
    collection: "analects",
    group: GROUPS[index < 10 ? 0 : 1]!,
    levels: [{ name: "Chapter", list: true, opening: true }],
    sources: {
      lzh: "Kyoto University Treebank (CC BY-SA 4.0); punctuation after Legge",
      en: "James Legge (1861, 2nd ed. 1893)",
    },
  })),
  sourceNotes: {},
};
