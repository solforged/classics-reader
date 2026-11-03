// Keys for deciding that a dictionary headword is the corpus's lemma. The corpus lemmas are CAMeL Tools' vocalized
// forms; Lane's headwords are Perseus-Buckwalter transliterations with their own habits (tanwin on nouns, a pronoun
// suffix on verbs, the definite article on a few nouns, hamza written on an alef where CAMeL writes a bare alef) and
// Wiktionary's are vocalized by hand. Two keys compare them: the consonantal skeleton, which ignores all vowel signs,
// and the vocal key, which keeps the short vowels and the shadda but not the ending that case or state adds. CAMeL
// leaves the short vowel before a long vowel unmarked (سُلْطان, قَيْرَوان, مَعادِن, إِلّا, حَتّى) where Lane and Wiktionary
// write it (سُلْطَان, إِلَّا, حَتَّى), whether or not a shadda stands between; the vocal key drops it from both. Marks are
// compared in Unicode's canonical order (NFC puts a short vowel before the shadda), so the order a source types them in does not matter.
//
// A word can also be known by other spellings than the one it is written in; `spellings` and the functions below
// list them, and the dictionaries index a headword under each (build/lane.ts, build/wiktionary.ts).

/**
 * Hamza seats and alef forms made alike. A hamza at the start of a word is an alef: Lane's إِنْفَعَلَ is CAMeL's اِنْفَعَلَ.
 * Lane writes a long alef before a hamza with a madda (جَآءَ, مَآءٌ, CAMeL's جاء, ماء), which is not the آ that stands for
 * hamza and alef (قُرْآن). `taMarbuta` also makes ة and ه alike (the source writes ه for ة, a Maghrebi habit): the
 * skeleton does, the vocal key does not, so that a verb نَبَّه is not the noun نَبَّةٌ.
 */
function unify(word: string, taMarbuta: boolean): string {
  const unified = word.normalize("NFC").replace(/\u0640/gu, "")
    .replace(/آ(?=[\u064B-\u065F]*[ءأئؤ])/gu, "ا")
    .replace(/^([\u064B-\u065F\u0670]*)[أإٱ]/u, "$1ا")
    .replace(/[أإؤئ]/gu, "ء").replace(/آ/gu, "ءا").replace(/ٱ/gu, "ا")
    .replace(/[ىیې]/gu, "ي").replace(/[ھہە]/gu, "ه").replace(/ۃ/gu, "ة").replace(/ک/gu, "ك");
  return taMarbuta ? unified.replace(/ة/gu, "ه") : unified;
}

/** The first word of a headword; a phrase has several. */
export const firstWord = (text: string): string => text.trim().split(/\s+/u)[0] ?? "";

/** The letters of a word, without vowel signs: كِتَابٌ → كتاب. */
export const skeleton = (word: string): string => unify(word, true).replace(/\p{M}/gu, "");

/**
 * The word without the short vowel that stands before the letter of a long vowel: a fatha before an alef or a final
 * alef maqsura, a kasra before a yāʼ and a damma before a wāw that carry no vowel of their own. (A yāʼ or wāw with a
 * sukun is a consonant: بَيْت, يَوْم, شَىْء keep their fatha, which the sukun test leaves alone.) A shadda between the
 * vowel and the long vowel's letter does not change that: Lane's إِلَّا and حَتَّى are CAMeL's إِلّا and حَتّى. A dagger alef
 * on a doubled letter is the long vowel of the fatha CAMeL writes there (Lane's اللّٰه is CAMeL's اللَّه): the letter gets that fatha
 * if it has no vowel. (The dagger alef elsewhere is a spelling, see `spellings`.)
 */
const longVowels = (word: string): string =>
  word.normalize("NFC")
    .replace(/(?<![\u064B-\u0650])\u0651\u0670/gu, "\u064E\u0651")
    .replace(/\u0670/gu, "")
    .replace(/\u064E(?=\u0651?(?:ا|آ(?=[\u064B-\u065F]*[ءأئؤ])|ى(?![\u064B-\u0652])))/gu, "")
    .replace(/\u0650(?=\u0651?[يى](?![\u064B-\u0652]))/gu, "")
    .replace(/\u064F(?=\u0651?و(?![\u064B-\u0652]))/gu, "");

/**
 * The letters with the short vowels and the shadda, without the sukun (writers differ in marking it) and without the
 * vowel or tanwin of the last letter, which depends on case and state: كِتَابٌ and كِتَاب agree. A defective noun's last
 * yāʼ goes too, since CAMeL writes it (قاضِي, مَعْنَى) where Lane writes the tanwin on the letter before (قَاضٍ, مَعْنًى); a word
 * of three letters keeps it (فِي, بَنَى). The ending of the defective nouns in -ī, the kasra and yāʼ of قاضِي and the tanwin-kasra of قَاضٍ,
 * is kept as a kasra at the end of the key, so that they agree with each other and not with the verb قَاضَى or a word that ends in قاض.
 */
export const vocalKey = (word: string): string => {
  const nfc = word.normalize("NFC");
  const key = unify(longVowels(nfc), false)
    .replace(/[\u0652\u0653-\u065F]/gu, "")
    .replace(/[\u064B-\u0650]+(?=\u0651?$)/u, "")
    .replace(/\u064B(?=\u0651?[اي]$)/u, "");
  const long = key.replace(/\p{M}/gu, "").length >= 4;
  const defective = /\u064D$/u.test(nfc) || (long && /\u0650ي$/u.test(nfc));
  return (long ? key.replace(/ي$/u, "") : key) + (defective ? "\u0650" : "");
};

/** The letters a word doubles: its letters with the shadda and no vowel (فَضَّلَ → فضّل), which tells a verb's form II from its form I. */
const gemination = (word: string): string => unify(word, true).replace(/[\u064B-\u0650\u0652-\u065F\u0670]/gu, "");

/**
 * The long vowel a word ends in, when it writes it plainly: "I" for a kasra and a yāʼ or a tanwin-kasra (قاضِي, Lane's قَاضٍ), "A" for
 * an alef maqsura or an alef with no mark (مَعْنَى, دَعَا); empty for the rest. An alef maqsura that carries a vowel is a yāʼ that Lane wrote so
 * (رَضِىَ for CAMeL's رَضِي) and is not read.
 */
function endingLong(word: string): "I" | "A" | "" {
  const nfc = word.normalize("NFC");
  if (/\u064D$|\u0650[يى]$/u.test(nfc)) return "I";
  return /[ىا]$/u.test(nfc) ? "A" : "";
}

/**
 * Whether two spellings of a word could be one word by their letters alone: they have the same letters, double the same ones (a
 * shadda is the word's: إِلّا is not أَلَا, nor كَلّا the pronoun كِلَا, nor فَضَّلَ, form II, the form I فَضَلَ) and do not end in different long
 * vowels (the defective noun مُقْتَضِي is not مُقْتَضَى). Short vowels are left out, which a lemma and a dictionary's headword differ in
 * often (جَرْم, جُرْم). A verb's last yāʼ is a consonant that CAMeL writes without its fatha (عُنِي, Lane's عَنَا…), so a verb takes no ending: `verb`.
 */
export function sameShape(word: string, other: string, verb = false): boolean {
  return spellings(word).some((a) => spellings(other).some((b) => {
    if (gemination(a) !== gemination(b)) return false;
    const x = endingLong(a);
    const y = endingLong(b);
    return verb || !x || !y || x === y;
  }));
}

// ---------------------------------------------------------------------------------------------------------------
// Other spellings of a word

/**
 * The spellings a word can have besides its own, for three habits that differ between CAMeL, Lane and Wiktionary:
 *  - CAMeL writes the alef of a tanwin-fatḥ after the letter and puts the sign on the alef (جَمِيعاً, غالِباً, صُعُداً); the alef is only
 *    the seat of the sign, and the noun it belongs to is Lane's جَمِيعٌ, صُعُدٌ. Lane and Wiktionary put the sign on the letter and write the
 *    alef after it (جَمِيعًا), which the vocal key already reads as CAMeL's, so only the first order is given a spelling without the alef.
 *  - A dagger alef is a fatha with the long vowel's length (هٰذَا, ذٰلِكَ), which CAMeL writes as a fatha (هَذا, ذَلِك) and some
 *    writers leave unmarked (Lane's إِلهِىٌّ for إِلٰهِيّ): the word is also given with a fatha where the dagger stands.
 *  - CAMeL writes a defective noun with its yāʼ (قاضِي, هادِي) where Lane and Wiktionary write its indefinite form with the tanwin-kasra on the
 *    last letter (قَاضٍ, هَادٍ), a page of its own without the yāʼ: a word of four letters or more ending in a kasra and a yāʼ is
 *    also given so, unless the letter before the kasra follows a sukun (أَسْفِي is a name and not the noun أَسَف).
 */
export function spellings(word: string): string[] {
  const nfc = word.normalize("NFC");
  const forms = [nfc];
  const withFatha = nfc.replace(/(?<![\u064B-\u0651])\u0670/gu, "\u064E");
  if (withFatha !== nfc) forms.push(withFatha);
  for (const form of [...forms]) {
    const bare = form.replace(/(?<=\p{L}\p{M}*)ا(?=\u064B$)/u, "");
    if (bare !== form && skeleton(bare).length >= 3) forms.push(bare);
    const defective = form.replace(/(?<=\p{L})(?<!\u0652\p{L})\u0650ي$/u, "\u064D");
    if (defective !== form && skeleton(defective).length >= 3) forms.push(defective);
  }
  return forms;
}

/** The consonants that assimilate the article's lām (a sun letter takes a shadda in the vowelled spelling of الشَّمْسُ). */
const SUN = "تثدذرزسشصضطظلن";

/**
 * A noun's headword without the definite article, for a noun that Lane files with it (الشَّمْسُ, الكُلَى): the shadda the
 * article's lām puts on a sun letter is not the word's. Undefined if the word has no article, or keeps fewer than three
 * letters without it (اللَّه, الآن).
 */
export function withoutArticle(word: string): string | undefined {
  const nfc = word.normalize("NFC");
  const article = /^[اٱ]ل\u0652?(?=\p{L})/u.exec(nfc)?.[0];
  if (!article) return undefined;
  const rest = nfc.slice(article.length).replace(new RegExp(`^([${SUN}])([\\u064B-\\u0650]?)\\u0651`, "u"), "$1$2");
  return skeleton(rest).length >= 3 ? rest : undefined;
}

/**
 * Other forms of a verb headword of Lane's that name the same verb. Lane writes the headword of a verb in the person and with
 * the object of the example that opens its article: "He wrote it" كَتَبَهُ, "she was near" أَصْقَبَتْ, "they stood in a row"
 * اصطفّوا; the verb is the form without the pronoun and the ending (the corpus's lemma is the third person masculine,
 * and its last letter's vowel, which the vocal key drops, is not at stake). A form with an alef at the end has the
 * verb's yāʼ in the same place, since a suffix turns it into an alef (حَمَاهُ, اغناهُ). A stem keeps three letters at least.
 */
export function verbStems(word: string): string[] {
  const nfc = word.normalize("NFC");
  const stems: string[] = [];
  const add = (stem: string): boolean => {
    if (stem === nfc || skeleton(stem).length < 3) return false;
    if (!stems.includes(stem)) stems.push(stem);
    return true;
  };
  const object = nfc.replace(/ه(?:\u064F(?:\u0645\u0652?|\u0645\u064E\u0627|\u0646\u064E\u0651)?|\u0650|\u064E\u0627)$/u, "");
  if (add(object) && object.endsWith("ا")) add(`${object.slice(0, -1)}ى`);
  add(object.replace(/(?<=\u064E)ت\u0652$|\u064F?وا$/u, ""));
  return stems;
}
