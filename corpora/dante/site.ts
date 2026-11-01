// The Dante Reader: the whole Commedia in Italian (Petrocchi's text as UD_Italian-Old gives it, with the treebank's
// lemmas and morphology) beside Henry Wadsworth Longfellow's line-for-line translation, one tercet per row. Each
// canto is a work; the three cantiche are the collections.
import type { CollectionInfo, ReaderSite, WorkInfo } from "../../src/sites/types";

/**
 * Each canto's subjects as the contents of Longfellow's translation (Project Gutenberg #1004) list them: the first,
 * which the reader shows under the canto's title, and the rest. build.ts checks them against the contents.
 */
export const SUBJECTS: Readonly<Record<"inferno" | "purgatorio" | "paradiso", readonly (readonly [string, string])[]>> = {
  inferno: [
    ["The Dark Forest", "The Hill of Difficulty. The Panther, the Lion, and the Wolf. Virgil."],
    ["The Descent", "Dante’s Protest and Virgil’s Appeal. The Intercession of the Three Ladies Benedight."],
    ["The Gate of Hell", "The Inefficient or Indifferent. Pope Celestine V. The Shores of Acheron. Charon. The Earthquake and the Swoon."],
    ["The First Circle, Limbo: Virtuous Pagans and the Unbaptized", "The Four Poets, Homer, Horace, Ovid, and Lucan. The Noble Castle of Philosophy."],
    ["The Second Circle: The Wanton", "Minos. The Infernal Hurricane. Francesca da Rimini."],
    ["The Third Circle: The Gluttonous", "Cerberus. The Eternal Rain. Ciacco. Florence."],
    ["The Fourth Circle: The Avaricious and the Prodigal", "Plutus. Fortune and her Wheel. The Fifth Circle: The Irascible and the Sullen. Styx."],
    ["Phlegyas", "Philippo Argenti. The Gate of the City of Dis."],
    ["The Furies and Medusa", "The Angel. The City of Dis. The Sixth Circle: Heresiarchs."],
    ["Farinata and Cavalcante de’ Cavalcanti", "Discourse on the Knowledge of the Damned."],
    ["The Broken Rocks", "Pope Anastasius. General Description of the Inferno and its Divisions."],
    ["The Minotaur", "The Seventh Circle: The Violent. The River Phlegethon. The Violent against their Neighbours. The Centaurs. Tyrants."],
    ["The Wood of Thorns", "The Harpies. The Violent against themselves. Suicides. Pier della Vigna. Lano and Jacopo da Sant’ Andrea."],
    ["The Sand Waste and the Rain of Fire", "The Violent against God. Capaneus. The Statue of Time, and the Four Infernal Rivers."],
    ["The Violent against Nature", "Brunetto Latini."],
    ["Guidoguerra, Aldobrandi, and Rusticucci", "Cataract of the River of Blood."],
    ["Geryon", "The Violent against Art. Usurers. Descent into the Abyss of Malebolge."],
    ["The Eighth Circle, Malebolge: The Fraudulent and the Malicious", "The First Bolgia: Seducers and Panders. Venedico Caccianimico. Jason. The Second Bolgia: Flatterers. Allessio Interminelli. Thais."],
    ["The Third Bolgia: Simoniacs", "Pope Nicholas III. Dante’s Reproof of corrupt Prelates."],
    ["The Fourth Bolgia: Soothsayers", "Amphiaraus, Tiresias, Aruns, Manto, Eryphylus, Michael Scott, Guido Bonatti, and Asdente. Virgil reproaches Dante’s Pity. Mantua’s Foundation."],
    ["The Fifth Bolgia: Peculators", "The Elder of Santa Zita. Malacoda and other Devils."],
    ["Ciampolo, Friar Gomita, and Michael Zanche", "The Malabranche quarrel."],
    ["Escape from the Malabranche", "The Sixth Bolgia: Hypocrites. Catalano and Loderingo. Caiaphas."],
    ["The Seventh Bolgia: Thieves", "Vanni Fucci. Serpents."],
    ["Vanni Fucci’s Punishment", "Agnello Brunelleschi, Buoso degli Abati, Puccio Sciancato, Cianfa de’ Donati, and Guercio Cavalcanti."],
    ["The Eighth Bolgia: Evil Counsellors", "Ulysses and Diomed. Ulysses’ Last Voyage."],
    ["Guido da Montefeltro", "His deception by Pope Boniface VIII."],
    ["The Ninth Bolgia: Schismatics", "Mahomet and Ali. Pier da Medicina, Curio, Mosca, and Bertrand de Born."],
    ["Geri del Bello", "The Tenth Bolgia: Alchemists. Griffolino d’ Arezzo and Capocchino."],
    ["Other Falsifiers or Forgers", "Gianni Schicchi, Myrrha, Adam of Brescia, Potiphar’s Wife, and Sinon of Troy."],
    ["The Giants, Nimrod, Ephialtes, and Antaeus", "Descent to Cocytus."],
    ["The Ninth Circle: Traitors", "The Frozen Lake of Cocytus. First Division, Caina: Traitors to their Kindred. Camicion de’ Pazzi. Second Division, Antenora: Traitors to their Country. Dante questions Bocca degli Abati. Buoso da Duera."],
    ["Count Ugolino and the Archbishop Ruggieri", "The Death of Count Ugolino’s Sons. Third Division of the Ninth Circle, Ptolomaea: Traitors to their Friends. Friar Alberigo, Branco d’ Oria."],
    ["Fourth Division of the Ninth Circle, the Judecca: Traitors to their Lords and Benefactors", "Lucifer, Judas Iscariot, Brutus, and Cassius. The Chasm of Lethe. The Ascent."],
  ],
  purgatorio: [
    ["The Shores of Purgatory", "The Four Stars. Cato of Utica. The Rush."],
    ["The Celestial Pilot", "Casella. The Departure."],
    ["Discourse on the Limits of Reason", "The Foot of the Mountain. Those who died in Contumacy of Holy Church. Manfredi."],
    ["Farther Ascent", "Nature of the Mountain. The Negligent, who postponed Repentance till the last Hour. Belacqua."],
    ["Those who died by Violence, but repentant", "Buonconte di Monfeltro. La Pia."],
    ["Dante’s Inquiry on Prayers for the Dead", "Sordello. Italy."],
    ["The Valley of Flowers", "Negligent Princes."],
    ["The Guardian Angels and the Serpent", "Nino di Gallura. The Three Stars. Currado Malaspina."],
    ["Dante’s Dream of the Eagle", "The Gate of Purgatory and the Angel. Seven P’s. The Keys."],
    ["The Needle’s Eye", "The First Circle: The Proud. The Sculptures on the Wall."],
    ["The Humble Prayer", "Omberto di Santafiore. Oderisi d’ Agobbio. Provenzan Salvani."],
    ["The Sculptures on the Pavement", "Ascent to the Second Circle."],
    ["The Second Circle: The Envious", "Sapia of Siena."],
    ["Guido del Duca and Renier da Calboli", "Cities of the Arno Valley. Denunciation of Stubbornness."],
    ["The Third Circle: The Irascible", "Dante’s Visions. The Smoke."],
    ["Marco Lombardo", "Lament over the State of the World."],
    ["Dante’s Dream of Anger", "The Fourth Circle: The Slothful. Virgil’s Discourse of Love."],
    ["Virgil further discourses of Love and Free Will", "The Abbot of San Zeno."],
    ["Dante’s Dream of the Siren", "The Fifth Circle: The Avaricious and Prodigal. Pope Adrian V."],
    ["Hugh Capet", "Corruption of the French Crown. Prophecy of the Abduction of Pope Boniface VIII and the Sacrilege of Philip the Fair. The Earthquake."],
    ["The Poet Statius", "Praise of Virgil."],
    ["Statius’ Denunciation of Avarice", "The Sixth Circle: The Gluttonous. The Mystic Tree."],
    ["Forese", "Reproof of immodest Florentine Women."],
    ["Buonagiunta da Lucca", "Pope Martin IV, and others. Inquiry into the State of Poetry."],
    ["Discourse of Statius on Generation", "The Seventh Circle: The Wanton."],
    ["Sodomites", "Guido Guinicelli and Arnaldo Daniello."],
    ["The Wall of Fire and the Angel of God", "Dante’s Sleep upon the Stairway, and his Dream of Leah and Rachel. Arrival at the Terrestrial Paradise."],
    ["The River Lethe", "Matilda. The Nature of the Terrestrial Paradise."],
    ["The Triumph of the Church", ""],
    ["Virgil’s Departure", "Beatrice. Dante’s Shame."],
    ["Reproaches of Beatrice and Confession of Dante", "The Passage of Lethe. The Seven Virtues. The Griffon."],
    ["The Tree of Knowledge", "Allegory of the Chariot."],
    ["Lament over the State of the Church", "Final Reproaches of Beatrice. The River Eunoe."],
  ],
  paradiso: [
    ["The Ascent to the First Heaven", "The Sphere of Fire."],
    ["The First Heaven, the Moon: Spirits who, having taken Sacred Vows, were forced to violate them", "The Lunar Spots."],
    ["Piccarda Donati and the Empress Constance", ""],
    ["Questionings of the Soul and of Broken Vows", ""],
    ["Discourse of Beatrice on Vows and Compensations", "Ascent to the Second Heaven, Mercury: Spirits who for the Love of Fame achieved great Deeds."],
    ["Justinian", "The Roman Eagle. The Empire. Romeo."],
    ["Beatrice’s Discourse of the Crucifixion, the Incarnation, the Immortality of the Soul, and the Resurrection of the Body", ""],
    ["Ascent to the Third Heaven, Venus: Lovers", "Charles Martel. Discourse on diverse Natures."],
    ["Cunizza da Romano, Folco of Marseilles, and Rahab", "Neglect of the Holy Land."],
    ["The Fourth Heaven, the Sun: Theologians and Fathers of the Church", "The First Circle. St. Thomas of Aquinas."],
    ["St. Thomas recounts the Life of St. Francis", "Lament over the State of the Dominican Order."],
    ["St. Buonaventura recounts the Life of St. Dominic", "Lament over the State of the Franciscan Order. The Second Circle."],
    ["Of the Wisdom of Solomon", "St. Thomas reproaches Dante’s Judgement."],
    ["The Third Circle", "Discourse on the Resurrection of the Flesh. The Fifth Heaven, Mars: Martyrs and Crusaders who died fighting for the true Faith. The Celestial Cross."],
    ["Cacciaguida", "Florence in the Olden Time."],
    ["Dante’s Noble Ancestry", "Cacciaguida’s Discourse of the Great Florentines."],
    ["Cacciaguida’s Prophecy of Dante’s Banishment", ""],
    ["The Sixth Heaven, Jupiter: Righteous Kings and Rulers", "The Celestial Eagle. Dante’s Invectives against ecclesiastical Avarice."],
    ["The Eagle discourses of Salvation, Faith, and Virtue", "Condemnation of the vile Kings of A.D. 1300."],
    ["The Eagle praises the Righteous Kings of old", "Benevolence of the Divine Will."],
    ["The Seventh Heaven, Saturn: The Contemplative", "The Celestial Stairway. St. Peter Damiano. His Invectives against the Luxury of the Prelates."],
    ["St. Benedict", "His Lamentation over the Corruption of Monks. The Eighth Heaven, the Fixed Stars."],
    ["The Triumph of Christ", "The Virgin Mary. The Apostles. Gabriel."],
    ["The Radiant Wheel", "St. Peter examines Dante on Faith."],
    ["The Laurel Crown", "St. James examines Dante on Hope. Dante’s Blindness."],
    ["St. John examines Dante on Charity", "Dante’s Sight. Adam."],
    ["St. Peter’s reproof of bad Popes", "The Ascent to the Ninth Heaven, the ‘Primum Mobile.’"],
    ["God and the Angelic Hierarchies", ""],
    ["Beatrice’s Discourse of the Creation of the Angels, and of the Fall of Lucifer", "Her Reproof of Foolish and Avaricious Preachers."],
    ["The Tenth Heaven, or Empyrean", "The River of Light. The Two Courts of Heaven. The White Rose of Paradise. The great Throne."],
    ["The Glory of Paradise", "Departure of Beatrice. St. Bernard."],
    ["St. Bernard points out the Saints in the White Rose", ""],
    ["Prayer to the Virgin", "The Threefold Circle of the Trinity. Mystery of the Divine and Human Nature."],
  ],
};

const COLLECTIONS: readonly (CollectionInfo & { id: keyof typeof SUBJECTS; abbr: string })[] = [
  {
    id: "inferno",
    abbr: "Inf.",
    title: "Inferno",
    subtitle: "Hell",
    intro: "Dante, lost in a dark wood in the spring of 1300, is led by Virgil down through the nine circles of Hell, " +
      "where the damned suffer according to their sins, to Lucifer at the centre of the earth.",
  },
  {
    id: "purgatorio",
    abbr: "Purg.",
    title: "Purgatorio",
    subtitle: "Purgatory",
    intro: "Virgil and Dante climb the mountain of Purgatory, where souls are cleansed of the seven deadly sins " +
      "terrace by terrace, to the Earthly Paradise at its summit; there Virgil leaves Dante to Beatrice.",
  },
  {
    id: "paradiso",
    abbr: "Par.",
    title: "Paradiso",
    subtitle: "Paradise",
    intro: "Beatrice leads Dante up through the nine heavens of the planets, the fixed stars and the Primum Mobile " +
      "to the Empyrean, where Saint Bernard prays to the Virgin for his vision of God.",
  },
];

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI",
  "XVII", "XVIII", "XIX", "XX", "XXI", "XXII", "XXIII", "XXIV", "XXV", "XXVI", "XXVII", "XXVIII", "XXIX", "XXX",
  "XXXI", "XXXII", "XXXIII", "XXXIV"];

const works: WorkInfo[] = COLLECTIONS.flatMap(({ id, abbr, title }) => SUBJECTS[id].map(([english, rest], i): WorkInfo => ({
  slug: `${id}-${i + 1}`,
  abbr: `${abbr} ${i + 1}`,
  title: `${title} ${ROMAN[i]}`,
  english,
  summary: rest || `${english}.`,
  collection: id,
  group: title,
  levels: [{ name: "Canto" }, { name: "Line" }],
  sources: {
    it: "Petrocchi (1966–67), as in UD_Italian-Old (CC BY-SA 4.0)",
    en: "Henry Wadsworth Longfellow (1867)",
  },
})));

export const site: ReaderSite = {
  id: "dante",
  name: "The Dante Reader",
  shortName: "Dante Reader",
  homeTitle: "The Dante Reader: the Divine Comedy in Italian and English",
  description: "Read Dante’s Divine Comedy, all hundred cantos, in the Italian of Petrocchi’s edition with " +
    "Longfellow’s line-for-line English, word-by-word grammar from the UD Old Italian treebank, Wiktionary and " +
    "Toynbee’s dictionary of names in Dante, and full-text search.",
  eyebrow: "La Commedia · Inferno · Purgatorio · Paradiso",
  lede: "The Divine Comedy in Dante’s Florentine, tercet by tercet, with Henry Wadsworth Longfellow’s translation " +
    "beside it line for line. Click any Italian word for its lemma, grammar and dictionary entries, and any name " +
    "for Paget Toynbee’s account of it.",
  credits: "Italian text and annotation: UD_Italian-Old (Claudia Corbetta, Marco Passarotti, Flavio Massimiliano " +
    "Cecchini, Giovanni Moretti), from the DanteSearch corpus (University of Pisa), as released in Universal " +
    'Dependencies 2.18, <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>: this reader’s ' +
    "Italian data may be reused only under the same licence. The text is Giorgio Petrocchi’s (1966–67). English: Henry " +
    "Wadsworth Longfellow’s translation (1867), public domain, via Project Gutenberg. Dictionaries: Wiktionary (via " +
    'kaikki.org), <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>, and Paget Toynbee, ' +
    "<i>A Concise Dictionary of Proper Names and Notable Matters in the Works of Dante</i> (1914), public domain.",
  corpus: "the Commedia",
  searchHint: "Accents, apostrophes and capitals are optional: <i>perche</i> finds <i>perché</i>, <i>chi</i> " +
    "finds <i>ch’i’</i>.",
  searchPlaceholder: "e.g. selva oscura, Beatrice, love",
  countNote: "Counts use the treebank’s lemmas, which are modern Italian citation forms (<i>loco</i> is counted under " +
    "<i>luogo</i>). A written word that joins two words (<i>del</i> = <i>di</i> + <i>il</i>) counts once for each.",
  sides: [{ id: "it", role: "source", label: "Italian" }, { id: "en", role: "translation", label: "English", lang: "en" }],
  collections: COLLECTIONS.map(({ abbr: _, ...collection }) => collection),
  groups: COLLECTIONS.map(({ title }) => title),
  works,
  sourceNotes: {},
  notes: { credit: "Henry Wadsworth Longfellow, The Divine Comedy of Dante Alighieri (1867).", introLabel: "About this canto" },
};
