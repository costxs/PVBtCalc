// Boundary rule: state and every backend payload stay in Kelvin (the model is calibrated in
// Kelvin -- Eq. 18 takes T in K, T_CALIBRATED_K is (283, 478)). Celsius exists only at the
// input boundary (what the user types, before it enters state) and the display boundary
// (what gets rendered or written to a cell). These two functions are pure -- no rounding --
// and each is meant to be called exactly once per value, at its own boundary:
//   celsiusToKelvin(c)  -- once, parsing input, before dispatch.
//   kelvinToCelsius(k)  -- once, building what is rendered or written.
// Never chain them, never call kelvinToCelsius on a value already produced by kelvinToCelsius,
// and never use either for a calibrated-range comparison -- compare against T_CALIBRATED_K
// directly, in Kelvin (see sweepValidation.ts and its callers); only the MESSAGE TEXT is
// Celsius. Rounding a value before it enters state is its own bug: a user typing 24.07 would
// see the field read back 24.05 after losing focus, because celsiusToKelvin -> round ->
// kelvinToCelsius is not the identity. Round only in a display formatter (roundCelsius below),
// applied after kelvinToCelsius, never inside it.
import { T_CALIBRATED_K } from "./sweepValidation";

export const KELVIN_OFFSET = 273.15;

export function celsiusToKelvin(c: number): number {
  return c + KELVIN_OFFSET;
}

export function kelvinToCelsius(k: number): number {
  return k - KELVIN_OFFSET;
}

// Display formatter, not a conversion: kelvinToCelsius(290) is 16.850000000000023, not 16.85
// (subtracting 273.15 in floating point leaves noise around 1e-13). Call this at a render or
// write site, with the SAME `decimals` as whatever it must visually match (e.g. the Analysis
// chart must pass the same decimals as the Analysis table's own cell formatter -- see
// analysisTable.ts's ANALYSIS_DISPLAY_DECIMALS). Never call this on a value used afterwards
// for a comparison or fed back into state.
export function roundCelsius(k: number, decimals: number): number {
  return Number(kelvinToCelsius(k).toFixed(decimals));
}

// The calibrated range, in Celsius, for MESSAGE TEXT ONLY (RUN SETUP, the Optimum Analysis
// sweep panel, chart banners) -- never for a comparison. Every calibrated-range check compares
// the Kelvin value against T_CALIBRATED_K directly; this constant only formats what the
// resulting message says. 283/478 K convert to an exact two-decimal Celsius bound (no
// repeating digit), so rounding here loses nothing.
export const T_CALIBRATED_C: [number, number] = [roundCelsius(T_CALIBRATED_K[0], 2), roundCelsius(T_CALIBRATED_K[1], 2)];
