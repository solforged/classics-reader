// English labels for Classical Chinese morphology as packs/lzh/build/morph.ts writes it: the Kyoto treebank's UPOS and
// UD features, plus two pack features: `Gloss` (the English gloss the treebank gives this token) and `Xpos` (the
// treebank's own tag below its top level, "動詞-行為-動作" for v,動詞,行為,動作). Chinese has no inflection, so the word
// panel's "form" line carries the contextual gloss and the grammatical function, and "props" the semantic class.
import { parseMorph } from "../../src/lib/morph";
import type { MorphLabel } from "../../src/lang/types";

const VALUE: Record<string, Record<string, string>> = {
  Degree: { Pos: "adjectival (stative)", Equ: "similative (‘like’)" },
  PronType: { Prs: "personal", Dem: "demonstrative", Int: "interrogative" },
  Polarity: { Neg: "negative" },
  Person: { "1": "1st person", "2": "2nd person", "3": "3rd person" },
  Reflex: { Yes: "reflexive" },
  NameType: { Giv: "given name", Sur: "surname", Prs: "personal name", Nat: "state name", Geo: "place name" },
  Case: { Loc: "noun of place or direction", Tem: "noun of time" },
  VerbForm: { Conv: "used adverbially", Part: "used as a modifier" },
  VerbType: { Cop: "copula" },
  Mood: { Pot: "potential (‘can’)", Des: "desiderative (‘want to’)", Nec: "necessitative (‘must’)" },
  Voice: { Pass: "passive" },
  AdvType: { Cau: "interrogative of reason or manner", Tim: "temporal" },
  Aspect: { Perf: "perfective" },
  Tense: { Fut: "future", Past: "past", Pres: "present" },
  NounType: { Clf: "classifier or unit of measure" },
};

/** What the treebank's bracketed glosses stand for: words with no English equivalent. */
export const GLOSS_CODES: Readonly<Record<string, string>> = {
  "[1PRON]": "I, me, we (1st-person pronoun)",
  "[2PRON]": "you (2nd-person pronoun)",
  "[3PRON]": "he, she, it, they (3rd-person pronoun)",
  "[Q]": "question particle",
  "[PFV]": "perfective particle (‘now’, change of state)",
  "[PASS]": "passive marker",
  "[final-particle]": "sentence-final particle",
  "[exclamatory-particle]": "exclamatory particle",
  "[modal-particle]": "modal particle",
  "[filler-character]": "filler particle (rhythm, in verse)",
  "[suffix]": "suffix of descriptive words",
  "[make-to-do]": "causative (make, cause to)",
  "[negator-of-nouns]": "negator of nouns (‘is not’)",
  "[expect-negative-answer]": "rhetorical question expecting the answer no",
  "[plural]": "plural marker (‘the various’)",
  "[given-name]": "given name",
  "[surname]": "surname",
  "[country-name]": "name of a state",
  "[place-name]": "place name",
  "[book-name]": "title of a book",
  "[poetry-name]": "title of a poem",
  "[ancient-music]": "name of ancient music",
  "[northern-people]": "northern peoples",
  "[kind-of-bell]": "a kind of bell",
  "[capacity-unit]": "unit of capacity",
  "[foot-measure]": "foot (unit of length)",
  "[distance-unit]": "unit of distance",
  "[length-unit]": "unit of length",
};

/** The treebank's top-level categories (second field of the tag) that a token may be filed under. */
const CATEGORY: Record<string, string> = {
  名詞: "noun", 動詞: "verb", 副詞: "adverb", 前置詞: "preposition", 助動詞: "auxiliary", 助詞: "particle",
  接尾辞: "suffix", 感嘆詞: "interjection", 代名詞: "pronoun", 数詞: "numeral",
};

/** Semantic classes (third and fourth fields of the tag, joined by "-"; the fourth may be absent). */
const CLASS: Record<string, string> = {
  // nouns
  "不可譲-属性": "inalienable: attribute", "不可譲-疾病": "inalienable: illness", "不可譲-身体": "inalienable: body part",
  "主体-動物": "entity: animal", "主体-書物": "entity: book", "主体-機関": "entity: institution", "主体-集団": "entity: group",
  "主体-国名": "entity: state", "人-人": "person", "人-役割": "person: role or title", "人-関係": "person: relation",
  "人-名": "person: given name", "人-姓氏": "person: surname", "人-その他の人名": "person: other name",
  "人-複合的人名": "person: compound name", "制度-儀礼": "institution: rite", "制度-場": "institution: setting",
  "可搬-乗り物": "movable: vehicle", "可搬-伝達": "movable: message or record", "可搬-成果物": "movable: product",
  "可搬-糧食": "movable: food", "可搬-道具": "movable: tool", "固定物-地形": "fixed: terrain",
  "固定物-建造物": "fixed: building", "固定物-樹木": "fixed: tree", "固定物-関係": "fixed: relational position",
  "固定物-地名": "fixed: place name", "天象-天文": "celestial: heavenly body", "天象-怪異": "celestial: portent",
  "天象-気象": "celestial: weather", "度量衡": "measure", "思考-思考": "thought", "描写-形質": "description: quality",
  "描写-態度": "description: manner", "描写-境遇": "description: circumstance", "描写-量": "description: quantity",
  "数量": "quantity", "時": "time", "行為": "action",
  // verbs
  "変化-制度": "change: institutional", "変化-性質": "change: of quality", "変化-生物": "change: of living things",
  "存在-存在": "existence", "行為-交流": "action: social exchange", "行為-伝達": "action: communication",
  "行為-使役": "action: causative", "行為-儀礼": "action: ritual", "行為-分類": "action: classification",
  "行為-動作": "action: physical", "行為-姿勢": "action: posture", "行為-役割": "action: role",
  "行為-得失": "action: gain and loss", "行為-態度": "action: attitude", "行為-生産": "action: production",
  "行為-移動": "action: movement", "行為-設置": "action: placing", "行為-飲食": "action: eating and drinking",
  // adverbs
  "判断-推定": "judgement: presumption", "判断-確定": "judgement: certainty", "判断-逆接": "judgement: contrast",
  "否定-体言否定": "negation: of nouns", "否定-有界": "negation: of an event (‘did not’)",
  "否定-無界": "negation: general", "否定-禁止": "negation: prohibition", "時相-変化": "time: change",
  "時相-完了": "time: completion", "時相-将来": "time: future", "時相-現在": "time: present", "時相-終局": "time: finality",
  "時相-緊接": "time: immediate succession", "時相-過去": "time: past", "疑問-原因": "question: reason",
  "疑問-反語": "question: rhetorical", "疑問-所在": "question: place", "範囲-共同": "scope: together",
  "範囲-総括": "scope: all", "範囲-限定": "scope: only", "頻度-重複": "frequency: again", "頻度-頻繁": "frequency: often",
  // prepositions
  "基盤": "with, by (basis)", "源泉": "from (source)", "経由": "through, by way of", "関係": "to, for (relation)",
  // auxiliaries
  "受動": "passive", "可能": "potential", "必要": "necessity", "願望": "desire",
  // particles, pronouns, numerals
  "句末": "sentence-final", "句頭": "sentence-initial", "接続-並列": "coordinating", "接続-体言化": "nominalizing",
  "接続-属格": "genitive", "提示": "marking",
  "人称-起格": "subject or possessive form", "人称-止格": "object form", "人称-他": "other form",
  "指示": "demonstrative", "疑問": "interrogative", "数": "number", "数字": "digit",
};

const POS: Record<string, string> = {
  NOUN: "noun", PROPN: "proper noun", VERB: "verb", AUX: "auxiliary verb", ADV: "adverb", ADP: "preposition",
  PRON: "pronoun", PART: "particle", CCONJ: "coordinating conjunction", SCONJ: "subordinating particle", NUM: "numeral",
  INTJ: "interjection",
};

/** A particle's kind from its Xpos class. */
const PARTICLE: Record<string, string> = {
  句末: "sentence-final particle", 句頭: "sentence-initial particle", 提示: "marking particle",
  "接続-体言化": "nominalizing particle",
};

/** A gloss as the reader shows it: plain glosses in quotes (the treebank hyphenates phrases), codes spelled out. */
export function glossText(gloss: string): { text: string; code: boolean } {
  if (!gloss.startsWith("[")) return { text: gloss.replaceAll("-", " "), code: false };
  const text = GLOSS_CODES[gloss];
  if (!text) throw new Error(`Unlabelled Kyoto gloss code: ${gloss}`);
  return { text, code: true };
}

export function describeMorph(morph: string): MorphLabel {
  const { upos, feats } = parseMorph(morph);
  if (!(upos in POS)) throw new Error(`Unlabelled Classical Chinese word class: ${upos}`);
  for (const [name, values] of Object.entries(feats)) {
    if (name === "Gloss" || name === "Xpos") continue;
    const labels = VALUE[name];
    if (!labels) throw new Error(`Unlabelled Classical Chinese feature: ${name}`);
    for (const value of values) if (!(value in labels)) throw new Error(`Unlabelled Classical Chinese feature value: ${name}=${value}`);
  }
  const v = (name: string) => (feats[name] ?? []).map((value) => VALUE[name]![value]!).join(" or ");

  // The treebank's tag below its top level: category, then class.
  const [category = "", ...rest] = (feats.Xpos?.[0] ?? "").split("-");
  if (feats.Xpos && !(category in CATEGORY)) throw new Error(`Unlabelled Kyoto category: ${category}`);
  const sub = rest.join("-");
  const klass = sub ? CLASS[sub] : undefined;
  if (sub && !klass) throw new Error(`Unlabelled Kyoto class: ${feats.Xpos![0]}`);

  let pos = POS[upos]!;
  if (upos === "PRON") pos = `${feats.Reflex ? "reflexive" : v("PronType")} pronoun`.replace(/^\s+/u, "");
  if (upos === "PART") pos = PARTICLE[sub] ?? (category === "接尾辞" ? "suffix" : pos);
  if (upos === "SCONJ" && sub === "接続-属格") pos = "genitive particle";

  const gloss = feats.Gloss?.[0] ? glossText(feats.Gloss[0]) : undefined;
  const form = [
    gloss ? (gloss.code ? gloss.text : `‘${gloss.text}’`) : "",
    upos === "PRON" ? v("Person") : "",
    v("Polarity"),
    v("Degree"), v("Mood"), v("Aspect") || v("Tense"), v("Voice"), v("VerbType"), v("VerbForm"),
    v("Case"), v("NounType"),
    upos === "PROPN" ? v("NameType") : "",
  ];
  // Only a verb that works as an adverb, preposition or auxiliary needs saying: its category is 動詞.
  const origin = category === "動詞" && upos !== "VERB" ? `a verb used as ${/^[aeiou]/u.test(POS[upos]!) ? "an" : "a"} ${POS[upos]}` : "";
  const props = [klass ?? "", upos === "PRON" || upos === "PROPN" ? "" : v("PronType"), upos === "ADV" ? v("AdvType") : "", origin];
  return { pos, form: [...new Set(form.filter(Boolean))].join(" · "), props: props.filter(Boolean) };
}
