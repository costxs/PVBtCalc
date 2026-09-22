// A dedicated, narrow guard for one regression: a leftover Kelvin unit shown to the user
// after the Celsius conversion (tools/temperature.ts). It exists because the general
// stray-literal scanner (strayLiterals.ts) correctly does NOT flag "(K)" as untranslated
// prose -- a bare unit symbol is not a language-coverage problem, the same way "(ft)" or
// "(in)" are legitimately never routed through the dictionary. This scanner instead looks
// for the UNIT ITSELF, wherever it sits inside a string, template or JSX-text literal --
// never inside an identifier ("temperature_k", "radialTemperatureK") and never inside a code
// COMMENT: both are only checked within actual rendered/written content, the same places the
// stray-literal scanner looks at.
import ts from "typescript";

// A standalone "K": not glued to another letter on either side (so it can follow a digit,
// space, "(", "}" or start/end of the literal, but never sit inside a word or identifier).
const STANDALONE_K = /(?<![A-Za-zÀ-ÿ])K(?![A-Za-zÀ-ÿ])/;
const KELVIN_WORD = /Kelvin/;

// Named to avoid the words "standalone K"/"Kelvin word" themselves matching this file's own
// patterns when noKelvinUnit.ts is scanned (it is not exempt from its own guard).
export type KelvinUnitKind = "symbol" | "word";

export interface KelvinUnitHit {
  file: string;
  line: number;
  kind: KelvinUnitKind;
  text: string;
}

function literalText(node: ts.Node): string | null {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isTemplateExpression(node)) {
    return node.head.text + node.templateSpans.map((s) => "{}" + s.literal.text).join("");
  }
  return null;
}

export function scanFileForKelvinUnit(file: string, source: string): KelvinUnitHit[] {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const out: KelvinUnitHit[] = [];
  const visit = (node: ts.Node) => {
    // JSX text ("<span>System Temperature (K)</span>") is its own node kind, not a string
    // literal -- must be checked separately or it slips straight past literalText().
    const text = ts.isJsxText(node) ? node.text : literalText(node);
    if (text !== null) {
      const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
      const clean = text.replace(/\s+/g, " ").trim();
      if (STANDALONE_K.test(text)) out.push({ file, line, kind: "symbol", text: clean });
      if (KELVIN_WORD.test(text)) out.push({ file, line, kind: "word", text: clean });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

// Test files describe fixtures and other scanners in prose ("338.71K", "T_CALIBRATED_K —
// fixture...", or a literal "K" used as an example of a non-prose unit) -- not user-facing
// text, so they are exempt, same as the stray-literal scanner's EXEMPT_PATHS.
const EXEMPT = /\.test\.tsx?$/;

export function scanAllForKelvinUnit(files: Record<string, string>): KelvinUnitHit[] {
  return Object.keys(files).filter((f) => !EXEMPT.test(f)).sort().flatMap((f) => scanFileForKelvinUnit(f, files[f]));
}
