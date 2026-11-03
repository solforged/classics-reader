import { countWords, parseOpenITI } from "../lib/openiti";
const text = await Bun.file(process.argv[2] ?? "/tmp/muq-research/arabic/openiti/Shamela0012320-ara1.mARkdown").text();
const works = parseOpenITI(text);
let total = 0;
for (const work of works) {
  const words = work.rows.reduce((sum, row) => sum + countWords(row.text), 0);
  total += words;
  const sizes = work.rows.map((row) => countWords(row.text));
  console.log(work.slug, work.rows.length, "rows", words, "words; kinds", work.rows.filter((r) => r.kind !== "prose").map((r) => `${r.kind[0]}${r.level ?? ""}`).join(","), "max", Math.max(...sizes), "titleAr", work.titleAr.slice(0, 40));
  console.log("   ", sizes.join(" "));
}
console.log("total", total);
