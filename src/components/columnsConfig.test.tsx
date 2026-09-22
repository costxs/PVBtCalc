import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderToString } from "react-dom/server";
import { createElement } from "react";
import DataTable, { ColumnConfig } from "./DataTable";
import { makeT } from "../i18n";
import { withLang } from "../i18n/testUtils";
import { buildSimulationTable, buildSkinTable, buildDesignTable } from "./columnsConfig";

function keysOf(columns: ColumnConfig[]): string[] {
  return columns.map((c) => c.key);
}

function expectUniqueKeys(columns: ColumnConfig[]) {
  const keys = keysOf(columns);
  const dups = keys.filter((k, i) => keys.indexOf(k) !== i);
  expect(dups, `keys duplicadas no columnsConfig: [${[...new Set(dups)].join(", ")}]`).toEqual([]);
}

const T = makeT("en");

describe("DataTable — guard dev-only de key de coluna duplicada", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("pre-condicao: o guard so roda quando import.meta.env.DEV", () => {
    expect(import.meta.env.DEV).toBe(true);
  });

  it("dispara console.warn quando ha uma key repetida (o caso que deveria pegar)", () => {
    const columns: ColumnConfig[] = [
      { key: "q0", label: "q0" },
      { key: "wv", label: "wv" },
      { key: "wv", label: "wv (2)" },
    ];
    renderToString(withLang(createElement(DataTable, { columns, rows: [{ q0: 1, wv: 2 }] }), "en"));

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(String(warnSpy.mock.calls[0][0])).toContain("wv");
  });

  it("NAO dispara quando todas as keys sao unicas", () => {
    const columns: ColumnConfig[] = [
      { key: "q0", label: "q0" },
      { key: "wv", label: "wv" },
      { key: "dv", label: "dv" },
    ];
    renderToString(withLang(createElement(DataTable, { columns, rows: [{ q0: 1, wv: 2, dv: 3 }] }), "en"));

    expect(warnSpy).not.toHaveBeenCalled();
  });
});

describe("columnsConfig — keys unicas em cada builder", () => {
  describe("buildSimulationTable", () => {
    it("radial, modo pvbt, com target", () => {
      const curve = { flowRegime: "radial", outputMode: "pvbt", targetLabel: "s = -3", flowratePoints: [0, 1] };
      expectUniqueKeys(buildSimulationTable(curve, T).columns);
    });

    it("radial, modo pvbt, sem target", () => {
      const curve = { flowRegime: "radial", outputMode: "pvbt", flowratePoints: [0, 1] };
      expectUniqueKeys(buildSimulationTable(curve, T).columns);
    });

    it("radial, modo volume (PVBt omitida)", () => {
      const curve = { flowRegime: "radial", outputMode: "volume", targetLabel: "s = -3", flowratePoints: [0, 1] };
      const table = buildSimulationTable(curve, T);
      expectUniqueKeys(table.columns);
      expect(keysOf(table.columns)).not.toContain("PVBt");
      expect(keysOf(table.columns)).toContain("V_A");
      expect(table.optimumField).toBe("V_A");
    });

    it("radial, modo pvbt: a coluna PVBt aparece e o otimo e por PVBt", () => {
      const curve = { flowRegime: "radial", outputMode: "pvbt", targetLabel: "s = -3", flowratePoints: [0, 1] };
      const table = buildSimulationTable(curve, T);
      expect(keysOf(table.columns)).toContain("PVBt");
      expect(table.optimumField).toBe("PVBt");
    });

    it("linear, modo pvbt", () => {
      const curve = { flowRegime: "linear", flowratePoints: [0, 1] };
      expectUniqueKeys(buildSimulationTable(curve, T).columns);
    });

    it("linear, modo volume (branch morto hoje, mas ainda no codigo)", () => {
      const curve = { flowRegime: "linear", outputMode: "volume", flowratePoints: [0, 1] };
      expectUniqueKeys(buildSimulationTable(curve, T).columns);
    });

    it("curve indefinido (guarda defensiva de Results.tsx)", () => {
      expectUniqueKeys(buildSimulationTable(undefined, T).columns);
    });
  });

  it("buildSkinTable", () => {
    const skinData = { "1.5": [{ x: 10, y: -3.7, l_ft: 5 }], "3": [{ x: 20, y: -4.1, l_ft: 9 }] };
    expectUniqueKeys(buildSkinTable(skinData, T).columns);
  });

  it("buildDesignTable", () => {
    const designData = {
      series: [
        {
          temperature_k: 297,
          optimum_rate_series: [[0.5, 5], [0.7, 10]],
          optimum_volume_series: [[12, 5], [18, 10]],
        }
      ]
    };
    expectUniqueKeys(buildDesignTable(designData, 1, T).columns);
  });

  it("buildDesignTable com payload nulo", () => {
    expectUniqueKeys(buildDesignTable(null, null, T).columns);
  });

  it("buildDesignTable calcula tbt_min e volume_total", () => {
    const designData = {
      series: [
        {
          temperature_k: 297,
          optimum_rate_series: [[0.5, 5]],
          optimum_volume_series: [[12, 5]],
        }
      ]
    };
    const { rows } = buildDesignTable(designData, 30, T);
    expect(rows[0].tbt_min).toBeCloseTo(12 / 0.5);
    expect(rows[0].volume_total).toBeCloseTo(12 * 30);
  });
});

// Regression: the swept/target length grid is fine (fractions of a ft: comprimentos_ft in
// tools.py is np.linspace(0.1, 20.0, 50), never round numbers). Without an explicit format,
// the column fell back to DataTable's generic defaultFormat, whose val !== 0 branch drops the
// decimals entirely for an exact 0.0 ("0" instead of "0.00") -- exactly the first-row case a
// real length grid starting at a small value hits. Lock the column to its own explicit,
// always-two-decimal format so it never depends on that generic fallback's edge case.
describe("wormhole_length column keeps 2 decimals, even at exactly 0", () => {
  it("buildSkinTable", () => {
    const skinData = { "1.5": [{ x: 10, y: -3.7, l_ft: 0 }, { x: 20, y: -4.1, l_ft: 1.318 }] };
    const { columns, rows } = buildSkinTable(skinData, T);
    const col = columns.find((c) => c.key === "wormhole_length")!;
    expect(col.format).toBeDefined();
    expect(col.format!(rows[0].wormhole_length)).toBe("0.00");
    expect(col.format!(rows[1].wormhole_length)).toBe("1.32");
  });

  it("buildDesignTable", () => {
    const designData = {
      series: [{ temperature_k: 297, optimum_rate_series: [[0.5, 0], [0.7, 1.318]], optimum_volume_series: [[12, 0], [18, 1.318]] }],
    };
    const { columns, rows } = buildDesignTable(designData, 1, T);
    const col = columns.find((c) => c.key === "wormhole_length")!;
    expect(col.format).toBeDefined();
    expect(col.format!(rows[0].wormhole_length)).toBe("0.00");
    expect(col.format!(rows[1].wormhole_length)).toBe("1.32");
  });
});
