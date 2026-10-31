import { describe, expect, test } from "bun:test";
import { formatCite, resolveCite, type CiteWork } from "./cite";

const stanza = [{ name: "Stanza" }];
const works: CiteWork[] = [
  { slug: "voluspa", abbr: "Vsp", levels: stanza },
  { slug: "havamal", abbr: "Háv", levels: stanza },
  { slug: "helgakvida-hundingsbana-i", abbr: "HH", levels: stanza },
  { slug: "helgakvida-hjorvardssonar", abbr: "HHv", levels: stanza },
  { slug: "gylfaginning", abbr: "Gylf", levels: [{ name: "Chapter", list: true }] },
  { slug: "bhagavad-gita-1", abbr: "BhG 1", levels: [{ name: "Verse" }] },
  { slug: "bhagavad-gita-12", abbr: "BhG 12", levels: [{ name: "Verse" }] },
  { slug: "aeneid-1", abbr: "Aen. 1", levels: [{ name: "Book" }, { name: "Line" }] },
];
const work = (slug: string) => works.find((w) => w.slug === slug)!;

describe("formatCite", () => {
  test("joins a plain abbreviation and a row with a space", () => {
    expect(formatCite(work("voluspa"), "45")).toBe("Vsp 45");
    expect(formatCite(work("helgakvida-hjorvardssonar"), "5p2")).toBe("HHv 5p2");
  });
  test("continues an abbreviation that names a division with a dot", () => {
    expect(formatCite(work("bhagavad-gita-12"), "47")).toBe("BhG 12.47");
  });
  test("does not repeat the division the abbreviation names", () => {
    expect(formatCite(work("aeneid-1"), "1.742")).toBe("Aen. 1.742");
  });
});

describe("resolveCite", () => {
  test("reads each reader's notation", () => {
    expect(resolveCite("Vsp 45", works)).toEqual({ slug: "voluspa", cite: "45" });
    expect(resolveCite("BhG 12.47", works)).toEqual({ slug: "bhagavad-gita-12", cite: "47" });
    expect(resolveCite("Aen. 1.157", works)).toEqual({ slug: "aeneid-1", cite: "1.157" });
  });
  test("accepts spaces, colons and commas as separators and ignores case and accents", () => {
    expect(resolveCite("aen 1 157", works)).toEqual({ slug: "aeneid-1", cite: "1.157" });
    expect(resolveCite("bhg 12:47", works)).toEqual({ slug: "bhagavad-gita-12", cite: "47" });
    expect(resolveCite("hav 77", works)).toEqual({ slug: "havamal", cite: "77" });
  });
  test("prefers the longest abbreviation at a word boundary", () => {
    expect(resolveCite("HHv 3", works)).toEqual({ slug: "helgakvida-hjorvardssonar", cite: "3" });
    expect(resolveCite("HH 3", works)).toEqual({ slug: "helgakvida-hundingsbana-i", cite: "3" });
    expect(resolveCite("BhG 12 3", works)).toEqual({ slug: "bhagavad-gita-12", cite: "3" });
    expect(resolveCite("BhG 1 3", works)).toEqual({ slug: "bhagavad-gita-1", cite: "3" });
  });
  test("keeps a full citation that repeats the abbreviation's division", () => {
    expect(resolveCite("Aen. 1 1.157", works)).toEqual({ slug: "aeneid-1", cite: "1.157" });
  });
  test("names the whole work when no row follows", () => {
    expect(resolveCite("Gylf", works)).toEqual({ slug: "gylfaginning", cite: "" });
  });
  test("names no work for bare numbers, words or a partial abbreviation", () => {
    expect(resolveCite("45", works)).toBeUndefined();
    expect(resolveCite("hammer", works)).toBeUndefined();
    expect(resolveCite("Vs 45", works)).toBeUndefined();
  });
});
