// Names of the Commedia: the treebank's proper-noun lemmas matched to the entries of Toynbee's dictionary.
//
// The treebank (UD_Italian-Old) lemmatises to modern Italian, "Minosse" for the "Minòs" of the line, "Adige" for the
// "Adice". Toynbee (Concise Dictionary of Proper Names and Notable Matters in the Works of Dante, 1914) files by the
// spelling of the poem's text, and under the family where a person has one: "Accorso, Francesco d'", "Alberti, Orso
// degli". A lemma therefore reaches its entries in one of two ways:
//
//   - the lemma, folded (lower case, accents and apostrophes off), is a headword: every entry of that headword is
//     taken, the numbered homographs together, since the reader orders entries by work;
//   - the lemma is a key of TOYNBEE_HEADS, and the headwords listed there are taken instead. A headword written with
//     a number ("Alpe 2") names that one homograph.
//
// A lemma in neither table is not found. The build checks that each lemma of the treebank is found, or listed in
// NO_TOYNBEE with the reason: a word the treebank tags as a name that Toynbee has no entry for, or an entry the OCR
// lost. The two tables are exclusive, and the build throws on an entry of either that matches nothing.

import type { ToynbeeEntry } from "../../packs/ita/build/toynbee";

/** Treebank PROPN lemma -> Toynbee headword(s) (with homograph number as "Alpe 2"), for lemmas whose Toynbee headword is spelt otherwise. */
export const TOYNBEE_HEADS: Readonly<Record<string, readonly string[]>> = {
  "Abele": ["Abel"],
  "Abramo": ["Abraam"],
  "Accorso": ["Accorso, Francesco d'"],
  "Adige": ["Adice"],
  "Africano": ["Scipione 1", "Scipione 2"],
  "Albero": ["Albero da Siena"],
  "Alberigo": ["Alberigo, Frate"],
  "Alcide": ["Alcide, Alcides"],
  "Aldobrandi": ["Aldobrandi, Tegghiaio"],
  "Alessio": ["Alessio Interminei"],
  "Anagni": ["Alagna"],
  "Antonio": ["Antonio, Sant'"],
  "Appennino": ["Apennino"],
  "Aquino": ["Tommaso 2"],
  "Arcangelo": ["Arcangeli"],
  "Arca": ["Arca, Dell'"],
  "Argenti": ["Argenti, Filippo"],
  "Aristotele": ["Aristotile"],
  "Arles": ["Arli"],
  "Arnaut": ["Arnaldo Daniello"],
  "Arpia": ["Arpie"],
  "Assalonne": ["Absalone"],
  "Azzo": ["Azzo, Ugolino d'"],
  "Bagnacavallo": ["Bagnacaval"],
  "Battista": ["Battista, Il", "Battisteo"],
  "Belisario": ["Bellisar"],
  "Bellincione": ["Bellincion, Berti"],
  "Belo": ["Belo Belus"],
  "Beringhiere": ["Beringhieri"],
  "Bernardino": ["Bernardin di Fosco"],
  "Bernardone": ["Bernardone, Pietro"],
  "Berti": ["Bellincion, Berti"],
  "Bertran": ["Bertram dal Bornio"],
  "Bonatti": ["Bonatti, Guido"],
  "Born": ["Bertram dal Bornio"],
  "Borsiere": ["Borsiere, Guglielmo"],
  "Branda": ["Branda, Fonte"],
  "Brigata": ["Brigata, Il"],
  "Brindisi": ["Brandizio"],
  "Broccia": ["Broccia, Pier dalla"],
  "Bruges": ["Bruggia"],
  "Brunetto": ["Brunetto Latini"],
  "Caccianemico": ["Caccianimico, Venedico", "Caccia d'"],
  "Cadice": ["Gade"],
  "Camicione": ["Camicion de' Pazzi"],
  "Camonica": ["Val Camonica"],
  "Campo": ["Campo di Siena", "Campo Piceno"],
  "Caorsini": ["Caorsino"],
  "Caponsacco": ["Caponsacco, Il"],
  "Carentana": ["Chiarentana"],
  "Carlin": ["Carlino"],
  "Caronte": ["Caron"],
  "Casal": ["Ubertino da Casale", "Casale"],
  "Cattolica": ["Cattolica, La"],
  "Cefas": ["Cephas"],
  "Ceprano": ["Ceperano"],
  "Chiavari": ["Chiaveri"],
  "Ciappetta": ["Ciapetta, Ugo"],
  "Ciotto": ["Gerusalemme, Il Giotto di"],
  "Cipro": ["Cipri"],
  "Classis": ["Chiassi 1", "Chiassi 2"],
  "Cluny": ["Clugni"],
  "Conti": ["Guidi, Conti"],
  "Cornelia": ["Corniglia"],
  "Damiano": ["Damiano, Pier"],
  "Daniele": ["Daniello"],
  "Davide": ["David"],
  "Didone": ["Dido"],
  "Diogene": ["Diogenes"],
  "Dolcino": ["Dolcino, Fra"],
  "Doria": ["Branca d'Oria"],
  "Branca": ["Branca d'Oria"],
  "Duca": ["Guido del Duca"],
  "Duera": ["Buoso da Duera"],
  "Efigenia": ["Ifigenia"],
  "Elba": ["Albia"],
  "Eletra": ["Elettra"],
  "Eliso": ["Elisio"],
  "Empedocle": ["Empedocles"],
  "Eneide": ["Eneida"],
  "Erinni": ["Erine"],
  "Erisittone": ["Eresitone"],
  "Eritone": ["Eriton"],
  "Eufrate": ["Eufrates"],
  "Ezechiele": ["Ezechiel"],
  "Fabrizio": ["Fabbrizio"],
  "Figline": ["Fighine"],
  "Fonte": ["Branda, Fonte"],
  "Fosco": ["Bernardin di Fosco"],
  "Franco": ["Bolognese, Franco"],
  "Gabriele": ["Gabriello"],
  "Gedeone": ["Gedeon"],
  "Genesi": ["Genesis"],
  "Geri": ["Bello, Geri del"],
  "Gerione": ["Gerion"],
  "Giasone": ["Jason 1", "Jason 2"],
  "Gianni": ["Gianni Schicchi", "Gianni de' Soldanier"],
  "Giordano": ["Jordan"],
  "Goffredo": ["Gottifredi, Duca"],
  "Gomita": ["Gomita, Frate"],
  "Gorgone": ["Gorgon"],
  "Governolo": ["Governo"],
  "Gubbio": ["Agobbio 1", "Agobbio 2"],
  "Guinizzelli": ["Guido Guinizelli"],
  "Iacopo": ["Jacopo 1", "Jacopo 2", "Jacopo Rusticucci", "Jacopo da sant' Andrea"],
  "Ibero": ["Ebro"],
  "Ieptè": ["Jepte"],
  "Ieronimo": ["Jeronimo"],
  "Illuminato": ["Illuminato"],
  "Interminei": ["Alessio Interminei"],
  "Iosafàt": ["Josafat"],
  "Isidoro": ["Isidore"],
  "Lachesi": ["Lachesis"],
  "Lacedemona": ["Lacedemone"],
  "Lancillotto": ["Lancelotto"],
  "Limosino": ["Lemosi"],
  "Macario": ["Maccario"],
  "Magno": ["Carlo Magno"],
  "Maiorca": ["Maiolica"],
  "Mangiadore": ["Pietro Mangiadore"],
  "Marocco": ["Morrocco"],
  "Mascheroni": ["Mascheroni, Sassol"],
  "Mardoceo": ["Mardocheo"],
  "Medicina": ["Medicina, Pier da"],
  "Minosse": ["Minos"],
  "Mira": ["Mira, La"],
  "Monviso": ["Monte Veso"],
  "Mosè": ["Moise"],
  "Narciso": ["Narcisso"],
  "Nasidio": ["Nassidio"],
  "Nathan": ["Natan"],
  "Nazareth": ["Nazzarette"],
  "Notaro": ["Jacopo da Lentino"],
  "Novello": ["Federico Novello"],
  "Obizzo": ["Obizzo da Esti"],
  "Oriaco": ["Oriago"],
  "Osterlicchi": ["Austericch"],
  "Ottacchero": ["Ottachero"],
  "Pagano": ["Mainardo Pagano"],
  "Palazzo": ["Currado da Palazzo"],
  "Pantasilea": ["Pentesilea"],
  "Paride": ["Paris"],
  "Pazzo": ["Pazzo, Rinier"],
  "Pegasea": ["Pegaseo"],
  "Pera": ["Pera, Della"],
  "Pettinaio": ["Pettinagno, Pier"],
  "Piave": ["Piava"],
  "Pia": ["Pia, La"],
  "Piceno": ["Campo Piceno"],
  "Pila": ["Pila, Ubaldin dalla"],
  "Polimnia": ["Polinnia"],
  "Polinestore": ["Polinestor"],
  "Policleto": ["Policreto"],
  "Porta": ["Porta Sole"],
  "Prata": ["Guido da Prata"],
  "Principato": ["Principati"],
  "Provenzano": ["Provenzan Salvani"],
  "Puccio": ["Puccio Sciancato"],
  "Rodolfo": ["Ridolfo 1", "Ridolfo 2"],
  "Romualdo": ["Romoaldo"],
  "Rubicone": ["Rubicon"],
  "Rife": ["Montagne Rife"],
  "Riniero": ["Corneto, Rinier da", "Pazzo, Rinier", "Rinier da Calboli"],
  "Rosso": ["Mare Rosso"],
  "Ruberto": ["Guiscardo"],
  "Ruggieri": ["Ruggieri, Arcivescovo"],
  "Rusticucci": ["Jacopo Rusticucci"],
  "Saffira": ["Safira"],
  "Saladino": ["Saladino, Il"],
  "Salterello": ["Lapo Salterello"],
  "Salvani": ["Provenzan Salvani"],
  "Sardegna": ["Sardigna"],
  "Sassolo": ["Mascheroni, Sassol"],
  "Schicchi": ["Gianni Schicchi"],
  "Sciancato": ["Puccio Sciancato"],
  "Sciro": ["Schiro"],
  "Semiramide": ["Semiramis"],
  "Sestri": ["Siestri"],
  "Simeonta": ["Simoenta"],
  "Simon": ["Simon Mago"],
  "Simone": ["Simon Mago"],
  "Siviglia": ["Sibilia"],
  "Sodoma": ["Soddoma"],
  "Soratte": ["Siratti"],
  "Spano": ["Pietro Ispano"],
  "Spirito": ["Spirito Santo"],
  "Strofadi": ["Strofade"],
  "Tacco": ["Ghin di Tacco"],
  "Ghino": ["Ghin di Tacco"],
  "Tambernicchi": ["Tambernic"],
  "Tarpea": ["Tarpeia"],
  "Tignoso": ["Federico Tignoso"],
  "Tolomeo": ["Tolommeo 1", "Tolommeo 2"],
  "Toppo": ["Toppo, Il"],
  "Traversari": ["Traversaro, Pier", "Traversara"],
  "Tristano": ["Tristan"],
  "Ubaldino": ["Pila, Ubaldin dalla"],
  "Ubertin": ["Donato, Ubertin"],
  "Ugo": ["Ciapetta, Ugo", "Ugo da San Vittore"],
  "Ungheria": ["Ungaria"],
  "Uguiccione": ["Uguccione 1", "Uguccione 2"],
  "Uranìe": ["Urania"],
  "Valdigrieve": ["Valdigreve"],
  "Vanni": ["Fucci, Vanni"],
  "Varrone": ["Varro"],
  "Vecchio": ["Vecchio, Del"],
  "Venceslao": ["Vincislao"],
  "Venedico": ["Caccianimico, Venedico"],
  "Zanche": ["Michel Zanche"],
  "Zefiro": ["Zeffiro"],
  "Zita": ["Zita, Santa"],
  "Averroè": ["Averrois"],
  "Guerra": ["Guido Guerra"],
  "Marco": ["Marco Lombardo"],
  "Gherardo": ["Cammino, Gherardo da"],
  "Zeno": ["Zeno, San"],
  "Castello": ["Castello, Guido da"],
  "Bolognese": ["Bolognese, Franco"],
  "Donati": ["Buoso Donati"],
  "Mainardi": ["Mainardi, Arrigo"],
  "Scotto": ["Michele Scotto"],
  "Michele": ["Michele", "Michele Scotto", "Michel Zanche"],
  "Filippo": ["Filippo 1", "Filippo 2", "Argenti, Filippo"],
  "Latini": ["Brunetto Latini"],
  "Corrado": ["Corrado", "Currado 1", "Currado 2", "Currado Malaspina", "Currado da Palazzo"],
  "Orso": ["Orso, Cont'"],
  "Peccatore": ["Damiano, Pier"],
  "Ramondo": ["Ramondo Berlinghieri"],
  "Naiadi": ["Naiade"],
  "Iscariota": ["Giuda 1"],
  "Bryson": ["Brisso"],
  "Garisenda": ["Carisenda"],
  "Elì": ["El"],
};

/** Treebank PROPN lemmas with no Toynbee entry, each with the reason ("not a name: Toynbee has no entry for common words", "OCR lost the entry", ...). */
export const NO_TOYNBEE: Readonly<Record<string, string>> = {};

/** A headword or lemma as compared: accents and apostrophes off, lower case, one space after a comma. */
export const fold = (text: string): string =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f'’]/gu, "")
    .toLowerCase()
    .replace(/\s*,\s*/gu, ", ")
    .replace(/\s+/gu, " ")
    .trim();

/** "Alpe 2" -> the headword and its homograph number; a trailing roman numeral is part of the headword. */
function split(spec: string): { head: string; n?: number } {
  const m = /^(.*\S) (\d+)$/u.exec(spec);
  return m ? { head: m[1] ?? spec, n: Number(m[2]) } : { head: spec };
}

const indexes = new WeakMap<readonly ToynbeeEntry[], Map<string, ToynbeeEntry[]>>();

/** The entries by folded headword. */
function indexOf(entries: readonly ToynbeeEntry[]): Map<string, ToynbeeEntry[]> {
  let index = indexes.get(entries);
  if (!index) {
    index = new Map();
    for (const entry of entries) {
      const key = fold(entry.head);
      index.set(key, [...(index.get(key) ?? []), entry]);
    }
    indexes.set(entries, index);
  }
  return index;
}

/** The entries of one headword ("Alpe 2" only the second), a cross-reference replaced by what it refers to. */
function lookup(spec: string, index: ReadonlyMap<string, ToynbeeEntry[]>, path: readonly ToynbeeEntry[]): ToynbeeEntry[] {
  const { head, n } = split(spec.replace(/[.\s]+$/u, ""));
  const found: ToynbeeEntry[] = [];
  for (const entry of index.get(fold(head)) ?? []) {
    if ((n !== undefined && entry.n !== n) || path.includes(entry)) continue;
    const targets = entry.see?.flatMap((ref) => lookup(ref, index, [...path, entry])) ?? [];
    found.push(...(entry.see && targets.length ? targets : [entry]));
  }
  return found;
}

/**
 * The entries of Toynbee's dictionary for a treebank PROPN lemma: those of the headwords TOYNBEE_HEADS gives for it,
 * or of the lemma itself. An entry that only refers to another ("Adam. [Adamo.]") is replaced by what it refers to,
 * when the reference reads; otherwise it is returned as it stands.
 */
export function namesFor(lemma: string, entries: readonly ToynbeeEntry[]): ToynbeeEntry[] {
  const index = indexOf(entries);
  const found = (TOYNBEE_HEADS[lemma] ?? [lemma]).flatMap((spec) => lookup(spec, index, []));
  return found.filter((entry, k) => found.indexOf(entry) === k);
}
