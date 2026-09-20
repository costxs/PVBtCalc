import type { Curve } from "../redux/storageresults/slice";
import type { RadialCurveResult } from "../redux/radial/slice";
import { matchesFlowRegime } from "./regimeFilter";
import type { ValidityAwareCurve } from "./validityWindow";

export function selectLinearChartCurves(curves: Curve[]): Curve[] {
  return curves.filter(
    (c) => matchesFlowRegime(c.flowRegime, "linear") && !!c.flowratePoints && c.flowratePoints.length > 0
  );
}

export function selectRadialChartCurves(
  curves: RadialCurveResult[],
  activeTargets: Set<string>
): RadialCurveResult[] {
  return curves.filter((c) => activeTargets.has(c.target_label));
}

export function toValidityAwareCurves(curves: Curve[]): ValidityAwareCurve[] {
  return curves.map((c) => ({
    target_label: c.id,
    flowratepoints: c.flowratePoints,
    within_validity_range: c.withinValidityRange,
    metadata: c.metadata ?? null,
  }));
}
