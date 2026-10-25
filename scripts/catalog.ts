// The list of works, their grouping and where each side of the facing text comes from.

export type Collection = "poetic" | "prose";

export interface WorkDef {
  slug: string;
  abbr: string;
  title: string; // conventional anglicised title
  titleOn: string; // Old Norse title
  english: string; // English rendering of the title
  collection: Collection;
  group: string;
  summary: string;
  /** EAE top-level divs (in order) making up the Old Norse side. A slice keeps units from/until a
   * head with that text or a unit key (`until` is exclusive). */
  eae?: (string | { div: string; from?: string; until?: string })[];
  /** Bugge 1867 transcription files (in .cache/sources/bugge) for poems outside Codex Regius. */
  bugge?: string[];
  /** Bellows 1923 chapter id (Project Gutenberg #73533). */
  bellows?: string;
  /** Snorra Edda section (Icelandic Wikisource) and Brodeur section (English Wikisource). */
  snorra?: string;
  brodeur?: string;
}

const MYTH = "Mythological poems";
const HERO = "Heroic poems";
const SNORRI = "Snorri’s Edda";

export const WORKS: WorkDef[] = [
  { slug: "voluspa", abbr: "Vsp", title: "Völuspá", titleOn: "Vǫluspá", english: "The Wise-Woman’s Prophecy", collection: "poetic", group: MYTH,
    summary: "A seeress tells Óðinn of the world’s making, the war of the gods, Baldr’s death, Ragnarǫk and the green earth that rises after.",
    eae: ["Völuspá"], bellows: "ch1.1" },
  { slug: "havamal", abbr: "Háv", title: "Hávamál", titleOn: "Hávamál", english: "The Ballad of the High One", collection: "poetic", group: MYTH,
    summary: "Óðinn’s counsel on guests, friendship and fame, his winning of the poetic mead, and the runes and charms he won on the windy tree.",
    eae: ["Hávamál"], bellows: "ch1.2" },
  { slug: "vafthrudnismal", abbr: "Vm", title: "Vafþrúðnismál", titleOn: "Vafþrúðnismál", english: "The Ballad of Vafthruthnir", collection: "poetic", group: MYTH,
    summary: "Óðinn wagers his head in a contest of lore with the wisest of giants, and wins with a question only he can answer.",
    eae: ["Vafþrúðnismál"], bellows: "ch1.3" },
  { slug: "grimnismal", abbr: "Grm", title: "Grímnismál", titleOn: "Grímnismál", english: "The Ballad of Grimnir", collection: "poetic", group: MYTH,
    summary: "Tortured between two fires, the disguised Óðinn reveals the halls of the gods and, at last, his own names.",
    eae: ["Frá_sonum_Hrauðungs_konungs", "Grímnismál"], bellows: "ch1.4" },
  { slug: "skirnismal", abbr: "Skm", title: "Skírnismál", titleOn: "Skírnismál", english: "The Ballad of Skirnir", collection: "poetic", group: MYTH,
    summary: "Freyr’s servant Skírnir woos the giantess Gerðr for his lovesick master, with gifts and then with curses.",
    eae: ["Skírnismál"], bellows: "ch1.5" },
  { slug: "harbardsljod", abbr: "Hrbl", title: "Hárbarðsljóð", titleOn: "Hárbarðsljóð", english: "The Poem of Harbarth", collection: "poetic", group: MYTH,
    summary: "Þórr, on his way home, trades boasts and insults with a ferryman who will not row him across.",
    eae: ["Hárbarðsljóð"], bellows: "ch1.6" },
  { slug: "hymiskvida", abbr: "Hym", title: "Hymiskviða", titleOn: "Hymiskviða", english: "The Lay of Hymir", collection: "poetic", group: MYTH,
    summary: "Þórr fetches a great brewing kettle from the giant Hymir and hooks the Miðgarðr serpent on the way.",
    eae: ["Hymiskviða"], bellows: "ch1.7" },
  { slug: "lokasenna", abbr: "Ls", title: "Lokasenna", titleOn: "Lokasenna", english: "Loki’s Wrangling", collection: "poetic", group: MYTH,
    summary: "At Ægir’s feast Loki insults each of the gods in turn until Þórr comes home.",
    eae: ["Frá_Ægi_ok_goðum", "Lokasenna", "Frá_Loka"], bellows: "ch1.8" },
  { slug: "thrymskvida", abbr: "Þrk", title: "Þrymskviða", titleOn: "Þrymskviða", english: "The Lay of Thrym", collection: "poetic", group: MYTH,
    summary: "Þórr’s hammer is stolen, and he goes to the giant Þrymr dressed as the bride Freyja to win it back.",
    eae: ["Þrymskviða"], bellows: "ch1.9" },
  { slug: "alvissmal", abbr: "Alv", title: "Alvíssmál", titleOn: "Alvíssmál", english: "The Ballad of Alvis", collection: "poetic", group: MYTH,
    summary: "Þórr keeps the dwarf who would marry his daughter talking about the names of things until the sun rises.",
    eae: ["Alvíssmál"], bellows: "ch1.10" },
  { slug: "baldrs-draumar", abbr: "Bdr", title: "Baldrs draumar", titleOn: "Baldrs draumar", english: "Baldr’s Dreams", collection: "poetic", group: MYTH,
    summary: "Óðinn rides to Hel and wakes a dead seeress to learn the meaning of Baldr’s dreams.",
    bugge: ["vegtams.html"], bellows: "ch1.11" },
  { slug: "rigsthula", abbr: "Rþ", title: "Rígsþula", titleOn: "Rígsþula", english: "The Song of Rig", collection: "poetic", group: MYTH,
    summary: "The god Rígr visits three households and fathers the races of thralls, freemen and earls.",
    bugge: ["rigstula.html"], bellows: "ch1.12" },
  { slug: "hyndluljod", abbr: "Hdl", title: "Hyndluljóð", titleOn: "Hyndluljóð", english: "The Poem of Hyndla", collection: "poetic", group: MYTH,
    summary: "Freyja makes the giantess Hyndla recite the ancestry of her favourite Óttarr; embedded is the “Short Völuspá”.",
    bugge: ["hyndlu.html"], bellows: "ch1.13" },
  { slug: "svipdagsmal", abbr: "Svipd", title: "Svipdagsmál", titleOn: "Svipdagsmál", english: "The Ballad of Svipdag", collection: "poetic", group: MYTH,
    summary: "Grógaldr and Fjölsvinnsmál: Svipdagr calls up his dead mother for charms, then talks his way past a giant warder to his bride.",
    bugge: ["svipdag1.html", "svipdag2.html"], bellows: "ch1.14" },
  { slug: "grottasongr", abbr: "Grt", title: "Gróttasöngr", titleOn: "Gróttasǫngr", english: "The Mill’s Song", collection: "poetic", group: MYTH,
    summary: "Two giant slave-women grind gold, peace and then an army out of King Fróði’s magic mill. Preserved in Snorri’s Edda.",
    bugge: ["grotta.html"], brodeur: "grottasongr" },

  { slug: "volundarkvida", abbr: "Vkv", title: "Völundarkviða", titleOn: "Vǫlundarkviða", english: "The Lay of Völund", collection: "poetic", group: HERO,
    summary: "The smith Völundr, hamstrung and imprisoned by King Níðuðr, takes a terrible revenge and flies away.",
    eae: ["Frá_Völundi", "Völundarkviða"], bellows: "ch2.1" },
  { slug: "helgakvida-hjorvardssonar", abbr: "HHv", title: "Helgakviða Hjörvarðssonar", titleOn: "Helgakviða Hjǫrvarðssonar", english: "The Lay of Helgi the Son of Hjorvarth", collection: "poetic", group: HERO,
    summary: "Helgi wins the valkyrie Sváva and his name, and dies by the hand of a brother-in-law’s kin.",
    eae: ["Helgakviða_Hjörvarðssonar"], bellows: "ch2.2" },
  { slug: "helgakvida-hundingsbana-i", abbr: "HH", title: "Helgakviða Hundingsbana I", titleOn: "Helgakviða Hundingsbana in fyrri", english: "The First Lay of Helgi Hundingsbane", collection: "poetic", group: HERO,
    summary: "The birth of the Vǫlsung hero Helgi, his killing of Hundingr, and the flyting before his battle for Sigrún.",
    eae: ["Helgakviða_Hundingsbana_I"], bellows: "ch2.3" },
  { slug: "helgakvida-hundingsbana-ii", abbr: "HH II", title: "Helgakviða Hundingsbana II", titleOn: "Helgakviða Hundingsbana ǫnnur", english: "The Second Lay of Helgi Hundingsbane", collection: "poetic", group: HERO,
    summary: "Helgi and Sigrún, his death, and her night with him in his burial mound.",
    eae: ["Helgakviða_Hundingsbana_II"], bellows: "ch2.4" },
  { slug: "fra-dauda-sinfjotla", abbr: "Sf", title: "Frá dauða Sinfjötla", titleOn: "Frá dauða Sinfjǫtla", english: "Of Sinfjotli’s Death", collection: "poetic", group: HERO,
    summary: "A prose link: Sinfjǫtli is poisoned by his stepmother and borne away by a mysterious ferryman.",
    eae: [{ div: "Grípisspá", until: "Grípisspá" }], bellows: "ch2.5" },
  { slug: "gripisspa", abbr: "Grp", title: "Grípisspá", titleOn: "Grípisspá", english: "Gripir’s Prophecy", collection: "poetic", group: HERO,
    summary: "Young Sigurðr visits his uncle Grípir, who foretells his whole life, against his own wish.",
    eae: [{ div: "Grípisspá", from: "Grípisspá" }], bellows: "ch2.6" },
  { slug: "reginsmal", abbr: "Rm", title: "Reginsmál", titleOn: "Reginsmál", english: "The Ballad of Regin", collection: "poetic", group: HERO,
    summary: "The origin of the otter’s ransom and Andvari’s cursed ring, and Sigurðr’s vengeance for his father.",
    eae: [{ div: "Reginsmál", until: "p55" }], bellows: "ch2.7" },
  { slug: "fafnismal", abbr: "Fm", title: "Fáfnismál", titleOn: "Fáfnismál", english: "The Ballad of Fafnir", collection: "poetic", group: HERO,
    summary: "The dying dragon Fáfnir talks with his slayer; Sigurðr tastes the heart’s blood and understands the birds.",
    eae: [{ div: "Reginsmál", from: "p55" }, "Fáfnismál"], bellows: "ch2.8" },
  { slug: "sigrdrifumal", abbr: "Sd", title: "Sigrdrífumál", titleOn: "Sigrdrífumál", english: "The Ballad of the Victory-Bringer", collection: "poetic", group: HERO,
    summary: "Sigurðr wakes a sleeping valkyrie, who teaches him runes and counsel. The end of the poem survives only in paper copies.",
    eae: ["Sigrdrífumál"], bugge: ["sigrdrif.html"], bellows: "ch2.9" },
  { slug: "brot-af-sigurdarkvidu", abbr: "Br", title: "Brot af Sigurðarkviðu", titleOn: "Brot af Sigurðarkviðu", english: "Fragment of a Sigurth Lay", collection: "poetic", group: HERO,
    summary: "What survives after the great gap in the manuscript: the plotting and killing of Sigurðr.",
    eae: ["Brot_af_Sigurðarkviðu", { div: "DSig", until: "p2@Guðrún sat yfir" }], bellows: "ch2.10" },
  { slug: "gudrunarkvida-i", abbr: "Gðr I", title: "Guðrúnarkviða I", titleOn: "Guðrúnarkviða in fyrsta", english: "The First Lay of Guthrun", collection: "poetic", group: HERO,
    summary: "Guðrún sits tearless over Sigurðr’s body while other women tell their sorrows.",
    eae: [{ div: "DSig", from: "p2@Guðrún sat yfir" }, "Guðrúnarkviða_I"], bellows: "ch2.11" },
  { slug: "sigurdarkvida-in-skamma", abbr: "Sg", title: "Sigurðarkviða in skamma", titleOn: "Sigurðarkviða in skamma", english: "The Short Lay of Sigurth", collection: "poetic", group: HERO,
    summary: "Brynhildr’s jealousy, Sigurðr’s murder, and her death on his pyre with a prophecy of what is to come.",
    eae: ["Sigurðarkviða_in_skamma"], bellows: "ch2.12" },
  { slug: "helreid-brynhildar", abbr: "Hlr", title: "Helreið Brynhildar", titleOn: "Helreið Brynhildar", english: "Brynhild’s Hell-Ride", collection: "poetic", group: HERO,
    summary: "On her way to Hel, Brynhildr answers a giantess who blames her for her life.",
    eae: ["Helreið_Brynhildar"], bellows: "ch2.13" },
  { slug: "drap-niflunga", abbr: "Dr", title: "Dráp Niflunga", titleOn: "Dráp Niflunga", english: "The Slaying of the Niflungs", collection: "poetic", group: HERO,
    summary: "A prose link telling how Atli lured Gunnarr and Hǫgni to their deaths.",
    eae: ["Drap_Niflunga"], bellows: "ch2.14" },
  { slug: "gudrunarkvida-ii", abbr: "Gðr II", title: "Guðrúnarkviða II", titleOn: "Guðrúnarkviða ǫnnur", english: "The Second, or Old, Lay of Guthrun", collection: "poetic", group: HERO,
    summary: "Guðrún tells Þjóðrekr of her sorrows, her forced marriage to Atli and her dark dreams.",
    eae: ["Guðrúnarkviða_II"], bellows: "ch2.15" },
  { slug: "gudrunarkvida-iii", abbr: "Gðr III", title: "Guðrúnarkviða III", titleOn: "Guðrúnarkviða in þriðja", english: "The Third Lay of Guthrun", collection: "poetic", group: HERO,
    summary: "Accused of adultery, Guðrún clears herself by the ordeal of boiling water.",
    eae: ["Guðrúnarkviða_III"], bellows: "ch2.16" },
  { slug: "oddrunargratr", abbr: "Od", title: "Oddrúnargrátr", titleOn: "Oddrúnargrátr", english: "Oddrun’s Lament", collection: "poetic", group: HERO,
    summary: "Oddrún, Atli’s sister, tells of her love for Gunnarr and his death in the snake pit.",
    eae: ["BrgOdd", "Oddrúnargrátr"], bellows: "ch2.17" },
  { slug: "atlakvida", abbr: "Akv", title: "Atlakviða", titleOn: "Atlakviða in grœnlenzka", english: "The Greenland Lay of Atli", collection: "poetic", group: HERO,
    summary: "Gunnarr and Hǫgni ride to Atli’s hall and death; Guðrún’s revenge is swift and terrible.",
    eae: ["Dauði_Atla", "Atlakviða"], bellows: "ch2.18" },
  { slug: "atlamal", abbr: "Am", title: "Atlamál", titleOn: "Atlamál in grœnlenzku", english: "The Greenland Ballad of Atli", collection: "poetic", group: HERO,
    summary: "The same story as Atlakviða, retold at length, with ominous dreams and household detail.",
    eae: ["Atlamál"], bellows: "ch2.19" },
  { slug: "gudrunarhvot", abbr: "Ghv", title: "Guðrúnarhvöt", titleOn: "Guðrúnarhvǫt", english: "Guthrun’s Inciting", collection: "poetic", group: HERO,
    summary: "Guðrún goads her last sons to avenge their sister Svanhildr, then recalls her griefs.",
    eae: ["Frá_Guðrúnu", "Guðrúnarhvöt"], bellows: "ch2.20" },
  { slug: "hamdismal", abbr: "Hm", title: "Hamðismál", titleOn: "Hamðismál", english: "The Ballad of Hamther", collection: "poetic", group: HERO,
    summary: "Hamðir and Sǫrli ride against King Jǫrmunrekkr, killing their half-brother on the way.",
    eae: ["Hamðismál"], bellows: "ch2.21" },

  { slug: "prologue", abbr: "Prol", title: "Prologue", titleOn: "Prologus", english: "Prologue", collection: "prose", group: SNORRI,
    summary: "A Christian frame: the creation, the spread of mankind, and the Æsir as men out of Troy who came north.",
    snorra: "prologus", brodeur: "prologue" },
  { slug: "gylfaginning", abbr: "Gylf", title: "Gylfaginning", titleOn: "Gylfaginning", english: "The Beguiling of Gylfi", collection: "prose", group: SNORRI,
    summary: "King Gylfi, in disguise, questions three mysterious figures in Ásgarðr about the gods from creation to Ragnarǫk.",
    snorra: "gylfaginning", brodeur: "gylfaginning" },
  { slug: "skaldskaparmal", abbr: "Skáldsk", title: "Skáldskaparmál", titleOn: "Skáldskaparmál", english: "The Language of Poetry", collection: "prose", group: SNORRI,
    summary: "Bragi tells Ægir the myths behind poetic diction, followed by a treatise on kennings and poetic names with many quoted verses.",
    snorra: "skaldskaparmal", brodeur: "skaldskaparmal" },
  { slug: "hattatal", abbr: "Ht", title: "Háttatal", titleOn: "Háttatal", english: "The Enumeration of Metres", collection: "prose", group: SNORRI,
    summary: "Snorri’s 102-stanza praise poem for King Hákon and Earl Skúli, each stanza demonstrating a verse form, with prose commentary. No public-domain English translation exists.",
    snorra: "hattatal" },
];

export const GROUPS = [MYTH, HERO, SNORRI];
