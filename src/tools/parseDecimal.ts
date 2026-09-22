import type { Language } from "../redux/ui/slice";

// Model inputs (porosity, flowrate, temperature...). Both "0,15" and "0.15" are
// accepted in BOTH interface languages: the language only decides how numbers are
// displayed, never how they are read.
//
// At most one separator is allowed, and it is always the decimal mark. "1.000" is 1,
// not one thousand (physical inputs have no thousands grouping), and anything
// ambiguous ("1,2,3", "1.234,5") is rejected so the field can say so instead of
// guessing. Axis limits have their own, thousands-aware parser (axisLimits.ts).
const DECIMAL = /^[+-]?(\d+([.,]\d*)?|[.,]\d+)([eE][+-]?\d+)?$/;

export function parseDecimal(raw: string | null | undefined): number | null {
  const s = (raw ?? "").trim();
  if (!DECIMAL.test(s)) return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

// Display: the language picks the decimal mark. No grouping, so the text can be
// edited and read back by parseDecimal unchanged.
export function formatDecimal(value: number | string | null | undefined, lang: Language): string {
  if (value === null || value === undefined || value === "") return "";
  const n = typeof value === "number" ? value : Number(value);
  const text = Number.isFinite(n) ? String(n) : String(value);
  return lang === "pt" ? text.replace(".", ",") : text;
}

export function numberLocale(lang: Language): string {
  return lang === "pt" ? "pt-BR" : "en-US";
}

export interface NumberInputEdit {
  draft: string;            // what the box shows while the user is typing
  value: number | null;     // parsed value, null if empty or invalid
  invalid: boolean;         // non-empty text that could not be read
}

export function editNumberInput(raw: string): NumberInputEdit {
  const value = parseDecimal(raw);
  return { draft: raw, value, invalid: raw.trim() !== "" && value === null };
}

// Formatted numbers (toFixed / toExponential output) shown in tables and cards:
// Portuguese uses the decimal comma, English the dot.
export function localizeNumberText(text: string, lang: Language): string {
  return lang === "pt" && /^-?\d/.test(text) ? text.replace(/\./g, ",") : text;
}
