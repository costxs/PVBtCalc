
export type DesignPlotReadMode = "volume" | "rate" | "length";

export interface DesignPlotGridPoint {
  length: number;
  qOpt: number;
  vOpt: number;
}

export interface DesignPlotReading {
  length: number;
  qOpt: number;
  vOpt: number;
}

export interface DesignPlotOutOfRange {
  outOfRange: true;
  min: number;
  max: number;
}

export function isDesignPlotOutOfRange(v: DesignPlotReading | DesignPlotOutOfRange): v is DesignPlotOutOfRange {
  return (v as DesignPlotOutOfRange).outOfRange === true;
}

export function extractDesignPlotGrid(
  series: { temperature_k: number; optimum_rate_series: number[][]; optimum_volume_series: number[][] }[],
  temperatureK: number
): DesignPlotGridPoint[] | null {
  const s = series.find((s) => s.temperature_k === temperatureK);
  if (!s) return null;
  const rate = s.optimum_rate_series || [];
  const volume = s.optimum_volume_series || [];
  const n = Math.min(rate.length, volume.length);
  const points: DesignPlotGridPoint[] = [];
  for (let i = 0; i < n; i++) {
    points.push({ length: rate[i][1], qOpt: rate[i][0], vOpt: volume[i][0] });
  }
  return points;
}

function logInterp(a: number, b: number, t: number): number {
  return Math.exp(Math.log(a) + t * Math.log(b / a));
}

function findBracket(xs: number[], target: number): number | null {
  for (let i = 0; i < xs.length - 1; i++) {
    const a = xs[i];
    const b = xs[i + 1];
    if ((target - a) * (target - b) <= 0) return i;
  }
  return null;
}

export function readDesignPlot(
  grid: DesignPlotGridPoint[],
  mode: DesignPlotReadMode,
  target: number
): DesignPlotReading | DesignPlotOutOfRange {
  const lengths = grid.map((p) => p.length);
  const qs = grid.map((p) => p.qOpt);
  const vs = grid.map((p) => p.vOpt);
  const xs = mode === "length" ? lengths : mode === "rate" ? qs : vs;

  if (xs.length < 2) return { outOfRange: true, min: xs[0] ?? NaN, max: xs[0] ?? NaN };

  const i = findBracket(xs, target);
  if (i == null) {
    return { outOfRange: true, min: Math.min(...xs), max: Math.max(...xs) };
  }

  const t = Math.log(target / xs[i]) / Math.log(xs[i + 1] / xs[i]);
  return {
    length: logInterp(lengths[i], lengths[i + 1], t),
    qOpt: logInterp(qs[i], qs[i + 1], t),
    vOpt: logInterp(vs[i], vs[i + 1], t),
  };
}
