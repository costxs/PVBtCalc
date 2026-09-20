import { describe, it, expect } from "vitest";
import { parseAxisLimitInput, resolveAxisLimit } from "./axisLimits";

describe("parseAxisLimitInput", () => {
  it("parses plain integers and decimals (EN-US dot)", () => {
    expect(parseAxisLimitInput("100")).toBe(100);
    expect(parseAxisLimitInput("100.5")).toBe(100.5);
    expect(parseAxisLimitInput("100.05")).toBe(100.05);
  });

  it("parses pt-BR decimal comma", () => {
    expect(parseAxisLimitInput("0,5")).toBe(0.5);
    expect(parseAxisLimitInput("10,25")).toBe(10.25);
  });

  it("parses pt-BR thousands separator (dot)", () => {
    expect(parseAxisLimitInput("1.000")).toBe(1000);
    expect(parseAxisLimitInput("100.000")).toBe(100000);
    expect(parseAxisLimitInput("12.345.678")).toBe(12345678);
  });

  it("parses pt-BR thousands + decimal comma together", () => {
    expect(parseAxisLimitInput("1.234,5")).toBe(1234.5);
    expect(parseAxisLimitInput("100.000,25")).toBe(100000.25);
  });

  it("does not mistake a 2-digit decimal for a thousands group", () => {
    expect(parseAxisLimitInput("100.5")).toBe(100.5);
    expect(parseAxisLimitInput("100.05")).toBe(100.05);
  });

  it("returns null for empty/whitespace", () => {
    expect(parseAxisLimitInput("")).toBeNull();
    expect(parseAxisLimitInput("   ")).toBeNull();
  });

  it("returns null for unparseable input", () => {
    expect(parseAxisLimitInput("abc")).toBeNull();
    expect(parseAxisLimitInput("1,2,3")).toBeNull();
  });
});

describe("resolveAxisLimit", () => {
  it("both empty -> fully auto, no error", () => {
    expect(resolveAxisLimit("", "", false)).toEqual({ min: undefined, max: undefined });
  });

  it("only max filled -> min stays auto (undefined), not ''", () => {
    const r = resolveAxisLimit("", "100.000", false);
    expect(r.error).toBeUndefined();
    expect(r.min).toBeUndefined();
    expect(r.max).toBe(100000);
  });

  it("only min filled -> max stays auto", () => {
    const r = resolveAxisLimit("10", "", false);
    expect(r.error).toBeUndefined();
    expect(r.min).toBe(10);
    expect(r.max).toBeUndefined();
  });

  it("both filled, valid range", () => {
    const r = resolveAxisLimit("10", "1.000", false);
    expect(r).toEqual({ min: 10, max: 1000 });
  });

  it("rejects max <= min", () => {
    expect(resolveAxisLimit("100", "10", false).error).toMatch(/Máx deve ser maior/);
    expect(resolveAxisLimit("10", "10", false).error).toMatch(/Máx deve ser maior/);
  });

  it("rejects min <= 0 on a log axis", () => {
    expect(resolveAxisLimit("0", "1000", true).error).toMatch(/Mín deve ser maior que 0/);
    expect(resolveAxisLimit("-5", "1000", true).error).toMatch(/Mín deve ser maior que 0/);
  });

  it("allows min <= 0 on a linear axis", () => {
    const r = resolveAxisLimit("-5", "10", false);
    expect(r).toEqual({ min: -5, max: 10 });
  });

  it("rejects unparseable values", () => {
    expect(resolveAxisLimit("abc", "10", false).error).toMatch(/Mín inválido/);
    expect(resolveAxisLimit("10", "abc", false).error).toMatch(/Máx inválido/);
  });

  it("matches the requested verification scenario (radial Simulation Y, log axis)", () => {
    const r1 = resolveAxisLimit("", "100.000", true);
    expect(r1).toEqual({ min: undefined, max: 100000 });

    const r2 = resolveAxisLimit("10", "1.000", true);
    expect(r2).toEqual({ min: 10, max: 1000 });
  });
});
