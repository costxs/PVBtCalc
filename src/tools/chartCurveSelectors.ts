/**
 * chartCurveSelectors.ts
 * ------------------------------------------------------------------
 * Bug (2026-09): o banner de fora-da-janela (Chart.tsx, collectValidityOffenders)
 * e o desenho do Simulation Chart liam listas de curvas filtradas
 * SEPARADAMENTE. O desenho do ramo linear ja filtrava por regime
 * (matchesFlowRegime, regimeFilter.ts) porque state.resultCurves mistura
 * curvas Linear e Radial no MESMO array (persistido em localStorage); o
 * banner linear nao tinha esse filtro e contava curvas radiais
 * sobreviventes -- incluindo a UNIDADE errada, porque o JSX do banner
 * linear tambem hardcodeava "cm3/min" em vez de ler worst.unit.
 *
 * Estas funcoes sao o UNICO lugar que decide "quais curvas este grafico
 * desenha" por regime. Chart.tsx usa o mesmo resultado tanto para desenhar
 * quanto para alimentar collectValidityOffenders -- os dois nao podem mais
 * divergir porque nao ha um segundo filtro pra divergir.
 */
import type { Curve } from "../redux/storageresults/slice";
import type { RadialCurveResult } from "../redux/radial/slice";
import { matchesFlowRegime } from "./regimeFilter";
import type { ValidityAwareCurve } from "./validityWindow";

/** Curvas Linear (state.resultCurves, mesmo array que a Radial usa) que o
 * Simulation Chart de fato desenha: regime bate com "linear" (legado sem
 * flowRegime conta como linear, ver regimeFilter.ts) e ha pontos pra plotar. */
export function selectLinearChartCurves(curves: Curve[]): Curve[] {
  return curves.filter(
    (c) => matchesFlowRegime(c.flowRegime, "linear") && !!c.flowratePoints && c.flowratePoints.length > 0
  );
}

/** Curvas Radial (state.radial.curves, ja regime-puro) que o Simulation
 * Chart de fato desenha: so as com chip de alvo ligado (simActiveTargets) --
 * curva desligada nem entra em solid/dashed no grafico. */
export function selectRadialChartCurves(
  curves: RadialCurveResult[],
  activeTargets: Set<string>
): RadialCurveResult[] {
  return curves.filter((c) => activeTargets.has(c.target_label));
}

/** Adapta Curve (camelCase, state.resultCurves) para o contrato
 * ValidityAwareCurve (snake_case) que collectValidityOffenders espera --
 * mesmo mapeamento pro radial (RadialCurveResult ja nasce nesse formato). */
export function toValidityAwareCurves(curves: Curve[]): ValidityAwareCurve[] {
  return curves.map((c) => ({
    target_label: c.id,
    flowratepoints: c.flowratePoints,
    within_validity_range: c.withinValidityRange,
    metadata: c.metadata ?? null,
  }));
}
