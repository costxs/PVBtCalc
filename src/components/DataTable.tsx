import { ReactNode } from "react";

export interface ColumnConfig {
  key: string;
  label: string;
  unit?: string;
  description?: string;
  format?: (v: any) => string;
}

export interface DataTableProps {
  columns: ColumnConfig[];
  rows: Record<string, any>[];
  markerColumnKey?: string;
  renderMarker?: (row: Record<string, any>, rowIndex: number) => ReactNode;
  isHighlighted?: (row: Record<string, any>, rowIndex: number) => boolean;
}

const defaultFormat = (val: any): string => {
  if (val == null) return "-";
  if (typeof val !== "number") return String(val);
  const absVal = Math.abs(val);
  if ((absVal < 0.01 && absVal > 0) || absVal > 1000) return val.toExponential(2);
  if (val !== 0) return val.toFixed(3);
  return String(val);
};

export default function DataTable({ columns, rows, markerColumnKey, renderMarker, isHighlighted }: DataTableProps) {
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
