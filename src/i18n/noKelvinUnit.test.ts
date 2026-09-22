import { describe, expect, it } from "vitest";
import { scanAllForKelvinUnit, scanFileForKelvinUnit } from "./noKelvinUnit";

// Every .ts/.tsx under src, as raw text (mirrors strayLiterals.test.ts's file collection).
const modules = import.meta.glob("../**/*.{ts,tsx}", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
const files: Record<string, string> = {};
for (const [p, src] of Object.entries(modules)) files[p.replace(/^\.\.\//, "/")] = src;

const keyOf = (h: { file: string; line: number; kind: string; text: string }) => `${h.file}:${h.line}: [${h.kind}] ${h.text}`;

// Exact, reviewed exceptions to the zero-tolerance rule below -- NOT a blanket file
// exemption (the guard keeps scanning these two files node by node; a stray-literal-style
// wholesale exemption would have silently let past the next stale table row, and it already
// missed two once: the old "Temperature [K]" rows this same guard caught). A count that
// drifts either way fails, including to zero -- so deleting the paragraph by accident fails
// too, not just adding a new leak.
//
// content.pt.tsx / content.en.tsx (the "About the Model" tab) explain, in prose, that the
// calibration itself (Eq. 18, T_CALIBRATED_K = 283-478 K) is fitted and computed in Kelvin,
// stating that bound in K next to its Celsius equivalent -- reviewed, deliberate content,
// confined to the "Acid-rock system properties" section.
const DOCUMENTED_EXCEPTIONS: Record<string, { symbol: number; word: number }> = {
  "/components/SobreOModelo/content.pt.tsx": { symbol: 1, word: 2 },
  "/components/SobreOModelo/content.en.tsx": { symbol: 1, word: 2 },
};

// [startLine, endLine) of the section whose <h2> carries id="properties" -- computed from
// the file, not hardcoded, so it tracks the section wherever it ends up.
function propertiesSectionLines(src: string): [number, number] {
  const start = src.indexOf('id="properties"');
  if (start < 0) throw new Error('no id="properties" section found');
  const nextH2 = src.indexOf("<h2", start + 1);
  const end = nextH2 < 0 ? src.length : nextH2;
  const startLine = src.slice(0, start).split("\n").length;
  const endLine = src.slice(0, end).split("\n").length;
  return [startLine, endLine];
}

describe("no leftover Kelvin temperature unit in the frontend", () => {
  it("scans the real source tree", () => {
    expect(Object.keys(files).length).toBeGreaterThan(50);
  });

  it("has no standalone K or 'Kelvin' word anywhere, except the two documented, exactly-counted exceptions, confined to the Properties section", () => {
    const hits = scanAllForKelvinUnit(files);
    const hitsByFile = new Map<string, typeof hits>();
    for (const h of hits) hitsByFile.set(h.file, [...(hitsByFile.get(h.file) ?? []), h]);

    for (const file of Object.keys(files)) {
      const exception = DOCUMENTED_EXCEPTIONS[file];
      const fileHits = hitsByFile.get(file) ?? [];

      if (!exception) {
        expect(fileHits.map(keyOf), `${file}: unexpected Kelvin-unit content`).toEqual([]);
        continue;
      }

      const kNodes = fileHits.filter((h) => h.kind === "symbol");
      const kelvinNodes = fileHits.filter((h) => h.kind === "word");
      expect(kNodes.length, `${file}: standalone-K count drifted from the documented ${exception.symbol}`).toBe(exception.symbol);
      expect(kelvinNodes.length, `${file}: "Kelvin"-word count drifted from the documented ${exception.word}`).toBe(exception.word);

      const [startLine, endLine] = propertiesSectionLines(files[file]);
      for (const h of fileHits) {
        expect(h.line, `${file}:${h.line}: [${h.kind}] found outside the Properties section (lines ${startLine}-${endLine})`).toBeGreaterThanOrEqual(startLine);
        expect(h.line, `${file}:${h.line}: [${h.kind}] found outside the Properties section (lines ${startLine}-${endLine})`).toBeLessThan(endLine);
      }
    }
  });
});

describe("scanner detects a standalone K and the word Kelvin, but not letters glued to K", () => {
  const scan = (src: string) => scanFileForKelvinUnit("/x.ts", src).map((h) => `${h.kind}:${h.text}`);

  it("catches the shapes this migration actually had", () => {
    expect(scan(`const a = "System Temperature (K)";`)).toEqual(["symbol:System Temperature (K)"]);
    expect(scan(`const b = \`\${t} K\`;`)).toEqual(["symbol:{} K"]);
    expect(scan(`const c = "Design 297 K";`)).toEqual(["symbol:Design 297 K"]);
    expect(scan(`const d = \`design_\${t}K\`;`)).toEqual(["symbol:design_{}K"]);
    expect(scan(`const e = "fitted in Kelvin";`)).toEqual(["word:fitted in Kelvin"]);
  });

  it("a node with both the symbol and the word reports both, once each", () => {
    expect(scan(`const a = "283-478 K, i.e. fitted in Kelvin";`)).toEqual([
      "symbol:283-478 K, i.e. fitted in Kelvin",
      "word:283-478 K, i.e. fitted in Kelvin",
    ]);
  });

  it("ignores identifiers, code comments, and non-temperature text", () => {
    expect(scan(`const radialTemperatureK = 297.2; const temperature_k = 1;`)).toEqual([]);
    expect(scan(`// sweepValues is Kelvin here\nconst e = "Wormhole Length [ft]";`)).toEqual([]);
    expect(scan(`const f = "OK, that works.";`)).toEqual([]); // "OK" is not a standalone K
    expect(scan(`const g = "kg, km";`)).toEqual([]); // letters on both sides, not this unit
  });
});
