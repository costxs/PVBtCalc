import { describe, expect, it } from "vitest";
import { analyzeLinearOptimum, linearNote, linearOptimumMarker, linearSummaryRows } from "./linearExport";
import type { Curve } from "../redux/storageresults/slice";
import fixture from "../../../shared-fixtures/linear_optimum_cases.json";

const cases = fixture.cases as any[];

describe("linearExport — fixture compartilhada TS<->Python", () => {
  it("fixture cobre os casos exigidos", () => {
    const names = cases.map((c) => c.name);
    for (const n of ["optimum_inside_sweep", "optimum_below_sweep", "optimum_above_sweep", "legacy_curve_without_pvbt_at_q_opt"]) {
      expect(names).toContain(n);
    }
  });

  it.each(cases.map((c) => [c.name, c] as const))("%s", (_name, c) => {
    const curve = {
      id: "X", flowRegime: "linear",
      flowratePoints: c.input.flowratepoints, pvbtPoints: c.input.pvbtpoints,
      metadata: c.input.metadata,
    } as unknown as Curve;
    const info = analyzeLinearOptimum(curve);
    const e = c.expected;
    expect(info.minIdx).toBe(e.min_idx);
    expect(info.isBorder).toBe(e.is_border);
    expect(linearNote(info, info.minIdx)).toBe(e.note);
    expect(linearOptimumMarker(info, curve.flowratePoints)).toEqual(e.marker);
    expect(Object.fromEntries(linearSummaryRows(info))).toEqual(e.summary);
  });
});
