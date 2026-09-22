import { describe, expect, it } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import fixture from "../../../shared-fixtures/export_text.json";
import analysisFixture from "../../../shared-fixtures/radial_analysis_table_cases.json";
import uiReducer, { setLanguage } from "../redux/ui/slice";
import * as X from "./exportText";
import { buildVerticalTableSheet } from "./export";
import { buildSimulationTable, buildSkinTable, buildDesignTable } from "../components/columnsConfig";
import { buildAnalysisRows, buildAnalysisTable, type AnalysisTableInput } from "./analysisTable";
import type { Curve } from "../redux/storageresults/slice";

// Same contract as tests/test_export_text_shared.py, on the client-side writer's text.
const FN: Record<string, (...args: any[]) => unknown> = {
  sim_note: X.simNote,
  design_target_note: X.designTargetNote,
  design_missed_note: X.designMissedNote,
  analysis_note_outside: X.analysisNoteOutside,
  analysis_note_skipped: X.analysisNoteSkipped,
  analysis_note_clipped: X.analysisNoteClipped,
  skin_note: X.skinNote,
  linear_note: X.linearNote,
  join_and: X.joinAnd,
};

describe("export text — shared fixture TS<->Python", () => {
  it("constants", () => {
    const c = fixture.constants;
    expect(X.NOTE_HEADER).toBe(c.note_header);
    expect(X.NOT_AVAILABLE).toBe(c.not_available);
    expect(X.CHART_SUMMARY_SHEET).toBe(c.chart_summary_sheet);
    expect(X.WORMHOLE_LENGTH).toBe(c.wormhole_length);
    expect(X.SIM_HEADER).toEqual(c.sim_header);
    expect(X.DESIGN_HEADER).toEqual(c.design_header);
    expect(X.SKIN_HEADER).toEqual(c.skin_header);
    expect(X.ANALYSIS_META).toEqual(c.analysis_meta);
    for (const [param, header] of Object.entries(fixture.analysis_headers)) {
      expect(X.analysisHeader(param)).toEqual(header);
    }
  });

  it("every note", () => {
    for (const c of fixture.notes as { fn: string; args: unknown[]; expected: string }[]) {
      expect(FN[c.fn], `no TS function for ${c.fn}`).toBeDefined();
      expect(FN[c.fn](...c.args), JSON.stringify(c)).toBe(c.expected);
    }
  });

  it("the wormhole length has one name in every sheet (never a bare L or 'comprimento')", () => {
    for (const header of [X.DESIGN_HEADER, X.SKIN_HEADER]) {
      expect(header.some((h) => h.startsWith("Wormhole Length [ft]"))).toBe(true);
      expect(header.some((h) => h.startsWith("L [") || h.startsWith("comprimento"))).toBe(false);
    }
  });

  it("Design sheet naming: Celsius, bare 'C' (no degree sign, no leftover K)", () => {
    for (const c of fixture.design_sheet_naming as { temperature_c: number; label: string; name: string; figure_stem: string }[]) {
      expect(X.designSheetLabel(c.temperature_c)).toBe(c.label);
      expect(X.designSheetName(c.temperature_c)).toBe(c.name);
      // figure_stem is Python-only (the client writer never renders figures), but the shared
      // label format must still match so the two writers name the same sheet consistently.
    }
  });
});

const toInput = (i: any): AnalysisTableInput => ({
  sweepParam: i.sweep_param, sweepValues: i.sweep_values, optimumRate: i.optimum_rate,
  optimumVolume: i.optimum_volume, hasClippedVolume: i.has_clipped_volume,
  firstClippedValue: i.first_clipped_value, skippedValues: i.skipped_values,
  outsideCalibratedRange: i.outside_calibrated_range,
});

describe("EXPORT_T — the `t` handed to the shared table builders", () => {
  it("analysis rows built with it equal the shared analysis fixture (English, same as the server)", () => {
    for (const c of analysisFixture.cases as any[]) {
      const rows = buildAnalysisRows(toInput(c.input), X.EXPORT_T);
      expect(rows.map((r) => ({ x: r.x, q_opt: r.q_opt, v_opt: r.v_opt, tbt_min: r.tbt_min, nota: r.nota }))).toEqual(c.expected);
    }
  });

  it("analysis header labels come from the same constants as the server header", () => {
    for (const param of Object.keys(fixture.constants.analysis_meta)) {
      const t = buildAnalysisTable({ ...toInput((analysisFixture.cases as any[])[0].input), sweepParam: param }, X.EXPORT_T);
      const [label, unit] = (fixture.constants.analysis_meta as any)[param];
      expect(`${t.columns[0].label} [${t.columns[0].unit}]`).toBe(`${label} [${unit}]`);
      expect(t.columns[t.columns.length - 1].label).toBe("Note");
    }
  });

  it("builders run on it (no missing key) and export no tooltip text", () => {
    const curve: any = { flowRegime: "radial", outputMode: "pvbt", targetLabel: "5.00 ft", flowratePoints: [1, 2] };
    for (const table of [
      buildSimulationTable(curve, X.EXPORT_T),
      buildSkinTable({ "1.5": [{ x: 1, y: -2, l_ft: 3 }] }, X.EXPORT_T),
      buildDesignTable(null, 1, X.EXPORT_T),
    ]) {
      expect(table.columns.every((c) => !c.description)).toBe(true);
    }
    expect(buildDesignTable(null, 1, X.EXPORT_T).columns[0].label).toBe("Wormhole Length");
    expect(() => X.EXPORT_T("run.title")).toThrow(/no entry/);
  });
});

// ---- The export does not depend on the interface language --------------------------------
const radialCurve = (): Curve => ({
  id: "run · 5.00 ft", flowRegime: "radial", rock: "Indiana Limestone", acid: "HCl", concentration: 0.15,
  porosity: 0.15, temperature: 297.2, wellboreRadiusIn: 3, payzoneThicknessFt: 30, targetLabel: "5.00 ft", target: 0.5,
  flowratePoints: [0.2, 0.9, 4], acidVolumePoints: [30, 12, 20], pvbtPoints: [], intersticialVelocity: [1, 2, 3],
  iDa: [1, 2, 3], volumeToBt: [1, 2, 3], timeToBt: [1, 2, 3], wormholeVelocity: [1, 2, 3], darcyVelocity: [1, 2, 3],
  outputMode: "volume", metadata: { q_opt_gal_ft_min: 0.9, validity_min_gal_ft_min: 0.09, validity_max_gal_ft_min: 9 },
} as any);

const linearCurve = (): Curve => ({
  id: "lin", flowRegime: "linear", rock: "Indiana Limestone", acid: "HCl", concentration: 0.15, porosity: 0.15,
  temperature: 25, length: 6, diameter: 1.5, flowratePoints: [0.5, 1, 2], pvbtPoints: [0.7, 0.5, 0.6],
  intersticialVelocity: [1, 2, 3], iDa: [1, 2, 3], volumeToBt: [1, 2, 3], timeToBt: [1, 2, 3],
  wormholeVelocity: [1, 2, 3], darcyVelocity: [1, 2, 3],
  metadata: { q_opt_cm3_min: 1.1, pvbt_at_q_opt: 0.49, validity_min_cm3_min: 0.11, validity_max_cm3_min: 11 },
} as any);

const inLanguage = <T>(lang: "pt" | "en", build: () => T): T => {
  // the real UI slice, switched to the language under test while the export text is produced
  const store = configureStore({ reducer: { ui: uiReducer } });
  store.dispatch(setLanguage(lang));
  expect(store.getState().ui.language).toBe(lang);
  return build();
};

const sheetJson = (ws: any) => JSON.stringify(Object.keys(ws).sort().map((k) => [k, ws[k]?.v ?? ws[k]]));

describe("the export is identical whether the interface is in Portuguese or English", () => {
  const cases: [string, () => unknown][] = [
    ["linear vertical table", () => sheetJson(buildVerticalTableSheet(linearCurve()))],
    ["radial vertical table", () => sheetJson(buildVerticalTableSheet(radialCurve()))],
    ["analysis rows + header", () => {
      const input = toInput((analysisFixture.cases as any[])[(analysisFixture.cases as any[]).length - 1].input);
      return JSON.stringify([buildAnalysisRows(input, X.EXPORT_T), X.analysisHeader(input.sweepParam)]);
    }],
    ["shared table builders", () => JSON.stringify([
      buildSimulationTable(radialCurve(), X.EXPORT_T).columns,
      buildSkinTable({ "1.5": [{ x: 1, y: -2, l_ft: 3 }] }, X.EXPORT_T).columns,
      buildDesignTable(null, 1, X.EXPORT_T).columns,
    ])],
  ];
  for (const [name, build] of cases) {
    it(name, () => {
      const pt = inLanguage("pt", build);
      const en = inLanguage("en", build);
      expect(pt).toBe(en);
      expect(String(pt)).not.toMatch(/Nota|comprimento|temperatura|não disponível|Mínimo|Alvo/);
    });
  }

  it("the export modules cannot see the UI language at all", () => {
    const sources = import.meta.glob(["./export*.{ts,tsx}", "./linearExport.ts", "./directoryExport.ts"], {
      query: "?raw", import: "default", eager: true,
    }) as Record<string, string>;
    expect(Object.keys(sources).length).toBeGreaterThanOrEqual(5);
    const offenders: string[] = [];
    for (const [path, src] of Object.entries(sources)) {
      if (path.endsWith(".test.ts")) continue;
      // only type imports from the i18n module (TFn/TKey), never the hook, translate or store
      for (const m of src.matchAll(/^import\s+(?!type\b)[^;]*from\s+["'](?:\.\.?\/)+(?:i18n|redux\/ui)[^"']*["']/gm)) offenders.push(`${path}: ${m[0]}`);
      if (/\buseT\(|useSelector|state\.ui\b|\blanguage\b|\bmakeT\b|translate\(/.test(src.replace(/\/\/.*$/gm, ""))) offenders.push(`${path}: reads language`);
    }
    expect(offenders).toEqual([]);
  });
});
