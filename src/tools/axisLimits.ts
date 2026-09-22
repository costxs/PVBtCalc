import type { TKey } from "../i18n";

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
  error?: TKey; // dictionary key, so it re-translates with the language
}

export function resolveAxisLimit(rawMin: string, rawMax: string, isLog: boolean): AxisLimitResult {
  const minRaw = (rawMin ?? '').trim();
  const maxRaw = (rawMax ?? '').trim();
  const min = parseAxisLimitInput(rawMin);
  const max = parseAxisLimitInput(rawMax);

  if (minRaw !== '' && min === null) return { error: 'axis.invalid_min' };
  if (maxRaw !== '' && max === null) return { error: 'axis.invalid_max' };
  if (isLog && min != null && min <= 0) return { error: 'axis.log_min_positive' };
  if (isLog && max != null && max <= 0) return { error: 'axis.log_max_positive' };
  if (min != null && max != null && max <= min) return { error: 'axis.max_gt_min' };

  return { min: min ?? undefined, max: max ?? undefined };
}
