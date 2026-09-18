import { describe, expect, it } from "vitest";
import { curveFlowRegime, matchesFlowRegime } from "./regimeFilter";

describe("curveFlowRegime", () => {
  it("returns the curve's own regime when set", () => {
    expect(curveFlowRegime("radial")).toBe("radial");
    expect(curveFlowRegime("linear")).toBe("linear");
  });

  it("treats a missing flowRegime (legacy curve saved before the field existed) as linear", () => {
    expect(curveFlowRegime(undefined)).toBe("linear");
  });
});

describe("matchesFlowRegime", () => {
  it("matches a radial curve against the radial tab, not linear", () => {
    expect(matchesFlowRegime("radial", "radial")).toBe(true);
    expect(matchesFlowRegime("radial", "linear")).toBe(false);
  });

  it("matches a linear curve against the linear tab, not radial", () => {
    expect(matchesFlowRegime("linear", "linear")).toBe(true);
    expect(matchesFlowRegime("linear", "radial")).toBe(false);
  });

  it("bug regression: a legacy curve with no flowRegime only shows up under linear", () => {
    expect(matchesFlowRegime(undefined, "linear")).toBe(true);
    expect(matchesFlowRegime(undefined, "radial")).toBe(false);
  });
});
