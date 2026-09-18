import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderToString } from "react-dom/server";
import { createElement } from "react";
import DataTable, { ColumnConfig } from "./DataTable";
import { buildSimulationTable, buildSkinTable, buildDesignTable } from "./columnsConfig";

// Contexto (ver DataTable.tsx e o pedido "Validar o guard de key duplicada"):
// desde a Fase 8 a ordem/existencia de cada coluna vem de um columnsConfig
// montado a mao por aba -- nao mais de Object.keys(). Com config explicito, um
// push repetido da mesma key passa batido e renderiza duas colunas lendo o
// mesmo row[key].
//
// Duas defesas, ambas verificadas aqui:
//   1) o guard dev-only dentro do DataTable. VERIFICADO que dispara, tanto em
//      server render (renderToString) quanto em client render (createRoot):
//      ele emite console.WARN. A mensagem "Encountered two children with the
//      same key" que o React emite e um console.ERROR separado, do reconciler
//      -- as duas saem, em canais diferentes; e facil so reparar na vermelha.
//      Fraqueza real do guard: dev-only, invisivel no CI e em build de prod.
//   2) estes testes -- rodam no CI, cobrem todas as configs de uma vez, sem
//      depender de console aberto na aba certa. Esta e a rede que vale.
//
// A aba Analysis Chart (visibleChart === 'B', Chart.tsx) NAO tem builder
// proprio: Results.tsx roteia tudo que nao e 'skin'/'design' para
// buildSimulationTable. Entao "o do Analysis" == buildSimulationTable, ja
// coberto abaixo em todos os ramos (radial/linear x pvbt/volume x target).

function keysOf(columns: ColumnConfig[]): string[] {
  return columns.map((c) => c.key);
}

function expectUniqueKeys(columns: ColumnConfig[]) {
  const keys = keysOf(columns);
  const dups = keys.filter((k, i) => keys.indexOf(k) !== i);
  expect(dups, `keys duplicadas no columnsConfig: [${[...new Set(dups)].join(", ")}]`).toEqual([]);
}

// ---------------------------------------------------------------------------
// Exercita o guard do DataTable contra uma duplicata REAL. O caminho pela UI
// (dev server -> modo radial -> aba Simulation com dados do backend) e fragil;
// renderToString roda a mesma funcao componente e o guard executa no corpo da
// funcao, ANTES do return -- entao ele nao tem como ser "vencido" pelo aviso
// do React, que so acontece na reconciliacao depois. Se o warn dispara aqui,
// dispara no navegador tambem.
// ---------------------------------------------------------------------------
describe("DataTable — guard dev-only de key de coluna duplicada", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("pre-condicao: o guard so roda quando import.meta.env.DEV", () => {
    // vitest roda em modo dev por padrao; se algum dia rodar com PROD=true
    // este teste vira um lembrete claro em vez de uma falha confusa abaixo.
    expect(import.meta.env.DEV).toBe(true);
  });

  it("dispara console.warn quando ha uma key repetida (o caso que deveria pegar)", () => {
    const columns: ColumnConfig[] = [
      { key: "q0", label: "q0" },
      { key: "wv", label: "wv" },
      { key: "wv", label: "wv (2)" }, // duplicata deliberada
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

// ---------------------------------------------------------------------------
// Passo 3 do pedido: teste permanente afirmando que cada builder de
// columnsConfig produz keys unicas, em toda variacao de entrada que muda o
// conjunto de colunas.
// ---------------------------------------------------------------------------
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
      // Fase 9: sem raio de drenagem o backend manda output_mode "volume" e
      // este ramo (antes codigo morto) passa a rodar -- a coluna PVBt sai e
      // o otimo passa a ser ranqueado por V_A.
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
      // isVolumeMode exige flowRegime === 'radial', entao este curve cai no
      // branch linear/pvbt de fato -- ainda assim vale travar as keys.
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
