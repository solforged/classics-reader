import { describe, expect, test } from "bun:test";
import { formatCite, resolveCite } from "../../src/lib/cite";
import { site } from "./site";
import { parseUnit } from "./lib/conllu";
import { placeEnglish, type Bead } from "./lib/align";

describe("Discorsi citations", () => {
  test("round-trips the book, chapter and paragraph without repeating the book", () => {
    const work = site.works.find((work) => work.slug === "discorsi-1")!;
    expect(formatCite(work, "1.11.3")).toBe("Disc. 1.11.3");
    expect(resolveCite("Disc. 1.11.3", site.works)).toEqual({ work, cite: "1.11.3" });
    expect(resolveCite("Disc. 1.11", site.works)).toEqual({ work, cite: "1.11" });
    expect(work.levels.findIndex((level) => level.list)).toBe(1);
  });
  test("round-trips the dedication as book zero without a spurious chapter level", () => {
    const work = site.works.find((work) => work.slug === "discorsi-dedication")!;
    expect(formatCite(work, "1")).toBe("Disc. 0.1");
    expect(resolveCite("Disc. 0.1", site.works)).toEqual({ work, cite: "1" });
  });
});

describe("Discorsi CoNLL-U metadata", () => {
  test("restarts sentence indices at each chapter even when paragraph numbers repeat", () => {
    const source = [1, 2].map((chapter) => `# unit = 1-1\n# book = 1\n# chapter = ${chapter}\n# par = 1\n# sent_id = disc-1-${chapter}-1-1\n# text = Roma\n1\tRoma\tRoma\tPROPN\tSP\tGender=Fem|Number=Sing\t0\troot\t_\tSpaceAfter=No`).join("\n\n");
    expect(parseUnit(source, "1-1").map(({ chapter, par, n }) => ({ chapter, par, n }))).toEqual([
      { chapter: 1, par: 1, n: 1 }, { chapter: 2, par: 1, n: 1 },
    ]);
  });
});

describe("Discorsi alignment identity checks", () => {
  const italian = [{ id: "disc-1-11-3-1", par: 3, sent: 1, text: "Roma." }];
  const bead: Bead = { n: 1, itIds: [italian[0]!.id], enIds: [], kind: "1-0" };
  test("rejects an Italian sentence missing from the alignment", () => {
    expect(() => placeEnglish([], italian, [], "1-11")).toThrow("is in no bead");
  });
  test("rejects a duplicated Italian sentence", () => {
    expect(() => placeEnglish([bead, { ...bead, n: 2 }], italian, [], "1-11")).toThrow("is in two beads");
  });
  test("rejects a stale sentence id after an annotation swap", () => {
    expect(() => placeEnglish([{ ...bead, itIds: ["disc-1-11-3-2"] }], italian, [], "1-11")).toThrow("which is not a sentence");
  });
});
