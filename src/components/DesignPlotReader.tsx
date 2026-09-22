import { useT, type TFn } from "../i18n";
import { parseDecimal, localizeNumberText } from "../tools/parseDecimal";
import { roundCelsius } from "../tools/temperature";
import NumberInput from "./NumberInput";
import { useMemo, useState, useEffect } from "react";
import { SEVERITY_COLORS } from "../tools/pointSeverity";
import { extractDesignPlotGrid, readDesignPlot, isDesignPlotOutOfRange, DesignPlotReadMode, DesignPlotReading } from "../tools/designPlotReader";

interface DesignPlotReaderProps {
  series: { temperature_k: number; optimum_rate_series: number[][]; optimum_volume_series: number[][] }[];
  onReadingChange?: (data: { mode: DesignPlotReadMode; target: number; reading: DesignPlotReading; temperatureK: number } | null) => void;
}

function getModeOptions(t: TFn): { value: DesignPlotReadMode; label: string; unit: string }[] {
  return [
    { value: "volume", label: t("chart.axis_acid_volume"), unit: "gal/ft" },
    { value: "rate", label: t("chart.axis_opt_rate"), unit: "gal/(ft.min)" },
    { value: "length", label: t("chart.axis_wormhole_length"), unit: t("designReader.ft_of_wormhole") },
  ];
}

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
  const { t, lang } = useT();
  const [mode, setMode] = useState<DesignPlotReadMode>("volume");
  const [targetInput, setTargetInput] = useState("15");
  const [temperatureK, setTemperatureK] = useState(series[0]?.temperature_k ?? 0);

  const grid = useMemo(() => extractDesignPlotGrid(series, temperatureK), [series, temperatureK]);
  const modeOptions = getModeOptions(t);
  const modeMeta = modeOptions.find((m) => m.value === mode)!;

  const target = parseDecimal(targetInput) ?? NaN; // comma or dot
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
      <strong style={{ letterSpacing: "0.04em", textTransform: "uppercase", fontSize: "11px" }}>{t('designReader.read_from')}</strong>

      <select value={mode} onChange={(e) => setMode(e.target.value as DesignPlotReadMode)}>
        {modeOptions.map((m) => (
          <option key={m.value} value={m.value}>{m.label}</option>
        ))}
      </select>

      <NumberInput value={targetInput} onChange={() => {}} onText={setTargetInput} style={{ width: "90px" }} />

      <select value={temperatureK} onChange={(e) => setTemperatureK(Number(e.target.value))}>
        {series.map((s) => (
          <option key={s.temperature_k} value={s.temperature_k}>{roundCelsius(s.temperature_k, 2)} °C</option>
        ))}
      </select>

      <span style={{ marginLeft: "auto" }}>
        {!reading && <span className="text-muted">{t("designReader.enter_a_positive_value")}</span>}
        {reading && isDesignPlotOutOfRange(reading) && (
          <span style={{ color: SEVERITY_COLORS.warn }}>
            {t("designReader.out_of_range", { label: modeMeta.label, min: localizeNumberText(reading.min.toFixed(3), lang), max: localizeNumberText(reading.max.toFixed(3), lang), unit: modeMeta.unit })}
          </span>
        )}
        {reading && !isDesignPlotOutOfRange(reading) && (
          <strong>
            {OUTPUT_FIELDS[mode].map((field, i) => {
              const meta = FIELD_META[field];
              return (
                <span key={field}>
                  {i > 0 && "  ·  "}
                  {meta.label} = {localizeNumberText(reading[field].toFixed(meta.digits), lang)} {meta.unit}
                </span>
              );
            })}
          </strong>
        )}
      </span>
    </div>
  );
}
