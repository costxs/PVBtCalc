import { describe, expect, it } from "vitest";
import { celsiusToKelvin, kelvinToCelsius, roundCelsius, T_CALIBRATED_C, KELVIN_OFFSET } from "./temperature";
import { T_CALIBRATED_K } from "./sweepValidation";

// The values a mistake would most plausibly hit: the calibrated bound (both directions,
// since a boundary-exact input must not be spuriously rejected), a couple of realistic user
// inputs, and 0/negative to make sure the offset sign isn't flipped.
const ROUND_TRIP_VALUES = [9.85, 23.85, 24.05, 204.85, 0, -50, 1000];

describe("temperature: the input/display boundary, kept pure", () => {
  it("celsiusToKelvin has no rounding: applying it once does not collapse distinct inputs", () => {
    expect(celsiusToKelvin(24.07)).not.toBe(celsiusToKelvin(24.05));
    expect(celsiusToKelvin(24.07)).toBeCloseTo(297.22, 9);
  });

  it.each(ROUND_TRIP_VALUES)("round-trip: kelvinToCelsius(celsiusToKelvin(%s)) === itself, within 1e-9", (c) => {
    expect(kelvinToCelsius(celsiusToKelvin(c))).toBeCloseTo(c, 9);
  });

  // Guards against exactly the "297 -> 23.85 -> -249.3" class of bug this report described: a
  // value already converted in a selector gets run through kelvinToCelsius again in the
  // component. The result is still a plausible-looking number, so only a test catches it.
  it("kelvinToCelsius applied twice to the same value is NOT the identity (the double-conversion bug)", () => {
    for (const k of [297.2, 400]) {
      const oncePlausible = kelvinToCelsius(k);
      const twiceWrong = kelvinToCelsius(oncePlausible);
      expect(Math.abs(twiceWrong - oncePlausible)).toBeGreaterThan(100);
    }
  });

  it("celsiusToKelvin of the Celsius bound reproduces the Kelvin bound within 1e-9 (no rounding trade-off: 283/478 K convert to an exact two-decimal Celsius bound)", () => {
    expect(celsiusToKelvin(9.85)).toBeCloseTo(283, 9);
    expect(celsiusToKelvin(204.85)).toBeCloseTo(478, 9);
    expect(T_CALIBRATED_C).toEqual([9.85, 204.85]);
    expect([...T_CALIBRATED_K]).toEqual([283, 478]);
  });

  it("roundCelsius scrubs float noise at the chosen precision, applied after the conversion (not inside it)", () => {
    expect(kelvinToCelsius(290)).not.toBe(16.85); // the float noise this formatter is scrubbing
    expect(roundCelsius(290, 2)).toBe(16.85);
    expect(roundCelsius(283, 2)).toBe(9.85);
    expect(roundCelsius(270, 2)).toBe(-3.15);
  });

  it("KELVIN_OFFSET is the one constant both directions share", () => {
    expect(celsiusToKelvin(0)).toBe(KELVIN_OFFSET);
  });
});
