import type { Curve } from "../redux/storageresults/slice";
import { fmtBblMin, readValidity } from "./validityWindow";

export const Q_UNIT = "cm³/min";
export const NOT_AVAILABLE = "não disponível";

export function isExperimentalCurve(c: Curve): boolean {
  return c.acid === "Experimental" && c.rock === "Experimental";
}

export interface LinearOptimumInfo {
  minIdx: number;
  isBorder: boolean;
  minPvbt: number | null;
  minQ: number | null;
  qOpt: number | null;
  pvbtAtQOpt: number | null;
  windowMin: number | null;
  windowMax: number | null;
}

export function analyzeLinearOptimum(curve: Curve): LinearOptimumInfo {
  const q = curve.flowratePoints ?? [];
  const pvbt = curve.pvbtPoints ?? [];
  let minIdx = -1;
  let minV = Infinity;
  for (let i = 0; i < q.length; i++) {
    const v = pvbt[i];
    if (v != null && v > 0 && v < minV) {
      minV = v;
      minIdx = i;
    }
  }

  const v = readValidity(curve.metadata);
  const exact = v != null && v.unit === Q_UNIT ? v : null;
  const pvbtRaw = curve.metadata?.pvbt_at_q_opt;
  return {
    minIdx,
    isBorder: minIdx === 0 || minIdx === q.length - 1,
    minPvbt: minIdx >= 0 ? minV : null,
    minQ: minIdx >= 0 ? q[minIdx] : null,
    qOpt: exact ? exact.qOpt : null,
    pvbtAtQOpt: exact && typeof pvbtRaw === "number" && Number.isFinite(pvbtRaw) ? pvbtRaw : null,
    windowMin: exact ? exact.min : null,
    windowMax: exact ? exact.max : null,
  };
}

export function linearOptimumMarker(
  info: LinearOptimumInfo,
  flowratePoints: number[] | undefined,
): { x: number; y: number } | null {
  if (info.qOpt == null || info.pvbtAtQOpt == null || !flowratePoints?.length) return null;
  if (info.qOpt < Math.min(...flowratePoints) || info.qOpt > Math.max(...flowratePoints)) return null;
  return { x: info.qOpt, y: info.pvbtAtQOpt };
}

export function linearNote(info: LinearOptimumInfo, i: number): string {
  if (i !== info.minIdx) return "";
  const qTxt = info.qOpt != null ? `; q_opt = ${fmtBblMin(info.qOpt)} ${Q_UNIT}` : "";
  return info.isBorder
    ? `Mínimo na borda da faixa simulada${qTxt}`
    : `PVBT mínimo desta simulação${qTxt}`;
}

export function linearSummaryRows(info: LinearOptimumInfo): [string, number | string][] {
  const num = (v: number | null): number | string => (v != null ? v : NOT_AVAILABLE);
  return [
    [`q_opt [${Q_UNIT}]`, num(info.qOpt)],
    ["PVBT at q_opt", num(info.pvbtAtQOpt)],
    [`Recommended window min = q_opt/10 [${Q_UNIT}]`, num(info.windowMin)],
    [`Recommended window max = 10·q_opt [${Q_UNIT}]`, num(info.windowMax)],
    ["Lowest PVBT in sweep (grid-dependent)", num(info.minPvbt)],
    [`Flowrate at lowest swept PVBT [${Q_UNIT}]`, num(info.minQ)],
  ];
}

export interface LinearExportPayload {
  curves: any[];
  experimental_curves: any[];
  options: { show_validity_band: boolean };
}

function toCelsius(t: number | null | undefined): number | null {
  if (t == null || !Number.isFinite(Number(t))) return null;
  const n = Number(t);
  return n >= 100 ? Number((n - 273.15).toFixed(2)) : n;
}

function nums(a: (number | null)[] | undefined): (number | null)[] {
  return a ? a.map((v) => (v == null || !Number.isFinite(v) ? null : v)) : [];
}

export function toLinearModelPayload(c: Curve): any {
  return {
    id: c.id,
    rock_type: c.rock ?? "",
    acid_type: c.acid ?? "",
    acid_concentration: c.concentration ?? null,
    porosity: c.porosity ?? null,
    temperature_c: toCelsius(c.temperature),
    core_length_in: c.length ?? null,
    core_diameter_in: c.diameter ?? null,
    flowratepoints: c.flowratePoints ?? [],
    pvbtpoints: nums(c.pvbtPoints ?? undefined),
    insterticialvelocity: nums(c.intersticialVelocity),
    ida: nums(c.iDa),
    wormholevelocity: nums(c.wormholeVelocity),
    volumetobt: nums(c.volumeToBt),
    timetobt: nums(c.timeToBt),
    darcyvelocity: nums(c.darcyVelocity),
    within_validity_range: c.withinValidityRange ?? [],
    metadata: c.metadata ?? null,
  };
}

export function toLinearExperimentalPayload(c: Curve): any {
  return { id: c.id, flowratepoints: c.flowratePoints ?? [], pvbtpoints: nums(c.pvbtPoints ?? undefined) };
}

export function buildLinearExportPayload(curves: Curve[]): LinearExportPayload {
  return {
    curves: curves.filter((c) => !isExperimentalCurve(c)).map(toLinearModelPayload),
    experimental_curves: curves.filter(isExperimentalCurve).map(toLinearExperimentalPayload),
    options: { show_validity_band: true },
  };
}
