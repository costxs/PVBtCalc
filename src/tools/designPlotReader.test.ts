import { describe, it, expect } from "vitest";
import { extractDesignPlotGrid, readDesignPlot, isDesignPlotOutOfRange, DesignPlotGridPoint } from "./designPlotReader";

describe("designPlotReader", () => {
  it("extractDesignPlotGrid zipa rate/volume pelo mesmo indice", () => {
    const series = [
      {
        temperature_k: 297,
        optimum_rate_series: [[0.5, 1], [0.7, 2]],
        optimum_volume_series: [[12, 1], [18, 2]],
      },
    ];
    const grid = extractDesignPlotGrid(series, 297);
    expect(grid).toEqual([
      { length: 1, qOpt: 0.5, vOpt: 12 },
      { length: 2, qOpt: 0.7, vOpt: 18 },
    ]);
  });

  it("extractDesignPlotGrid devolve null se a temperatura nao existe", () => {
    expect(extractDesignPlotGrid([{ temperature_k: 297, optimum_rate_series: [], optimum_volume_series: [] }], 422)).toBeNull();
  });

  it("interpolacao log-log e exata sobre uma lei de potencia", () => {
    const C = 0.05, k = 1.7, D = 0.6, m = 2.4;
    const lengths = [1, 2, 3, 4, 5];
    const grid: DesignPlotGridPoint[] = lengths.map((l) => ({
      length: l,
      qOpt: C * Math.pow(l, k),
      vOpt: D * Math.pow(l, m),
    }));

    const targetLength = 4.3;
    const targetVolume = D * Math.pow(targetLength, m);
    const targetRate = C * Math.pow(targetLength, k);

    const byVolume = readDesignPlot(grid, "volume", targetVolume);
    const byRate = readDesignPlot(grid, "rate", targetRate);
    const byLength = readDesignPlot(grid, "length", targetLength);

    for (const reading of [byVolume, byRate, byLength]) {
      expect(isDesignPlotOutOfRange(reading)).toBe(false);
      if (!isDesignPlotOutOfRange(reading)) {
        expect(reading.length).toBeCloseTo(targetLength, 6);
        expect(reading.qOpt).toBeCloseTo(targetRate, 6);
        expect(reading.vOpt).toBeCloseTo(targetVolume, 6);
      }
    }
  });

  it("fora da faixa nao extrapola -- devolve min/max da grade", () => {
    const grid: DesignPlotGridPoint[] = [1, 2, 3].map((l) => ({ length: l, qOpt: 0.1 * l, vOpt: l * l }));

    const belowRange = readDesignPlot(grid, "volume", 0.5);
    expect(isDesignPlotOutOfRange(belowRange)).toBe(true);
    if (isDesignPlotOutOfRange(belowRange)) {
      expect(belowRange.min).toBe(1);
      expect(belowRange.max).toBe(9);
    }

    const aboveRange = readDesignPlot(grid, "length", 10);
    expect(isDesignPlotOutOfRange(aboveRange)).toBe(true);
    if (isDesignPlotOutOfRange(aboveRange)) {
      expect(aboveRange.min).toBe(1);
      expect(aboveRange.max).toBe(3);
    }
  });

  it("grade com menos de 2 pontos e sempre fora da faixa", () => {
    const grid: DesignPlotGridPoint[] = [{ length: 1, qOpt: 0.1, vOpt: 1 }];
    expect(isDesignPlotOutOfRange(readDesignPlot(grid, "length", 1))).toBe(true);
  });

  it("fixture do backend (338.71K, entrada 15 gal/ft)", () => {
    const grid: DesignPlotGridPoint[] = [
      { length: 1, qOpt: 0.054465215501531494, vOpt: 0.6161602789018865 },
      { length: 2, qOpt: 0.1176784379391352, vOpt: 2.4366825002680086 },
      { length: 3, qOpt: 0.1932321229391739, vOpt: 6.119267372398033 },
      { length: 4, qOpt: 0.28031306323788735, vOpt: 12.592901087326949 },
      { length: 5, qOpt: 0.3784400039729008, vOpt: 23.144493040278547 },
    ];

    const reading = readDesignPlot(grid, "volume", 15);
    expect(isDesignPlotOutOfRange(reading)).toBe(false);
    if (!isDesignPlotOutOfRange(reading)) {
      expect(reading.length).toBeCloseTo(4.2649, 3);
      expect(reading.qOpt).toBeCloseTo(0.30557, 4);
    }
  });
});
