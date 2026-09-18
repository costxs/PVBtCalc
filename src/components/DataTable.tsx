import { ReactNode } from "react";

/**
 * DataTable.tsx (Fase 8)
 * ------------------------------------------------------------------
 * UNICO componente de tabela do painel 05 -- consumido por todas as abas
 * (Simulation/Analysis, Skin Evolution, Design Plot). A ordem das colunas
 * vem de `columns`, NUNCA de Object.keys() de um objeto de dados: cada aba
 * monta seu proprio columnsConfig (ver Results.tsx), o componente so itera
 * sobre ele. Isso elimina a fragilidade de a ordem da tabela depender de
 * como o objeto foi montado no backend/no reducer.
 */
export interface ColumnConfig {
  key: string; // chave de acesso em cada row
  label: string; // titulo exibido no cabecalho
  unit?: string; // unidade, exibida junto do label como "label (unit)"
  description?: string; // tooltip (title) do cabecalho/celula; opcional
  format?: (v: any) => string; // formatacao por coluna; default abaixo se omitido
}

export interface DataTableProps {
  columns: ColumnConfig[];
  rows: Record<string, any>[];
  // Coluna que recebe o marcador de severidade (Fase 4, radial); so a
  // Simulation Chart usa isto hoje -- Skin/Design nao passam esta prop.
  markerColumnKey?: string;
  renderMarker?: (row: Record<string, any>, rowIndex: number) => ReactNode;
  // Linha em destaque (ex.: otimo PVBt/volume). Sem uso em Skin/Design.
  isHighlighted?: (row: Record<string, any>, rowIndex: number) => boolean;
}

// Mesma regra adaptativa que a tabela ja usava antes da Fase 8 (Results.tsx
// getFormattedVal): notacao cientifica fora de [0.01, 1000], 3 casas dentro.
const defaultFormat = (val: any): string => {
  if (val == null) return "-";
  if (typeof val !== "number") return String(val);
  const absVal = Math.abs(val);
  if ((absVal < 0.01 && absVal > 0) || absVal > 1000) return val.toExponential(2);
  if (val !== 0) return val.toFixed(3);
  return String(val);
};

export default function DataTable({ columns, rows, markerColumnKey, renderMarker, isHighlighted }: DataTableProps) {
  // Guard dev-only: `columns` vem de configs montados a mao (4 abas passam
  // por aqui -- ver Results.tsx). Com Object.keys() era impossivel ter duas
  // colunas do mesmo campo; com config explicito, uma key repetida passa
  // batido e renderiza duas colunas lendo o mesmo row[key].
  if (import.meta.env.DEV) {
    const seen = new Set<string>();
    const dups = [...new Set(columns.map((c) => c.key).filter((k) => seen.size === seen.add(k).size))];
    if (dups.length) console.warn(`DataTable: chave(s) de coluna repetida(s) [${dups.join(", ")}] -- duas colunas vao ler o mesmo campo`);
  }

  return (
    <table className="table" style={{ tableLayout: "auto", width: "100%" }}>
      <thead style={{ position: "sticky", top: 0, background: "#fff", zIndex: 1 }}>
        <tr>
          {columns.map((col) => (
            <th key={col.key} title={col.description} style={{ whiteSpace: "nowrap", cursor: col.description ? "help" : undefined, paddingBottom: "8px" }}>
              {col.label}{col.unit ? ` (${col.unit})` : ""}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => {
          const highlighted = isHighlighted?.(row, rowIndex) ?? false;
          return (
            <tr key={rowIndex} style={highlighted ? { backgroundColor: "var(--color-bg)", fontWeight: "bold" } : {}}>
              {columns.map((col) => {
                const raw = row[col.key];
                const formatted = col.format ? col.format(raw) : defaultFormat(raw);
                return (
                  <td key={col.key} title={col.description} style={{ fontFamily: "var(--font-heading)", fontSize: "15px", color: highlighted ? "var(--color-accent-800)" : "var(--color-accent-700)", whiteSpace: "nowrap", padding: "10px 8px", textAlign: "center" }}>
                    {markerColumnKey === col.key && renderMarker?.(row, rowIndex)}
                    {formatted}
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
