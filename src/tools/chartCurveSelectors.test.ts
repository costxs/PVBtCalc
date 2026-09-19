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

// Numeros do bug reportado: "420.0 cm3/min ... 115x acima do limite superior
// (3.65 cm3/min)" -- na verdade gal/(ft.min) do sweep radial anterior (10
// bbl/min = 420 gal/(ft.min) no topo, mascarado de cm3/min pelo hardcode
// no JSX do banner Linear).
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

// Cenario exato do bug reportado: Linear mostrando UMA curva (0.5-10 cm3/min,
// dentro da janela 0.46-45.8), com uma curva Radial de uma rodada anterior
// (10 bbl/min = 420 gal/(ft.min) no topo do sweep) ainda em state.resultCurves.
// O banner Linear contava os pontos da curva Radial e rotulava o valor
// gal/(ft.min) como "cm3/min". Com o filtro de regime restaurado (mesmo
// selector usado pelo desenho), a curva Radial nunca chega no banner Linear.
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
    // Documenta o bug que este selector corrige: passar `mixedCurves` cru
    // (sem selectLinearChartCurves) reproduz o "726 pontos em 20 curvas" --
    // aqui, 1 ponto (420) da curva Radial contaria como se fosse Linear.
    const buggySummary = collectValidityOffenders(toValidityAwareCurves(mixedCurves));
    expect(buggySummary.count).toBe(1);
    expect(buggySummary.worst).toMatchObject({ label: "2 · 5.00 ft", flowrate: 420, boundary: "upper" });
    expect(buggySummary.worst!.ratio).toBeCloseTo(420 / 3.65, 5);
    // A unidade correta (do metadata da curva Radial) ja era gal/(ft.min) --
    // o segundo bug (JSX hardcoding "cm3/min") esta em Chart.tsx, fora do
    // alcance de um teste DOM-free; corrigido lendo worst.unit em vez de
    // um literal.
    expect(buggySummary.worst!.unit).toBe("gal/(ft.min)");
  });
});
