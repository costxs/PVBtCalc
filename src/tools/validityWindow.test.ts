import { describe, expect, it } from "vitest";
import {
  splitByValidity,
  collectValidityOffenders,
  readValidity,
  fmtBblMin,
  fmtRatio,
} from "./validityWindow";
import type { RadialCurveResult } from "../redux/radial/slice";

const META = {
  q_opt_gal_ft_min: 1,
  validity_min_gal_ft_min: 0.1, // q_opt / 10
  validity_max_gal_ft_min: 10, // q_opt * 10
};

const META_CM3 = {
  q_opt_cm3_min: 4.58,
  validity_min_cm3_min: 0.458,
  validity_max_cm3_min: 45.8,
};

describe("readValidity (Fase 7) -- normalizacao por sufixo de chave", () => {
  it("familia *_gal_ft_min -> unit gal/(ft.min)", () => {
    expect(readValidity(META)).toEqual({ qOpt: 1, min: 0.1, max: 10, unit: "gal/(ft.min)" });
  });

  it("familia *_cm3_min -> unit cm³/min", () => {
    expect(readValidity(META_CM3)).toEqual({ qOpt: 4.58, min: 0.458, max: 45.8, unit: "cm³/min" });
  });

  it("null / undefined -> null (sem janela)", () => {
    expect(readValidity(null)).toBeNull();
    expect(readValidity(undefined)).toBeNull();
  });

  it("metadata SEM nenhuma das duas familias -> null, nao lanca (formato futuro/desconhecido)", () => {
    expect(readValidity({ q_opt_l_min: 3, foo: 1 } as any)).toBeNull();
    expect(readValidity({} as any)).toBeNull();
  });

  it("trio incompleto ou nao-finito (cache corrompido) -> null", () => {
    expect(readValidity({ q_opt_gal_ft_min: 1, validity_min_gal_ft_min: 0.1 } as any)).toBeNull();
    expect(readValidity({ ...META, validity_max_gal_ft_min: NaN })).toBeNull();
    expect(readValidity({ ...META, validity_max_gal_ft_min: Infinity })).toBeNull();
  });
});

describe("Fase 7 -- metadata de familia desconhecida cai no tratamento 'sem janela'", () => {
  // Fase 8: gal_ft_min virou familia REAL (radial) -- a fixture de familia
  // desconhecida precisa de um sufixo que continue nao reconhecido por
  // nenhuma das duas (L/min nao existe em lugar nenhum do backend).
  const ALIEN = { q_opt_l_min: 3, validity_min_l_min: 0.3, validity_max_l_min: 30 } as any;

  it("splitByValidity: curva inteira solida, sem faixa, sem tracejado", () => {
    const r = splitByValidity([0.01, 1, 50], [4, 8, 20], [false, true, false], ALIEN);
    expect(r.solid).toEqual([[0.01, 4], [1, 8], [50, 20]]);
    expect(r.dashed).toEqual([null, null, null]);
    expect(r.bandBelow).toBe(false);
    expect(r.bandAbove).toBe(false);
  });

  it("collectValidityOffenders: nenhum ponto conta como fora", () => {
    const s = collectValidityOffenders([
      { flowratepoints: [0.01, 50], within_validity_range: [false, false], metadata: ALIEN },
    ]);
    expect(s).toEqual({ count: 0, curvesAffected: 0, worst: null });
  });
});

describe("collectValidityOffenders (Fase 7) -- regime linear (cm³/min)", () => {
  it("le a familia *_cm3_min e reporta a unidade no worst", () => {
    const s = collectValidityOffenders([
      { flowratepoints: [0.01, 50], within_validity_range: [false, false], metadata: META_CM3 },
    ]);
    expect(s.count).toBe(2);
    // pior = maior razao: 0.458/0.01 = 45.8 (abaixo) vs 50/45.8 = 1.09 (acima)
    expect(s.worst).toMatchObject({ boundary: "lower", limit: 0.458, flowrate: 0.01, unit: "cm³/min" });
  });
});

describe("splitByValidity (Fase 5)", () => {
  it("sem metadata: curva inteira solida, sem faixa, sem tracejado", () => {
    const r = splitByValidity([1, 2, 3], [10, 20, 30], [true, true, true], null);
    expect(r.solid).toEqual([[1, 10], [2, 20], [3, 30]]);
    expect(r.dashed).toEqual([null, null, null]);
    expect(r.bandBelow).toBe(false);
    expect(r.bandAbove).toBe(false);
  });

  it("todos dentro da janela => nada tracejado, sem faixa", () => {
    const r = splitByValidity([1, 2, 5], [10, 20, 30], [true, true, true], META);
    expect(r.dashed.every((p) => p === null)).toBe(true);
    expect(r.bandBelow).toBe(false);
    expect(r.bandAbove).toBe(false);
  });

  it("ponto abaixo da janela => tracejado + faixa inferior, com vertice no cruzamento", () => {
    // x: 0.05 (fora, < 0.1), 0.2 (dentro), 1 (dentro)
    const r = splitByValidity([0.05, 0.2, 1], [4, 8, 10], [false, true, true], META);
    expect(r.bandBelow).toBe(true);
    expect(r.bandAbove).toBe(false);
    // vertice de cruzamento em x = validity_min = 0.1, presente nos dois traces
    const solidXs = r.solid.filter(Boolean).map((p) => (p as number[])[0]);
    const dashedXs = r.dashed.filter(Boolean).map((p) => (p as number[])[0]);
    expect(solidXs).toContain(0.1);
    expect(dashedXs).toContain(0.1);
    // y do cruzamento: geometrico entre (0.05,4) e (0.2,8)
    const cross = r.solid.find((p) => p && (p as number[])[0] === 0.1) as number[];
    const t = (0.1 - 0.05) / (0.2 - 0.05);
    expect(cross[1]).toBeCloseTo(4 * Math.pow(8 / 4, t), 6);
  });

  it("ponto acima da janela => tracejado + faixa superior", () => {
    const r = splitByValidity([1, 5, 40], [10, 8, 20], [true, true, false], META);
    expect(r.bandBelow).toBe(false);
    expect(r.bandAbove).toBe(true);
    const dashedXs = r.dashed.filter(Boolean).map((p) => (p as number[])[0]);
    expect(dashedXs).toContain(10); // cruzamento em validity_max
    expect(dashedXs).toContain(40);
  });

  it("y null (ponto clipped) quebra a linha em vez de virar 0", () => {
    const r = splitByValidity([0.05, 0.2], [null, 8], [false, true], META);
    expect(r.solid[0]).toBeNull();
    expect(r.dashed[0]).toBeNull();
    // sem cruzamento interpolado quando um dos y e null
    expect(r.solid.filter((p) => p && (p as number[])[0] === 0.1)).toHaveLength(0);
  });
});

const curve = (over: Partial<RadialCurveResult>): RadialCurveResult =>
  ({
    target: 1,
    target_label: "5.00 ft",
    flowratepoints: [],
    pvbtpoints: null,
    acidvolumepoints: null,
    insterticialvelocity: [],
    ida: [],
    volumetobt: [],
    timetobt: [],
    wormholevelocity: [],
    darcyvelocity: [],
    status: [],
    within_validity_range: [],
    metadata: null,
    ...over,
  } as RadialCurveResult);

describe("collectValidityOffenders (Fase 5)", () => {
  it("nenhum ponto fora => count 0, worst null", () => {
    const s = collectValidityOffenders([
      curve({ flowratepoints: [1, 2], within_validity_range: [true, true], metadata: META }),
    ]);
    expect(s).toEqual({ count: 0, curvesAffected: 0, worst: null });
  });

  it("metadata null => pontos nunca contam como fora", () => {
    const s = collectValidityOffenders([
      curve({ flowratepoints: [1, 2], within_validity_range: [false, false], metadata: null }),
    ]);
    expect(s.count).toBe(0);
  });

  it("razao acima do limite superior = x / validity_max, calculada", () => {
    const s = collectValidityOffenders([
      curve({ flowratepoints: [50], within_validity_range: [false], metadata: META }),
    ]);
    expect(s.count).toBe(1);
    expect(s.curvesAffected).toBe(1);
    expect(s.worst).toMatchObject({ boundary: "upper", limit: 10, flowrate: 50 });
    expect(s.worst!.ratio).toBeCloseTo(5, 10); // 50 / 10
  });

  it("razao abaixo do limite inferior = validity_min / x", () => {
    const s = collectValidityOffenders([
      curve({ flowratepoints: [0.02], within_validity_range: [false], metadata: META }),
    ]);
    expect(s.worst).toMatchObject({ boundary: "lower", limit: 0.1 });
    expect(s.worst!.ratio).toBeCloseTo(5, 10); // 0.1 / 0.02
  });

  it("varias curvas: conta pontos, curvas distintas e escolhe a MAIOR razao", () => {
    const s = collectValidityOffenders([
      curve({ target_label: "5.00 ft", flowratepoints: [20, 30], within_validity_range: [false, false], metadata: META }),
      curve({ target_label: "10.00 ft", flowratepoints: [200], within_validity_range: [false], metadata: META }),
    ]);
    expect(s.count).toBe(3);
    expect(s.curvesAffected).toBe(2);
    expect(s.worst!.label).toBe("10.00 ft");
    expect(s.worst!.ratio).toBeCloseTo(20, 10); // 200 / 10
  });
});

describe("formatadores", () => {
  it("fmtBblMin: casas adaptativas", () => {
    expect(fmtBblMin(0.042)).toBe("0.042");
    expect(fmtBblMin(1.234)).toBe("1.23");
    expect(fmtBblMin(42.7)).toBe("42.7");
  });

  it("fmtRatio: uma casa abaixo de 10, inteiro acima", () => {
    expect(fmtRatio(6.83)).toBe("6.8");
    expect(fmtRatio(12.4)).toBe("12");
  });
});
