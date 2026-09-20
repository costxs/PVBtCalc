import { describe, expect, it } from "vitest";
import { selectLinearChartCurves, selectRadialChartCurves, toValidityAwareCurves } from "./chartCurveSelectors";
import { collectValidityOffenders } from "./validityWindow";
import type { Curve } from "../redux/storageresults/slice";
import type { RadialCurveResult } from "../redux/radial/slice";

const linearMeta = {
  q_opt_cm3_min: 4.58,
  validity_min_cm3_min: 0.458,
  validity_max_cm3_min: 45.8,
};

const radialMeta = {
  q_opt_gal_ft_min: 0.365,
  validity_min_gal_ft_min: 0.0365,
  validity_max_gal_ft_min: 3.65,
};

const curve = (over: Partial<Curve>): Curve =>
  ({
    id: "linear-curve",
    acid: "HCl",
    rock: "limestone",
    porosity: 0.2,
    concentration: 0.15,
    temperature: 25,
    pvbtPoints: [],
    flowratePoints: [],
    intersticialVelocity: [],
    iDa: [],
    volumeToBt: [],
    timeToBt: [],
    wormholeVelocity: [],
    darcyVelocity: [],
    ...over,
  } as Curve);

describe("selectLinearChartCurves (regime leak, 2026-09)", () => {
  it("exclui curva com flowRegime 'radial' mesmo com flowratePoints preenchido", () => {
    const linear = curve({ id: "L1", flowRegime: "linear", flowratePoints: [1, 2, 3] });
    const radial = curve({ id: "2 · 5.00 ft", flowRegime: "radial", flowratePoints: [10, 420] });
    expect(selectLinearChartCurves([linear, radial])).toEqual([linear]);
  });

  it("curva legado sem flowRegime conta como linear (mesma convencao de regimeFilter.ts)", () => {
    const legacy = curve({ id: "legacy", flowRegime: undefined, flowratePoints: [1] });
    expect(selectLinearChartCurves([legacy])).toEqual([legacy]);
  });

  it("descarta curva sem pontos de vazao", () => {
    const empty = curve({ id: "empty", flowRegime: "linear", flowratePoints: [] });
    expect(selectLinearChartCurves([empty])).toEqual([]);
  });
});

describe("selectRadialChartCurves", () => {
  const radialCurve = (over: Partial<RadialCurveResult>): RadialCurveResult =>
    ({
      target: 1,
      target_label: "5.00 ft",
      flowratepoints: [],
      pvbtpoints: null,
      acidvolumepoints: null,
      insterticialvelocity: [],
      ida: [],
      volumetobt: [],
      timetobt: [],
      wormholevelocity: [],
      darcyvelocity: [],
      status: [],
      within_validity_range: [],
      metadata: null,
      ...over,
    } as RadialCurveResult);

  it("so inclui curvas com chip de alvo ligado -- espelha o que allCurvesSeries desenha", () => {
    const on = radialCurve({ target_label: "5.00 ft" });
    const off = radialCurve({ target_label: "10.00 ft" });
    const result = selectRadialChartCurves([on, off], new Set(["5.00 ft"]));
    expect(result).toEqual([on]);
  });
});

describe("cenario do bug: banner Linear nao deve contar curva Radial leftover", () => {
  const linearInWindow = curve({
    id: "L1",
    flowRegime: "linear",
    flowratePoints: [0.5, 1, 5, 10],
    withinValidityRange: [true, true, true, true],
    metadata: linearMeta,
  });

  const radialLeftover = curve({
    id: "2 · 5.00 ft",
    flowRegime: "radial",
    flowratePoints: [10, 100, 420],
    withinValidityRange: [true, true, false],
    metadata: radialMeta,
  });

  const mixedCurves = [linearInWindow, radialLeftover];

  it("selectLinearChartCurves descarta a curva Radial leftover", () => {
    expect(selectLinearChartCurves(mixedCurves)).toEqual([linearInWindow]);
  });

  it("banner Linear (selector + collectValidityOffenders) fica silencioso -- curva visivel esta 100% dentro da janela", () => {
    const summary = collectValidityOffenders(toValidityAwareCurves(selectLinearChartCurves(mixedCurves)));
    expect(summary).toEqual({ count: 0, curvesAffected: 0, worst: null });
  });

  it("sem o filtro de regime (comportamento antigo, com bug) o leftover Radial vazava pro banner", () => {
    const buggySummary = collectValidityOffenders(toValidityAwareCurves(mixedCurves));
    expect(buggySummary.count).toBe(1);
    expect(buggySummary.worst).toMatchObject({ label: "2 · 5.00 ft", flowrate: 420, boundary: "upper" });
    expect(buggySummary.worst!.ratio).toBeCloseTo(420 / 3.65, 5);
    expect(buggySummary.worst!.unit).toBe("gal/(ft.min)");
  });
});
