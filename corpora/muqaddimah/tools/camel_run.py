"""Stage 1 of the Muqaddimah annotation: sentences, tokens and CAMeL Tools' analysis of each token.

    CAMELTOOLS_DATA=/tmp/muq-research/annotation/camel_data \\
      /tmp/muq-research/annotation/venv-camel/bin/python corpora/muqaddimah/tools/camel_run.py \\
      --rows /tmp/muq-build/rows.json --raw /tmp/muq-build/camel-raw.json

reads the rows tools/units.ts wrote, cuts each row into sentences, tokenizes them, and disambiguates every sentence with
CAMeL Tools 1.6.0's BERT-unfactored MSA model over calima-msa-r13. It writes the raw analyses (the fields tools/annotate.py
uses) to --raw, so that the conversion can be run again and again without running the model (20 s on a laptop CPU).

The analyzer's backoff is NOAN_ALL, not the ADD_PROP the model ships with. ADD_PROP adds a proper-noun guess to every
word, and the model prefers it for about 3% of the words, among them closed-class words the database knows (مع, حيث, كذا,
حسبما): they come out as unanalysed names. NOAN_ALL guesses only for words the database has no analysis for, and guesses
every part of speech, so a word like قليلون comes out as an adjective and عاصرهم as a verb with its pronoun. The guesses have
source "backoff", no root ("O") and no clean segmentation; tools/annotate.py segments them from the clitic tags.

Sentences (see split_sentences): a heading is one sentence, a verse row has one sentence per verse line, and a prose row
is cut after every whitespace-separated chunk that ends in . ؟ ! or : (and the closing quotes or brackets after it),
except a colon between digits (a Qur'an reference, 73: 5). The edition punctuates so little that this leaves sentences
of up to 1,000 words, so a sentence of more than SENTENCE_CAP + SLACK chunks is cut further, after a comma, else before a
word that opens with the conjunction و or ف, else at the cap. Those cuts are for reading and for the model's context
window, not syntax; the CoNLL-U carries no dependencies. The sentences of a row, joined by one space, are the row's text,
so the # text lines of the CoNLL-U reproduce the OpenITI paragraph exactly.
Tokens: the chunks of a sentence, each cut by CAMeL's simple_word_tokenize into letters, digits and punctuation, except the
verse break "..." (one token). The tokens of a chunk are written without a space between them.
"""
import argparse
import json
import os
import re
import sys
from pathlib import Path

os.environ.setdefault("CAMELTOOLS_DATA", "/tmp/muq-research/annotation/camel_data")

TERMINATOR = re.compile(r"[.؟!:][»)\]]*$")
CLOSERS_ONLY = re.compile(r"^[»)\]]+[.؟!:]*$")
CONJUNCTION_WORD = re.compile(r"^[وف][\u0621-\u064A\u0671]{2,}$")
# The analysis fields tools/annotate.py reads.
FIELDS = ("diac", "lex", "root", "pos", "ud", "atbseg", "d3tok", "enc0", "prc0", "prc1", "prc2", "prc3",
          "gen", "num", "per", "asp", "vox", "mod", "cas", "stt", "source", "pattern", "stemcat")
SENTENCE_CAP = 90
CUT_FROM = 50
SLACK = 20
BACKOFF = "NOAN_ALL"


def cap_sentence(chunks):
    """A sentence longer than SENTENCE_CAP + SLACK chunks, cut into sentences of at most that many."""
    out = []
    while len(chunks) > SENTENCE_CAP + SLACK:
        window = range(CUT_FROM, SENTENCE_CAP + 1)
        at = next((k for k in reversed(window) if chunks[k - 1].endswith("،")), None)
        if at is None:
            at = next((k for k in reversed(window) if CONJUNCTION_WORD.match(chunks[k])), SENTENCE_CAP)
        out.append(chunks[:at])
        chunks = chunks[at:]
    out.append(chunks)
    return out


def split_sentences(row):
    """The sentences of a row as lists of chunks."""
    if row["kind"] == "head":
        return [row["text"].split(" ")]
    if row["kind"] == "verse":
        return [line.split(" ") for line in row["lines"]]
    chunks = row["text"].split(" ")
    sentences, current = [], []
    for i, chunk in enumerate(chunks):
        current.append(chunk)
        nxt = chunks[i + 1] if i + 1 < len(chunks) else None
        if nxt is None:
            break
        if not TERMINATOR.search(chunk):
            continue
        if chunk.endswith(":") and re.search(r"\d:$", chunk) and re.match(r"^\d", nxt):
            continue
        if CLOSERS_ONLY.match(nxt):
            continue
        sentences.append(current)
        current = []
    if current:
        sentences.append(current)
    return [part for sentence in sentences for part in cap_sentence(sentence)]


def tokenize(chunks, simple_word_tokenize):
    """[(token, space_after)] for the chunks of one sentence."""
    out = []
    for c, chunk in enumerate(chunks):
        pieces = ["..."] if chunk == "..." else simple_word_tokenize(chunk)
        if "".join(pieces) != chunk:
            raise SystemExit(f"tokenizer changed {chunk!r}: {pieces!r}")
        for p, piece in enumerate(pieces):
            out.append((piece, p == len(pieces) - 1 and c < len(chunks) - 1))
    return out


def load_disambiguator():
    """The model `pretrained('msa')` loads, over an analyzer with the backoff BACKOFF instead of the shipped one."""
    from camel_tools.data import CATALOGUE
    from camel_tools.disambig.bert.unfactored import FEATURE_SET_MAP, BERTUnfactoredDisambiguator
    from camel_tools.morphology.analyzer import Analyzer
    from camel_tools.morphology.database import MorphologyDB

    info = CATALOGUE.get_dataset("DisambigBertUnfactored", "msa")
    config = json.loads(Path(info.path, "default_config.json").read_text())
    analyzer = Analyzer(MorphologyDB.builtin_db(config["db_name"], "a"), backoff=BACKOFF, cache_size=10000)
    return BERTUnfactoredDisambiguator(
        str(info.path), analyzer, top=1, features=FEATURE_SET_MAP[config["feature"]], scorer=config["scorer"],
        tie_breaker=config["tie_breaker"], use_gpu=False, batch_size=32)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--rows", default="/tmp/muq-build/rows.json")
    ap.add_argument("--raw", default="/tmp/muq-build/camel-raw.json")
    args = ap.parse_args()

    from camel_tools.tokenizers.word import simple_word_tokenize

    units = json.load(open(args.rows, encoding="utf-8"))["units"]
    dis = load_disambiguator()
    out = {"backoff": BACKOFF, "units": []}
    rows_done = 0
    for unit in units:
        rows_out = []
        for row in unit["rows"]:
            sentences_out = []
            for chunks in split_sentences(row):
                tokens = tokenize(chunks, simple_word_tokenize)
                results = dis.disambiguate([t for t, _ in tokens])
                if len(results) != len(tokens):
                    raise SystemExit(f"{row['pid']}: {len(results)} analyses for {len(tokens)} tokens; lower SENTENCE_CAP")
                sentences_out.append({
                    "tokens": [
                        {"form": t, "space": s, "a": {f: d.analyses[0].analysis.get(f) for f in FIELDS}}
                        for (t, s), d in zip(tokens, results)
                    ],
                })
            rows_out.append({"pid": row["pid"], "kind": row["kind"], "sentences": sentences_out})
            rows_done += 1
        out["units"].append({"id": unit["id"], "rows": rows_out})
        print(unit["id"], "done", file=sys.stderr, flush=True)
    json.dump(out, open(args.raw, "w", encoding="utf-8"), ensure_ascii=False)
    print("rows", rows_done)


if __name__ == "__main__":
    main()
