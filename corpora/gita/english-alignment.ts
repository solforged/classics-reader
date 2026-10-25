import type { EnUnit, OnUnit, Row } from "../../scripts/core/types";

// Besant Discourse 13 opens with Arjuna's question, "Matter and Spirit, also the Field and the Knower of the
// Field ...", numbered (1). DCS chapter 13 instead begins "idaṃ śarīraṃ kaunteya", Besant's numbered (2).
// Thus DCS 13.N corresponds to Besant 13.N+1. Besant 13.1 is retained as row "0", with no Sanskrit side.
const NUMBERING: Readonly<Record<number, { offset: number; extra: readonly { verse: number; row: string }[] }>> = {
  13: { offset: 1, extra: [{ verse: 1, row: "0" }] },
};

export function alignEnglish(chapter: number, sanskrit: ReadonlyMap<number, OnUnit[]>, english: ReadonlyMap<number, EnUnit[]>): Row[] {
  const numbering = NUMBERING[chapter];
  const offset = numbering?.offset ?? 0;
  const used = new Set<number>();
  const rows: Row[] = [];
  for (const extra of numbering?.extra ?? []) {
    const en = english.get(extra.verse);
    if (!en?.some((unit) => unit.kind !== "head" && unit.lines.some((line) => line.trim()))) {
      throw new Error(`Missing extra Besant verse ${chapter}.${extra.verse}`);
    }
    rows.push({ id: extra.row, on: [], en });
    used.add(extra.verse);
  }
  for (const [verse, on] of [...sanskrit].sort(([a], [b]) => a - b)) {
    const number = verse + offset;
    const en = english.get(number);
    if (!en) throw new Error(`Missing Besant verse ${chapter}.${number} for DCS ${chapter}.${verse}`);
    if (!en.some((unit) => unit.kind !== "head" && unit.lines.some((line) => line.trim()))) {
      throw new Error(`Empty Besant verse ${chapter}.${number}`);
    }
    rows.push({ id: String(verse), on, en });
    used.add(number);
  }
  for (const verse of english.keys()) {
    if (!used.has(verse)) throw new Error(`Unmapped Besant verse ${chapter}.${verse}`);
  }
  return rows;
}
