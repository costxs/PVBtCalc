// The ONLY way to silence the stray-literal scanner (strayLiterals.ts).
//
// A text belongs here when it is identical in every language: a unit, a file
// format, a symbol, a product name, a bibliographic reference. Anything a
// reader would translate ("Export", "Skin", "Flowrate"...) does NOT belong here —
// it goes in en.ts/pt.ts.
//
// Rules, enforced by strayLiterals.test.ts:
//   - entries are compared after normalisation (entities decoded, whitespace
//     collapsed, leading punctuation and trailing punctuation stripped);
//   - every entry must still match a literal in the source, so the list cannot
//     accumulate dead entries;
//   - there are no per-line ignore comments. Adding a token is a diff to this file.
export const NEUTRAL_TOKENS: readonly string[] = [
  // formats and names that read the same in English and Portuguese
  "PNG 300 dpi",
  "(psi)", // pressure unit
  "Regime",

  // chart names: proper names, identical in the app, the exported sheets and the theory
  // documents, so they stay in English in both languages
  "Design Plot",
  "Simulation Chart",
  "Analysis Chart",
  "Skin Evolution",

  // rock formation names (proper names, kept in English in both languages)
  "Indiana Limestone",
  "Desert Pink",
  "Edwards Yellow",
  "Edwards White",
  "Austin Chalk",
  "Winterest Limestone",

  // chart mark labels: symbol = value + unit ("{}" stands for an interpolated value)
  "V = {} gal/ft",
  "q = {} gal/(ft.min)",

  // internal matching key, not display text: mirrors the backend target_label ("skin -3.00")
  "skin {}",

  // product name (rendered as PVBt<span>Calc</span>)
  "Calc",

  // bibliographic references (Footer)
  "Perry, R. H.",
  "Perry's Chemical Engineers' Handbook.",
  "Ali, M., & Ziauddin, M.",
  "Carbonate acidizing: A mechanistic model for wormhole growth in linear and radial flow. Journal of Petroleum Science and Engineering",
];

export function normalizeLiteral(raw: string): string {
  return raw
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[^\p{L}\p{N}(]+/u, "")
    .replace(/[\s—–,:;-]+$/, "");
}
