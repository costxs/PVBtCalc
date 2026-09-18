import XLSX from "xlsx-js-style";
import { saveAs } from "file-saver";
import { Curve } from "../redux/storageresults/slice";
import { buildSimulationTable } from "../components/columnsConfig";

/**
 * export.tsx
 * ------------------------------------------------------------------
 * Reusa buildSimulationTable (columnsConfig.ts) -- a MESMA fonte que a
 * tabela da aba Simulation/Analysis usa -- em vez de serializar o objeto
 * Redux cru. Isso e o que mantem tabela e export sincronizados por
 * construcao: key le o valor, label+unit vira o cabecalho, a ordem do
 * array vira a ordem das colunas.
 *
 * Estilos e Cores na Planilha Excel:
 * - Cabeçalhos de Seção ("INPUT PARAMETERS", "SIMULATION RESULTS"):
 *   Fundo Azul Escuro (1F4E78), fonte branca em negrito, centralizado.
 * - Cabeçalhos de Coluna (q0, V_A, target, iv, wv, etc.):
 *   Fundo Azul Médio (2F75B5), fonte branca em negrito, centralizado.
 * - Valores dos Parâmetros de Entrada:
 *   Fundo Azul Claro Suave (D9E1F2), bordas finas.
 * - Células de Dados:
 *   Bordas finas, formatação numérica nativa do Excel.
 */

function buildMetadataRows(curve: Curve): (string | number)[][] {
  const isRadial = curve.flowRegime === 'radial';
  const rows: (string | number)[][] = [
    ['Curve ID', curve.id],
    ['Flow Regime', curve.flowRegime ?? 'linear'],
    ['Rock Type', curve.rock],
    ['Acid Type', curve.acid],
    ['Acid Concentration (w/w)', curve.concentration],
    ['Porosity', curve.porosity],
  ];

  // Correção e clareza da temperatura:
  // Se for < 100, sabemos que foi informada em Celsius (ex: 24.05).
  // Se for >= 100, é Kelvin (ex: 338.71).
  // Exporta explicitamente ambas as grandezas para evitar qualquer ambiguidade.
  const rawTemp = curve.temperature;
  if (rawTemp != null) {
    let tempC: number;
    let tempK: number;
    if (rawTemp < 100) {
      tempC = rawTemp;
      tempK = Number((rawTemp + 273.15).toFixed(2));
    } else {
      tempK = rawTemp;
      tempC = Number((rawTemp - 273.15).toFixed(2));
    }
    rows.push(['Temperature (°C)', tempC]);
    rows.push(['Temperature (K)', tempK]);
  }

  // Flowrate Sweep (Min e Max do sweep realizado)
  const qPoints = (curve.flowratePoints || []).filter((v) => typeof v === 'number' && !isNaN(v));
  if (qPoints.length > 0) {
    const qMin = Math.min(...qPoints);
    const qMax = Math.max(...qPoints);
    const qUnit = isRadial ? 'gal/(ft.min)' : 'cm³/min';
    rows.push([`Flowrate Sweep Min (${qUnit})`, qMin]);
    rows.push([`Flowrate Sweep Max (${qUnit})`, qMax]);

    // Para modelo radial, adiciona também a conversão em bbl/min caso haja payzoneThicknessFt
    if (isRadial && curve.payzoneThicknessFt) {
      const qMinBbl = Number(((qMin * curve.payzoneThicknessFt) / 42).toFixed(4));
      const qMaxBbl = Number(((qMax * curve.payzoneThicknessFt) / 42).toFixed(4));
      rows.push(['Flowrate Sweep Min (bbl/min)', qMinBbl]);
      rows.push(['Flowrate Sweep Max (bbl/min)', qMaxBbl]);
    }
  }

  if (isRadial) {
    if (curve.wellboreRadiusIn != null) rows.push(['Wellbore Radius (in)', curve.wellboreRadiusIn]);
    if (curve.payzoneThicknessFt != null) rows.push(['Payzone Thickness (ft)', curve.payzoneThicknessFt]);
    if (curve.targetLabel) rows.push(['Target', curve.targetLabel]);
    else if (curve.target != null) rows.push(['Target', curve.target]);
  } else {
    if (curve.length != null) rows.push(['Core Length (in)', curve.length]);
    if (curve.diameter != null) rows.push(['Core Diameter (in)', curve.diameter]);
  }

  return rows;
}

export const exportCurveAsVerticalTable = (curve: Curve) => {
  const { columns, rows } = buildSimulationTable(curve);

  const metadataRows = buildMetadataRows(curve);
  const headerRow = columns.map((c) => c.label + (c.unit ? ` (${c.unit})` : ""));
  
  // Valores numéricos mantidos em formato nativo para Excel
  const dataRows = rows.map((row) =>
    columns.map((c) => {
      const val = row[c.key];
      return val ?? "";
    })
  );

  // Montagem estruturada do layout da planilha
  const inputSectionHeader = ["INPUT PARAMETERS"];
  const resultsSectionHeader = ["SIMULATION RESULTS"];

  const sheetAoA: (string | number)[][] = [
    inputSectionHeader,
    ...metadataRows,
    [], // linha em branco para espaçamento
    resultsSectionHeader,
    headerRow,
    ...dataRows,
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(sheetAoA);

  // Configuração de mesclagem para cabeçalhos de seção
  const inputHeaderRowIndex = 0;
  const simHeaderRowIndex = metadataRows.length + 2;
  const colHeadersRowIndex = simHeaderRowIndex + 1;
  const numDataCols = Math.max(columns.length, 2);

  worksheet['!merges'] = [
    // INPUT PARAMETERS mesclado nas colunas A e B
    { s: { r: inputHeaderRowIndex, c: 0 }, e: { r: inputHeaderRowIndex, c: 1 } },
    // SIMULATION RESULTS mesclado em todas as colunas da tabela
    { s: { r: simHeaderRowIndex, c: 0 }, e: { r: simHeaderRowIndex, c: numDataCols - 1 } },
  ];

  // Auto-ajuste de largura de cada coluna com base no conteúdo
  const colWidths: { wch: number }[] = [];
  for (let colIdx = 0; colIdx < numDataCols; colIdx++) {
    let maxLen = 12;
    // Ignorar linhas de cabeçalho mescladas no cálculo de largura para não estourar a coluna A
    sheetAoA.forEach((r, rowIdx) => {
      if (rowIdx === inputHeaderRowIndex || rowIdx === simHeaderRowIndex) return;
      const val = r[colIdx];
      if (val != null) {
        const str = String(val);
        if (str.length > maxLen) {
          maxLen = Math.min(str.length, 38);
        }
      }
    });
    colWidths.push({ wch: Math.max(maxLen + 4, 16) });
  }
  worksheet['!cols'] = colWidths;

  // ==========================================
  // ESTILIZAÇÃO E CORES (AZUL / WHITE / BORDERS)
  // ==========================================
  const borderThin = {
    top: { style: "thin", color: { rgb: "B0C4DE" } },
    bottom: { style: "thin", color: { rgb: "B0C4DE" } },
    left: { style: "thin", color: { rgb: "B0C4DE" } },
    right: { style: "thin", color: { rgb: "B0C4DE" } },
  };

  // 1. Estilo do Cabeçalho de Seção: Azul Escuro (#1F4E78)
  const sectionHeaderStyle = {
    fill: { fgColor: { rgb: "1F4E78" } },
    font: { name: "Calibri", sz: 12, bold: true, color: { rgb: "FFFFFF" } },
    alignment: { horizontal: "center", vertical: "center" },
  };

  // 2. Estilo dos Cabeçalhos das Colunas da Tabela: Azul Médio (#2F75B5)
  const colHeaderStyle = {
    fill: { fgColor: { rgb: "2F75B5" } },
    font: { name: "Calibri", sz: 11, bold: true, color: { rgb: "FFFFFF" } },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: borderThin,
  };

  // 3. Estilo dos Labels dos Parâmetros de Entrada
  const inputLabelStyle = {
    font: { name: "Calibri", sz: 11, bold: true, color: { rgb: "1F2937" } },
    border: borderThin,
    alignment: { horizontal: "left", vertical: "center" },
  };

  // 4. Estilo dos Valores dos Parâmetros de Entrada: Azul Claro (#D9E1F2)
  const inputValueStyle = {
    fill: { fgColor: { rgb: "D9E1F2" } },
    font: { name: "Calibri", sz: 11, color: { rgb: "0F172A" } },
    border: borderThin,
    alignment: { horizontal: "center", vertical: "center" },
  };

  // Aplicar estilo no banner "INPUT PARAMETERS"
  for (let c = 0; c <= 1; c++) {
    const ref = XLSX.utils.encode_cell({ r: inputHeaderRowIndex, c });
    if (!worksheet[ref]) worksheet[ref] = { t: "s", v: "" };
    worksheet[ref].s = sectionHeaderStyle;
  }

  // Aplicar estilo nos parâmetros de entrada
  for (let r = 0; r < metadataRows.length; r++) {
    const rowIdx = inputHeaderRowIndex + 1 + r;
    const labelRef = XLSX.utils.encode_cell({ r: rowIdx, c: 0 });
    const valRef = XLSX.utils.encode_cell({ r: rowIdx, c: 1 });
    if (worksheet[labelRef]) worksheet[labelRef].s = inputLabelStyle;
    if (worksheet[valRef]) worksheet[valRef].s = inputValueStyle;
  }

  // Aplicar estilo no banner "SIMULATION RESULTS" (Azul Escuro em todas as colunas mescladas)
  for (let c = 0; c < numDataCols; c++) {
    const ref = XLSX.utils.encode_cell({ r: simHeaderRowIndex, c });
    if (!worksheet[ref]) worksheet[ref] = { t: "s", v: "" };
    worksheet[ref].s = sectionHeaderStyle;
  }

  // Aplicar estilo nas células de cabeçalho de coluna (Azul Médio)
  for (let c = 0; c < columns.length; c++) {
    const ref = XLSX.utils.encode_cell({ r: colHeadersRowIndex, c });
    if (worksheet[ref]) {
      worksheet[ref].s = colHeaderStyle;
    }
  }

  // 5. Estilização e Formatação Numérica nas Células de Dados
  const dataStartRowIndex = colHeadersRowIndex + 1;
  for (let r = 0; r < dataRows.length; r++) {
    const isEven = r % 2 === 0;
    const rowFillColor = isEven ? "FFFFFF" : "F4F7FB"; // zebra striping suave

    for (let c = 0; c < columns.length; c++) {
      const cellRef = XLSX.utils.encode_cell({ r: dataStartRowIndex + r, c });
      const cell = worksheet[cellRef];
      if (cell) {
        if (cell.t === 'n' && typeof cell.v === 'number') {
          const absVal = Math.abs(cell.v);
          if (absVal > 0 && (absVal < 0.001 || absVal >= 10000)) {
            cell.z = '0.0000E+00';
          } else if (Number.isInteger(cell.v)) {
            cell.z = '#,##0';
          } else {
            cell.z = '0.0000';
          }
        }

        cell.s = {
          fill: { fgColor: { rgb: rowFillColor } },
          font: { name: "Calibri", sz: 10.5, color: { rgb: "1F2937" } },
          alignment: { horizontal: columns[c].key === 'target' ? "center" : "right", vertical: "center" },
          border: borderThin,
        };
      }
    }
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `Curve_${curve.id}`.slice(0, 31));

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], { type: "application/octet-stream" });

  saveAs(blob, `curve_${curve.id}.xlsx`);
};

export default exportCurveAsVerticalTable;

// --- NOVAS FUNÇÕES PARA O MODO RADIAL ---

const COL_HEADER_STYLE = {
  fill: { fgColor: { rgb: "2F75B5" } },
  font: { name: "Calibri", sz: 11, bold: true, color: { rgb: "FFFFFF" } },
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
  border: {
    top: { style: "thin", color: { rgb: "B0C4DE" } },
    bottom: { style: "thin", color: { rgb: "B0C4DE" } },
    left: { style: "thin", color: { rgb: "B0C4DE" } },
    right: { style: "thin", color: { rgb: "B0C4DE" } },
  }
};

const DATA_CELL_STYLE = (isEven: boolean, highlighted: boolean = false) => {
  const rowFillColor = highlighted ? "FFF2CC" : (isEven ? "FFFFFF" : "F4F7FB");
  return {
    fill: { fgColor: { rgb: rowFillColor } },
    font: { name: "Calibri", sz: 10.5, color: { rgb: highlighted ? "000000" : "1F2937" }, bold: highlighted },
    alignment: { horizontal: "right", vertical: "center" },
    border: COL_HEADER_STYLE.border,
  };
};

function autoWidths(aoa: any[][]) {
  const colWidths: { wch: number }[] = [];
  for (let c = 0; c < 10; c++) { // arbitrary max cols
    let maxLen = 12;
    for (let r = 0; r < aoa.length; r++) {
      if (aoa[r] && aoa[r][c] != null) {
        const len = String(aoa[r][c]).length;
        if (len > maxLen) maxLen = Math.min(len, 38);
      }
    }
    if (maxLen > 0) colWidths.push({ wch: Math.max(maxLen + 4, 16) });
  }
  return colWidths;
}

function createSimulationSheet(curve: Curve) {
  const qPoints = curve.flowratePoints || [];
  const vPoints = curve.acidVolumePoints || [];
  
  // Calculate optimum (min volume)
  let minV = Infinity;
  let minIdx = -1;
  for (let i = 0; i < vPoints.length; i++) {
    const v = vPoints[i];
    if (v != null && v > 0 && v < minV) {
      minV = v;
      minIdx = i;
    }
  }

  const header = ["q [gal/(ft.min)]", "V [gal/ft]", "Nota"];
  const sheetAoA: any[][] = [header];
  
  for (let i = 0; i < Math.max(qPoints.length, vPoints.length); i++) {
    const isOpt = i === minIdx;
    sheetAoA.push([
      qPoints[i] ?? null,
      vPoints[i] ?? null,
      isOpt ? "q ótimo" : ""
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(sheetAoA);
  ws['!cols'] = autoWidths(sheetAoA);
  
  for (let R = 0; R < sheetAoA.length; R++) {
    const isHeader = R === 0;
    const isOpt = R - 1 === minIdx;
    for (let C = 0; C < sheetAoA[R].length; C++) {
      const ref = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[ref]) continue;
      ws[ref].s = isHeader ? COL_HEADER_STYLE : DATA_CELL_STYLE(R % 2 === 0, isOpt);
      if (typeof ws[ref].v === "number") ws[ref].z = "0.0000";
    }
  }
  return ws;
}

export const exportRadialSimulationTable = (curve: Curve) => {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, createSimulationSheet(curve), curve.targetLabel || "Sim");
  XLSX.writeFile(wb, `PVBtCalc_Radial_${curve.id}.xlsx`);
};

import { buildDesignTable, buildSkinTable } from "../components/columnsConfig";

function createDesignPlotSheet(designPlotData: any, payzoneThicknessFt: number | null | undefined, targetLength: number | null | undefined) {
  const { rows } = buildDesignTable(designPlotData, payzoneThicknessFt);
  
  // Design plot table yields: comprimento, q_opt, V_opt, tempo_bombeio, volume_total, temperatura
  const header = [
    "L [ft]", 
    "q_opt [gal/(ft.min)]", 
    "V_opt [gal/ft]", 
    "Tempo de bombeio [min]", 
    "Temperatura [K]",
    "Nota"
  ];
  const sheetAoA: any[][] = [header];
  
  let targetIdx = -1;
  let targetMissed = false;
  if (rows.length > 0 && targetLength != null) {
    const lastRow = rows[rows.length - 1];
    // Se o último L for < alvo - 1e-6, alvo não atingido
    if (lastRow.comprimento < targetLength - 1e-6) {
      targetMissed = true;
      targetIdx = rows.length - 1; // destacar a última linha
    } else {
      // achar o empate ou mais próximo
      let minDiff = Infinity;
      for (let i = 0; i < rows.length; i++) {
        const diff = Math.abs(rows[i].comprimento - targetLength);
        if (diff < minDiff) {
          minDiff = diff;
          targetIdx = i;
        }
      }
    }
  }

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const isTarget = i === targetIdx;
    let note = "";
    if (isTarget) {
      if (targetMissed && targetLength != null) {
        note = `Alvo ${targetLength.toFixed(2)} ft não atingido — tabela termina em ${r.comprimento.toFixed(2)} ft`;
      } else {
        note = "Alvo atingido";
      }
    }
    sheetAoA.push([
      r.comprimento ?? null,
      r.q_opt ?? null,
      r.V_opt ?? null,
      r.tempo_bombeio ?? null,
      r.temperatura ?? null,
      note
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(sheetAoA);
  ws['!cols'] = autoWidths(sheetAoA);

  for (let R = 0; R < sheetAoA.length; R++) {
    const isHeader = R === 0;
    const isTarget = R - 1 === targetIdx;
    for (let C = 0; C < sheetAoA[R].length; C++) {
      const ref = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[ref]) continue;
      ws[ref].s = isHeader ? COL_HEADER_STYLE : DATA_CELL_STYLE(R % 2 === 0, isTarget);
      if (typeof ws[ref].v === "number") ws[ref].z = "0.0000";
    }
  }
  return ws;
}

export const exportRadialDesignPlotTable = (designPlotData: any, payzoneThicknessFt: number | null | undefined, targetLength: number | null | undefined) => {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, createDesignPlotSheet(designPlotData, payzoneThicknessFt, targetLength), "Design Plot");
  XLSX.writeFile(wb, `PVBtCalc_Radial_Design.xlsx`);
};

function createSkinSheet(skinEvolutionData: any, targetSkin: number | null | undefined) {
  const { rows } = buildSkinTable(skinEvolutionData);
  // rows has: V_A, skin, comprimento, q0
  
  const header = [
    "V [gal/ft]", 
    "Skin", 
    "Flowrate [bbl/min]",
    "Wormhole length [ft]",
    "Nota"
  ];
  const sheetAoA: any[][] = [header];
  
  // Highlight target skin per flowrate, or final point if no target
  const flowrates = Array.from(new Set(rows.map(r => r.q0)));
  const highlightIndices = new Set<number>();
  
  for (const q of flowrates) {
    const qRows = rows.map((r, i) => ({r, i})).filter(x => x.r.q0 === q);
    if (qRows.length === 0) continue;
    
    let targetIdx = qRows[qRows.length - 1].i; // default to last
    if (targetSkin != null) {
      let minDiff = Infinity;
      for (const item of qRows) {
        const diff = Math.abs(item.r.skin - targetSkin);
        if (diff < minDiff) {
          minDiff = diff;
          targetIdx = item.i;
        }
      }
    }
    highlightIndices.add(targetIdx);
  }

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const isTarget = highlightIndices.has(i);
    let note = "";
    if (isTarget) {
      if (targetSkin != null) {
        note = `Skin alvo (mais próximo de ${targetSkin})`;
      } else {
        note = "Skin final";
      }
    }
    sheetAoA.push([
      r.V_A ?? null,
      r.skin ?? null,
      r.q0 ?? null,
      r.comprimento ?? null,
      note
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(sheetAoA);
  ws['!cols'] = autoWidths(sheetAoA);

  for (let R = 0; R < sheetAoA.length; R++) {
    const isHeader = R === 0;
    const isTarget = highlightIndices.has(R - 1);
    for (let C = 0; C < sheetAoA[R].length; C++) {
      const ref = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[ref]) continue;
      ws[ref].s = isHeader ? COL_HEADER_STYLE : DATA_CELL_STYLE(R % 2 === 0, isTarget);
      if (typeof ws[ref].v === "number") ws[ref].z = "0.0000";
    }
  }
  return ws;
}

export const exportRadialSkinTable = (skinEvolutionData: any, targetSkin: number | null | undefined) => {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, createSkinSheet(skinEvolutionData, targetSkin), "Skin");
  XLSX.writeFile(wb, `PVBtCalc_Radial_Skin.xlsx`);
};

export const exportRadialAll = (
  radialState: any, 
  curves: Curve[], 
  targetLength: number | null | undefined, 
  targetSkin: number | null | undefined
) => {
  const wb = XLSX.utils.book_new();
  
  // 1. Inputs Sheet
  const inputsAoA: any[][] = [
    ["INPUT PARAMETERS", ""],
  ];
  
  const baseCurve = curves[0];
  if (baseCurve) {
    // Add same metadata as buildMetadataRows but adjusted
    inputsAoA.push(['Flow Regime', 'radial']);
    inputsAoA.push(['Rock Type', baseCurve.rock || '']);
    inputsAoA.push(['Acid Type', baseCurve.acid || '']);
    inputsAoA.push(['Acid Concentration (w/w)', baseCurve.concentration ?? '']);
    inputsAoA.push(['Porosity', baseCurve.porosity ?? '']);
    
    if (baseCurve.temperature != null) {
      let tempC = baseCurve.temperature < 100 ? baseCurve.temperature : Number((baseCurve.temperature - 273.15).toFixed(2));
      let tempK = baseCurve.temperature >= 100 ? baseCurve.temperature : Number((baseCurve.temperature + 273.15).toFixed(2));
      inputsAoA.push(['Temperature (°C)', tempC]);
      inputsAoA.push(['Temperature (K)', tempK]);
    }
    
    inputsAoA.push(['Wellbore Mode', radialState.wellboreMode || 'diameter']);
    if (baseCurve.wellboreRadiusIn != null) inputsAoA.push(['Wellbore Radius (in)', baseCurve.wellboreRadiusIn]);
    if (baseCurve.payzoneThicknessFt != null) inputsAoA.push(['Payzone Thickness (ft)', baseCurve.payzoneThicknessFt]);
    
    // Flowing fraction logic
    const fVal = baseCurve.metadata?.f;
    inputsAoA.push(['Flowing Fraction (f)', fVal != null ? fVal : 'não disponível']);
  }
  
  const wsInputs = XLSX.utils.aoa_to_sheet(inputsAoA);
  wsInputs['!cols'] = autoWidths(inputsAoA);
  // Style inputs
  wsInputs['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
  const sectionHeaderStyle = { fill: { fgColor: { rgb: "1F4E78" } }, font: { name: "Calibri", sz: 12, bold: true, color: { rgb: "FFFFFF" } }, alignment: { horizontal: "center", vertical: "center" } };
  const inputLabelStyle = { font: { name: "Calibri", sz: 11, bold: true, color: { rgb: "1F2937" } }, border: COL_HEADER_STYLE.border, alignment: { horizontal: "left", vertical: "center" } };
  const inputValueStyle = { fill: { fgColor: { rgb: "D9E1F2" } }, font: { name: "Calibri", sz: 11, color: { rgb: "0F172A" } }, border: COL_HEADER_STYLE.border, alignment: { horizontal: "center", vertical: "center" } };
  for (let c = 0; c <= 1; c++) {
    const ref = XLSX.utils.encode_cell({ r: 0, c });
    if (!wsInputs[ref]) wsInputs[ref] = { t: "s", v: "" };
    wsInputs[ref].s = sectionHeaderStyle;
  }
  for (let r = 1; r < inputsAoA.length; r++) {
    const lRef = XLSX.utils.encode_cell({ r, c: 0 });
    const vRef = XLSX.utils.encode_cell({ r, c: 1 });
    if (wsInputs[lRef]) wsInputs[lRef].s = inputLabelStyle;
    if (wsInputs[vRef]) wsInputs[vRef].s = inputValueStyle;
  }
  
  XLSX.utils.book_append_sheet(wb, wsInputs, "Inputs");
  
  // 2. Simulation Sheets (one per curve)
  for (const c of curves) {
    if (c.flowRegime === 'radial') {
      const wsSim = createSimulationSheet(c);
      XLSX.utils.book_append_sheet(wb, wsSim, (c.targetLabel || c.id || "Sim").slice(0, 31));
    }
  }
  
  // 3. Design Plot Sheet
  if (radialState.designPlotData?.series?.length > 0) {
    const wsDesign = createDesignPlotSheet(radialState.designPlotData, radialState.payzoneThickness, targetLength);
    XLSX.utils.book_append_sheet(wb, wsDesign, "Design Plot");
  }
  
  // 4. Skin Evolution Sheet
  if (radialState.skinEvolutionData && Object.keys(radialState.skinEvolutionData).length > 0) {
    const wsSkin = createSkinSheet(radialState.skinEvolutionData, targetSkin);
    XLSX.utils.book_append_sheet(wb, wsSkin, "Skin Evolution");
  }
  
  const curveIds = curves.map(c => c.id).join("-");
  const dateStr = new Date().toISOString().split("T")[0];
  XLSX.writeFile(wb, `PVBtCalc_Radial_${curveIds}_${dateStr}.xlsx`);
};
