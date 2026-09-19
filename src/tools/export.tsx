import XLSX from "xlsx-js-style";
import { saveAs } from "file-saver";
import { unzipSync, zipSync, strFromU8, strToU8 } from "fflate";
import { Curve } from "../redux/storageresults/slice";
import { buildSimulationTable, buildDesignTable, buildSkinTable } from "../components/columnsConfig";
import { readValidity } from "./validityWindow";

/**
 * export.tsx
 * ------------------------------------------------------------------
 * Reusa buildSimulationTable/buildDesignTable/buildSkinTable (columnsConfig.ts)
 * -- a MESMA fonte que as tabelas do painel 05 usam -- em vez de serializar o
 * objeto Redux cru. Isso e o que mantem tabela e export sincronizados por
 * construcao: key le o valor, label+unit vira o cabecalho, a ordem do
 * array vira a ordem das colunas.
 *
 * Estilos e Cores na Planilha Excel:
 * - Cabeçalhos de Seção ("INPUT PARAMETERS"):
 *   Fundo Azul Escuro (1F4E78), fonte branca em negrito, centralizado.
 * - Cabeçalhos de Coluna:
 *   Fundo Azul Médio (2F75B5), fonte branca em negrito, centralizado.
 * - Linha destacada (alvo / mínimo / skin final):
 *   fundo amarelo claro (FFF2CC) + negrito. Linhas comuns NAO tem fill.
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

export const buildVerticalTableSheet = (curve: Curve) => {
  const { columns, rows, isHighlighted } = buildSimulationTable(curve);

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
    const isRowHighlighted = isHighlighted ? isHighlighted(rows[r], r) : false;
    const rowFillColor = isRowHighlighted ? "FFF2CC" : (isEven ? "FFFFFF" : "F4F7FB");

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
          font: {
            name: "Calibri",
            sz: 10.5,
            bold: isRowHighlighted,
            color: { rgb: isRowHighlighted ? "000000" : "1F2937" },
          },
          alignment: { horizontal: columns[c].key === 'target' ? "center" : "right", vertical: "center" },
          border: borderThin,
        };
      }
    }
  }

  return worksheet;
};

export const exportCurveAsVerticalTable = (curve: Curve) => {
  const worksheet = buildVerticalTableSheet(curve);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `Curve_${curve.id}`.slice(0, 31));

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], { type: "application/octet-stream" });

  saveAs(blob, `curve_${curve.id}.xlsx`);
};

export default exportCurveAsVerticalTable;

// --- NOVAS FUNÇÕES PARA O MODO RADIAL ---

const BORDER_THIN = {
  top: { style: "thin", color: { rgb: "B0C4DE" } },
  bottom: { style: "thin", color: { rgb: "B0C4DE" } },
  left: { style: "thin", color: { rgb: "B0C4DE" } },
  right: { style: "thin", color: { rgb: "B0C4DE" } },
};

const COL_HEADER_STYLE = {
  fill: { fgColor: { rgb: "2F75B5" } },
  font: { name: "Calibri", sz: 11, bold: true, color: { rgb: "FFFFFF" } },
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
  border: BORDER_THIN,
};

const SECTION_HEADER_STYLE = {
  fill: { fgColor: { rgb: "1F4E78" } },
  font: { name: "Calibri", sz: 12, bold: true, color: { rgb: "FFFFFF" } },
  alignment: { horizontal: "center", vertical: "center" },
};

const INPUT_LABEL_STYLE = {
  font: { name: "Calibri", sz: 11, bold: true, color: { rgb: "1F2937" } },
  border: BORDER_THIN,
  alignment: { horizontal: "left", vertical: "center" },
};

const INPUT_VALUE_STYLE = {
  fill: { fgColor: { rgb: "D9E1F2" } },
  font: { name: "Calibri", sz: 11, color: { rgb: "0F172A" } },
  border: BORDER_THIN,
  alignment: { horizontal: "center", vertical: "center" },
};

// Item 5: linhas comuns SEM fill -- so cabecalho e linha destacada tem cor de
// fundo. `highlighted` e a UNICA condicao que injeta fill/bold nas celulas de
// dados (mantém o antigo zebra-striping fora, por pedido explicito).
function dataCellStyle(highlighted: boolean) {
  const base: Record<string, any> = {
    font: { name: "Calibri", sz: 10.5, color: { rgb: highlighted ? "000000" : "1F2937" }, bold: highlighted },
    alignment: { horizontal: "right", vertical: "center" },
    border: BORDER_THIN,
  };
  if (highlighted) base.fill = { fgColor: { rgb: "FFF2CC" } };
  return base;
}

// Item 5: formato por COLUNA (nao por celula) -- decide olhando todos os
// valores nao-nulos da coluna: se algum estoura [0.001, 1e5) vira notacao
// cientifica pra coluna inteira (V_A/tbt grandes, velocidades pequenas nunca
// ficam ilegiveis arredondados a 4 casas fixas); senao fica em 0.0000.
function pickNumberFormat(values: number[]): string {
  const nonZero = values.filter((v) => typeof v === 'number' && Number.isFinite(v) && v !== 0);
  if (nonZero.length === 0) return '0.0000';
  const needsSci = nonZero.some((v) => {
    const a = Math.abs(v);
    return a < 0.001 || a >= 1e5;
  });
  return needsSci ? '0.000E+00' : '0.0000';
}

// Item 5: largura ajustada ao cabecalho (linha 0 sempre entra no scan) --
// tambem cobre a coluna "Nota", cujo texto costuma ser mais longo que
// qualquer header.
function autoWidths(aoa: (string | number | null)[][]): { wch: number }[] {
  const ncols = aoa.reduce((max, r) => Math.max(max, r.length), 0);
  const widths: { wch: number }[] = [];
  for (let c = 0; c < ncols; c++) {
    let maxLen = 8;
    for (let r = 0; r < aoa.length; r++) {
      const v = aoa[r]?.[c];
      if (v != null) maxLen = Math.max(maxLen, String(v).length);
    }
    widths.push({ wch: Math.min(maxLen + 3, 60) });
  }
  return widths;
}

// Campos numericos da aba Inputs podem chegar como STRING vinda direto do
// Redux: <input type="number"> e <input type="range"> entregam e.target.value
// (string) no onChange, e alguns reducers (setup/slice.tsx setParameter, ex.:
// minimum_flowrate/flowrate/step_numbers) gravam esse valor sem Number() --
// aoa_to_sheet tipa a celula pelo typeof do JS, entao uma string aqui vira
// celula de TEXTO no Excel ("0.1" alinhado a esquerda, sem == numerico) em
// vez de numero. Forca Number() na hora de montar a linha, sem depender de
// consertar cada reducer/input a montante.
function asNumberCell(v: unknown): number | string {
  if (v == null) return '';
  const n = Number(v);
  return Number.isFinite(n) ? n : String(v);
}

// Nomes de aba nao podem ter : \ / ? * [ ] nem passar de 31 caracteres.
function sanitizeSheetName(name: string): string {
  return name.replace(/[:\\/?*[\]]/g, '').slice(0, 31);
}

function dedupeSheetName(name: string, used: Set<string>): string {
  let candidate = name;
  let n = 2;
  while (used.has(candidate)) {
    const suffix = ` ${n}`;
    candidate = name.slice(0, 31 - suffix.length) + suffix;
    n++;
  }
  used.add(candidate);
  return candidate;
}

/**
 * Monta uma aba "simples" (1 linha de cabecalho + linhas de dados, sem
 * banner/merge) com formatacao por coluna e destaque de linha -- usado por
 * Simulation, Design Plot e Skin (cada uma so difere na montagem do AoA).
 * numericColRange = [colInicial, colFinal] (inclusive) das colunas que
 * recebem formato numerico; colunas fora do range (ex.: "Nota") ficam texto.
 */
function finalizeSheet(
  sheetAoA: (string | number | null)[][],
  highlightRows: Set<number>,
  numericColRange: [number, number]
) {
  const ws = XLSX.utils.aoa_to_sheet(sheetAoA);
  ws['!cols'] = autoWidths(sheetAoA);

  const formats: string[] = [];
  for (let c = numericColRange[0]; c <= numericColRange[1]; c++) {
    const colValues = sheetAoA
      .slice(1)
      .map((r) => r[c])
      .filter((v): v is number => typeof v === 'number');
    formats[c] = pickNumberFormat(colValues);
  }

  for (let r = 0; r < sheetAoA.length; r++) {
    const isHeader = r === 0;
    const isHighlighted = !isHeader && highlightRows.has(r - 1);
    for (let c = 0; c < sheetAoA[r].length; c++) {
      const ref = XLSX.utils.encode_cell({ r, c });
      const cell = ws[ref];
      if (!cell) continue;
      if (isHeader) {
        cell.s = COL_HEADER_STYLE;
      } else {
        cell.s = dataCellStyle(isHighlighted);
        if (typeof cell.v === 'number' && c >= numericColRange[0] && c <= numericColRange[1]) {
          cell.z = formats[c];
        }
      }
    }
  }
  return ws;
}

// Item 5: congela a linha de cabecalho em TODAS as abas do arquivo. A versao
// instalada de xlsx-js-style (1.2.0) nao escreve panes/freeze no writer
// (confirmado inspecionando o XML gerado) -- entao pos-processamos o zip
// (xlsx e um .zip OOXML) injetando <pane .../> em cada xl/worksheets/sheetN.xml
// antes de salvar. Puramente cosmetico: se o patch falhar por qualquer razao,
// devolve o buffer original sem congelar em vez de quebrar o export.
function applyHeaderFreeze(buf: ArrayBuffer | Uint8Array): Uint8Array {
  try {
    const input = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    const files = unzipSync(input);
    const paneXml = '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A2" sqref="A2"/>';
    for (const path of Object.keys(files)) {
      if (!/^xl\/worksheets\/sheet\d+\.xml$/.test(path)) continue;
      let xml = strFromU8(files[path]);
      if (xml.includes('<pane ')) continue;
      if (/<sheetView([^>]*)\/>/.test(xml)) {
        xml = xml.replace(/<sheetView([^>]*)\/>/, `<sheetView$1>${paneXml}</sheetView>`);
      } else {
        xml = xml.replace(/(<sheetView[^>]*>)/, `$1${paneXml}`);
      }
      files[path] = strToU8(xml);
    }
    return zipSync(files, { level: 0 });
  } catch {
    return buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  }
}

function saveWorkbook(wb: XLSX.WorkBook, filename: string) {
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  const frozen = applyHeaderFreeze(buf);
  const blob = new Blob([frozen], { type: "application/octet-stream" });
  saveAs(blob, filename);
}

const SIM_HEADER = ["q0 [gal/(ft.min)]", "V_A [gal/ft]", "iv [m/s]", "wv [m/s]", "dv [m/s]", "1/Da", "tbt [s]", "Nota"];

// Item 1: uma aba por alvo, colunas na ordem do export antigo por curva.
// Destaca a linha do menor V_A; se ela for a primeira/ultima (borda da faixa
// simulada), a nota cita o q_opt que ja vem pronto em curve.metadata (Fase 6) --
// nunca recalculado aqui.
function createSimulationSheet(curve: Curve) {
  const { rows } = buildSimulationTable(curve);

  let minIdx = -1;
  let minV = Infinity;
  rows.forEach((r, i) => {
    const v = r.V_A;
    if (v != null && v > 0 && v < minV) {
      minV = v;
      minIdx = i;
    }
  });
  const isBorder = minIdx === 0 || minIdx === rows.length - 1;
  const validity = readValidity(curve.metadata);
  const qOptStr = validity ? validity.qOpt.toFixed(4) : null;

  const sheetAoA: (string | number | null)[][] = [SIM_HEADER];
  rows.forEach((r, i) => {
    let note = "";
    if (i === minIdx) {
      if (isBorder) {
        note = qOptStr != null
          ? `Mínimo na borda da faixa simulada; q_opt = ${qOptStr} gal/(ft·min)`
          : `Mínimo na borda da faixa simulada`;
      } else {
        note = qOptStr != null
          ? `V_A mínimo desta simulação; q_opt = ${qOptStr} gal/(ft·min)`
          : `V_A mínimo desta simulação`;
      }
    }
    sheetAoA.push([r.q0 ?? null, r.V_A ?? null, r.iv ?? null, r.wv ?? null, r.dv ?? null, r.invDa ?? null, r.tbt ?? null, note]);
  });

  const highlightRows = new Set<number>(minIdx >= 0 ? [minIdx] : []);
  return finalizeSheet(sheetAoA, highlightRows, [0, 6]);
}

function simulationSheetName(curve: Curve): string {
  return sanitizeSheetName(`Sim ${curve.targetLabel ?? curve.target ?? ''}`);
}

function appendSimulationSheets(wb: XLSX.WorkBook, curves: Curve[]) {
  const used = new Set<string>();
  for (const c of curves) {
    if (c.flowRegime !== 'radial') continue;
    const ws = createSimulationSheet(c);
    const name = dedupeSheetName(simulationSheetName(c), used);
    XLSX.utils.book_append_sheet(wb, ws, name);
  }
}

export const exportRadialSimulationTable = (curve: Curve) => {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, createSimulationSheet(curve), simulationSheetName(curve));
  saveWorkbook(wb, `PVBtCalc_Radial_${curve.id}.xlsx`);
};

// Item 1 (botao "Export Chart Data"): TODAS as abas "Sim ... ft" num unico
// arquivo -- antes cada curva baixava um arquivo separado.
export const exportRadialSimulationAll = (curves: Curve[], simulationId?: string) => {
  const wb = XLSX.utils.book_new();
  appendSimulationSheets(wb, curves);
  const dateStr = new Date().toISOString().split("T")[0];
  saveWorkbook(wb, `PVBtCalc_Radial_${simulationId || '---'}_Simulation_${dateStr}.xlsx`);
};

const DESIGN_HEADER = ["L [ft]", "q_opt [gal/(ft.min)]", "V_opt [gal/ft]", "tbt [min]", "Temperatura [K]", "Nota"];

// "5" para alvo inteiro, "7.50" trimado para "7.5" -- os alvos configurados
// pelo usuario (radial.targetsLambda) sao tipicamente inteiros; nunca forcar
// 2 casas decimais aqui (ficaria "Alvo 5.00 ft", que o pedido nao quer).
function fmtTarget(t: number): string {
  if (Number.isInteger(t)) return String(t);
  return t.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

// "5 e 10", "10, 15 e 20" -- lista em portugues (virgula entre itens, "e"
// antes do ultimo) para a nota de multiplos alvos nao atingidos.
function joinPt(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} e ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`;
}

// Item 3 (revisado): uma aba por temperatura, com TODOS os alvos configurados
// (radial.targetsLambda -- nao so o primeiro) destacados nessa mesma aba.
// Design Plot varre L continuamente (buildDesignTable ja devolve `temperatura`
// por linha, so agrupamos por ela); halfStep = metade do passo da grade dessa
// temperatura, usado como tolerancia pra decidir se um alvo "bate" numa linha
// (a grade e por temperatura -- cada uma pode ter um numero de pontos
// diferente, ate por causa do corte em 1000 gal/ft). Alvos que caem depois do
// ultimo L viram UMA nota so na ultima linha, listando todos.
function appendDesignPlotSheets(
  wb: XLSX.WorkBook,
  designPlotData: any,
  payzoneThicknessFt: number | null | undefined,
  targets: (number | null | undefined)[] | null | undefined
) {
  const { rows } = buildDesignTable(designPlotData, payzoneThicknessFt);
  if (rows.length === 0) return;

  const cleanTargets = (targets || []).filter((t): t is number => t != null && Number.isFinite(t));

  const byTemp = new Map<number, typeof rows>();
  for (const r of rows) {
    const key = r.temperatura;
    if (!byTemp.has(key)) byTemp.set(key, []);
    byTemp.get(key)!.push(r);
  }

  const used = new Set<string>();
  const temps = Array.from(byTemp.keys()).sort((a, b) => a - b);
  for (const tempK of temps) {
    const tempRows = byTemp.get(tempK)!.slice().sort((a, b) => a.comprimento - b.comprimento);
    const lastComprimento = tempRows[tempRows.length - 1].comprimento;
    const halfStep = tempRows.length > 1
      ? (lastComprimento - tempRows[0].comprimento) / (tempRows.length - 1) / 2
      : Infinity;

    const notesByRow = new Map<number, string[]>();
    const highlightRows = new Set<number>();
    const missedTargets: number[] = [];

    for (const t of cleanTargets) {
      let idx = -1;
      let minDiff = Infinity;
      tempRows.forEach((r, i) => {
        const diff = Math.abs(r.comprimento - t);
        if (diff < minDiff) {
          minDiff = diff;
          idx = i;
        }
      });
      if (idx >= 0 && minDiff <= halfStep) {
        highlightRows.add(idx);
        const list = notesByRow.get(idx) ?? [];
        list.push(`Alvo ${fmtTarget(t)} ft (L = ${tempRows[idx].comprimento.toFixed(2)} ft)`);
        notesByRow.set(idx, list);
      } else if (t > lastComprimento) {
        missedTargets.push(t);
      }
    }

    if (missedTargets.length > 0) {
      const lastIdx = tempRows.length - 1;
      highlightRows.add(lastIdx);
      const label = missedTargets.length === 1 ? 'Alvo' : 'Alvos';
      const verb = missedTargets.length === 1 ? 'não atingido' : 'não atingidos';
      const list = notesByRow.get(lastIdx) ?? [];
      list.push(`${label} ${joinPt(missedTargets.map(fmtTarget))} ft ${verb} — tabela termina em ${lastComprimento.toFixed(2)} ft (limite 1000 gal/ft)`);
      notesByRow.set(lastIdx, list);
    }

    const sheetAoA: (string | number | null)[][] = [DESIGN_HEADER];
    tempRows.forEach((r, i) => {
      const note = (notesByRow.get(i) ?? []).join('; ');
      sheetAoA.push([r.comprimento ?? null, r.q_opt ?? null, r.V_opt ?? null, r.tbt_min ?? null, r.temperatura ?? null, note]);
    });

    const ws = finalizeSheet(sheetAoA, highlightRows, [0, 4]);
    const name = dedupeSheetName(sanitizeSheetName(`Design ${Math.round(tempK)} K`), used);
    XLSX.utils.book_append_sheet(wb, ws, name);
  }
}

export const exportRadialDesignPlotTable = (
  designPlotData: any,
  payzoneThicknessFt: number | null | undefined,
  targets: (number | null | undefined)[] | null | undefined
) => {
  const wb = XLSX.utils.book_new();
  appendDesignPlotSheets(wb, designPlotData, payzoneThicknessFt, targets);
  const dateStr = new Date().toISOString().split("T")[0];
  saveWorkbook(wb, `PVBtCalc_Radial_Design_${dateStr}.xlsx`);
};

const SKIN_HEADER = ["V_A [gal/ft]", "skin", "comprimento [ft]", "Nota"];

// Item 4: uma aba por vazao de "Flowrates to compare" -- q0 sai das colunas
// (agora e a identidade da aba, nao precisa repetir por linha).
function appendSkinSheets(
  wb: XLSX.WorkBook,
  skinEvolutionData: Record<string, { x: number; y: number; l_ft: number }[]>,
  targetSkin: number | null | undefined
) {
  const { rows } = buildSkinTable(skinEvolutionData);
  if (rows.length === 0) return;

  const byQ = new Map<number, typeof rows>();
  for (const r of rows) {
    if (!byQ.has(r.q0)) byQ.set(r.q0, []);
    byQ.get(r.q0)!.push(r);
  }

  const used = new Set<string>();
  const flowrates = Array.from(byQ.keys()).sort((a, b) => a - b);
  for (const q0 of flowrates) {
    const qRows = byQ.get(q0)!;

    let targetIdx = qRows.length - 1; // sem alvo -> skin final (ultimo ponto)
    if (targetSkin != null) {
      let minDiff = Infinity;
      qRows.forEach((r, i) => {
        const diff = Math.abs(r.skin - targetSkin);
        if (diff < minDiff) {
          minDiff = diff;
          targetIdx = i;
        }
      });
    }

    const sheetAoA: (string | number | null)[][] = [SKIN_HEADER];
    qRows.forEach((r, i) => {
      const note = i === targetIdx
        ? (targetSkin != null ? `Skin alvo (mais próximo de ${targetSkin})` : "Skin final")
        : "";
      sheetAoA.push([r.V_A ?? null, r.skin ?? null, r.comprimento ?? null, note]);
    });

    const highlightRows = new Set<number>([targetIdx]);
    const ws = finalizeSheet(sheetAoA, highlightRows, [0, 2]);
    const name = dedupeSheetName(sanitizeSheetName(`Skin ${q0} bbl-min`), used);
    XLSX.utils.book_append_sheet(wb, ws, name);
  }
}

export const exportRadialSkinTable = (
  skinEvolutionData: Record<string, { x: number; y: number; l_ft: number }[]>,
  targetSkin: number | null | undefined
) => {
  const wb = XLSX.utils.book_new();
  appendSkinSheets(wb, skinEvolutionData, targetSkin);
  const dateStr = new Date().toISOString().split("T")[0];
  saveWorkbook(wb, `PVBtCalc_Radial_Skin_${dateStr}.xlsx`);
};

// Item 2: Inputs completo. `curves` aqui DEVE vir de state.resultCurves (as
// mesmas curvas camelCase que alimentam a tabela Simulation/Analysis) --
// nunca radial.curves cru (RadialCurveResult, chaves snake_case), que e o que
// deixava rock/acid/concentration/porosity vazios antes desta correcao.
function buildRadialInputsRows(curves: Curve[], radialState: any, simulationId: string): (string | number)[][] {
  const rows: (string | number)[][] = [];
  rows.push(['Simulation ID', simulationId || '—']);
  rows.push(['Flow Regime', 'radial']);

  const baseCurve = curves[0];
  if (!baseCurve) return rows;

  rows.push(['Rock Type', baseCurve.rock ?? '']);
  rows.push(['Acid Type', baseCurve.acid ?? '']);
  if (baseCurve.concentration != null) rows.push(['Acid Concentration (w/w)', asNumberCell(baseCurve.concentration)]);
  if (baseCurve.porosity != null) rows.push(['Porosity', asNumberCell(baseCurve.porosity)]);

  const rawTemp = baseCurve.temperature != null ? Number(baseCurve.temperature) : null;
  if (rawTemp != null && Number.isFinite(rawTemp)) {
    // Curva radial sempre guarda Kelvin (SimuCard.tsx dispatcha radialTemperatureK,
    // nunca o `temperature` do setup linear) -- mas mantem a mesma checagem
    // defensiva do buildMetadataRows caso essa convencao mude.
    const tempK = rawTemp >= 100 ? rawTemp : Number((rawTemp + 273.15).toFixed(2));
    const tempC = rawTemp >= 100 ? Number((rawTemp - 273.15).toFixed(2)) : rawTemp;
    rows.push(['Temperature (K)', tempK]);
    rows.push(['Temperature (°C)', tempC]);
  }

  const wellboreMode = radialState?.wellboreSizeMode ?? 'diameter';
  if (radialState?.wellboreSize != null) {
    rows.push([`Wellbore Size (in) [${wellboreMode}]`, asNumberCell(radialState.wellboreSize)]);
  }
  if (baseCurve.wellboreRadiusIn != null) rows.push(['Wellbore Radius (in)', asNumberCell(baseCurve.wellboreRadiusIn)]);
  if (baseCurve.payzoneThicknessFt != null) rows.push(['Payzone Thickness (ft)', asNumberCell(baseCurve.payzoneThicknessFt)]);

  // lastRunSetup: snapshot do setup no momento do Calculate (setLastRunState,
  // SimuCard.tsx) -- fonte mais confiavel que o setup "ao vivo", que pode ter
  // sido editado depois do run sem recalcular. minimum_flowrate/flowrate/
  // step_numbers em particular chegam como STRING quando o usuario mexeu
  // nesses campos (setup/slice.tsx setParameter grava e.target.value cru) --
  // por isso passam por asNumberCell, nao so um valor direto.
  const lastRunSetup = radialState?.lastRunSetup;
  if (lastRunSetup?.minimum_flowrate != null) rows.push(['Flowrate Sweep Min (bbl/min)', asNumberCell(lastRunSetup.minimum_flowrate)]);
  if (lastRunSetup?.flowrate != null) rows.push(['Flowrate Sweep Max (bbl/min)', asNumberCell(lastRunSetup.flowrate)]);

  const allQ = curves.flatMap((c) => c.flowratePoints || []).filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  if (allQ.length > 0) {
    rows.push(['Flowrate Sweep Min (gal/(ft.min))', Math.min(...allQ)]);
    rows.push(['Flowrate Sweep Max (gal/(ft.min))', Math.max(...allQ)]);
  }

  if (lastRunSetup?.step_numbers != null) rows.push(['Number of steps', asNumberCell(lastRunSetup.step_numbers)]);

  const targets = curves.map((c) => c.targetLabel).filter(Boolean).join(', ');
  rows.push(['Targets', targets || '—']);

  const fVal = baseCurve.flowingFraction;
  if (fVal == null && import.meta.env.DEV) {
    console.warn('export.tsx: Flowing Fraction (f) indisponivel para esta curva -- baseCurve.flowingFraction e null/undefined (curva salva antes desta chave existir?)');
  }
  rows.push(['Flowing Fraction (f)', fVal != null ? asNumberCell(fVal) : 'não disponível']);

  return rows;
}

function buildInputsSheet(curves: Curve[], radialState: any, simulationId: string) {
  const rows = buildRadialInputsRows(curves, radialState, simulationId);
  const aoa: (string | number)[][] = [["INPUT PARAMETERS", ""], ...rows];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = autoWidths(aoa);
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];

  for (let c = 0; c <= 1; c++) {
    const ref = XLSX.utils.encode_cell({ r: 0, c });
    if (!ws[ref]) ws[ref] = { t: "s", v: "" };
    ws[ref].s = SECTION_HEADER_STYLE;
  }
  for (let r = 1; r < aoa.length; r++) {
    const lRef = XLSX.utils.encode_cell({ r, c: 0 });
    const vRef = XLSX.utils.encode_cell({ r, c: 1 });
    if (ws[lRef]) ws[lRef].s = INPUT_LABEL_STYLE;
    if (ws[vRef]) ws[vRef].s = INPUT_VALUE_STYLE;
  }
  return ws;
}

// Item 2 + ordem das abas (Inputs | Design | Sim | Skin). `curves` deve ser o
// subconjunto de state.resultCurves.curves do run radial atual (flowRegime
// radial + id do run atual) -- ver Chart.tsx.
export const exportRadialAll = (
  radialState: any,
  curves: Curve[],
  targetLengths: (number | null | undefined)[] | null | undefined,
  targetSkin: number | null | undefined,
  simulationId?: string
) => {
  const wb = XLSX.utils.book_new();
  const simId = simulationId || radialState?.lastRunSetup?.id || curves[0]?.id?.split(' · ')[0] || '';

  XLSX.utils.book_append_sheet(wb, buildInputsSheet(curves, radialState, simId), "Inputs");

  if (radialState?.designPlotData?.series?.length > 0) {
    appendDesignPlotSheets(wb, radialState.designPlotData, radialState.payzoneThickness, targetLengths);
  }

  appendSimulationSheets(wb, curves);

  if (radialState?.skinEvolutionData && Object.keys(radialState.skinEvolutionData).length > 0) {
    appendSkinSheets(wb, radialState.skinEvolutionData, targetSkin);
  }

  const dateStr = new Date().toISOString().split("T")[0];
  saveWorkbook(wb, `PVBtCalc_Radial_${simId || '---'}_${dateStr}.xlsx`);
};
