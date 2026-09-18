import { useMemo, useState, useEffect } from "react";
import { SEVERITY_COLORS } from "../tools/pointSeverity";
import { extractDesignPlotGrid, readDesignPlot, isDesignPlotOutOfRange, DesignPlotReadMode, DesignPlotReading } from "../tools/designPlotReader";

interface DesignPlotReaderProps {
  series: { temperature_k: number; optimum_rate_series: number[][]; optimum_volume_series: number[][] }[];
  onReadingChange?: (data: { mode: DesignPlotReadMode; target: number; reading: DesignPlotReading; temperatureK: number } | null) => void;
}

// Etapa 1 da leitura guiada (artigo, Secao 6.4): entra por UM eixo, devolve
// os OUTROS DOIS -- sem desenhar as setas ainda (Etapa 2, so depois deste
// calculo estar conferido contra o fixture, ver designPlotReader.test.ts).
const MODE_OPTIONS: { value: DesignPlotReadMode; label: string; unit: string }[] = [
  { value: "volume", label: "tenho", unit: "gal/ft" },
  { value: "rate", label: "posso bombear", unit: "gal/(ft.min)" },
  { value: "length", label: "quero", unit: "ft de wormhole" },
];

// Quais dois campos mostrar por modo -- sempre os DOIS que nao foram a
// entrada (item (c) do pedido: "quero X ft -> devolve volume e q_opt").
const OUTPUT_FIELDS: Record<DesignPlotReadMode, Array<"length" | "qOpt" | "vOpt">> = {
  volume: ["length", "qOpt"],
  rate: ["length", "vOpt"],
  length: ["vOpt", "qOpt"],
};

const FIELD_META: Record<"length" | "qOpt" | "vOpt", { label: string; unit: string; digits: number }> = {
  length: { label: "l", unit: "ft", digits: 3 },
  qOpt: { label: "q_opt", unit: "gal/(ft.min)", digits: 4 },
  vOpt: { label: "V_opt", unit: "gal/ft", digits: 3 },
};

export default function DesignPlotReader({ series, onReadingChange }: DesignPlotReaderProps) {
  const [mode, setMode] = useState<DesignPlotReadMode>("volume");
  const [targetInput, setTargetInput] = useState("15");
  const [temperatureK, setTemperatureK] = useState(series[0]?.temperature_k ?? 0);

  const grid = useMemo(() => extractDesignPlotGrid(series, temperatureK), [series, temperatureK]);
  const modeMeta = MODE_OPTIONS.find((m) => m.value === mode)!;

  const target = Number(targetInput);
  const reading = useMemo(() => {
    if (!grid || grid.length < 2 || !Number.isFinite(target) || target <= 0) return null;
    return readDesignPlot(grid, mode, target);
  }, [grid, mode, target]);

  useEffect(() => {
    if (onReadingChange) {
      if (reading && !isDesignPlotOutOfRange(reading)) {
        onReadingChange({ mode, target, reading: reading as DesignPlotReading, temperatureK });
      } else {
        onReadingChange(null);
      }
    }
  }, [reading, mode, target, temperatureK, onReadingChange]);

  return (
    <div style={{
      margin: "0 2px 12px", padding: "10px 14px", border: "1px solid #ddd", borderRadius: "6px",
      display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px", fontSize: "12.5px",
    }}>
      <strong style={{ letterSpacing: "0.04em", textTransform: "uppercase", fontSize: "11px" }}>Leitura guiada</strong>

      <select value={mode} onChange={(e) => setMode(e.target.value as DesignPlotReadMode)}>
        {MODE_OPTIONS.map((m) => (
          <option key={m.value} value={m.value}>{m.label}</option>
        ))}
      </select>

      <input
        type="number"
        min={0}
        step="any"
        value={targetInput}
        onChange={(e) => setTargetInput(e.target.value)}
        style={{ width: "90px" }}
      />
      <span className="text-muted">{modeMeta.unit}</span>

      <select value={temperatureK} onChange={(e) => setTemperatureK(Number(e.target.value))}>
        {series.map((s) => (
          <option key={s.temperature_k} value={s.temperature_k}>{s.temperature_k} K</option>
        ))}
      </select>

      <span style={{ marginLeft: "auto" }}>
        {!reading && <span className="text-muted">informe um valor positivo</span>}
        {reading && isDesignPlotOutOfRange(reading) && (
          <span style={{ color: SEVERITY_COLORS.warn }}>
            fora da faixa coberta pelas curvas — {modeMeta.label} entre {reading.min.toFixed(3)} e {reading.max.toFixed(3)} {modeMeta.unit}
          </span>
        )}
        {reading && !isDesignPlotOutOfRange(reading) && (
          <strong>
            {OUTPUT_FIELDS[mode].map((field, i) => {
              const meta = FIELD_META[field];
              return (
                <span key={field}>
                  {i > 0 && "  ·  "}
                  {meta.label} = {reading[field].toFixed(meta.digits)} {meta.unit}
                </span>
              );
            })}
          </strong>
        )}
      </span>
    </div>
  );
}
