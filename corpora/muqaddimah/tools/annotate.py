"""Stage 2 of the Muqaddimah annotation: CAMeL Tools' analyses to Universal Dependencies CoNLL-U.

Rerunning the annotation from scratch (only stage 1 needs the model):

    bun corpora/muqaddimah/tools/units.ts --source <openiti file> --rows /tmp/muq-build/rows.json
    CAMELTOOLS_DATA=/tmp/muq-research/annotation/camel_data \\
      /tmp/muq-research/annotation/venv-camel/bin/python corpora/muqaddimah/tools/camel_run.py \\
      --rows /tmp/muq-build/rows.json --raw /tmp/muq-build/camel-raw.json
    python3 corpora/muqaddimah/tools/annotate.py --raw /tmp/muq-build/camel-raw.json \\
      --out corpora/muqaddimah/data/conllu --report /tmp/muq-build/annotation-report.json
    bun corpora/muqaddimah/tools/check.ts        # paragraph text = # text, units.json = conllu
    bun corpora/muqaddimah/tools/pins.ts         # re-pin every vendored file in sources.ts

(camel_run.py needs CAMeL Tools 1.6.0 and its data: `camel_data -i defaults`, which has the MSA BERT model and
calima-msa-r13.)

The contract this stage writes to (shared with the pack's describeMorph and the build):

* One CoNLL-U file per review unit. A row (paragraph, heading or verse row) opens with `# newpar id = <pid>`; each
  sentence has `# sent_id = <pid>.<k>` and `# text = ...`. The sentences' texts joined by one space are the row's text.
* A written word is one token line, or, when it holds clitics, a range line (`1-3  وبالعلم`) over one line per syntactic
  word: proclitic conjunctions and prepositions (وَ فَ بِ لِ كَ سَ and the question hamza), the stem (with the article ال
  kept in it, as CAMeL segments) and an enclitic pronoun (lemma هُوَ, هِيَ ...). Punctuation is a PUNCT token (lemma = form);
  `...` is the break between the two hemistichs of a verse line. SpaceAfter=No goes on the token or the range line, never
  on a word inside a range.
* FORM is the written letters of the syntactic word. LEMMA is the vocalized lemma (alif wasla written as plain alif).
  MISC has Root= (CAMeL's root, radicals dot-separated, # for a weak or hamza radical CAMeL leaves open; only for the
  open classes NOUN VERB ADJ ADV and number words, never for names or function words), Diac= (the word's own vocalized
  segment; absent for a guessed word, which CAMeL gives no vowels) and SpaceAfter=No. CAMeL's English glosses are not
  kept (the analyzer database is GPL-2).
* FEATS use only Abbr, Aspect, Case, Definite, Gender, Mood, NumForm, Number, Person, Polarity, PronType, VerbForm and
  Voice. CAMeL marks no participles or verbal nouns, so VerbForm is Fin for verbs and nothing else; the word-by-word
  review adds Part and Vnoun by hand.
* Words the analyzer's database lacks (about 3% of the text: place names, gentilics, rare verbal nouns and plurals) are
  CAMeL backoff guesses. patches.py completes them: STEMS, keyed by the stem written without clitics or article, gives
  lemma, UPOS, root and features; WHOLE overrides a written token (and may split it into several syntactic words); FIXES
  re-lemmatize or re-tag a word CAMeL analysed wrongly (closed-class words, elatives, a few roots), with the numeral rule;
  MERGES join pieces CAMeL cut out of one word (ب + عَضّ); FOREIGN marks the letters of a cipher or a foreign word as X.
  The script stops on an unused entry. A guessed word with no entry is kept as CAMeL guessed it (a name's lemma is
  its written stem) and listed in the report as questionable, with the other doubts (FLAGS).
"""
import argparse
import collections
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patches  # noqa: E402
from patches import DIACRITICS, KEEP, bare, dediac, norm  # noqa: E402

ROOT_SHAPE = re.compile("^[\u0621-\u064A#](\\.[\u0621-\u064A#])+$")
LEMMA_SHAPE = re.compile("^[\u0621-\u064A\u064B-\u0652\u0670]+$")

GEN = {"m": "Masc", "f": "Fem"}
NUM = {"s": "Sing", "d": "Dual", "p": "Plur"}
ASP = {"p": "Perf", "i": "Imp"}
VOX = {"a": "Act", "p": "Pass"}
MOD = {"i": "Ind", "s": "Sub", "j": "Jus"}
CAS = {"n": "Nom", "a": "Acc", "g": "Gen"}
STT = {"d": "Def", "i": "Ind", "c": "Cons"}

POS_UPOS = {
    "noun": "NOUN", "adj": "ADJ", "noun_prop": "PROPN", "verb": "VERB", "adv": "ADV", "adv_rel": "ADV",
    "adv_interrog": "ADV", "pron": "PRON", "pron_dem": "DET", "pron_rel": "PRON", "pron_interrog": "PRON",
    "conj": "CCONJ", "conj_sub": "SCONJ", "prep": "ADP", "part": "PART", "part_neg": "PART", "part_focus": "PART",
    "part_voc": "PART", "part_interrog": "PART", "part_verb": "AUX", "verb_pseudo": "SCONJ", "interj": "INTJ",
    "noun_num": "NUM", "noun_quant": "NOUN", "adj_comp": "ADJ", "adj_num": "NUM", "abbrev": "X",
}
NOMINAL_POS = {"noun", "adj", "noun_prop", "noun_num", "noun_quant", "adj_comp", "adj_num"}
PROCLITIC_UPOS = {"و": "CCONJ", "ف": "CCONJ", "ب": "ADP", "ل": "ADP", "ك": "ADP", "س": "AUX", "أ": "PART"}
OPEN_UPOS = {"NOUN", "VERB", "ADJ", "ADV"}
UPOS_VALUES = {"NOUN", "VERB", "ADJ", "ADV", "ADP", "CCONJ", "SCONJ", "PRON", "DET", "PART", "AUX", "PROPN", "NUM", "PUNCT",
               "X", "INTJ", "SYM"}

ENC_LEMMA = {
    "3ms": "هُوَ", "3fs": "هِيَ", "3d": "هُمَا", "3mp": "هُمْ", "3fp": "هُنَّ", "2ms": "أَنْتَ", "2fs": "أَنْتِ",
    "2d": "أَنْتُمَا", "2mp": "أَنْتُمْ", "2fp": "أَنْتُنَّ", "1s": "أَنَا", "1p": "نَحْنُ",
}
ENC_LETTERS = {"3ms": 1, "3fs": 2, "3d": 3, "3mp": 2, "3fp": 2, "2ms": 1, "2fs": 1, "2d": 3, "2mp": 2, "2fp": 2, "1p": 2}
ENC_PERSON = re.compile(r"^(\d)([mf]?)([sdp])$")
ENC_SPECIAL = {"mA_rel": ("مَا", 2), "man_rel": ("مَنْ", 2)}

FLAGS = (
    "guessed",       # a word the database lacks that patches.py does not complete: CAMeL's guess is kept
    "guessed-name",  # the same, guessed to be a name: lemma = the written stem
    "no-ud",         # CAMeL gave no UPOS for a piece; the part of speech supplies it
    "segmentation",  # CAMeL's clitic segmentation does not match the written word; the word is kept whole
    "abbrev",        # CAMeL's NTWS 'abbreviation' analysis of an ordinary word
)


def plain_alif(text):
    return text.replace("ٱ", "ا")


def feats_string(feats):
    return "|".join(f"{k}={v}" for k, v in sorted(feats.items())) or "_"


def parse_feats(text):
    return dict(pair.split("=") for pair in text.split("|")) if text else {}


class Word:
    __slots__ = ("form", "lemma", "upos", "feats", "root", "diac", "croot", "unsure")

    def __init__(self, form, lemma, upos, feats=None, root=None, diac=None, croot=None):
        self.form, self.lemma, self.upos = form, lemma, upos
        self.feats, self.root, self.diac = feats or {}, root, diac
        self.croot = croot  # CAMeL's root whatever the class, for a fix that keeps it
        self.unsure = None  # (flag, note): reported unless a patch settles the word


class Context:
    """Counts what patches.py is used for, and what stays doubtful."""

    def __init__(self):
        self.flags = []
        self.flag_counts = collections.Counter()
        self.used = collections.defaultdict(collections.Counter)
        self.patched_tokens = 0

    def flag(self, flag, sid, form, note=""):
        assert flag in FLAGS, flag
        self.flag_counts[flag] += 1
        self.flags.append({"flag": flag, "sent": sid, "form": form, "note": note})


def stem_feats(a, upos):
    """FEATS of a stem word from CAMeL's feature codes."""
    pos = a["pos"]
    if pos == "verb" and upos in ("VERB", "AUX"):
        feats = {"VerbForm": "Fin"}
        if a["asp"] in ASP:
            feats["Aspect"] = ASP[a["asp"]]
            if a["asp"] == "i" and a["mod"] in MOD:
                feats["Mood"] = MOD[a["mod"]]
        elif a["asp"] == "c":
            feats["Mood"] = "Imp"
        if a["vox"] in VOX:
            feats["Voice"] = VOX[a["vox"]]
        if a["per"] in ("1", "2", "3"):
            feats["Person"] = a["per"]
        for key, table, name in (("gen", GEN, "Gender"), ("num", NUM, "Number")):
            if a[key] in table:
                feats[name] = table[a[key]]
        return feats
    feats = {}
    if pos in NOMINAL_POS or pos in ("pron", "pron_rel"):
        for key, table, name in (("gen", GEN, "Gender"), ("num", NUM, "Number")):
            if a[key] in table:
                feats[name] = table[a[key]]
    if pos in NOMINAL_POS:
        if a["cas"] in CAS:
            feats["Case"] = CAS[a["cas"]]
        if a["stt"] in STT:
            feats["Definite"] = STT[a["stt"]]
    if pos == "pron_dem":
        feats["PronType"] = "Dem"
        for key, table, name in (("gen", GEN, "Gender"), ("num", NUM, "Number")):
            if a[key] in table:
                feats[name] = table[a[key]]
    elif pos == "pron":
        feats["PronType"] = "Prs"
        if a["per"] in ("1", "2", "3"):
            feats["Person"] = a["per"]
    elif pos in ("pron_rel", "adv_rel"):
        feats["PronType"] = "Rel"
    elif pos in ("pron_interrog", "adv_interrog", "part_interrog"):
        feats["PronType"] = "Int"
    elif pos == "part_neg":
        feats["Polarity"] = "Neg"
    if upos == "NUM":
        feats["NumForm"] = "Word"
    return feats


def enclitic(a):
    """(lemma, feats) of the enclitic pronoun or relative particle."""
    if a["enc0"] in ENC_SPECIAL:
        return ENC_SPECIAL[a["enc0"]][0], {"PronType": "Rel"}
    code, kind = a["enc0"].rsplit("_", 1)
    match = ENC_PERSON.match(code)
    if not match or code not in ENC_LEMMA or kind not in ("poss", "pron", "dobj"):
        raise SystemExit(f"unknown enclitic {a['enc0']}")
    person, gender, number = match.groups()
    feats = {"PronType": "Prs", "Person": person, "Number": NUM[number]}
    if gender:
        feats["Gender"] = GEN[gender]
    if kind == "dobj" or (kind == "pron" and a["pos"] in ("verb_pseudo", "conj_sub")):
        feats["Case"] = "Acc"
    else:
        feats["Case"] = "Gen"
    return ENC_LEMMA[code], feats


def enclitic_letters(a):
    if a["enc0"] in ENC_SPECIAL:
        return ENC_SPECIAL[a["enc0"]][1]
    code = a["enc0"].split("_")[0]
    if code == "1s":
        return 2 if a["enc0"].endswith("dobj") else 1
    return ENC_LETTERS[code]


def split_diac(text, letters):
    """(first `letters` base letters with their diacritics, the rest)."""
    seen = 0
    for i, ch in enumerate(text):
        if not DIACRITICS.match(ch):
            if seen == letters:
                return text[:i], text[i:]
            seen += 1
    return text, ""


def written_forms(written, pieces):
    """The written letters of each piece: substrings of the token when the pieces' letters add up to it."""
    bases = [dediac(piece) for piece in pieces]
    if sum(len(base) for base in bases) == len(written):
        at, out = 0, []
        for base in bases:
            part = written[at:at + len(base)]
            if norm(part) != norm(base):
                break
            out.append(part)
            at += len(base)
        else:
            return out
    return bases


def cut_clitics(diac, word, proclitics, enc_letters):
    """A vocalized word cut into one-letter proclitics, a stem and an enclitic of `enc_letters` letters; None if it does not fit."""
    if len(dediac(diac)) != len(word) or proclitics + enc_letters >= len(word):
        return None
    pieces, rest = [], diac
    for _ in range(proclitics):
        piece, rest = split_diac(rest, 1)
        pieces.append(piece)
    stem, tail = split_diac(rest, len(dediac(rest)) - enc_letters)
    pieces.append(stem)
    if enc_letters:
        pieces.append(tail)
    return pieces


def pieces_of(token, a, guessed):
    """The vocalized pieces of an analysis (proclitics, stem, enclitic), or None when they do not fit the written word."""
    word = token["form"]
    has_enc = a["enc0"] not in ("0", "na")
    suffix = enclitic_letters(a) if has_enc else 0
    if guessed:
        # atbseg has NOAN in it: cut the vocalized word by the clitic tags (one letter per proclitic).
        prefix = sum(1 for tag in ("prc3", "prc2", "prc1") if a[tag] not in ("0", "na", None))
        pieces = cut_clitics(a["diac"], word, prefix, suffix)
    else:
        raw = a["atbseg"].split("+")
        pieces = [p for p in (piece.strip("_") for piece in raw) if p]
        # atbseg marks a stem that an enclitic follows with a trailing "_" (لَ_+هُ); without it (يُوَزِّعْنا, وَ+_يُرْشِدْنا)
        # the object pronoun stays on the verb and is cut here
        if has_enc and not (len(raw) >= 2 and raw[-2].endswith("_")):
            tail = cut_clitics(pieces[-1], dediac(pieces[-1]), 0, suffix)
            pieces = pieces[:-1] + tail if tail else None
    if pieces is None or (has_enc and len(pieces) < 2):
        return None
    if norm("".join(pieces)) != norm(word) and has_enc:
        # the feminine ending ة of a stem is written ت before an enclitic (مشكاته)
        at = len(pieces) - 2
        base = dediac(pieces[at])
        if base.endswith("ة"):
            cut = pieces[at].rindex("ة")
            pieces = pieces[:at] + [pieces[at][:cut] + "ت" + pieces[at][cut + 1:]] + pieces[at + 1:]
    if norm("".join(pieces)) != norm(word):
        return None
    return pieces


def stem_index(pieces, a):
    return len(pieces) - (2 if a["enc0"] not in ("0", "na") else 1)


def stem_key(form, a, pieces_forms, stem_at):
    """The stem as patches.STEMS spells it: written, without the article, normalised."""
    stem = pieces_forms[stem_at]
    if a["prc0"] == "Al_det":
        if stem.startswith("ال"):
            stem = stem[2:]
        elif stem.startswith("ل") and a["prc1"] == "li_prep":
            stem = stem[1:]
    return stem


def convert_token(token, sid, ctx):
    """The syntactic words of one written token."""
    a, form = token["a"], token["form"]
    if a["pos"] == "punc" or form == "...":
        return [Word(form, form, "PUNCT")]
    if a["pos"] == "digit":
        return [Word(form, form, "NUM", {"NumForm": "Digit"})]
    if form in patches.FOREIGN.get(sid.rsplit(".", 1)[0], ()):
        ctx.used["FOREIGN"][(sid.rsplit(".", 1)[0], form)] += 1
        ctx.patched_tokens += 1
        return [Word(form, form, "X")]
    if form in patches.WHOLE:
        ctx.used["WHOLE"][form] += 1
        ctx.patched_tokens += 1
        return [make_word(w) for w in patches.WHOLE[form]]
    if a["pos"] == "abbrev":
        if form not in patches.ABBREV:
            ctx.flag("abbrev", sid, form, a["lex"])
        else:
            ctx.used["ABBREV"][form] += 1
            ctx.patched_tokens += 1
            return [make_word(w) for w in patches.ABBREV[form]]

    guessed = a["source"] == "backoff"
    pieces = pieces_of(token, a, guessed)
    if pieces is None:
        ctx.flag("segmentation", sid, form, a["atbseg"])
        pieces = [form]
        a = dict(a, enc0="0", prc0="0", prc1="0", prc2="0", prc3="0", diac=form)
    stem_at = stem_index(pieces, a)
    forms = written_forms(form, pieces)

    uds = [u for u in (a["ud"] or "").split("+") if u]
    if guessed:
        uds = []
    expected = len(pieces)
    if len(uds) == expected - 1 and expected > 1 and not guessed:
        # ud lacks one word: the enclitic pronoun when the last one is not a PRON (verb + 1p), else the stem (لله)
        if a["enc0"] not in ("0", "na") and uds[-1] not in ("PRON", "SCONJ"):
            uds.append("")
        else:
            uds.insert(stem_at, "")
    if len(uds) != expected:
        uds = [""] * expected

    words = []
    for index, (piece, written, upos) in enumerate(zip(pieces, forms, uds)):
        if index < stem_at:
            upos = upos or PROCLITIC_UPOS.get(written[:1], "CCONJ")
            if written == "س":
                upos = "AUX"
            words.append(Word(written, plain_alif(piece), upos, diac=plain_alif(piece)))
        elif index == stem_at:
            word = guessed_word(a, written, forms, stem_at, sid, ctx) if guessed else stem_word(a, written, piece, upos, sid, ctx)
            words.append(apply_fixes(word, sid, ctx))
        else:
            lemma, feats = enclitic(a)
            default = "SCONJ" if a["enc0"] in ENC_SPECIAL and a["enc0"] != "man_rel" else "PRON"
            words.append(Word(written, lemma, upos or default, feats, diac=plain_alif(piece)))
    for word in words:
        if word.unsure:
            ctx.flag(word.unsure[0], sid, word.form, word.unsure[1])
    return apply_merges(words, ctx)


def make_word(spec):
    return Word(spec["form"], spec["lemma"], spec["upos"], parse_feats(spec.get("feats", "")), spec.get("root"), spec.get("diac"))


NOMINAL_FEATS = ("Gender", "Number", "Case", "Definite")
VERBAL_FEATS = ("VerbForm", "Aspect", "Mood", "Voice", "Person", "Gender", "Number")
FEATS_OF = {
    "NOUN": NOMINAL_FEATS, "ADJ": NOMINAL_FEATS, "NUM": NOMINAL_FEATS + ("NumForm",), "PROPN": ("Definite",),
    "VERB": VERBAL_FEATS, "AUX": VERBAL_FEATS, "PRON": ("Gender", "Number", "Person", "PronType", "Case"),
    "DET": ("Gender", "Number", "PronType", "Case"), "PART": ("Polarity",),
}


def retarget(word, upos, lemma, root, feats, diac):
    """Make `word` a `lemma` of class `upos`: the features the new class has are kept, `feats` are added."""
    kept = FEATS_OF.get(upos, ())
    if upos != word.upos:
        word.feats = {k: v for k, v in word.feats.items() if k in kept}
    word.feats.update(parse_feats(feats))
    if upos == "NUM":
        word.feats["NumForm"] = "Word"
    if root is KEEP:
        root = word.croot
    word.root = root if root and ROOT_SHAPE.match(root) and (upos in OPEN_UPOS or upos == "NUM") else None
    word.diac = diac or (word.diac if norm(lemma) == norm(word.lemma) else None)
    word.upos, word.lemma = upos, lemma


def apply_fixes(word, sid, ctx):
    """patches.FIXES: a stem whose lemma or class CAMeL gives wrongly."""
    stem, written = bare(word.form), norm(word.form)
    for index in patches.FIXES_BY.get(norm(word.lemma), ()):
        fix = patches.FIXES[index]
        if word.upos not in fix["upos"] or (fix["forms"] is not None and stem not in fix["forms"] and written not in fix["forms"]):
            continue
        if sid in fix["not_in"]:
            ctx.used["NOT_IN"][(index, sid)] += 1
            return word
        ctx.used["FIXES"][index] += 1
        retarget(word, fix["to_upos"], fix["to_lemma"], fix["root"], fix["feats"], fix["diac"])
        word.unsure = None
        return word
    return word


def apply_merges(words, ctx):
    """patches.MERGES: consecutive words CAMeL cuts out of one word (ب + عَضّ for بعض) made one."""
    for index, merge in enumerate(patches.MERGES):
        pieces = merge["pieces"]
        at = 0
        while at + len(pieces) <= len(words):
            run = words[at:at + len(pieces)]
            if all(norm(w.lemma) == lemma and w.upos == upos for w, (lemma, upos) in zip(run, pieces)):
                ctx.used["MERGES"][index] += 1
                joined = Word("".join(w.form for w in run), run[-1].lemma, run[-1].upos, dict(run[-1].feats), croot=run[-1].croot)
                retarget(joined, merge["upos"], merge["lemma"], merge["root"], merge["feats"], None)
                words[at:at + len(pieces)] = [joined]
            at += 1
    return words


def stem_word(a, written, piece, upos, sid, ctx):
    pos = a["pos"]
    lemma = plain_alif(a["lex"])
    unsure = None
    if not upos:
        upos = POS_UPOS.get(pos, "X")
        if pos in ("noun", "adj"):
            unsure = ("no-ud", f"{pos} {lemma}")
    elif upos == "VERB" and pos in ("noun", "adj") and a["asp"] not in ASP and a["asp"] != "c":
        # an elative or an ordinal (أكثر, العاشر) that ud calls a verb: CAMeL's own pos has it a noun or adjective
        upos = "ADJ"
        ctx.used["ud-verb-nominal"][lemma] += 1
    word = Word(written, lemma, upos, stem_feats(a, upos), diac=plain_alif(piece))
    word.unsure = unsure
    root = a["root"]
    word.croot = root if root and ROOT_SHAPE.match(root) else None
    if upos == "PROPN":
        word.feats = {"Definite": "Def"} if written.startswith("ال") else {}
    if (upos in OPEN_UPOS or upos == "NUM") and pos != "digit":
        word.root = word.croot
    return word


def guessed_word(a, written, forms, stem_at, sid, ctx):
    """A word the database lacks, from CAMeL's backoff guess and patches.STEMS."""
    pos = a["pos"]
    key = stem_key(written, a, forms, stem_at)
    article = a["prc0"] == "Al_det"
    if not article and key.startswith("ال") and len(key) > 3:  # CAMeL leaves the article on a name it does not know
        key, article = key[2:], True
    used_key, entry = patches.stem_entry(key)
    definite = {"Definite": "Def"} if article else {}
    if entry is not None:
        ctx.used["STEMS"][used_key] += 1
        ctx.patched_tokens += 1
        lemma, upos, root, feats = entry
        lemma = lemma or key
        if upos == "VERB" or (upos == "PROPN" and not article):
            definite = {}
        return Word(written, lemma, upos, {**parse_feats(feats), **definite}, root, croot=root)
    default_upos = POS_UPOS.get(pos, "X")
    if pos == "noun_prop":
        ctx.flag("guessed-name", sid, written, f"{key}\t{pos}\t{a['lex']}")
        return Word(written, key, "PROPN", definite)
    ctx.flag("guessed", sid, written, f"{key}\t{pos}\t{a['lex']}")
    feats = stem_feats(a, default_upos)
    for drop in ("Case", "Definite"):
        feats.pop(drop, None)
    return Word(written, plain_alif(a["lex"]), default_upos, {**feats, **definite})


def surface_lines(token, words, first_id):
    """CoNLL-U lines of one written token; the id after it."""
    space = {} if token["space"] else {"SpaceAfter": "No"}
    lines, ident = [], first_id
    if len(words) > 1:
        miscs = "SpaceAfter=No" if space else "_"
        lines.append(f"{ident}-{ident + len(words) - 1}\t{token['form']}\t_\t_\t_\t_\t_\t_\t_\t{miscs}")
    for word in words:
        misc = []
        if word.root:
            misc.append(f"Root={word.root}")
        if word.diac:
            misc.append(f"Diac={word.diac}")
        if space and len(words) == 1:
            misc.append("SpaceAfter=No")
        lines.append("\t".join([str(ident), word.form, word.lemma, word.upos, "_", feats_string(word.feats), "_", "_", "_",
                                "|".join(misc) or "_"]))
        ident += 1
    return lines, ident


def check_word(word, sid):
    if word.upos not in UPOS_VALUES:
        raise SystemExit(f"{sid}: UPOS {word.upos} on {word.form}")
    if word.upos != "PUNCT" and not word.lemma:
        raise SystemExit(f"{sid}: no lemma on {word.form}")
    if word.upos not in ("PUNCT", "NUM") or word.lemma != word.form:
        if word.upos != "PUNCT" and not (LEMMA_SHAPE.match(word.lemma) or word.lemma == word.form):
            raise SystemExit(f"{sid}: odd lemma {word.lemma!r} on {word.form}")
    if word.root and not ROOT_SHAPE.match(word.root):
        raise SystemExit(f"{sid}: odd root {word.root!r} on {word.form}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw", default="/tmp/muq-build/camel-raw.json")
    ap.add_argument("--out", required=True)
    ap.add_argument("--report", default="/tmp/muq-build/annotation-report.json")
    args = ap.parse_args()

    raw = json.load(open(args.raw, encoding="utf-8"))
    ctx = Context()
    os.makedirs(args.out, exist_ok=True)
    totals = collections.Counter()
    upos_counts = collections.Counter()
    for unit in raw["units"]:
        out = []
        for row in unit["rows"]:
            out.append(f"# newpar id = {row['pid']}")
            for k, sentence in enumerate(row["sentences"], 1):
                sid = f"{row['pid']}.{k}"
                text = ""
                body, ident = [], 1
                for token in sentence["tokens"]:
                    words = convert_token(token, sid, ctx)
                    for word in words:
                        check_word(word, sid)
                        upos_counts[word.upos] += 1
                    lines, ident = surface_lines(token, words, ident)
                    body.extend(lines)
                    text += token["form"] + (" " if token["space"] else "")
                    totals["tokens"] += 1
                    totals["words"] += len(words)
                out.append(f"# sent_id = {sid}")
                out.append(f"# text = {text}")
                out.extend(body)
                out.append("")
                totals["sentences"] += 1
        with open(os.path.join(args.out, f"{unit['id']}.conllu"), "w", encoding="utf-8") as handle:
            handle.write("\n".join(out) + "\n")

    unused = patches.unused(ctx.used)
    report = {
        "totals": dict(totals), "upos": dict(upos_counts), "flags": dict(ctx.flag_counts),
        "patched_whole_tokens": ctx.patched_tokens, "stem_entries_used_tokens": sum(ctx.used["STEMS"].values()),
        "stem_entries": len(patches.STEMS), "unused": unused, "flagged": ctx.flags,
    }
    json.dump(report, open(args.report, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(json.dumps({k: v for k, v in report.items() if k != "flagged"}, ensure_ascii=False, indent=1))
    if unused:
        raise SystemExit("unused patch entries: " + json.dumps(unused, ensure_ascii=False))


if __name__ == "__main__":
    main()
