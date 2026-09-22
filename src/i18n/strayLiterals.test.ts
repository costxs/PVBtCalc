import { describe, expect, it } from "vitest";
import { scanAll, scanSource, isTranslatable } from "./strayLiterals";
import { NEUTRAL_TOKENS, normalizeLiteral } from "./neutralTokens";

// Every .ts/.tsx under src, as raw text (no Node typings needed).
const modules = import.meta.glob("../**/*.{ts,tsx}", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
const files: Record<string, string> = {};
for (const [p, src] of Object.entries(modules)) files[p.replace(/^\.\.\//, "/")] = src;

const keyOf = (v: { file: string; kind: string; text: string }) => `${v.file}::${v.kind}::${v.text}`;

describe("no user-facing literals outside src/i18n", () => {
  it("scans the real source tree", () => {
    expect(Object.keys(files).length).toBeGreaterThan(50);
  });

  // Zero tolerance. The only way to silence a literal is a reviewed entry in neutralTokens.ts.
  it("has no user-facing literal outside the dictionary", () => {
    expect(scanAll(files).map(keyOf)).toEqual([]);
  });
});

describe("neutral token list", () => {
  it("is normalised and duplicate-free", () => {
    expect(NEUTRAL_TOKENS.filter((x) => normalizeLiteral(x) !== x)).toEqual([]);
    expect(new Set(NEUTRAL_TOKENS).size).toBe(NEUTRAL_TOKENS.length);
  });
  it("has no dead entries: each token still silences a real literal", () => {
    const used = new Set<string>();
    scanAll(files, used);
    expect(NEUTRAL_TOKENS.filter((x) => !used.has(x))).toEqual([]);
  });
  it("per-line ignore comments do not exist anywhere", () => {
    const offenders = Object.entries(files).filter(([p, s]) => !p.includes("/i18n/") && /i18n-ignore/.test(s)).map(([p]) => p);
    expect(offenders).toEqual([]);
  });
});

describe("scanner detects each literal position it claims to", () => {
  const scan = (src: string) => scanSource("/x.tsx", src).map((v) => v.kind);

  it("JSX text, attrs, expressions", () => {
    expect(scan(`const A = () => <div title="Some title">Hello world</div>;`)).toEqual(["jsx-attr", "jsx-text"]);
    expect(scan(`const A = ({c}: any) => <b>{c ? "Yes please" : "No thanks"}</b>;`)).toEqual(["jsx-expression", "jsx-expression"]);
  });
  it("chart/table config properties, calls and error assignments", () => {
    expect(scan(`const o = { name: "Injection Rate", nameLocation: "middle" };`)).toEqual(["prop:name"]);
    expect(scan(`const c = { label: "Flowrate", description: "Some words here" };`)).toEqual(["prop:label", "prop:description"]);
    expect(scan(`alert("Enter your username"); window.confirm(\`Delete \${x}?\`);`)).toEqual(["call:alert", "call:confirm"]);
    expect(scan(`errors.minimum = "Enter a number";`)).toEqual(["assign:minimum"]);
    expect(scan(`reasons.push("bad value");`)).toEqual(["call:push"]);
  });
  it("multi-word return values and arrow bodies, but not enum-like single words", () => {
    expect(scan(`function f(p: string) { switch (p) { case "a": return "Core Length (in)"; default: return "radial"; } }`)).toEqual(["return"]);
    expect(scan(`const g = () => "Some phrase here";`)).toEqual(["return"]);
  });
  it("flags isPt branching", () => {
    expect(scan(`const isPt = true;`)).toEqual(["isPt-branching"]);
  });
  it("ignores symbols, units, css, ids, slice names and listed neutral tokens only", () => {
    expect(scan(`const o = { label: "q0", unit: "gal/(ft.min)" }; const p = { label: "V_opt" };`)).toEqual([]);
    expect(scan(`const A = () => <div className="flex gap-2" style={{ color: "red" }}>{x}</div>;`)).toEqual([]);
    expect(scan(`createSlice({ name: "results" }); const s = { font: { name: "Calibri" } };`)).toEqual([]);
    expect(scan(`const A = () => <b>Regime</b>;`)).toEqual([]);
    expect(scan(`const A = () => <b>— PNG 300 dpi</b>;`)).toEqual([]);
    // near-misses and translatable words are still flagged; a comment does not silence anything
    expect(scan(`const A = () => <b>Regime change</b>;`)).toEqual(["jsx-text"]);
    expect(scan(`const A = () => <b>Export</b>;`)).toEqual(["jsx-text"]);
    expect(scan(`// i18n-ignore\nconst A = () => <b>Brand Name</b>;`)).toEqual(["jsx-text"]);
  });
  it("word heuristic", () => {
    expect(isTranslatable("Minimum")).toBe(true);
    expect(isTranslatable("PVBt")).toBe(false);
    expect(isTranslatable("1/Da")).toBe(false);
    expect(isTranslatable("K")).toBe(false);
  });
});
