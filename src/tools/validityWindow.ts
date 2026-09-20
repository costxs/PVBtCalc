
export const fmtBblMin = (v: number): string =>
  v < 0.1 ? v.toPrecision(2) : v < 10 ? v.toFixed(2) : v.toFixed(1);

export const fmtRatio = (r: number): string =>
  r >= 10 ? String(Math.round(r)) : r.toFixed(1);

type XY = [number, number];

export type FlowUnit = "gal/(ft.min)" | "cm³/min";

export interface NormalizedValidity {
  qOpt: number;
  min: number;
  max: number;
  unit: FlowUnit;
}

export interface ValidityAwareCurve {
  target_label?: string;
  flowratepoints: number[];
  within_validity_range?: boolean[];
  metadata?: Record<string, number> | null;
}

const VALIDITY_FAMILIES: { unit: FlowUnit; qOpt: string; min: string; max: string }[] = [
  { unit: "gal/(ft.min)", qOpt: "q_opt_gal_ft_min", min: "validity_min_gal_ft_min", max: "validity_max_gal_ft_min" },
  { unit: "cm³/min", qOpt: "q_opt_cm3_min", min: "validity_min_cm3_min", max: "validity_max_cm3_min" },
];

export function readValidity(
  meta: Record<string, number> | null | undefined
): NormalizedValidity | null {
  if (!meta || typeof meta !== "object") return null;
  for (const f of VALIDITY_FAMILIES) {
    const qOpt = meta[f.qOpt];
    const min = meta[f.min];
    const max = meta[f.max];
    if ([qOpt, min, max].every((v) => typeof v === "number" && Number.isFinite(v))) {
      return { qOpt, min, max, unit: f.unit };
    }
  }
  return null;
}

export interface ValiditySplit {
  solid: (XY | null)[];
  dashed: (XY | null)[];
  bandBelow: boolean;
  bandAbove: boolean;
}

function interpY(x0: number, y0: number, x1: number, y1: number, xb: number): number {
  const t = (xb - x0) / (x1 - x0);
  if (y0 > 0 && y1 > 0) return y0 * Math.pow(y1 / y0, t);
  return y0 + (y1 - y0) * t;
}

export function splitByValidity(
  x: number[],
  y: (number | null)[],
  flags: boolean[],
  meta: Record<string, number> | null
): ValiditySplit {
  const solid: (XY | null)[] = [];
  const dashed: (XY | null)[] = [];

  const v = readValidity(meta);

  // Sem janela: tudo "dentro" por convencao (igual ao backend, que devolve
  // within_validity_range todo true). Curva inteira solida, sem faixa.
  if (!v) {
    for (let i = 0; i < x.length; i++) {
      const yi = y[i];
      solid.push(yi == null ? null : [x[i], yi]);
      dashed.push(null);
    }
    return { solid, dashed, bandBelow: false, bandAbove: false };
  }

  const { min: vMin, max: vMax } = v;

  const push = (arr: (XY | null)[], other: (XY | null)[], pt: XY | null) => {
    arr.push(pt);
    other.push(null);
  };

  for (let i = 0; i < x.length; i++) {
    const yi = y[i];
    const inWindow = flags[i];

    if (yi == null) {
      solid.push(null);
      dashed.push(null);
    } else if (inWindow) {
      push(solid, dashed, [x[i], yi]);
    } else {
      push(dashed, solid, [x[i], yi]);
    }

    if (i + 1 < x.length) {
      const yn = y[i + 1];
      if (yi != null && yn != null && flags[i] !== flags[i + 1]) {
        const lo = Math.min(x[i], x[i + 1]);
        const hi = Math.max(x[i], x[i + 1]);
        const xb = vMin > lo && vMin < hi ? vMin : vMax > lo && vMax < hi ? vMax : null;
        if (xb != null) {
          const yb = interpY(x[i], yi, x[i + 1], yn, xb);
          solid.push([xb, yb]);
          dashed.push([xb, yb]);
        }
      }
    }
  }

  const bandBelow = x.some((xi, i) => !flags[i] && xi < vMin);
  const bandAbove = x.some((xi, i) => !flags[i] && xi > vMax);

  return { solid, dashed, bandBelow, bandAbove };
}

export type ValidityBoundary = "upper" | "lower";

export interface WorstOffender {
  label: string;
  flowrate: number;
  ratio: number;
  boundary: ValidityBoundary;
  limit: number;
  qOpt: number;
  unit: FlowUnit;
}

export interface ValiditySummary {
  count: number;
  curvesAffected: number;
  worst: WorstOffender | null;
}

export function collectValidityOffenders(curves: ValidityAwareCurve[]): ValiditySummary {
  let count = 0;
  const labels = new Set<string>();
  let worst: WorstOffender | null = null;

  for (const c of curves) {
    const v = readValidity(c.metadata);
    const flags = c.within_validity_range;
    const xs = c.flowratepoints;
    if (!v || !flags || !xs) continue;

    for (let i = 0; i < flags.length; i++) {
      if (flags[i] !== false) continue;
      const x = xs[i];
      if (!(x > 0)) continue;

      count++;
      if (c.target_label) labels.add(c.target_label);

      let ratio: number;
      let boundary: ValidityBoundary;
      let limit: number;
      if (x > v.max * (1 + 1e-9)) {
        ratio = x / v.max;
        boundary = "upper";
        limit = v.max;
      } else if (x < v.min * (1 - 1e-9)) {
        ratio = v.min / x;
        boundary = "lower";
        limit = v.min;
      } else {
        continue;
      }

      if (!worst || ratio > worst.ratio) {
        worst = {
          label: c.target_label ?? "",
          flowrate: x,
          ratio,
          boundary,
          limit,
          qOpt: v.qOpt,
          unit: v.unit,
        };
      }
    }
  }

  return { count, curvesAffected: labels.size, worst };
}
