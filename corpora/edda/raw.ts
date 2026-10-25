// A work's units before alignment (.cache/raw/<slug>.json): the Old Norse side and the English side, keyed for the
// curated crosswalks in alignment/<slug>.json.
import type { Analysis, SourceUnit, TextUnit } from "../../scripts/core/types";

export interface RawWork {
  slug: string;
  on: SourceUnit[];
  en: TextUnit[];
  analyses: Analysis[];
  notes: Record<string, string>; // note key → sanitized HTML
  intro?: string[]; // translator's introductory note, sanitized HTML paragraphs
}
