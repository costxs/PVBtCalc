import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderToString } from "react-dom/server";
import { createElement } from "react";
import DataTable, { ColumnConfig } from "./DataTable";
import { buildSimulationTable, buildSkinTable, buildDesignTable } from "./columnsConfig";

function keysOf(columns: ColumnConfig[]): string[] {
  return columns.map((c) => c.key);
}

function expectUniqueKeys(columns: ColumnConfig[]) {
  const keys = keysOf(columns);
  const dups = keys.filter((k, i) => keys.indexOf(k) !== i);
  expect(dups, `keys duplicadas no columnsConfig: [${[...new Set(dups)].join(", ")}]`).toEqual([]);
}

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
    renderToString(createElement(DataTable, { columns, rows: [{ q0: 1, wv: 2 }] }));

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(String(warnSpy.mock.calls[0][0])).toContain("wv");
  });

  it("NAO dispara quando todas as keys sao unicas", () => {
    const columns: ColumnConfig[] = [
      { key: "q0", label: "q0" },
      { key: "wv", label: "wv" },
      { key: "dv", label: "dv" },
    ];
    renderToString(createElement(DataTable, { columns, rows: [{ q0: 1, wv: 2, dv: 3 }] }));

    expect(warnSpy).not.toHaveBeenCalled();
  });
});

describe("columnsConfig — keys unicas em cada builder", () => {
  describe("buildSimulationTable", () => {
    it("radial, modo pvbt, com target", () => {
      const curve = { flowRegime: "radial", outputMode: "pvbt", targetLabel: "s = -3", flowratePoints: [0, 1] };
      expectUniqueKeys(buildSimulationTable(curve).columns);
    });

    it("radial, modo pvbt, sem target", () => {
      const curve = { flowRegime: "radial", outputMode: "pvbt", flowratePoints: [0, 1] };
      expectUniqueKeys(buildSimulationTable(curve).columns);
    });

    it("radial, modo volume (PVBt omitida)", () => {
      const curve = { flowRegime: "radial", outputMode: "volume", targetLabel: "s = -3", flowratePoints: [0, 1] };
      const table = buildSimulationTable(curve);
      expectUniqueKeys(table.columns);
      expect(keysOf(table.columns)).not.toContain("PVBt");
      expect(keysOf(table.columns)).toContain("V_A");
      expect(table.optimumField).toBe("V_A");
    });

    it("radial, modo pvbt: a coluna PVBt aparece e o otimo e por PVBt", () => {
      const curve = { flowRegime: "radial", outputMode: "pvbt", targetLabel: "s = -3", flowratePoints: [0, 1] };
      const table = buildSimulationTable(curve);
      expect(keysOf(table.columns)).toContain("PVBt");
      expect(table.optimumField).toBe("PVBt");
    });

    it("linear, modo pvbt", () => {
      const curve = { flowRegime: "linear", flowratePoints: [0, 1] };
      expectUniqueKeys(buildSimulationTable(curve).columns);
    });

    it("linear, modo volume (branch morto hoje, mas ainda no codigo)", () => {
      const curve = { flowRegime: "linear", outputMode: "volume", flowratePoints: [0, 1] };
      expectUniqueKeys(buildSimulationTable(curve).columns);
    });

    it("curve indefinido (guarda defensiva de Results.tsx)", () => {
      expectUniqueKeys(buildSimulationTable(undefined).columns);
    });
  });

  it("buildSkinTable", () => {
    const skinData = { "1.5": [{ x: 10, y: -3.7, l_ft: 5 }], "3": [{ x: 20, y: -4.1, l_ft: 9 }] };
    expectUniqueKeys(buildSkinTable(skinData).columns);
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
    expectUniqueKeys(buildDesignTable(designData, 1).columns);
  });

  it("buildDesignTable com payload nulo", () => {
    expectUniqueKeys(buildDesignTable(null, null).columns);
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
    const { rows } = buildDesignTable(designData, 30);
    expect(rows[0].tbt_min).toBeCloseTo(12 / 0.5);
    expect(rows[0].volume_total).toBeCloseTo(12 * 30);
  });
});
