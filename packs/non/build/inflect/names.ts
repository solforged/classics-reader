// Conservative proper-name declensions in the edition's spelling. Only indefinite forms are generated, and only
// in the number used for the headword. Final elements determine ambiguous strong stems; otherwise genitive and
// dative attestations must identify the stem. Every generated cell is checked against the edition before use.
import { fold } from "../../spelling";
import type { Paradigm } from "../../../../src/lib/paradigm";
import { isVowel, syncopate, uUmlaut } from "./phonology";
import type { Generated } from "./zoega";

type Gender = "m" | "f" | "n";
const normalize = (form: string): string => fold(form.replace(/ǿ/g, "œ"));
const same = (a: string, b: string): boolean => normalize(a) === normalize(b);

/** The shared sound change uses Zoëga's ö; name tables retain the edition's ǫ. */
function umlaut(stem: string): string {
  const lower = stem[0]!.toLowerCase() + stem.slice(1);
  const changed = uUmlaut(lower).replace(/ö/g, "ǫ");
  return /^\p{Lu}/u.test(stem) ? changed[0]!.toUpperCase() + changed.slice(1) : changed;
}

function table(plural: boolean, note: string, ...forms: (string | string[])[]): Generated {
  const cells: Generated["cells"] = {};
  for (const [i, c] of ["n", "a", "d", "g"].entries()) {
    const form = forms[i]!;
    cells[`|${c}${plural ? "p" : "s"}i`] = typeof form === "string" ? [form] : form;
  }
  return { cells, label: note, note };
}

/** Select one regular alternative only when all attestations in that cell identify it. */
function attestedChoice(forms: string[], key: string, attested?: Paradigm["attested"]): string | undefined {
  const observed = Object.keys(attested?.[key] ?? {});
  if (!observed.length) return undefined;
  return forms.find((form) => observed.every((value) => same(value, form)));
}

function generate(
  lemma: string,
  gender: Gender,
  plural: boolean,
  attested?: Paradigm["attested"],
): Generated | undefined {
  // Multiword and hyphenated headwords need a lexical analysis of their components, not just a final ending.
  if (!/^\p{Lu}\p{L}*$/u.test(lemma)) return undefined;
  const lower = lemma.toLowerCase();
  if (plural) {
    if (gender === "m" && lower.endsWith("ar")) {
      const stem = lemma.slice(0, -2);
      let genitive: string | string[] = `${stem}a`;
      if (lower.endsWith("gotar")) {
        genitive = [`${stem}na`];
        if (Object.keys(attested?.["|gpi"] ?? {}).some((form) => same(form, `${stem}a`))) genitive.push(`${stem}a`);
      }
      return table(true, "masculine plural name in -ar", lemma, `${stem}a`, `${umlaut(stem)}um`, genitive);
    }
    if (gender === "m" && /(?:staðir|danir)$/.test(lower)) {
      const stem = lemma.slice(0, -2);
      return table(true, "masculine plural name in -staðir or -Danir",
        lemma, `${stem}i`, `${umlaut(stem)}um`, `${stem}a`);
    }
    if (gender === "m" && lower.endsWith("vellir")) {
      const stem = lemma.slice(0, -6);
      return table(true, "masculine plural name in -vellir",
        lemma, `${stem}vǫllu`, `${stem}vǫllum`, `${stem}valla`);
    }
    if (gender === "n" && /(?:fjǫll|bjǫrg|tún|blik)$/.test(lower)) {
      const gen = lemma.replace(/fjǫll$/, "fjall").replace(/bjǫrg$/, "bjarg");
      return table(true, "neuter plural place name in -fjǫll, -bjǫrg, -tún or -blik",
        lemma, lemma, `${lemma}um`, `${gen}a`);
    }
    return undefined;
  }
  if (gender === "m") {
    if (lower.endsWith("i")) {
      const stem = lemma.slice(0, -1);
      let oblique = `${stem}${/(?:tveggi|vili|beli)$/.test(lower) ? "ja" : "a"}`;
      if (lower.endsWith("ingi")) {
        const observed = ["|asi", "|dsi", "|gsi"].flatMap((key) => Object.keys(attested?.[key] ?? {}));
        const selected = [`${stem}a`, `${stem}ja`]
          .find((form) => observed.length && observed.every((value) => same(value, form)));
        if (!selected) return undefined;
        oblique = selected;
      }
      return table(false, "weak masculine name in -i", lemma, oblique, oblique, oblique);
    }
    // The father element is a kinship stem, not one of the regular names in -ir.
    if (lower.endsWith("faðir")) return undefined;
    if (lower.endsWith("ir")) {
      const stem = lemma.slice(0, -1);
      return table(false, "masculine name in -ir", lemma, stem, stem, `${stem}s`);
    }
    if (lower.endsWith("steinn") || lower.endsWith("geirr")) {
      const stem = lemma.slice(0, -1);
      return table(false, "masculine name in -steinn or -geirr", lemma, stem, `${stem}i`, `${stem}s`);
    }
    if (/(?:inn|ill|all|ull)$/.test(lower)) {
      const stem = lemma.slice(0, -1);
      const regularDative = lower.endsWith("reginn") ? stem : `${syncopate(stem, true)}i`;
      const dative = attestedChoice([regularDative, stem], "|dsi", attested) ?? regularDative;
      return table(false, "masculine name in -inn, -ill, -all or -ull", lemma, stem, dative, `${stem}s`);
    }
    if (lower.endsWith("arr")) {
      const stem = lemma.slice(0, -1);
      const dative = /(?:jaðarr|hamarr)$/.test(lower) ? `${syncopate(stem)}i` : `${stem}i`;
      return table(false, "masculine name in -arr", lemma, stem, dative, `${stem}s`);
    }
    if (lower.endsWith("víss")) {
      const stem = lemma.slice(0, -1);
      return table(false, "masculine name in -víss", lemma, stem, `${stem}i`, `${stem}s`);
    }
    if (lower.endsWith("r") && !isVowel(lower.at(-2)) && !lower.endsWith("rr")) {
      const stem = lemma.slice(0, -1);
      if (lower.endsWith("vǫllr")) {
        return table(false, "masculine name in -vǫllr",
          lemma, stem, `${stem.slice(0, -4)}velli`, `${stem.slice(0, -4)}vallar`);
      }
      if (lower.endsWith("fjǫrðr")) {
        return table(false, "masculine name in -fjǫrðr",
          lemma, stem, `${stem.slice(0, -5)}firði`, `${stem.slice(0, -5)}fjarðar`);
      }
      const genAr = /(?:mundr|røðr|varðr|urðr|lundr)$/.test(lower)
        || lower.endsWith("viðr") && !lower.endsWith("sviðr");
      const genS = /(?:heimr|garðr|ormr|ingr|ungr|haugr|bakr|ráðr|sviðr)$/.test(lower);
      const genitive = attestedChoice([`${stem}s`, `${stem}ar`], "|gsi", attested)
        ?? (genAr ? `${stem}ar` : genS ? `${stem}s` : undefined);
      if (!genitive) return undefined;
      const observedDative = attestedChoice([`${stem}i`, stem], "|dsi", attested);
      if (!genAr && !genS && !observedDative) return undefined;
      const dative = observedDative ?? `${stem}i`;
      const note = genAr ? "masculine name with an -ar final element (or an attested -s genitive)"
        : genS ? "masculine name with an -s final element (or an attested -ar genitive)"
          : "masculine name in consonant + -r with attested genitive and dative";
      return table(false, note, lemma, stem, dative, genitive);
    }
  } else if (gender === "f") {
    if (lower.endsWith("a")) {
      const oblique = `${umlaut(lemma.slice(0, -1))}u`;
      return table(false, "weak feminine name in -a", lemma, oblique, oblique, oblique);
    }
    if (/(?:hildr|vildr|gerðr|heiðr)$/.test(lower)) {
      const stem = lemma.slice(0, -1);
      return table(false, "feminine name in -hildr, -vildr, -gerðr or -heiðr",
        lemma, `${stem}i`, `${stem}i`, `${stem}ar`);
    }
    if (lower.endsWith("rún") || lower.endsWith("laug")) {
      return table(false, "feminine name in -rún or -laug", lemma, `${lemma}u`, `${lemma}u`, `${lemma}ar`);
    }
    if (lower.endsWith("dís")) {
      return table(false, "feminine name in -dís", lemma, lemma, lemma, `${lemma}ar`);
    }
    if (lower.endsWith("vǫr")) {
      return table(false, "feminine name in -vǫr",
        lemma, `${lemma}u`, `${lemma}u`, `${lemma.slice(0, -3)}varar`);
    }
    if (lower.endsWith("ey")) {
      return table(false, "feminine name in -ey", lemma, lemma, [lemma, `${lemma}ju`], `${lemma}jar`);
    }
    if (lower.endsWith("ný")) {
      return table(false, "feminine name in -ný", lemma, `${lemma}ju`, `${lemma}ju`, `${lemma}jar`);
    }
  } else if (/(?:land|sund|horn|nes|far|fjall|tún)$/.test(lower)) {
    return table(false, "neuter place name with a strong a-stem", lemma, lemma, `${lemma}i`, `${lemma}s`);
  }
  return undefined;
}

/** Ending- and gender-based name table, refused if any edition-attested generated cell disagrees. */
export function inflectName(
  lemma: string,
  gender: Gender,
  plural: boolean,
  attested?: Paradigm["attested"],
): Generated | undefined {
  const generated = generate(lemma, gender, plural, attested);
  if (!generated) return undefined;
  for (const [key, forms] of Object.entries(attested ?? {})) {
    const expected = generated.cells[key];
    if (expected && Object.keys(forms).some((form) => !expected.some((value) => same(form, value)))) return undefined;
  }
  return generated;
}
