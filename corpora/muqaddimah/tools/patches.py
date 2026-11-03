"""Corrections to CAMeL Tools' output for the Muqaddimah (see annotate.py).

Every entry is used at least once or annotate.py stops, so the tables cannot grow stale. Spelling is normalised before a
match: diacritics are dropped and أ إ آ ٱ = ا, ى = ي, ة = ه (the keys may be written either way).
"""
import re

DIACRITICS = re.compile("[\u064B-\u0652\u0670\u0640]")
NORMALIZE = str.maketrans({"أ": "ا", "إ": "ا", "آ": "ا", "ٱ": "ا", "ى": "ي", "ة": "ه"})


def dediac(text):
    return DIACRITICS.sub("", text)


def norm(text):
    return dediac(text).translate(NORMALIZE)


def bare(form):
    """A written word without its article, normalised: how FIXES match `forms`."""
    form = norm(form)
    return form[2:] if form.startswith("ال") and len(form) > 3 else form


KEEP = "<keep>"


def W(form, lemma, upos, feats="", root=None, diac=None):
    """One syntactic word, for WHOLE and ABBREV."""
    return {"form": form, "lemma": lemma, "upos": upos, "feats": feats, "root": root, "diac": diac}


# ---------------------------------------------------------------------------------------------------------------------
# STEMS: words the analyzer's database lacks (place names, gentilics, rare plurals and verbal nouns). Keyed by the stem as
# written without clitics and article: (lemma, UPOS, root or None, FEATS). Definite=Def is added for a word with the
# article. A backoff word with no entry keeps CAMeL's guess (a name's lemma is its written stem). See stems.py.
from stems import STEMS as _STEMS  # noqa: E402

STEMS = {}  # as written (diacritics removed)
_BY_NORM = {}
for _key, _entry in _STEMS.items():
    _key = dediac(_key)
    assert _key not in STEMS, f"STEMS: {_key} twice"
    STEMS[_key] = _entry
    _BY_NORM.setdefault(norm(_key), []).append(_key)


def stem_entry(stem):
    """(key, (lemma, UPOS, root, FEATS)) for a written stem: the exact spelling first, else the one entry that matches
    it with أ إ آ ى ة normalised; (None, None) if there is none."""
    stem = dediac(stem)
    if stem in STEMS:
        return stem, STEMS[stem]
    hits = _BY_NORM.get(norm(stem), [])
    return (hits[0], STEMS[hits[0]]) if len(hits) == 1 else (None, None)

# ---------------------------------------------------------------------------------------------------------------------
# WHOLE: a written token whose analysis is replaced whole by the list of its syntactic words. The surface is the key; a
# word's FORM may be its underlying spelling (مما = من + ما), which is what a multiword token is for.
WHOLE = {}

_PREFIX = {
    "": [],
    "و": [W("و", "وَ", "CCONJ", diac="وَ")],
    "ف": [W("ف", "فَ", "CCONJ", diac="فَ")],
}


WHOLE_GROUPS = []  # the keys one whole() call made: a group is used when any of its keys is


def whole(surface, words, prefixes=("", "و", "ف")):
    """WHOLE entries for `surface` and for it behind each proclitic conjunction in `prefixes`."""
    keys = []
    for prefix in prefixes:
        key = prefix + surface
        assert key not in WHOLE, f"WHOLE: {key} twice"
        WHOLE[key] = _PREFIX[prefix] + words
        keys.append(key)
    WHOLE_GROUPS.append(keys)


_REL = "PronType=Rel"
_DEM = "Gender=Masc|Number=Sing|PronType=Dem"
whole("إنما", [W("إنما", "إِنَّما", "PART", diac="إِنَّما")])
whole("مما", [W("من", "مِن", "ADP", diac="مِنْ"), W("ما", "مَا", "PRON", _REL, diac="مَا")])
whole("عما", [W("عن", "عَن", "ADP", diac="عَنْ"), W("ما", "مَا", "PRON", _REL, diac="مَا")])
whole("ممن", [W("من", "مِن", "ADP", diac="مِنْ"), W("من", "مَن", "PRON", _REL, diac="مَنْ")])
whole("عمن", [W("عن", "عَن", "ADP", diac="عَنْ"), W("من", "مَن", "PRON", _REL, diac="مَنْ")])
whole("بما", [W("ب", "بِ", "ADP", diac="بِ"), W("ما", "مَا", "PRON", _REL, diac="مَا")])
whole("فيما", [W("في", "فِي", "ADP", diac="فِي"), W("ما", "مَا", "PRON", _REL, diac="مَا")])
whole("لذلك", [W("ل", "لِ", "ADP", diac="لِ"), W("ذلك", "ذٰلِكَ", "DET", _DEM, diac="ذٰلِكَ")])
whole("لذا", [W("ل", "لِ", "ADP", diac="لِ"), W("ذا", "هٰذا", "DET", _DEM, diac="ذا")])
# Place names CAMeL cuts at their first letter: ودان (Waddān), دانية (Denia).
whole("ودان", [W("ودان", "وَدّان", "PROPN")], prefixes=("",))
whole("دانية", [W("دانية", "دانِيَة", "PROPN", diac="دانِيَة")], prefixes=("",))
# لله and بالله: the alif of الله is dropped in the written word after ل (and after ب), so FORM is الله.
_ALLAH = "اللَّه"
whole("لله", [W("ل", "لِ", "ADP", diac="لِ"), W("الله", _ALLAH, "PROPN", "Definite=Def", diac="اللّٰهِ")])
whole("بالله", [W("ب", "بِ", "ADP", diac="بِ"), W("الله", _ALLAH, "PROPN", "Definite=Def", diac="اللّٰهِ")])

_PRON_ACC_1S = "Case=Acc|Number=Sing|Person=1|PronType=Prs"
_IMP_2MS = "Gender=Masc|Mood=Imp|Number=Sing|Person=2|VerbForm=Fin|Voice=Act"
_PERF_3MS = "Aspect=Perf|Gender=Masc|Number=Sing|Person=3|VerbForm=Fin|Voice=Act"
_3MP_GEN = "Case=Gen|Gender=Masc|Number=Plur|Person=3|PronType=Prs"
# Words CAMeL cuts wrongly or tags as one name; verses and phrases with a pronoun CAMeL does not see.
whole("ألغفلتهم", [W("أ", "أَ", "PART", diac="أَ"), W("ل", "لِ", "ADP", diac="لِ"),
                   W("غفلت", "غَفْلَة", "NOUN", "Case=Gen|Definite=Cons|Gender=Fem|Number=Sing", "غ.ف.ل", "غَفْلَتِ"),
                   W("هم", "هُمْ", "PRON", _3MP_GEN, diac="هِمْ")], prefixes=("",))
whole("اجعلني", [W("اجعل", "جَعَل", "VERB", _IMP_2MS, "ج.ع.ل", "اِجْعَلْ"), W("ني", "أَنَا", "PRON", _PRON_ACC_1S, diac="نِي")],
      prefixes=("",))
whole("داوني", [W("داو", "داوَى", "VERB", _IMP_2MS, "د.و.ي", "داوِ"), W("ني", "أَنَا", "PRON", _PRON_ACC_1S, diac="نِي")],
      prefixes=("",))
whole("بالذي", [W("ب", "بِ", "ADP", diac="بِ"), W("الذي", "الَّذِي", "PRON", "Gender=Masc|Number=Sing|PronType=Rel", diac="الَّذِي")],
      prefixes=("",))
whole("كالذي", [W("ك", "كَ", "ADP", diac="كَ"), W("الذي", "الَّذِي", "PRON", "Gender=Masc|Number=Sing|PronType=Rel", diac="الَّذِي")],
      prefixes=("",))
# "قال مالك فو الله": فَ + وَ (the oath), the waw written apart from الله.
whole("فو", [W("ف", "فَ", "CCONJ", diac="فَ"), W("و", "وَ", "PART", diac="وَ")], prefixes=("",))
whole("بزيدة", [W("بزيدة", "بزيدة", "PROPN")], prefixes=("",))
whole("ولاءمه", [W("و", "وَ", "CCONJ", diac="وَ"), W("لاءم", "لاءَم", "VERB", _PERF_3MS, "ل.أ.م", "لاءَمَ"),
                 W("ه", "هُوَ", "PRON", "Case=Acc|Gender=Masc|Number=Sing|Person=3|PronType=Prs", diac="هُ")], prefixes=("",))
whole("ولاوزعتهم", [W("و", "وَ", "CCONJ", diac="وَ"), W("لا", "لا", "PART", "Polarity=Neg", diac="لا"),
                    W("وزعت", "وَزَع", "VERB", "Aspect=Perf|Gender=Fem|Number=Sing|Person=3|VerbForm=Fin|Voice=Act", "و.ز.ع", "وَزَعَتْ"),
                    W("هم", "هُمْ", "PRON", _3MP_GEN, diac="هِمْ")], prefixes=("",))
_3MS_GEN = "Case=Gen|Gender=Masc|Number=Sing|Person=3|PronType=Prs"
_3FS_GEN = "Case=Gen|Gender=Fem|Number=Sing|Person=3|PronType=Prs"
_CONS = "Definite=Cons|Gender=Masc|Number=Sing"
# A noun the database lacks with its possessive pronoun, which CAMeL leaves on the noun.
whole("إسماعه", [W("إسماع", "إِسْماع", "NOUN", _CONS, "س.م.ع"), W("ه", "هُوَ", "PRON", _3MS_GEN, diac="هِ")], prefixes=("",))
whole("إهلاكه", [W("إهلاك", "إِهْلاك", "NOUN", _CONS, "ه.ل.ك"), W("ه", "هُوَ", "PRON", _3MS_GEN, diac="هِ")], prefixes=("",))
whole("بمنه", [W("ب", "بِ", "ADP", diac="بِ"), W("من", "مَنّ", "NOUN", "Case=Gen|" + _CONS, "م.ن.ن"),
               W("ه", "هُوَ", "PRON", _3MS_GEN, diac="هِ")], prefixes=("",))
whole("تحويمه", [W("تحويم", "تَحْوِيم", "NOUN", _CONS, "ح.و.م"), W("ه", "هُوَ", "PRON", _3MS_GEN, diac="هِ")], prefixes=("",))
whole("لفصاله", [W("ل", "لِ", "ADP", diac="لِ"), W("فصال", "فِصال", "NOUN", "Case=Gen|" + _CONS, "ف.ص.ل"),
                 W("ه", "هُوَ", "PRON", _3MS_GEN, diac="هِ")], prefixes=("",))
whole("نشؤها", [W("نشؤ", "نَشْء", "NOUN", _CONS, "ن.ش.أ"), W("ها", "هِيَ", "PRON", _3FS_GEN, diac="ها")], prefixes=("",))
whole("واستخلافه", [W("و", "وَ", "CCONJ", diac="وَ"), W("استخلاف", "اِسْتِخْلاف", "NOUN", _CONS, "خ.ل.ف"),
                    W("ه", "هُوَ", "PRON", _3MS_GEN, diac="هِ")], prefixes=("",))
whole("وجزائره", [W("و", "وَ", "CCONJ", diac="وَ"), W("جزائر", "جَزِيرَة", "NOUN", "Definite=Cons|Gender=Fem|Number=Plur", "ج.ز.ر"),
                  W("ه", "هُوَ", "PRON", _3MS_GEN, diac="هِ")], prefixes=("",))
whole("وخواصها", [W("و", "وَ", "CCONJ", diac="وَ"), W("خواص", "خاصَّة", "NOUN", "Definite=Cons|Gender=Fem|Number=Plur", "خ.ص.ص"),
                  W("ها", "هِيَ", "PRON", _3FS_GEN, diac="ها")], prefixes=("",))

whole("ولك", [W("و", "وَ", "CCONJ", diac="وَ"), W("ل", "لِ", "ADP", diac="لِ"),
              W("ك", "أَنْتَ", "PRON", "Case=Gen|Gender=Masc|Number=Sing|Person=2|PronType=Prs", diac="كَ")], prefixes=("",))
# Letter-words of the zāʾiraja (discussion-6.62 to 65) and the foreign formula about dreams (discussion-6.36): row -> the
# written words that are not Arabic, tagged X with their written form as lemma wherever they occur in that row.
FOREIGN = {
    "discussion-6.36": {"تماغس", "يسواد", "وغداس", "نوفنا", "غادس"},
    "discussion-6.62": {"ايقش"},
    "discussion-6.63": {"ايقش", "بكر", "جلس", "دمت", "هنث", "وصخ", "زعد", "حفظ", "طضغ"},
    "discussion-6.64": {"ارب", "يستمك", "جزلط", "مدوص", "هف", "تحذن", "عش", "خع", "ثضظ"},
    "discussion-6.65": {"ايقش"},
}

# CAMeL's NTWS "abbreviation" analysis of a written token: the words it is replaced by.
ABBREV = {
    "إن": [W("إن", "أَنَّ", "SCONJ", diac="إِنَّ")],
    "إي": [W("إي", "إِي", "INTJ", diac="إِي")],
    # The letters of the زايرجة's tables, "(أ) الدالة على الواحد", and the hijri sign in "1 ه-."
    **{letter: [W(letter, letter, "X")] for letter in ("أ", "اي", "ب", "ق", "ش", "ر", "ك")},
    "ه": [W("ه", "ه", "X", "Abbr=Yes")],
}

# ---------------------------------------------------------------------------------------------------------------------
# FIXES: a stem CAMeL gives a wrong lemma or class, matched on (lemma, UPOS), optionally on the written stem (`forms`,
# bare spelling) and on sentences to leave alone (`not_in`). The first rule that matches wins, so restricted rules
# come first. A rule that changes the class keeps the features that class has; `feats` adds to them. KEEP keeps
# CAMeL's root; the vocalized form (Diac=) is kept only where the lemma's letters do not change.
FIXES = []
FIXES_BY = {}


def fix(lemma, upos, to_lemma, to_upos=None, root=KEEP, feats="", forms=None, diac=None, not_in=()):
    """`upos`: the class (or classes) CAMeL gives; `to_upos` defaults to it."""
    upos = (upos,) if isinstance(upos, str) else tuple(upos)
    FIXES_BY.setdefault(norm(lemma), []).append(len(FIXES))
    FIXES.append({"lemma": norm(lemma), "upos": upos, "to_lemma": to_lemma, "to_upos": to_upos or upos[0], "root": root,
                  "feats": feats, "forms": {norm(f) for f in forms} if forms else None, "diac": diac,
                  "not_in": frozenset(not_in)})


# Prepositions and adverbs CAMeL files as accusative nouns.
for _lemma, _to in (("بين", "بَيْن"), ("عند", "عِنْد"), ("تحت", "تَحْتَ"), ("فوق", "فَوْق"), ("وراء", "وَراء"),
                    ("منذ", "مُنْذُ"), ("قبل", "قَبْل"), ("دون", "دُون")):
    fix(_lemma, "NOUN", _to, "ADP", None)
# بعد is بَعْد "after" except where the sentence means "distance": مع بعد الشقة, لبعدها عن الصحة ...
fix("بعد", "NOUN", "بَعْد", "ADP", None,
    not_in=("introduction.10.1", "introduction.13.3", "introduction.15.1", "discussion-2.23.2", "discussion-3.4.2",
            "discussion-6.69.1"))
fix("كذا", "NOUN", "كَذا", "ADV", None)
fix("ازاء", "NOUN", "إِزاء", "ADP", None)
fix("بعض", "ADJ", "بَعْض", "NOUN", "ب.ع.ض")
fix("ذو", "NOUN", "ذُو", "NOUN", "ذ.و.#")
fix("ثلث", "NOUN", "ثُلْث", "NOUN", "ث.ل.ث")
fix("كم", "NOUN", "كَما", "SCONJ", None, forms=("كما",))
fix("كما", "CCONJ", "كَما", "SCONJ", None)
fix("ثم", "ADV", "ثُمَّ", "CCONJ", None)
fix("ايض", "NOUN", "أَيْضاً", "ADV", "أ.ي.ض")
fix("ليس", "VERB", "لَيْسَ", None, "ل.ي.س", "Polarity=Neg")
fix("هيهات", "VERB", "هَيْهات", "INTJ", None)
# كأن, لعل and ليت are not coordinating conjunctions.
fix("كان", "CCONJ", "كَأَنَّ", "SCONJ", None)
fix("لعل", "CCONJ", "لَعَلَّ", "SCONJ", None)
fix("ليت", "CCONJ", "لَيْتَ", "SCONJ", None)

# Common words CAMeL's lexicon has as names: the points of the compass, ابن and أبو in names, an adjective, a verse.
fix("شرق", "PROPN", "شَرْق", "NOUN")
fix("مغرب", "PROPN", "مَغْرِب", "NOUN")
fix("ثاني", "PROPN", "ثانِي", "ADJ", "ث.ن.ي")
fix("اقصي", "PROPN", "أَقْصَى", "ADJ", "ق.ص.#")
fix("ابن", "PROPN", "اِبْن", "NOUN", "ب.ن.#")
fix("بن", "PROPN", "اِبْن", "NOUN", "ب.ن.#")
fix("بني", "PROPN", "اِبْن", "NOUN", "ب.ن.#", "Number=Plur")
fix("ابي", "PROPN", "أَب", "NOUN", "أ.ب.#")
fix("ابو", "PROPN", "أَب", "NOUN", "أ.ب.#")
fix("ابا", "PROPN", "أَب", "NOUN", "أ.ب.#")
fix("روحاني", "PROPN", "رُوحانِيّ", "ADJ", "ر.و.ح")
fix("سيد", "PROPN", "سَيِّد", "NOUN", "س.#.د")
fix("مولي", "PROPN", "مَوْلَى", "NOUN", "و.ل.ي")
fix("جهاد", "PROPN", "جِهاد", "NOUN", "ج.ه.د")
fix("بناء", "PROPN", "بَنّاء", "NOUN", "ب.ن.ي")
fix("منجم", "PROPN", "مُنَجِّم", "NOUN", "ن.ج.م")
fix("مكتوم", "PROPN", "مَكْتُوم", "ADJ", "ك.ت.م")
fix("معلاه", "PROPN", "مَعْلاة", "NOUN", "ع.ل.#")
fix("شين", "PROPN", "شِين", "NOUN", None)
fix("مصر", "ADJ", "مِصْر", "PROPN", None)

# Wrong lemmas of common words.
fix("امر", "NOUN", "أَمْر", "NOUN", "أ.م.ر")
fix("اصاب", "VERB", "صَبّ", "VERB", "ص.ب.ب", forms=("يصب", "تصب"))
fix("راوند", "VERB", "رَأَى", "VERB", "ر.أ.ي")
fix("غائب", "ADJ", "غَيْب", "NOUN", "غ.ي.ب", forms=("غيب",))
fix("امام", "NOUN", "إِمام", "NOUN", "أ.م.م", forms=("الامام",))
fix("خليق", "NOUN", "خَلِيقَة", "NOUN", "خ.ل.ق")
fix("نيل", "NOUN", "نِيل", "PROPN", None)
fix("نصف", "NOUN", "نِصْف", "NOUN", "ن.ص.ف")
for _lemma, _to, _root in (("اقرب", "أَقْرَب", "ق.ر.ب"), ("اخف", "أَخَفّ", "خ.ف.ف"), ("اطول", "أَطْوَل", "ط.و.ل"),
                           ("احمر", "أَحْمَر", "ح.م.ر")):
    fix(_lemma, "NOUN", _to, "ADJ", _root)
fix("نبي", "ADJ", "نَبِيّ", "NOUN", "ن.ب.#")
fix("ذات", "NOUN", "ذات", "NOUN", "ذ.و.#")
fix("ذوات", "NOUN", "ذات", "NOUN", "ذ.و.#")
fix("ذاتي", "ADJ", "ذاتِيّ", "ADJ", "ذ.و.#")
fix("كافه", "NOUN", "كافَّة", "NOUN", "ك.ف.ف")
fix("أُولائِكَ", "NOUN", "ذٰلِكَ", "DET", None, "Number=Plur|PronType=Dem")


def numeral(lemma, to_lemma, root=KEEP, forms=None):
    fix(lemma, ("NOUN", "ADJ", "PROPN", "NUM", "VERB"), to_lemma, "NUM", root, forms=forms)


numeral("ثلاث", "ثَلاثُون", "ث.ل.ث", ("ثلاثون", "ثلاثين"))
numeral("ثلاث", "ثَلاث", "ث.ل.ث")
numeral("اربع", "أَرْبَعُون", "ر.ب.ع", ("اربعون", "اربعين"))
numeral("اربع", "أَرْبَع", "ر.ب.ع")
numeral("خمس", "خَمْسُون", "خ.م.س", ("خمسون", "خمسين"))
numeral("خمس", "خَمْس", "خ.م.س")
numeral("ست", "سِتُّون", "س.#.#", ("ستون", "ستين"))
numeral("ست", "سِتّ", "س.#.#", ("ست", "ستة", "الستة"))
numeral("سبع", "سَبْعُون", "س.ب.ع", ("سبعون", "سبعين"))
numeral("سبع", "سَبْع", "س.ب.ع", ("سبع", "سبعة"))
numeral("تسع", "تِسْع", "ت.س.ع", ("تسع", "تسعة"))
numeral("عشره", "عَشَرَة", "ع.ش.ر")
numeral("عشرون", "عِشْرُون", "ع.ش.ر")
numeral("مئه", "مِئَة", "م.#.#")
numeral("الف", "أَلْف", "أ.ل.ف")
for _lemma, _to in (("اثنا", "اِثْنان"), ("اثنان", "اِثْنان"), ("اثنين", "اِثْنان"), ("اثنتان", "اِثْنَتان"),
                    ("اثنتا", "اِثْنَتان"), ("الاثنا", "اِثْنان"), ("الاثنان", "اِثْنان")):
    numeral(_lemma, _to, "ث.ن.ي")
for _lemma, _to in (("ثلاثمائه", "ثَلاثُمِئَة"), ("اربعمائه", "أَرْبَعُمِئَة"), ("خمسمائه", "خَمْسُمِئَة"),
                    ("ستمائه", "سِتُّمِئَة"), ("سبعمائه", "سَبْعُمِئَة"), ("تسعمائه", "تِسْعُمِئَة")):
    numeral(_lemma, _to, None)

# CAMeL cuts بعض as بِ + عَضّ.
MERGES = [{"pieces": (("ب", "ADP"), ("عض", "NOUN")), "lemma": "بَعْض", "upos": "NOUN", "root": "ب.ع.ض", "feats": ""}]


def unused(used):
    """Entries of the tables that never matched."""
    out = {}
    for name, table in (("STEMS", STEMS), ("ABBREV", ABBREV)):
        left = [key for key in table if key not in used[name]]
        if left:
            out[name] = left
    left = [keys[0] for keys in WHOLE_GROUPS if not any(key in used["WHOLE"] for key in keys)]
    left += [key for key in WHOLE if not any(key in keys for keys in WHOLE_GROUPS)]
    if left:
        out["WHOLE"] = left
    left = [index for index in range(len(FIXES)) if index not in used["FIXES"]]
    if left:
        out["FIXES"] = [f"{FIXES[i]['lemma']} {'/'.join(FIXES[i]['upos'])} ({i})" for i in left]
    left = [index for index in range(len(MERGES)) if index not in used["MERGES"]]
    if left:
        out["MERGES"] = [str(MERGES[i]["pieces"]) for i in left]
    exempt = [(i, sid) for i, rule in enumerate(FIXES) for sid in rule["not_in"] if (i, sid) not in used["NOT_IN"]]
    if exempt:
        out["not_in"] = [f"{FIXES[i]['lemma']} {sid}" for i, sid in exempt]
    left = [f"{pid} {word}" for pid, words in FOREIGN.items() for word in sorted(words) if (pid, word) not in used["FOREIGN"]]
    if left:
        out["FOREIGN"] = left
    return out
