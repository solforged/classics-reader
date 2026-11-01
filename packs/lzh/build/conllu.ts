// Reads the Analects' documents from the Kyoto University Treebank for Classical Chinese (CoNLL-U, UD_Classical_Chinese-
// Kyoto): one document per book, a title sentence and then clause-sized sentences grouped in paragraphs. The text has
// no punctuation and no spaces, and every token carries an English gloss in MISC. Strict: any line the format does
// not explain throws.

export interface KyotoToken {
  form: string;
  /** Kanripo-normalised variant of the form (為 → 爲). */
  lemma: string;
  upos: string;
  /** Kyoto's own tag: "v,動詞,行為,動作". */
  xpos: string;
  feats: Record<string, string>;
  /** Position of the head within the sentence, 0 for the root. */
  head: number;
  deprel: string;
  gloss: string;
}

export interface KyotoSentence {
  id: string;
  /** The tokens' forms joined. */
  text: string;
  tokens: KyotoToken[];
}

export interface KyotoBook {
  /** Book number 1–20. */
  book: number;
  title: KyotoSentence;
  sentences: KyotoSentence[];
}

const pairs = (field: string): Record<string, string> => {
  const out: Record<string, string> = {};
  if (field === "_") return out;
  for (const pair of field.split("|")) {
    const eq = pair.indexOf("=");
    if (eq < 1) throw new Error(`Malformed key=value pair "${pair}"`);
    out[pair.slice(0, eq)] = pair.slice(eq + 1);
  }
  return out;
};

function token(line: string, sentence: string): KyotoToken {
  const cols = line.split("\t");
  if (cols.length !== 10) throw new Error(`${sentence}: expected 10 columns, got ${cols.length}: ${line}`);
  const [, form, lemma, upos, xpos, feats, head, deprel, deps, misc] = cols as unknown as [string, string, string, string, string, string, string, string, string, string];
  const extra = pairs(misc);
  const gloss = extra.Gloss;
  if (!gloss) throw new Error(`${sentence}: token ${form} has no Gloss`);
  for (const key of Object.keys(extra)) {
    if (key !== "Gloss" && key !== "SpaceAfter" && key !== "SpacesAfter") throw new Error(`${sentence}: unexpected MISC ${key}`);
  }
  if (deps !== "_" || !/^\d+$/u.test(head)) throw new Error(`${sentence}: unexpected head/deps columns in ${line}`);
  return { form, lemma, upos, xpos, feats: pairs(feats), head: Number(head), deprel, gloss };
}

/** The twenty books, in order. */
export function parseKyoto(source: string): KyotoBook[] {
  const books: KyotoBook[] = [];
  let sentence: KyotoSentence | undefined;
  let declared: string | undefined;
  let paragraph: { text: string; joined: string } | undefined;
  const closeParagraph = () => {
    if (paragraph && paragraph.text !== paragraph.joined) {
      throw new Error(`Paragraph "${paragraph.text}" differs from its sentences "${paragraph.joined}"`);
    }
  };
  const closeSentence = () => {
    if (!sentence) return;
    sentence.text = sentence.tokens.map((t) => t.form).join("");
    if (sentence.text !== declared) throw new Error(`${sentence.id}: tokens read "${sentence.text}", # text says "${declared}"`);
    if (sentence.tokens.some((t) => t.head > sentence!.tokens.length)) throw new Error(`${sentence.id}: head beyond the sentence`);
    sentence = undefined;
  };
  for (const line of source.split("\n")) {
    if (!line) {
      closeSentence();
      continue;
    }
    const comment = /^# (\S+(?: \S+)*?) = (.*)$/u.exec(line);
    if (line.startsWith("#")) {
      if (!comment) throw new Error(`Unexpected comment line: ${line}`);
      const [, key, value] = comment as unknown as [string, string, string];
      if (key === "newdoc id") {
        closeSentence();
        closeParagraph();
        paragraph = undefined;
        const book = Number(/^KR1h0004_(\d{3})$/u.exec(value)?.[1]);
        if (book !== books.length + 1) throw new Error(`Document ${value} is not book ${books.length + 1}`);
        books.push({ book, title: undefined as unknown as KyotoSentence, sentences: [] });
      } else if (key === "newpar text") {
        closeSentence();
        closeParagraph();
        paragraph = { text: value, joined: "" };
      } else if (key === "sent_id") {
        closeSentence();
        const current = books.at(-1);
        if (!current) throw new Error(`Sentence ${value} before any document`);
        sentence = { id: value, text: "", tokens: [] };
        if (value.endsWith("_title")) current.title = sentence;
        else current.sentences.push(sentence);
      } else if (key === "text") {
        declared = value;
        if (paragraph && !sentence!.id.endsWith("_title")) paragraph.joined += value;
      } else throw new Error(`Unexpected comment ${key}`);
      continue;
    }
    if (!sentence) throw new Error(`Token line outside a sentence: ${line}`);
    sentence.tokens.push(token(line, sentence.id));
  }
  closeSentence();
  closeParagraph();
  for (const book of books) {
    if (!book.title) throw new Error(`Book ${book.book} has no title sentence`);
    if (!book.sentences.length) throw new Error(`Book ${book.book} has no sentences`);
  }
  if (books.length !== 20) throw new Error(`Read ${books.length} books, expected 20`);
  return books;
}
