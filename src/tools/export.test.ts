import { describe, expect, it } from "vitest";
import XLSX from "xlsx-js-style";
import { buildVerticalTableSheet } from "./export";
import type { Curve } from "../redux/storageresults/slice";

describe("buildVerticalTableSheet — destaque da linha ótima no modelo linear", () => {
  it("destaca a linha com menor PVBt com fundo amarelo (FFF2CC) e texto em negrito", () => {
    const mockCurve: Curve = {
      id: "linear_test_run",
      flowRegime: "linear",
      rock: "Calcita",
      acid: "HCl 15%",
      concentration: 0.15,
      porosity: 0.2,
      temperature: 25,
      flowratePoints: [0.5, 0.694, 1.082, 1.663, 1.857],
      pvbtPoints: [0.661, 0.583, 0.531, 0.516, 0.517],
      intersticialVelocity: [4.87e-5, 6.76e-5, 1.05e-4, 1.62e-4, 1.81e-4],
      iDa: [0.162, 0.222, 0.334, 0.489, 0.538],
      wormholeVelocity: [1.28e-3, 1.74e-3, 2.63e-3, 3.85e-3, 4.23e-3],
      volumeToBt: [17.22, 15.201, 13.85, 13.458, 13.47],
      timeToBt: [2070, 1310, 768.258, 485.488, 435.181],
      darcyVelocity: [7.31e-6, 1.01e-5, 1.58e-5, 2.43e-5, 2.71e-5],
    };

    const ws = buildVerticalTableSheet(mockCurve);

    let headerRowIdx = -1;
    for (let r = 0; r < 30; r++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c: 0 })];
      if (cell && typeof cell.v === "string" && cell.v.includes("q0")) {
        headerRowIdx = r;
        break;
      }
    }

    expect(headerRowIdx).toBeGreaterThan(0);

    const dataStartRow = headerRowIdx + 1;

    const row0Cell = ws[XLSX.utils.encode_cell({ r: dataStartRow + 0, c: 0 })];
    expect(row0Cell.s?.font?.bold).toBe(false);
    expect(row0Cell.s?.fill?.fgColor?.rgb).not.toBe("FFF2CC");

    const row1Cell = ws[XLSX.utils.encode_cell({ r: dataStartRow + 1, c: 0 })];
    expect(row1Cell.s?.font?.bold).toBe(false);
    expect(row1Cell.s?.fill?.fgColor?.rgb).not.toBe("FFF2CC");

    const optCellQ0 = ws[XLSX.utils.encode_cell({ r: dataStartRow + 3, c: 0 })];
    const optCellPVBt = ws[XLSX.utils.encode_cell({ r: dataStartRow + 3, c: 1 })];

    expect(optCellQ0.v).toBe(1.663);
    expect(optCellPVBt.v).toBe(0.516);

    expect(optCellQ0.s?.fill?.fgColor?.rgb).toBe("FFF2CC");
    expect(optCellQ0.s?.font?.bold).toBe(true);
    expect(optCellQ0.s?.font?.color?.rgb).toBe("000000");

    expect(optCellPVBt.s?.fill?.fgColor?.rgb).toBe("FFF2CC");
    expect(optCellPVBt.s?.font?.bold).toBe(true);

    const row4Cell = ws[XLSX.utils.encode_cell({ r: dataStartRow + 4, c: 0 })];
    expect(row4Cell.s?.font?.bold).toBe(false);
    expect(row4Cell.s?.fill?.fgColor?.rgb).not.toBe("FFF2CC");
  });
});
