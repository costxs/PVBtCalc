import { describe, expect, it } from "vitest";
import { ftToLambda, lambdaToFt, lambdaToSkin, skinToLambda, formatTargets, parseTargetInput } from "./targetConversion";

const BETA = 0.0762;

describe("target conversion fixture (locks in L and beta)", () => {
  it.each([
    [5, -3.04],
    [10, -3.71],
    [15, -4.11],
    [20, -4.39],
  ])("%d ft -> skin %f", (ft: number, expectedSkin: number) => {
    const lambda = ftToLambda(ft);
    const skin = Math.round(lambdaToSkin(lambda, BETA) * 100) / 100;
    expect(skin).toBe(expectedSkin);
  });
});

describe("lambda <-> ft round trip", () => {
  it("is inverse for arbitrary values", () => {
    const lambda = ftToLambda(12.5);
    expect(lambdaToFt(lambda)).toBeCloseTo(12.5, 10);
  });
});

describe("lambda <-> skin round trip", () => {
  it("is inverse for arbitrary values", () => {
    const lambda = skinToLambda(-4.39, BETA);
    expect(lambdaToSkin(lambda, BETA)).toBeCloseTo(-4.39, 10);
  });
});

describe("toggling display mode never changes the canonical lambda", () => {
  it("re-labels chips without mutating targetsLambda", () => {
    const targetsLambda = [5, 10, 15, 20].map((ft) => ftToLambda(ft));

    const asLength = formatTargets(targetsLambda, "length", { beta: BETA });
    const asSkin = formatTargets(targetsLambda, "skin", { beta: BETA });

    expect(asLength.map((c) => c.lambda)).toEqual(targetsLambda);
    expect(asSkin.map((c) => c.lambda)).toEqual(targetsLambda);
    expect(asLength.map((c) => c.label)).toEqual([5, 10, 15, 20]);
    expect(asSkin.map((c) => c.label)).toEqual([-3.04, -3.71, -4.11, -4.39]);
  });
});

describe("parseTargetInput validation", () => {
  it("rejects non-positive length input", () => {
    expect(parseTargetInput("0", "length", { beta: BETA })).toBeNull();
    expect(parseTargetInput("-5", "length", { beta: BETA })).toBeNull();
  });

  it("accepts negative skin input", () => {
    expect(parseTargetInput("-4", "skin", { beta: BETA })).not.toBeNull();
  });

  it("rejects non-numeric input", () => {
    expect(parseTargetInput("abc", "length", { beta: BETA })).toBeNull();
  });
});
