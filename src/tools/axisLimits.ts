/**
 * axisLimits.ts
 * ------------------------------------------------------------------
 * Parsing/validacao dos campos "X Limits"/"Y Limits" (Chart.tsx). DOM-free,
 * testavel sem React (ver axisLimits.test.ts).
 *
 * Bug corrigido (relato: "ao preencher o limite, as curvas sobem"): os
 * inputs sao texto livre e o valor ia direto pra yAxis.min/max SEM
 * Number()/parseFloat() nenhum. "100.000" (pt-BR, cem mil) virava a STRING
 * "100.000", que o JS/ECharts leem como o numero 100 (ponto = separador
 * decimal em EN-US) -- o eixo colapsava pra um teto 1000x menor que o
 * pretendido e as curvas pareciam "subir" (ficavam espremidas perto do topo
 * do range errado). "0,5" (virgula decimal pt-BR) vira NaN/0 pelo mesmo
 * motivo. parseAxisLimitInput() aceita os dois formatos.
 */

// Aceita "0,5" (virgula decimal pt-BR), "1.000" (ponto de milhar pt-BR) e
// "1000.5" (ponto decimal EN-US puro). Heuristica pra "." sozinho: SO conta
// como separador de milhar quando TODOS os grupos depois do primeiro "."
// tem exatamente 3 digitos (ex.: "1.000", "12.345.678") -- "100.5" (2 casas)
// ou "100.05" continuam decimal EN-US.
export function parseAxisLimitInput(raw: string): number | null {
  const s = (raw ?? '').trim();
  if (s === '') return null;

  let cleaned = s.replace(/\s/g, '');
  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');

  if (hasComma && hasDot) {
    // separador decimal = o que aparece por ULTIMO na string.
    if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (hasComma) {
    cleaned = cleaned.replace(',', '.');
  } else if (hasDot) {
    const parts = cleaned.split('.');
    const looksLikeThousands =
      parts.length > 1 &&
      parts[0].length > 0 && parts[0].length <= 3 &&
      parts.slice(1).every((p) => p.length === 3);
    if (looksLikeThousands) cleaned = cleaned.replace(/\./g, '');
  }

  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export interface AxisLimitResult {
  /** undefined = deixa o ECharts decidir sozinho (auto) para esse extremo */
  min?: number;
  max?: number;
  /** presente quando a combinacao informada nao pode ser aplicada -- min/max somem (fica tudo auto) */
  error?: string;
}

// Regra: campo vazio -> undefined (auto) PARA AQUELE EXTREMO, nunca ''/NaN
// direto pro ECharts. Min/Max exatos, sem arredondar pra decada nem somar
// padding -- quem quiser folga visual usa o dataZoom, nao este campo.
export function resolveAxisLimit(rawMin: string, rawMax: string, isLog: boolean): AxisLimitResult {
  const minRaw = (rawMin ?? '').trim();
  const maxRaw = (rawMax ?? '').trim();
  const min = parseAxisLimitInput(rawMin);
  const max = parseAxisLimitInput(rawMax);

  if (minRaw !== '' && min === null) return { error: 'Valor de Mín inválido.' };
  if (maxRaw !== '' && max === null) return { error: 'Valor de Máx inválido.' };
  if (isLog && min != null && min <= 0) return { error: 'Em escala log, Mín deve ser maior que 0.' };
  if (isLog && max != null && max <= 0) return { error: 'Em escala log, Máx deve ser maior que 0.' };
  if (min != null && max != null && max <= min) return { error: 'Máx deve ser maior que Mín.' };

  return { min: min ?? undefined, max: max ?? undefined };
}
