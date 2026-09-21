export type SweepRegime = "linear" | "radial";

// Espelho de T_CALIBRATED_K (app/services/PVBTradialFunc.py) -- manter em sincronia.
export const T_CALIBRATED_K: [number, number] = [283, 478];

export interface SweepFieldErrors {
  minimum?: string;
  maximum?: string;
}

interface Range {
  ok: (v: number) => boolean;
  message: string;
}

const openUnit: Range = { ok: (v) => v > 0 && v < 1, message: "must be strictly between 0 and 1" };
const positive: Range = { ok: (v) => v > 0, message: "must be positive" };

const rangeFor = (param: string, regime: SweepRegime): Range | null => {
  switch (param) {
    case "temperature":
      return regime === "radial"
        ? { ok: (v) => v > 0, message: "must be above absolute zero (> 0 K)" }
        : { ok: (v) => v > -273.15, message: "must be above absolute zero (> -273.15 °C)" };
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
  return Number(raw);
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

  if (!Number.isFinite(min)) errors.minimum = "Enter a number";
  else if (range && !range.ok(min)) errors.minimum = `Minimum ${range.message}`;

  if (!Number.isFinite(max)) errors.maximum = "Enter a number";
  else if (range && !range.ok(max)) errors.maximum = `Maximum ${range.message}`;

  if (!errors.minimum && !errors.maximum && min >= max) {
    errors.minimum = "Minimum must be lower than maximum";
  }
  return errors;
}
