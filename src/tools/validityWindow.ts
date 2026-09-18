/**
 * validityWindow.ts
 * ------------------------------------------------------------------
 * Fase 5 (radial) + Fase 7 (generalizado para o regime linear). Tres
 * responsabilidades, todas DOM-free (testaveis sem React):
 *
 *  1. readValidity() -> normaliza o metadata do backend. As chaves vem
 *     sufixadas pela unidade do regime: *_gal_ft_min (radial, Fase 8 --
 *     antes *_bbl_min) ou *_cm3_min (linear, escala de core). Aqui a familia e
 *     detectada e devolvida como { qOpt, min, max, unit }. Qualquer
 *     coisa que nao seja um trio finito de uma das duas familias
 *     (null, nao-objeto, familia desconhecida, cache corrompido) vira
 *     null = "sem janela" -- MESMO tratamento da degradacao do backend
 *     (metadata === null): curva inteira solida, sem faixa, nenhum
 *     ponto conta como fora. Nunca lanca.
 *
 *  2. splitByValidity() -> parte UMA curva em dois tracos:
 *       - solid : trecho DENTRO da janela [min, max]
 *       - dashed: trecho FORA (renderizado cinza tracejado no grafico,
 *                 nunca vermelho -- vermelho e erro numerico de verdade)
 *     Os dois tracos compartilham o vertice EXATO onde a curva cruza o
 *     limite da janela (interpolado em x linear / y geometrico, porque o
 *     eixo Y do grafico e log). Assim os segmentos se encontram na
 *     borda sem buraco e sem sobreposicao.
 *
 *  3. collectValidityOffenders() -> resumo agregado para o banner:
 *     quantos pontos, em quantas curvas, e o PIOR ponto -- com a razao
 *     "quantas vezes fora do limite" CALCULADA (x / max acima,
 *     min / x abaixo), nunca hardcoded, e o rotulo da unidade junto
 *     (o banner cita a unidade e ela varia por regime).
 *
 * Consumidor: Chart.tsx (ramo radial hoje; ramo linear na Fase 7).
 */

// Vazao: faixa tipica ampla (~0.01..300 em qualquer das unidades), entao
// casas adaptativas em vez de um toFixed fixo. Nome herdado da Fase 3
// (bbl/min), mas o corpo e agnostico de unidade -- reusado para cm3/min.
export const fmtBblMin = (v: number): string =>
  v < 0.1 ? v.toPrecision(2) : v < 10 ? v.toFixed(2) : v.toFixed(1);

// "6.8x", "12x", "140x" -- abaixo de 10 uma casa ajuda, acima vira ruido.
export const fmtRatio = (r: number): string =>
  r >= 10 ? String(Math.round(r)) : r.toFixed(1);

type XY = [number, number];

/** Unidade da vazao, definida pelo regime. O backend nunca emite m3/s cru.
 * Fase 8: radial trocou de bbl/min para gal/(ft.min) (o artigo normaliza
 * por pe de zona) -- linear continua cm3/min, sem equivalente. */
export type FlowUnit = "gal/(ft.min)" | "cm³/min";

export interface NormalizedValidity {
  qOpt: number;
  min: number;
  max: number;
  unit: FlowUnit;
}

/**
 * Contrato minimo que tanto a curva radial (RadialCurveResult) quanto a
 * curva linear (storageresults Curve, chaves camelCase) satisfazem. NAO
 * assume unidade: metadata fica Record<string, number> e readValidity()
 * decide pela chave presente.
 */
export interface ValidityAwareCurve {
  target_label?: string; // radial tem alvo; linear nao
  flowratepoints: number[];
  within_validity_range?: boolean[];
  metadata?: Record<string, number> | null;
}

const VALIDITY_FAMILIES: { unit: FlowUnit; qOpt: string; min: string; max: string }[] = [
  { unit: "gal/(ft.min)", qOpt: "q_opt_gal_ft_min", min: "validity_min_gal_ft_min", max: "validity_max_gal_ft_min" },
  { unit: "cm³/min", qOpt: "q_opt_cm3_min", min: "validity_min_cm3_min", max: "validity_max_cm3_min" },
];

/**
 * Normaliza o metadata do backend. null (sem janela / degradacao),
 * nao-objeto, familia de chave desconhecida ou trio incompleto/nao-finito
 * => null. Nunca lanca.
 */
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
  /** vertices dentro da janela + os pontos de cruzamento; null quebra a linha */
  solid: (XY | null)[];
  /** vertices fora da janela + os pontos de cruzamento; null quebra a linha */
  dashed: (XY | null)[];
  /** desenhar faixa de fundo de xAxis-min ate validity_min */
  bandBelow: boolean;
  /** desenhar faixa de fundo de validity_max ate xAxis-max */
  bandAbove: boolean;
}

/** y geometrico entre (x0,y0) e (x1,y1) no x=xb -- casa com o eixo Y log. */
function interpY(x0: number, y0: number, x1: number, y1: number, xb: number): number {
  const t = (xb - x0) / (x1 - x0);
  if (y0 > 0 && y1 > 0) return y0 * Math.pow(y1 / y0, t);
  return y0 + (y1 - y0) * t; // fallback linear (nao deveria acontecer: volume > 0)
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

    // Vertice de cruzamento entre este ponto e o proximo, quando o flag
    // vira E ambos os y existem. Entra nos DOIS tracos (borda compartilhada).
    if (i + 1 < x.length) {
      const yn = y[i + 1];
      if (yi != null && yn != null && flags[i] !== flags[i + 1]) {
        const lo = Math.min(x[i], x[i + 1]);
        const hi = Math.max(x[i], x[i + 1]);
        // exatamente uma das bordas cai no intervalo (janela contigua)
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
  flowrate: number; // na unidade do regime
  ratio: number; // > 1, calculada
  boundary: ValidityBoundary;
  limit: number; // max (upper) ou min (lower), na unidade do regime
  qOpt: number; // na unidade do regime
  unit: FlowUnit; // rotulo para o texto do banner (nunca hardcoded)
}

export interface ValiditySummary {
  count: number; // total de pontos fora da janela
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
