
export function parseAxisLimitInput(raw: string): number | null {
  const s = (raw ?? '').trim();
  if (s === '') return null;

  let cleaned = s.replace(/\s/g, '');
  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');

  if (hasComma && hasDot) {
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
  min?: number;
  max?: number;
  error?: string;
}

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
