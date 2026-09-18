import { useEffect, useRef } from "react";
import { Pvbt3DShelfChart } from "../tools/Pvbt3DShelfChart";

export interface Pvbt3DRun {
  label: string;
  color: string | number;
  qs: number[];
  values: number[];
}

interface HoverPoint {
  label: string;
  x: number;
  y: number;
}

interface Pvbt3DChartProps {
  runs: Pvbt3DRun[];
  xLabel?: string;
  yLabel?: string;
  xLog?: boolean;
  onHoverPoint?: (point: HoverPoint | null) => void;
}

export default function Pvbt3DChart({ runs, xLabel = "Flowrate", yLabel = "PVBt", xLog = true, onHoverPoint }: Pvbt3DChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<InstanceType<typeof Pvbt3DShelfChart> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = new Pvbt3DShelfChart(containerRef.current, { xLabel, yLabel, xLog });
    chart.onHover = onHoverPoint;
    chart.setRuns(runs.filter((r) => r.qs.length > 0 && r.values.length > 0));
    chartRef.current = chart;
    return () => chart.dispose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [xLabel, yLabel, xLog]);

  useEffect(() => {
    if (chartRef.current) chartRef.current.onHover = onHoverPoint;
  }, [onHoverPoint]);

  useEffect(() => {
    chartRef.current?.setRuns(runs.filter((r) => r.qs.length > 0 && r.values.length > 0));
  }, [runs]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
