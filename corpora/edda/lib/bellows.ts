// Parses Henry Adams Bellows, The Poetic Edda (1923), Project Gutenberg #73533 HTML.
import * as cheerio from "cheerio";
import type { Element } from "domhandler";
import { hasClass, inline } from "../../../scripts/core/html";
import type { EnUnit } from "../../../scripts/core/types";

export interface BellowsPoem {
  intro: string[];
  units: EnUnit[];
  notes: Record<string, string>;
}

const skipPage = (el: Element) => hasClass(el, "pageNum");

export function parseBellows(html: string): Map<string, BellowsPoem> {
  const $ = cheerio.load(html);
  const poems = new Map<string, BellowsPoem>();

  $('div.div1[id^="ch"]').each((_, ch) => {
    const id = ch.attribs.id!;
    if (!/^ch[12]\.\d+$/.test(id)) return;
    const $ch = $(ch);
    const intro = $ch
      .find("div.introNote > div.divBody > p")
      .toArray()
      .map((p) => inline(p, { italics: true, skip: skipPage }))
      .filter(Boolean);

    const units: EnUnit[] = [];
    const byAnchor = new Map<string, EnUnit>();
    let n = 0;
    const bodies = $ch.find("div.div2.section").not(".introNote").not(".endNotes").toArray();
    for (const body of bodies) {
      $(body)
        .find("div.lgouter, p, h3, h4")
        .each((_, el) => {
          if (el.name === "p" && ($(el).closest("div.lgouter").length || hasClass(el, "tb"))) return;
          if ($(el).closest("div.introNote, div.endNotes").length) return;
          if (el.name === "h3" || el.name === "h4") {
            const t = inline(el, { skip: skipPage });
            if (t && !/^contents$/i.test(t)) units.push({ key: `h${++n}`, kind: "head", lines: [t] });
            return;
          }
          if (el.name === "p") {
            const t = inline(el, { skip: skipPage });
            if (!t) return;
            const u: EnUnit = { key: `p${++n}`, kind: "prose", lines: [t.replace(/\n/g, " ")] };
            units.push(u);
            if (el.attribs.id) byAnchor.set(el.attribs.id, u);
            return;
          }
          // Stanza
          const num = $(el).find(".verseNum").first().text().replace(/[.\s]/g, "");
          const lines = $(el)
            .find("p.line")
            .toArray()
            .map((l) =>
              inline(l, { skip: (e) => skipPage(e) || hasClass(e, "verseNum") })
                .replace(/\s*\|\s*/g, " | ")
                .trim(),
            )
            .filter(Boolean);
          if (!lines.length) return;
          const u: EnUnit = { key: `s${++n}`, kind: "stanza", label: num || undefined, lines };
          units.push(u);
          if (el.attribs.id) byAnchor.set(el.attribs.id, u);
        });
    }

    // Notes: each note paragraph links back to a stanza (#lg…) or prose paragraph (#p…).
    const notes: Record<string, string> = {};
    $ch.find("div.endNotes > div.divBody > p").each((i, p) => {
      const target = $(p)
        .find('a[href^="#lg"], a[href^="#p"]')
        .toArray()
        .map((a) => a.attribs.href!.slice(1))
        .find((h) => !h.startsWith("pb"));
      const html = inline(p, { italics: true, skip: (e) => skipPage(e) || hasClass(e, "parNum") });
      if (!html) return;
      const key = `${id}.n${i}`;
      notes[key] = html;
      const unit = target ? byAnchor.get(target) : undefined;
      if (unit) (unit.notes ??= []).push(key);
    });

    poems.set(id, { intro, units, notes });
  });
  return poems;
}
