import { describe, expect, it } from "vitest";
import XLSX from "xlsx-js-style";
import { buildVerticalTableSheet } from "./export";
import {
  analyzeLinearOptimum,
  buildLinearExportPayload,
  isExperimentalCurve,
  linearNote,
  linearSummaryRows,
} from "./linearExport";
import { fmtBblMin } from "./validityWindow";
import type { Curve } from "../redux/storageresults/slice";

const META = {
  q_opt_cm3_min: 1.7284296238540526,
  validity_min_cm3_min: 0.17284296238540526,
  validity_max_cm3_min: 17.284296238540526,
  pvbt_at_q_opt: 0.5186002219352394,
};

function modelCurve(over: Partial<Curve> = {}): Curve {
  return {
    id: "T25", flowRegime: "linear", rock: "Indiana Limestone", acid: "HCl With Inhibitor Corrosion",
    concentration: 0.15, porosity: 0.15, temperature: 25, length: 6, diameter: 1.5,
    flowratePoints: [0.1, 0.7, 1.3, 1.9, 2.5, 3.1],
    pvbtPoints: [8.45, 0.585, 0.524, 0.519, 0.529, 0.54],
    intersticialVelocity: [1, 2, 3, 4, 5, 6], iDa: [1, 2, 3, 4, 5, 6], wormholeVelocity: [1, 2, 3, 4, 5, 6],
    volumeToBt: [1, 2, 3, 4, 5, 6], timeToBt: [1, 2, 3, 4, 5, 6], darcyVelocity: [1, 2, 3, 4, 5, 6],
    withinValidityRange: [false, true, true, true, true, true],
    metadata: META,
    ...over,
  };
}

function experimentalCurve(): Curve {
  return {
    id: "Exp: core A", acid: "Experimental", rock: "Experimental", length: 0, diameter: 0, porosity: 0,
    concentration: 0, temperature: 0, pvbtPoints: [3.1, 1.9, 1.5], flowratePoints: [0.5, 1, 2],
    intersticialVelocity: [0, 0, 0], iDa: [0, 0, 0], volumeToBt: [0, 0, 0], timeToBt: [0, 0, 0],
    wormholeVelocity: [0, 0, 0], darcyVelocity: [0, 0, 0],
  };
}

function cellText(ws: XLSX.WorkSheet): string[] {
  return Object.keys(ws).filter((k) => !k.startsWith("!")).map((k) => String((ws as any)[k].v));
}

describe("linearExport — otimo exato vs. menor PVBT varrido", () => {
  it("q_opt exportado e o valor de metadata, o mesmo que a tela formata", () => {
    const info = analyzeLinearOptimum(modelCurve());
    expect(info.qOpt).toBe(META.q_opt_cm3_min);
    expect(info.pvbtAtQOpt).toBe(META.pvbt_at_q_opt);
    const note = linearNote(info, info.minIdx);
    expect(note).toBe(`PVBT mínimo desta simulação; q_opt = ${fmtBblMin(META.q_opt_cm3_min)} cm³/min`);
    expect(note).toContain("1.73");
  });

  it("os dois otimos ficam distintos no resumo", () => {
    const rows = Object.fromEntries(linearSummaryRows(analyzeLinearOptimum(modelCurve())));
    expect(rows["q_opt [cm³/min]"]).toBe(META.q_opt_cm3_min);
    expect(rows["Lowest PVBT in sweep (grid-dependent)"]).toBe(0.519);
    expect(rows["Flowrate at lowest swept PVBT [cm³/min]"]).toBe(1.9);
    expect(rows["Recommended window min = q_opt/10 [cm³/min]"]).toBe(META.validity_min_cm3_min);
    expect(rows["Recommended window max = 10·q_opt [cm³/min]"]).toBe(META.validity_max_cm3_min);
  });

  it("minimo na borda da faixa: nota diz borda e da o q_opt verdadeiro", () => {
    const c = modelCurve({
      flowratePoints: [5, 6, 7, 8, 9, 10],
      pvbtPoints: [0.598, 0.607, 0.615, 0.624, 0.633, 0.64],
      withinValidityRange: [true, true, true, true, true, true],
      metadata: { ...META, q_opt_cm3_min: 1.7054084 },
    });
    const info = analyzeLinearOptimum(c);
    expect(info.isBorder).toBe(true);
    const note = linearNote(info, info.minIdx);
    expect(note).toBe("Mínimo na borda da faixa simulada; q_opt = 1.71 cm³/min");
    expect(note).not.toContain("PVBT mínimo desta simulação");
    expect(linearNote(info, 3)).toBe("");
  });

  it("sem metadata: sem q_opt inventado", () => {
    const info = analyzeLinearOptimum(modelCurve({ metadata: null }));
    expect(info.qOpt).toBeNull();
    expect(linearNote(info, info.minIdx)).toBe("PVBT mínimo desta simulação");
    expect(linearSummaryRows(info)[0][1]).toBe("não disponível");
  });

  it("curva salva antes de pvbt_at_q_opt existir: q_opt ok, PVBT(q_opt) nao disponivel", () => {
    const { pvbt_at_q_opt: _drop, ...legacy } = META;
    const info = analyzeLinearOptimum(modelCurve({ metadata: legacy }));
    expect(info.qOpt).toBe(META.q_opt_cm3_min);
    expect(info.pvbtAtQOpt).toBeNull();
  });
});

describe("linearExport — experimentais nao sao curvas de modelo", () => {
  it("detecta curva experimental e a separa no payload, sem metadata", () => {
    expect(isExperimentalCurve(experimentalCurve())).toBe(true);
    expect(isExperimentalCurve(modelCurve())).toBe(false);
    const p = buildLinearExportPayload([modelCurve(), experimentalCurve()]);
    expect(p.curves).toHaveLength(1);
    expect(p.experimental_curves).toHaveLength(1);
    expect(Object.keys(p.experimental_curves[0]).sort()).toEqual(["flowratepoints", "id", "pvbtpoints"]);
    expect(p.curves[0].metadata).toEqual(META);
  });

  it("dados-somente: experimental mantem o layout antigo (sem Nota, sem resumo)", () => {
    const text = cellText(buildVerticalTableSheet(experimentalCurve()));
    expect(text).not.toContain("Nota");
    expect(text).not.toContain("OPTIMUM SUMMARY");
  });
});

describe("export somente-tabelas linear — resumo + Nota", () => {
  it("escreve OPTIMUM SUMMARY, coluna Nota e a nota na linha do minimo", () => {
    const ws = buildVerticalTableSheet(modelCurve());
    const text = cellText(ws);
    expect(text).toContain("OPTIMUM SUMMARY");
    expect(text).toContain("Nota");
    expect(text).toContain(`PVBT mínimo desta simulação; q_opt = 1.73 cm³/min`);

    const labelAddr = Object.keys(ws).find((k) => (ws as any)[k].v === "q_opt [cm³/min]")!;
    const valAddr = "B" + labelAddr.slice(1);
    expect((ws as any)[valAddr].v).toBe(META.q_opt_cm3_min);
  });

  it("borda: nota de borda na primeira/ultima linha", () => {
    const ws = buildVerticalTableSheet(modelCurve({
      flowratePoints: [5, 6, 7], pvbtPoints: [0.6, 0.61, 0.62], withinValidityRange: [true, true, true],
      intersticialVelocity: [1, 2, 3], iDa: [1, 2, 3], wormholeVelocity: [1, 2, 3],
      volumeToBt: [1, 2, 3], timeToBt: [1, 2, 3], darcyVelocity: [1, 2, 3],
    }));
    expect(cellText(ws)).toContain("Mínimo na borda da faixa simulada; q_opt = 1.73 cm³/min");
  });

  it("radial nao ganha bloco de otimo linear", () => {
    const ws = buildVerticalTableSheet(modelCurve({ flowRegime: "radial", targetLabel: "5.00 ft" }));
    expect(cellText(ws)).not.toContain("OPTIMUM SUMMARY");
  });
});
