// Finds user-facing string literals that live outside the translation source
// (src/i18n). Pure: takes { path: source } and returns violations, so both the
// vitest guard and scripts/stray-literals.mjs share it.
//
// What counts as "user-facing" (heuristic, syntax-directed):
//   - JSX text and string literals in JSX children expressions
//   - JSX attributes title / placeholder / alt / aria-label / label / legendLabel
//   - object properties name / title / text / label / description / message / error / ...
//     (chart config, table column config, option lists, validation results)
//   - arguments of alert / confirm / set*Error|Notice|Message, and .push() on
//     reasons / notes / errors / messages arrays
//   - `errors.minimum = "..."`-style assignments
//   - new Error("...") messages (they end up on screen)
//   - multi-word text returned from a function or arrow body
//   - variables named tooltip*/html/message/text/... assigned or appended literals
//   - any use of the identifier `isPt` (language branching must go through t())
// The only way to silence it is the reviewed list in neutralTokens.ts.
import ts from "typescript";
import { NEUTRAL_TOKENS, normalizeLiteral } from "./neutralTokens.ts";

const NEUTRAL = new Set(NEUTRAL_TOKENS);

export interface StrayViolation {
  file: string;
  line: number;
  kind: string;
  text: string;
}

const USER_ATTRS = new Set(["title", "placeholder", "alt", "aria-label", "label", "legendLabel"]);
const USER_PROPS = new Set([
  "name", "title", "text", "label", "description", "message", "error",
  "legendLabel", "subtext", "hint", "tooltip", "header", "xLabel", "yLabel", "formatter",
]);
const CALL_NAMES = /^(alert|confirm|set\w*(Error|Notice|Message))$/;
const PUSH_RECEIVERS = /(reasons|notes|errors|messages)$/i;
// variables that build displayed text (tooltip HTML, messages...)
const TEXT_VARS = /^(tooltip|html|message|msg|text|label|title|note|banner)/i;
const ASSIGN_TARGETS = new Set([...USER_PROPS, "minimum", "maximum"]);

// Files that hold long-form translated content as typed PT/EN pairs; they are
// the translation source for the documentation tab and footer.
export const EXEMPT_PATHS = [
  /(^|\/)i18n\//,
  /SobreOModelo\/content\.(pt|en)\.tsx$/,
  /components\/footerContent\.ts$/,
  // the exported workbook's text: fixed English constants, pinned to shared-fixtures/export_text.json
  /tools\/exportText\.ts$/,
  /\.test\.tsx?$/,
  /vite-env\.d\.ts$/,
];

function literalText(node: ts.Node): string | null {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isTemplateExpression(node)) {
    return node.head.text + node.templateSpans.map((s) => "{}" + s.literal.text).join("");
  }
  return null;
}

// Literal nodes that can end up displayed when `expr` is used as a value.
function valueLiterals(expr: ts.Expression | undefined): ts.Node[] {
  if (!expr) return [];
  if (ts.isParenthesizedExpression(expr) || ts.isAsExpression(expr) || ts.isNonNullExpression(expr)) {
    return valueLiterals(expr.expression);
  }
  if (ts.isConditionalExpression(expr)) return [...valueLiterals(expr.whenTrue), ...valueLiterals(expr.whenFalse)];
  if (ts.isBinaryExpression(expr)) {
    const op = expr.operatorToken.kind;
    if (op === ts.SyntaxKind.QuestionQuestionToken || op === ts.SyntaxKind.BarBarToken || op === ts.SyntaxKind.AmpersandAmpersandToken) {
      return [...valueLiterals(expr.left), ...valueLiterals(expr.right)];
    }
    if (op === ts.SyntaxKind.PlusToken) return [...valueLiterals(expr.left), ...valueLiterals(expr.right)];
    return [];
  }
  return literalText(expr) !== null ? [expr] : [];
}

// A translatable text has a real word in it. Bare symbols and units (q0, V_opt,
// PVBt, iv, gal/(ft.min), cm³/min) are not prose.
export function isTranslatable(raw: string): boolean {
  const text = raw.replace(/<[^>]*>/g, " ").replace(/\{\}/g, " ").trim(); // markup and interpolations are not prose
  if (!/[A-Za-zÀ-ÿ]{3,}/.test(text)) return false;
  if (/^[a-z][a-zA-Z]*(\.[a-zA-Z_]+)+(\?.*)?$/.test(text)) return false; // dictionary key, e.g. "error.unreachable"
  if (!/\s/.test(text)) {
    if (/[0-9_/]/.test(text)) return false;
    if (text.length <= 3) return false;
    if (/^[A-Za-z]/.test(text) && /[A-Z]/.test(text.slice(1))) return false;
  }
  return true;
}

// "name" is also RTK's createSlice({ name }) and a font family in Excel styles; neither is displayed.
function isNonDisplayName(prop: ts.PropertyAssignment): boolean {
  const obj = prop.parent;
  const owner = obj.parent;
  if (ts.isCallExpression(owner)) {
    const callee = ts.isIdentifier(owner.expression) ? owner.expression.text : '';
    return callee === 'createSlice' || callee === 'createAsyncThunk';
  }
  return ts.isPropertyAssignment(owner) && ts.isIdentifier(owner.name) && owner.name.text === 'font';
}

export function scanSource(file: string, source: string, used?: Set<string>): StrayViolation[] {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const out: StrayViolation[] = [];

  const report = (node: ts.Node, kind: string, text: string) => {
    const norm = normalizeLiteral(text);
    if (NEUTRAL.has(norm)) { used?.add(norm); return; }
    const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
    out.push({ file, line, kind, text: text.replace(/\s+/g, " ").trim() });
  };
  const checkValue = (expr: ts.Expression | undefined, kind: string) => {
    for (const lit of valueLiterals(expr)) {
      const text = literalText(lit)!;
      if (isTranslatable(text)) report(lit, kind, text);
    }
  };
  const nameOf = (n: ts.Node): string | null =>
    ts.isIdentifier(n) ? n.text : ts.isPropertyAccessExpression(n) ? n.name.text : ts.isStringLiteral(n) ? n.text : null;

  const visit = (node: ts.Node) => {
    if (ts.isIdentifier(node) && node.text === "isPt") report(node, "isPt-branching", "isPt");

    if (ts.isJsxText(node)) {
      const text = normalizeLiteral(node.text);
      if (isTranslatable(text)) report(node, "jsx-text", text);
    } else if (ts.isJsxExpression(node) && node.expression && (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))) {
      checkValue(node.expression, "jsx-expression");
    } else if (ts.isJsxAttribute(node) && USER_ATTRS.has(node.name.getText(sf))) {
      const init = node.initializer;
      if (init && ts.isStringLiteral(init)) {
        if (isTranslatable(init.text)) report(init, "jsx-attr", init.text);
      } else if (init && ts.isJsxExpression(init)) {
        checkValue(init.expression, "jsx-attr");
      }
    } else if (ts.isPropertyAssignment(node)) {
      const key = ts.isIdentifier(node.name) || ts.isStringLiteral(node.name) ? node.name.text : null;
      if (key && USER_PROPS.has(key) && !(key === "name" && isNonDisplayName(node))) checkValue(node.initializer, `prop:${key}`);
    } else if (ts.isCallExpression(node)) {
      const callee = nameOf(node.expression);
      const receiver = ts.isPropertyAccessExpression(node.expression) ? nameOf(node.expression.expression) : null;
      const isUserCall = callee !== null && (CALL_NAMES.test(callee) || (callee === "push" && receiver !== null && PUSH_RECEIVERS.test(receiver)));
      if (isUserCall) node.arguments.forEach((a) => checkValue(a, `call:${callee}`));
    } else if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "Error") {
      (node.arguments ?? []).forEach((a) => checkValue(a, "new-Error"));
    } else if (ts.isReturnStatement(node) || ts.isArrowFunction(node) && !ts.isBlock(node.body)) {
      // `return "Some phrase"` / `() => "Some phrase"`: only multi-word text, since single
      // words are usually enum-like values (`return "radial"`).
      const expr = ts.isReturnStatement(node) ? node.expression : (node.body as ts.Expression);
      for (const lit of valueLiterals(expr)) {
        const text = literalText(lit)!;
        if (/\s/.test(text.trim()) && isTranslatable(text)) report(lit, "return", text);
      }
    } else if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && TEXT_VARS.test(node.name.text)) {
      checkValue(node.initializer, `var:${node.name.text}`);
    } else if (ts.isBinaryExpression(node) && (node.operatorToken.kind === ts.SyntaxKind.EqualsToken || node.operatorToken.kind === ts.SyntaxKind.PlusEqualsToken)) {
      // property targets must be an exact display property (canvas `textAlign = "center"` is not text);
      // plain variables are matched by name pattern.
      const target = ts.isPropertyAccessExpression(node.left) && ASSIGN_TARGETS.has(node.left.name.text) ? node.left.name.text
        : ts.isIdentifier(node.left) && TEXT_VARS.test(node.left.text) ? node.left.text : null;
      if (target) checkValue(node.right, `assign:${target}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

export function scanAll(files: Record<string, string>, used?: Set<string>): StrayViolation[] {
  return Object.keys(files)
    .filter((f) => !EXEMPT_PATHS.some((re) => re.test(f)))
    .sort()
    .flatMap((f) => scanSource(f, files[f], used));
}
