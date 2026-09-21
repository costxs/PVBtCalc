import { describe, it, expect } from "vitest";
import fixture from "../../../shared-fixtures/radial_analysis_table_cases.json";
import { buildAnalysisRows, buildAnalysisTable, type AnalysisTableInput } from "./analysisTable";

const toInput = (i: any): AnalysisTableInput => ({
  sweepParam: i.sweep_param, sweepValues: i.sweep_values, optimumRate: i.optimum_rate,
  optimumVolume: i.optimum_volume, hasClippedVolume: i.has_clipped_volume,
  firstClippedValue: i.first_clipped_value, skippedValues: i.skipped_values,
  outsideCalibratedRange: i.outside_calibrated_range,
});

describe("analysisTable — fixture compartilhada TS<->Python", () => {
  for (const c of fixture.cases as any[]) {
    it(c.name, () => {
      const rows = buildAnalysisRows(toInput(c.input), "pt");
      expect(rows.map((r) => ({ x: r.x, q_opt: r.q_opt, v_opt: r.v_opt, tbt_min: r.tbt_min, nota: r.nota }))).toEqual(c.expected);
    });
  }

  it("cabecalho traz a unidade do parametro varrido e tbt em min (igual ao Design Plot)", () => {
    const t = buildAnalysisTable(toInput((fixture.cases as any[])[0].input));
    expect(t.columns.map((c) => `${c.label}${c.unit ? ` (${c.unit})` : ""}`)).toEqual(
      ["temperatura (K)", "q_opt (gal/(ft.min))", "V_opt (gal/ft)", "tbt (min)", "Nota"]);
  });

  it("notas em ingles para a tela", () => {
    const rows = buildAnalysisRows(toInput((fixture.cases as any[])[2].input), "en");
    expect(rows[1].nota).toMatch(/Series truncated/);
  });
});
