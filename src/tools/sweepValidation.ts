import type { TKey } from "../i18n";
import { parseDecimal } from "./parseDecimal";

export type SweepRegime = "linear" | "radial";

// Espelho de T_CALIBRATED_K (app/services/PVBTradialFunc.py) -- manter em sincronia.
export const T_CALIBRATED_K: [number, number] = [283, 478];

// Errors are dictionary keys, not text, so they re-translate when the language changes.
export interface SweepFieldErrors {
  minimum?: TKey;
  maximum?: TKey;
}

interface Range {
  ok: (v: number) => boolean;
  rule: "open_unit" | "positive" | "zero_c";
}

const openUnit: Range = { ok: (v) => v > 0 && v < 1, rule: "open_unit" };
const positive: Range = { ok: (v) => v > 0, rule: "positive" };
// Both regimes take temperature in Celsius from the user (the radial Optimum Analysis sweep
// panel converts to Kelvin only at submit time — see OptimumAnalysis.tsx), so both use the
// same floor.
const zeroC: Range = { ok: (v) => v > -273.15, rule: "zero_c" };

const rangeFor = (param: string, regime: SweepRegime): Range | null => {
  void regime; // no longer distinguishes any rule; kept so callers don't need to change
  switch (param) {
    case "temperature":
      return zeroC;
    case "core porosity":
    case "porosity":
    case "acid concentration":
    case "acid_concentration":
      return openUnit;
    case "core length":
    case "core diameter":
    case "wellbore diameter":
    case "wellbore_diameter":
    case "payzone_thickness":
      return positive;
    default:
      return null;
  }
};

const parse = (raw: string | number | null | undefined): number => {
  if (raw === null || raw === undefined || raw === "") return NaN;
  // typed text may use a comma or a dot (parseDecimal); numbers pass through
  if (typeof raw === "number") return raw;
  const n = parseDecimal(raw);
  return n === null ? NaN : n;
};

/** Validates a sweep range BEFORE any request is made. Empty object = valid. */
export function validateSweep(
  param: string,
  minRaw: string | number | null | undefined,
  maxRaw: string | number | null | undefined,
  regime: SweepRegime
): SweepFieldErrors {
  const errors: SweepFieldErrors = {};
  const min = parse(minRaw);
  const max = parse(maxRaw);
  const range = rangeFor(param, regime);

  if (!Number.isFinite(min)) errors.minimum = "sweep.enter_number";
  else if (range && !range.ok(min)) errors.minimum = `sweep.minimum_${range.rule}`;

  if (!Number.isFinite(max)) errors.maximum = "sweep.enter_number";
  else if (range && !range.ok(max)) errors.maximum = `sweep.maximum_${range.rule}`;

  if (!errors.minimum && !errors.maximum && min >= max) {
    errors.minimum = "sweep.min_lt_max";
  }
  return errors;
}
