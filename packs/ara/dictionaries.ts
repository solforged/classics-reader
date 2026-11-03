import type { Dictionary } from "../../src/lang/types";

/** The credit Perseus requires wherever its text of Lane's Lexicon is used (the files' availability statement). */
export const LANE_CREDIT =
  "Text provided by Perseus Digital Library, with funding from The U.S. Department of Education and The Max Planck Society.";

/** The rest of the availability statement, which must stay intact beside the text (packs/ara/build/lane.ts checks the files for it). */
export const LANE_AVAILABILITY: readonly string[] = [
  "This text may be freely distributed, subject to the following restrictions:",
  `You credit Perseus, as follows, whenever you use the document: ${LANE_CREDIT}`,
  "You leave this availability statement intact.",
  "You offer Perseus any modifications you make.",
];

export const WIKTIONARY_CREDIT =
  "Wiktionary's Arabic entries, extracted by kaikki.org (Tatu Ylonen's wiktextract); text under CC BY-SA 4.0 and the GFDL.";

/**
 * The terms Lane prints in abbreviated form, with his own expansions (An Arabic-English Lexicon, Preface, Table II). The
 * quasi-technical ones occur in the text of nearly every verb article.
 */
const TERMS: Readonly<Record<string, string>> = {
  "aor.": "aorist (the imperfect, with the vowel of its second radical)",
  "inf. n.": "infinitive noun (maṣdar, the verbal noun)",
  "pl.": "plural",
  "Pl.": "plural",
  "pl. of pauc.": "plural of paucity (jam‘ qillah: three to ten)",
  "pl. of mult.": "plural of multitude (jam‘ kathrah)",
  "pl. pl.": "plural of a plural",
  "sing.": "singular",
  "fem.": "feminine",
  "masc.": "masculine",
  "dim.": "diminutive",
  "syn.": "synonym, synonymous",
  "Syn.": "synonym, synonymous",
  "accord.": "according",
  "accord. to": "according to",
  "Accord. to": "according to",
  "app.": "apparently",
  "q. v.": "quod vide, which see",
  "i. q.": "idem quod, the same as",
  "voce": "under the word (Latin)",
  "art.": "article, an entry of the lexicon or of its sources",
  "trad.": "tradition (ḥadīth)",
  "subst.": "substantive",
  "dial.": "dialect",
  "dial. var. of": "dialectal variant of",
  "n. un.": "noun of unity (a single one of a collective)",
  "gen. n.": "generic noun",
  "coll. gen. n.": "collective generic noun",
  "act.": "active",
  "pass.": "passive",
  "act. part. n.": "active participial noun",
  "pass. part. n.": "passive participial noun",
  "trans.": "transitive",
  "intrans.": "intransitive",
  "pret.": "preterite",
  "irreg.": "irregular",
  "lit.": "literally",
  "ex.": "example",
  "expl.": "explained",
  "rel. n.": "relative noun (nisbah)",
  "quasi-inf. n.": "quasi-infinitive noun",
  "Kur": "the Ḳur-án",
};

/**
 * Lane's sigla of his authorities, as written in the XML (Perseus's ASCII spelling of the printed ones: S for Ṣ, K for
 * Ḳ, Msb for Mṣb); expansions from Table IV of his Preface, in his romanization. Not listed, because the English text
 * also uses them as words: A (the Asás of Ez-Zamakhsheree), O (the ʻObáb of Eṣ-Ṣaghánee), As (El-Aṣma’ee) and I.
 */
const AUTHORITIES: Readonly<Record<string, string>> = {
  S: "the Ṣiḥáḥ of El-Jowharee",
  K: "the Ḳámoos of El-Feyroozábádee",
  TA: "the Táj el-ʻAroos of the seyyid Murtaḍà (Ez-Zebeedee), Lane’s chief source",
  M: "the Moḥkam of Ibn-Seedeh",
  Msb: "the Miṣbáḥ of El-Feiyoomee",
  Mgh: "the Mughrib of El-Muṭarrizee",
  L: "the Lisán el-ʻArab of Ibn-Mukarram",
  T: "the Tahdheeb of El-Azheree",
  Mughnee: "the Mughni-l-Lebeeb of Ibn-Hishám",
  Mz: "the Muzhir of Es-Suyooṭee",
  B: "the Baṣáïr, by the author of the Ḳámoos",
  Bd: "El-Beyḍáwee’s exposition of the Ḳur-án",
  Ksh: "the Keshsháf of Ez-Zamakhsheree",
  Z: "Ez-Zamakhsheree",
  J: "El-Jowharee, author of the Ṣiḥáḥ",
  F: "El-Feyroozábádee, author of the Ḳámoos",
  MF: "Moḥammad Ibn-Eṭ-Teiyib El-Fásee, author of annotations on the Ḳámoos",
  CK: "the Calcutta edition of the Ḳámoos",
  TK: "the Turkish translation of the Ḳámoos",
  KL: "the Kenz el-Loghah of Ibn-Maạroof, an Arabic-Persian dictionary",
  Ham: "Et-Tebreezee’s exposition of the Ḥamáseh",
  EM: "the exposition of the Mo’allaḳát printed in Calcutta",
  Meyd: "El-Meydánee’s Proverbs",
  Lth: "El-Leyth Ibn-Naṣr Ibn-Seiyár, held by El-Azheree to be the author of the ʻEyn",
  Kh: "El-Khaleel, commonly supposed to be the author of the ʻEyn",
  Sb: "Seebaweyh",
  Akh: "El-Akhfash",
  Az: "El-Azheree, author of the Tahdheeb",
  AZ: "Aboo-Zeyd",
  AA: "Aboo-ʻAmr (Ibn-El-ʻAlà or Esh-Sheybánee)",
  AAF: "Aboo-ʻAlee El-Fárisee",
  AO: "Aboo-ʻObeydeh",
  AHn: "Aboo-Ḥaneefeh Ed-Deenawaree, author of the Book of Plants",
  Fr: "El-Farrà",
  Ks: "El-Kisá-ee",
  Th: "Thaạlab",
  Sh: "Shemir",
  Lh: "El-Liḥyánee",
  Mbr: "El-Mubarrad",
  IAar: "Ibn-El-Aạrábee",
  IAth: "Ibn-El-Atheer, author of the Niháyeh",
  IB: "Ibn-Barree, author of annotations on the Ṣiḥáḥ",
  IDrd: "Ibn-Dureyd, author of the Jemharah",
  IF: "Ibn-Fáris, author of the Mujmal",
  IJ: "Ibn-Jinnee",
  IKh: "Ibn-Khálaweyh",
  IKt: "Ibn-Ḳuteybeh",
  ISd: "Ibn-Seedeh, author of the Moḥkam",
  ISk: "Ibn-Es-Sikkeet",
  IM: "Ibn-Mukarram, author of the Lisán el-ʻArab",
  Sgh: "Eṣ-Ṣaghánee, author of the ʻObáb",
};

export const DICTIONARIES: readonly Dictionary[] = [
  {
    id: "lane",
    title: "Lane",
    fullTitle: "Edward William Lane, An Arabic–English Lexicon (1863–93), Perseus Digital Library text as corrected by the Lane’s Lexicon project",
    style: "article",
    abbreviations: { ...TERMS, ...AUTHORITIES },
  },
  {
    id: "wikt",
    title: "Wiktionary",
    fullTitle: "Wiktionary, Arabic entries (via kaikki.org)",
    style: "article",
  },
];
