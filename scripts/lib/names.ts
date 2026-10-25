import * as cheerio from "cheerio";

/** An entry in Bellows's "Pronouncing Index of Proper Names" (1923). */
export interface NameGloss {
  /** Bellows's spelling, e.g. "Grani", "Hreithmar". */
  name: string;
  /** His identification, e.g. "Sigurth's horse", without page references. */
  desc: string;
  /** Reader slugs whose Bellows pages the entry cites; empty when none map to a work. */
  works: string[];
}

const clean = (text: string): string => text.replace(/\s+/g, " ").trim();

function nameText(text: string): string {
  return clean(text.replace(/[′″'’\-]/g, "").normalize("NFD").replace(/\u0304/g, "").normalize("NFC"));
}

function key(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/[ðþ]/g, "th")
    .replace(/æ/g, "ae").replace(/[øœ]/g, "o").replace(/[^a-z]/g, "");
}

function norseKey(text: string): string {
  return text.toLowerCase().normalize("NFC").replace(/[ǫöø]/g, "o");
}

function keys(lemma: string): string[] {
  const k = key(lemma);
  const forms = [k];
  if (/[^aeiouy]r$/.test(k)) forms.push(k.slice(0, -1));
  if (/(n|l|s|t)\1$/.test(k)) forms.push(k.slice(0, -1));
  if (k.endsWith("ar")) forms.push(`${k.slice(0, -2)}s`);
  for (const form of [...forms]) {
    if (form.includes("ft")) forms.push(form.replace(/ft/g, "pt"));
    if (form.startsWith("gull")) forms.push(`goll${form.slice(4)}`);
  }
  return forms;
}

// Spellings in the index that do not follow Bellows's usual transliteration.
const spellings: Readonly<Record<string, string>> = {
  hamthir: "hamther",
  valholl: "valhall",
  guthmundr: "gothmund",
  myrkvithr: "myrkwood",
  valfothr: "valfather",
  sigfothr: "sigfather",
  sigfathir: "sigfather",
  herjafothr: "heerfather",
  herfothr: "heerfather",
  borr: "bur",
  durathror: "dyrathror",
  allvaldi: "alvaldi",
  mundilfori: "mundilferi",
  rennandi: "rinnandi",
  hatafjorthr: "hatafjord",
  varinsfjorthr: "varinsfjord",
  hindarfjall: "hindarfjoll",
};

function nominatives(surface: string): string[] {
  const forms = new Set([surface]);
  const add = (stem: string): void => {
    forms.add(stem);
    forms.add(`${stem}r`);
    if (/[nl]$/.test(stem)) forms.add(stem + stem.slice(-1));
  };
  add(surface);
  if (surface.endsWith("s")) add(surface.slice(0, -1));
  if (/(?:ar|ur)$/.test(surface)) add(surface.slice(0, -2));
  if (surface.endsWith("a")) {
    const stem = surface.slice(0, -1);
    forms.add(`${stem}i`);
    forms.add(`${surface}r`);
    if (!/r$/.test(stem)) add(stem);
  }
  if (surface.endsWith("i") && !surface.endsWith("ari")) add(surface.slice(0, -1));
  if (surface.endsWith("u")) {
    const stem = surface.slice(0, -1);
    forms.add(`${stem}a`);
    forms.add(`${stem.replace(/[öǫ]/, "a")}a`);
    forms.add(`${stem}i`);
  }
  if (surface.endsWith("um")) {
    const stem = surface.slice(0, -2);
    forms.add(`${stem}ar`);
    forms.add(`${stem}ir`);
  }
  return [...forms];
}

export class NameIndex {
  private readonly entries = new Map<string, NameGloss[]>();
  private readonly knownIndexes = new WeakMap<ReadonlySet<string>, Map<string, string[]>>();
  readonly size: number;

  constructor(bellowsHtml: string, chapterSlug: Map<string, string>) {
    const $ = cheerio.load(bellowsHtml);
    const pageWorks = new Map<number, Set<string>>();
    $('[id^="pb"]').each((_, page) => {
      const n = /^pb(\d+)[a-z]*$/.exec(page.attribs.id ?? "");
      const chapter = $(page).closest('div.div1[id^="ch"]').attr("id");
      const slug = chapter ? chapterSlug.get(chapter) : undefined;
      if (!n || !slug) return;
      const pageNumber = Number(n[1]);
      const works = pageWorks.get(pageNumber) ?? new Set<string>();
      works.add(slug);
      pageWorks.set(pageNumber, works);
    });

    let size = 0;
    $("div.div1.index").filter((_, div) => /PRONOUNCING INDEX/i.test($(div).find("h2").first().text()))
      .find(".divBody > p").each((_, paragraph) => {
        const p = $(paragraph).clone();
        p.find(".pageNum").remove();
        p.find("br").replaceWith("\n");
        const descriptions: string[] = [];
        p.find("i").each((i, italic) => {
          descriptions.push(clean($(italic).text()).replace(/[\s,;:–—-]+$/g, ""));
          $(italic).replaceWith(`\uE000${i}\uE000`);
        });
        const text = p.text();
        const markers = [...text.matchAll(/\uE000(\d+)\uE000/g)];
        const starts = markers.map((marker, i) => {
          const from = i ? markers[i - 1]!.index! + markers[i - 1]![0].length : 0;
          const before = text.slice(from, marker.index);
          const name = /(?:^|[.;\n])\s*([^.;\n]+),\s*$/.exec(before);
          return name ? { name: nameText(name[1]!), start: from + name.index } : undefined;
        });
        for (let i = 0; i < markers.length; i++) {
          const marker = markers[i]!;
          const start = starts[i];
          const desc = descriptions[Number(marker[1])];
          if (!start?.name || !desc) continue;
          const refs = text.slice(marker.index! + marker[0].length, starts[i + 1]?.start ?? text.length);
          const works = new Set<string>();
          for (const page of refs.matchAll(/\b(\d+)(?:\s*[–—-]\s*(\d+))?/g)) {
            const first = Number(page[1]);
            const last = page[2] ? Number(page[2]) : first;
            for (let n = first; n <= last; n++) {
              for (const slug of pageWorks.get(n) ?? []) works.add(slug);
            }
          }
          const entry: NameGloss = { name: start.name, desc, works: [...works] };
          const names = [start.name.replace(/\s*\(.*$/, "")];
          const alternative = /\(or (.+)\)/.exec(start.name);
          if (alternative) names.push(alternative[1]!);
          for (const name of names) {
            const variants = new Set([key(name), key(name.replace(/ǫ/g, "a"))]);
            for (const variant of variants) {
              const entries = this.entries.get(variant) ?? [];
              entries.push(entry);
              this.entries.set(variant, entries);
            }
          }
          size++;
        }
      });
    this.size = size;
    // The index identifies Gylfi only under his assumed name, Gangleri.
    const gylfi = this.entries.get("gangleri")?.find((entry) => entry.desc === "King Gylfi");
    if (gylfi) {
      this.entries.set("gylfi", [{ name: "Gylfi", desc: "King Gylfi (called Gangleri)", works: gylfi.works }]);
    }
    const nari = this.entries.get("narfi")?.filter((entry) => entry.desc === "son of Loki");
    if (nari?.length) this.entries.set("nari", nari);
  }

  /** Bellows identifications, retaining homonyms and their cited works. */
  glosses(lemma: string): NameGloss[] {
    const spelling = spellings[key(lemma)];
    if (spelling) return this.entries.get(spelling) ?? [];
    for (const k of keys(lemma)) {
      const entries = this.entries.get(k);
      if (entries) return entries;
    }
    return [];
  }

  /** Conservative nominatives for capitalized words not analysed by the edition. */
  lemmaFor(surface: string, known: ReadonlySet<string>): string | undefined {
    if (!/^\p{Lu}\p{Ll}+(?:-\p{Lu}?\p{Ll}+)*$/u.test(surface)) return;
    const candidates = nominatives(surface);
    if (/(?:ing|ung)a$/.test(surface) && this.glosses(`${surface}r`).length) return `${surface}r`;
    for (const lemma of candidates) {
      if (known.has(lemma)) return lemma;
    }
    let index = this.knownIndexes.get(known);
    if (!index) {
      index = new Map<string, string[]>();
      for (const lemma of known) {
        const k = norseKey(lemma);
        const lemmas = index.get(k) ?? [];
        lemmas.push(lemma);
        index.set(k, lemmas);
      }
      this.knownIndexes.set(known, index);
    }
    for (const candidate of candidates) {
      const lemmas = index.get(norseKey(candidate));
      if (lemmas?.length === 1) return lemmas[0];
    }
    for (let lemma of candidates) {
      // Unattested stems need an unambiguous nominative, not just a matching accusative.
      if (/(?:heim|garð|bekk|ólf|olf|mund|vald|stein|orm|dag|ist|ar|ur)$/.test(lemma)) lemma += "r";
      if (lemma !== surface && /[ai]$/.test(surface) && lemma === surface.slice(0, -1)) continue;
      if (surface.endsWith("a") && lemma === `${surface.slice(0, -1)}r`) continue;
      const entries = this.glosses(lemma);
      if (!entries.length || entries.every((entry) => key(entry.name.replace(/\s*\(.*/, "")).length < 4)) continue;
      if (entries.every((entry) => entry.desc === "a river")) continue;
      if (entries.every((entry) => /^(?:son|daughter) of (?:Karl|Jarl|Thræll)$/.test(entry.desc))) continue;
      return lemma;
    }
    return undefined;
  }
}
