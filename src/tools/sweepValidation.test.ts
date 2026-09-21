import { describe, it, expect } from "vitest";
import { validateSweep } from "./sweepValidation";

describe("validateSweep", () => {
  it("rejeita minimum >= maximum (6 / 3) nos dois regimes", () => {
    for (const regime of ["linear", "radial"] as const) {
      expect(validateSweep("temperature", 6, 3, regime).minimum).toMatch(/lower than maximum/);
      expect(validateSweep("temperature", 5, 5, regime).minimum).toMatch(/lower than maximum/);
    }
  });

  it("rejeita valores fora da faixa fisica", () => {
    expect(validateSweep("core porosity", 0, 0.3, "linear").minimum).toBeDefined();
    expect(validateSweep("core porosity", 0.1, 1, "linear").maximum).toBeDefined();
    expect(validateSweep("acid concentration", -0.1, 0.3, "radial").minimum).toBeDefined();
    expect(validateSweep("acid concentration", 0.1, 1.2, "radial").maximum).toBeDefined();
    expect(validateSweep("temperature", 0, 300, "radial").minimum).toBeDefined();
    expect(validateSweep("temperature", -300, 20, "linear").minimum).toBeDefined();
    expect(validateSweep("wellbore diameter", 0, 6, "radial").minimum).toBeDefined();
  });

  it("rejeita campo vazio e aceita faixa valida", () => {
    expect(validateSweep("temperature", "", 300, "radial").minimum).toBeDefined();
    expect(validateSweep("temperature", 290, "", "radial").maximum).toBeDefined();
    expect(validateSweep("temperature", -10, 90, "linear")).toEqual({});
    expect(validateSweep("wellbore diameter", 3, 6, "radial")).toEqual({});
  });
});

import fixture from "../../../shared-fixtures/temperature_calibration.json";
import { T_CALIBRATED_K } from "./sweepValidation";

describe("T_CALIBRATED_K — fixture compartilhada TS<->Python", () => {
  it("espelho TS bate com shared-fixtures/temperature_calibration.json", () => {
    expect([...T_CALIBRATED_K]).toEqual(fixture.t_calibrated_k);
  });
});
