// ISWOC lemmas against Bosworth–Toller. ISWOC's lemmas are plain ASCII (no length marks), spell "and" as & and number
// homographs (hwæt#2). A lemma is found under the key btKey() gives both; these tables handle the rest. A key is the
// treebank's lemma, or "lemma:Tag" (the PROIEL part of speech) for a correction that applies to one class only.
//
// FIXES: the treebank's lemma is wrong (an inflected form, a misspelling) or the word has a more usual lemma. The
// corrected lemma is the one shown and counted.
//
// SPELLINGS: the lemma is right but Bosworth–Toller prints the word otherwise (leorningcniht as leornungcniht). The
// lemma stays; its dictionary entry is found under the other spelling ("Listed as leornungcniht").
//
// WITHOUT_ENTRY: lemmas the dictionary lacks, which Wiktionary may have. The build throws on a lemma that no
// dictionary has and that is not here (or a name, or a foreign word), and on an entry of any table that goes unused.

/** The third-person pronoun, which Bosworth–Toller lists once (hē, with hēo and hit) and ISWOC under nine lemmas. */
const HE = "he";

export const FIXES: Readonly<Record<string, string>> = {
  his: HE, him: HE, hit: HE, hi: HE, heo: HE, hira: HE, hire: HE, hyre: HE, hyra: HE,
  "ure:Pp": "we",
  þære: "se", ðam: "se", þam: "se", þæm: "se",
  mynre: "min", minre: "min", minum: "min",
  Godes: "God", come: "cuman", ofercom: "ofercuman", girnde: "gyrnan", gesette: "gesettan", gebinde: "gebindan",
  geopenode: "geopenian", gelufod: "gelufian", gecorenum: "geceosan", heredon: "herian", awriten: "awritan",
  besmitenum: "besmitan", ongeton: "ongeotan", bewende: "bewendan", feollan: "feallan", geseald: "sellan",
  gifta: "gift", hwætes: "hwæte", sunde: "sund", lifes: "lif", stræte: "stræt", tune: "tun", stane: "stan",
  naman: "nama", rode: "rod", top: "topp", scamu: "sceamu", twicene: "twicen", manega: "manig",
  nanum: "nan", þusendum: "þusend", twelfe: "twelf", Twa: "twegen", leofost: "leof", fuller: "fullere",
  towear: "toweard",
  // Variant lemmas of one name.
  Drihten: "Dryhten", Iudea: "Iudeas", Galilee: "Galilea", Satanas: "Satan", Iordan: "Iordane", Barrabbas: "Barrabas",
  Israel: "Israhel", Capharnaum: "Cafarnaum", Simone: "Simon", Herodiani: "Herodianisc", Lairus: "Iairus",
  Elias: "Helias", THOMAS: "Thomas", Bedzaida: "Bethsaida", Sidone: "Sidonis",
};

export const SPELLINGS: Readonly<Record<string, string>> = {
  leorningcniht: "leornungcniht", heahsacherd: "heahsacerd", forgifness: "forgifnes", digolnessa: "digolnes",
  "hweþer:C-": "hwæþer", gesyltan: "gesiltan", unsceaþig: "unsceþþig", æðelborennes: "æþelborenness",
  gemiltsigend: "gemiltsiend", ceastergewaran: "ceastergewara", morgengif: "morgengifu", læringmædene: "læringmæden",
  abuton: "abutan", binnon: "binnan", nahwar: "nahwær", wiliga: "wilige", liccetere: "licettere", ungleaf: "ungeleaf",
  ungeleafull: "ungeleaffull", earfednume: "earfednyme", Sadducaei: "sadduceas", gegeearwian: "gegearwian",
  midlene: "midlen", mansliht: "mannsliht", elþeodignis: "elþeodignes", ieldo: "yld", þaron: "þæron", ric: "rice",
};

export const WITHOUT_ENTRY: Readonly<Record<string, true>> = {
  todæg: true, utgan: true, tirisc: true, tiriscan: true, Magdalenisc: true, cirinisc: true, tharsysc: true,
  upstigan: true, upcuman: true, onsundran: true, utdrifan: true, midwyrcan: true, upaspringan: true, þoþor: true,
  Herodianisc: true,
};
