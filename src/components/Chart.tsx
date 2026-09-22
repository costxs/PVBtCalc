import ReactECharts from "echarts-for-react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../redux/store";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion, LayoutGroup } from "motion/react";
import type { TooltipComponentFormatterCallbackParams } from "echarts";
import { CurveAnalysis } from "../redux/analysisresults/slice";
import { fetchDesignPlot } from "../redux/radial/slice";
import { roundCelsius, T_CALIBRATED_C } from "../tools/temperature";
import { formatSweepX } from "../tools/analysisTable";
import { getOptimalPointsForDesign } from "../tools/chartDataUtils";
import DesignPlotReader from "./DesignPlotReader";
import { Chip, ChipRow, SegmentedControl, toggleInSet } from "./ChartControls";
import { splitByValidity, collectValidityOffenders, readValidity, fmtBblMin, fmtRatio } from "../tools/validityWindow";
import { analyzeLinearOptimum, linearOptimumMarker } from "../tools/linearExport";
import { resolveAxisLimit } from "../tools/axisLimits";
import { SEVERITY_COLORS } from "../tools/pointSeverity";
import PhysicalLimitNote from "./PhysicalLimitNote";
import { useT, translateIfKey } from "../i18n";
import { numberLocale } from "../tools/parseDecimal";
import { setVisibleChart } from "../redux/ui/slice";
import { selectLinearChartCurves, selectRadialChartCurves, toValidityAwareCurves } from "../tools/chartCurveSelectors";

const fmtSig3 = (v: number): string => (Number.isFinite(v) ? v.toPrecision(3) : String(v));

const toLogDecadeAxis = (lo: number | undefined, hi: number | undefined) => {
  if (lo === undefined || hi === undefined || !(lo > 0) || !(hi > 0)) return undefined;
  return { 
    min: 10 ** Math.floor(Math.log10(lo)), 
    max: 10 ** Math.ceil(Math.log10(hi)) 
  };
};

const OUT_OF_WINDOW_GRAY = "#616161";
const OUT_OF_WINDOW_BAND = "rgba(97,97,97,0.05)";

const CURVE_PALETTE = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc'];

const validityYRange = (
  solids: ([number, number] | null)[][],
  isLog: boolean,
): { min: number; max: number } | undefined => {
  const ys: number[] = [];
  for (const s of solids) {
    for (const p of s) {
      if (p && Number.isFinite(p[1]) && (!isLog || p[1] > 0)) ys.push(p[1]);
    }
  }
  if (!ys.length) return undefined;
  const lo = Math.min(...ys);
  const hi = Math.max(...ys);
  if (isLog) return { min: lo / 2, max: hi * 2 };
  const pad = (hi - lo) * 0.05 || Math.abs(hi) * 0.05 || 1;
  return { min: lo - pad, max: hi + pad };
};

// Item 1 (auto Y-Log): a decisao AUTOMATICA do eixo Y segue o DADO, nao o
// grafico. Simulation linear e Analysis plotam a mesma grandeza (PVBt / Acid
// Volume), ambos sujeitos aos mesmos blow-ups de ordens de magnitude que a
// investigacao de pontos clipped expos -- nada nesses dois graficos esta
// protegido contra achatamento por natureza, entao ambos merecem o mesmo
// cuidado. O ramo radial fica FORA: la o eixo Y ja e `type: "log"` fixo por
// razao fisica (volume de acido varia ordens de magnitude por natureza) --
// Chart.tsx:~367 (Simulation radial) e :~600 (Design Plot) -- e nao ha toggle
// a automatizar. yisLog/userToggledYLog nunca sao roteados para codepath radial.
//
// So valores > 0 e finitos entram (log exige positivo). No ramo Simulation
// reusamos o mesmo conjunto "dentro da janela validada" que a Fase 7.7 usa
// para o range: pontos fora da janela sao blow-ups conhecidos (nao-fisicos) e
// nao devem forcar log sozinhos.
const Y_LOG_AUTO_RATIO = 1000;

const spansOrders = (values: (number | null | undefined)[]): boolean => {
  const pos = values.filter(
    (v): v is number => typeof v === "number" && Number.isFinite(v) && v > 0,
  );
  if (pos.length < 2) return false;
  const lo = Math.min(...pos);
  const hi = Math.max(...pos);
  const ratio = hi / lo;
  console.log("[auto-Y-Log] spansOrders", { n: pos.length, lo, hi, ratio, threshold: Y_LOG_AUTO_RATIO });
  return ratio >= Y_LOG_AUTO_RATIO;
};

const RESET_ZOOM_ICON = 'path://M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z';

// One toolbox for every chart; corner pins it to the top-right (Simulation and Skin charts).
function resetZoomToolbox(chartRef: { current: unknown }, title: string, corner: boolean) {
  return {
    ...(corner ? { top: 10, right: 10 } : {}),
    feature: {
      dataZoom: { yAxisIndex: 'none' },
      restore: {},
      myResetZoom: {
        show: true,
        title,
        icon: RESET_ZOOM_ICON,
        onclick: () => {
          const chart = chartRef.current as any;
          if (chart) chart.getEchartsInstance().dispatchAction({ type: 'dataZoom', start: 0, end: 100 });
        },
      },
    },
  };
}

const ChartComponent = () => {
  const dispatch = useDispatch();
  const { curves } = useSelector((state: RootState) => state.resultCurves);
  const analyse: CurveAnalysis = useSelector((state: RootState) => state.analysisResult);
  const radialState = useSelector((state: RootState) => state.radial);
  const { flowRegime, curves: radialCurves, processed: radialProcessed, skinEvolutionData, designPlotData } = radialState;

  const currentSimulationId: string = radialState.lastRunSetup?.id ?? '';
  const radialSimulationCurves = flowRegime === 'radial' && currentSimulationId
    ? curves.filter((c) => c.flowRegime === 'radial' && c.id.startsWith(`${currentSimulationId} · `))
    : [];
  const visibleChart = useSelector((state: RootState) => state.ui.visibleChart);
  const { t, lang } = useT();

  const chartRefA = useRef(null);
  const chartRefB = useRef(null);
  const chartRefDesign = useRef(null);
  const chartRefSkin = useRef(null);
  const wrapperRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const handleAnimationComplete = () => {
    let activeRef = null;
    if (visibleChart === 'A') activeRef = chartRefA.current;
    else if (visibleChart === 'B') activeRef = chartRefB.current;
    else if (visibleChart === 'design') activeRef = chartRefDesign.current;
    else if (visibleChart === 'skin') activeRef = chartRefSkin.current;
    
    if (activeRef) {
      try {
        (activeRef as any).getEchartsInstance().resize();
      } catch (e) {}
    }
  };

  const [opt, setOpt] = useState(false);
  const [chartOptions, setChartOptions] = useState({});
  const [chartOptionsA, setChartOptionsA] = useState({});
  const [designChartOptions, setDesignChartOptions] = useState({});
  const [skinChartOptions, setSkinChartOptions] = useState({});
  const [xisLog, setxIsLog] = useState(false);
  const [yisLog, setyIsLog] = useState(false);
  const [userToggledYLog, setUserToggledYLog] = useState(false);
  const [grid, setGrid] = useState(true);

  const [designActiveTemps, setDesignActiveTemps] = useState<Set<string>>(new Set());
  const [designSeriesFilter, setDesignSeriesFilter] = useState<'rate' | 'volume' | 'both'>('both');
  const [simActiveTargets, setSimActiveTargets] = useState<Set<string>>(new Set());
  const [simShowOptimumPath, setSimShowOptimumPath] = useState(true);
  const [skinActiveFlowrates, setSkinActiveFlowrates] = useState<Set<string>>(new Set());

  const designTempsKey = designPlotData?.series?.map((s: any) => s.temperature_k).slice().sort().join('|') ?? '';
  useEffect(() => {
    if (designPlotData?.series?.length) {
      setDesignActiveTemps(new Set(designPlotData.series.map((s: any) => String(s.temperature_k))));
      setDesignSeriesFilter('both');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [designTempsKey]);

  useEffect(() => {
    if (flowRegime === 'radial' && radialCurves.length > 0) {
      setSimActiveTargets(new Set(radialCurves.map((c) => c.target_label)));
      setSimShowOptimumPath(true);
    }
  }, [radialCurves, flowRegime]);

  useEffect(() => {
    const keys = Object.keys(skinEvolutionData || {});
    if (keys.length > 0) setSkinActiveFlowrates(new Set(keys));
  }, [skinEvolutionData]);

  const radialChartCurves = useMemo(
    () => selectRadialChartCurves(radialCurves, simActiveTargets),
    [radialCurves, simActiveTargets],
  );
  const linearChartCurves = useMemo(
    () => selectLinearChartCurves(curves),
    [curves],
  );

  const radialValidity = flowRegime === 'radial'
    ? collectValidityOffenders(radialChartCurves)
    : { count: 0, curvesAffected: 0, worst: null };

  const linearValidity = flowRegime === 'linear'
    ? collectValidityOffenders(toValidityAwareCurves(linearChartCurves))
    : { count: 0, curvesAffected: 0, worst: null };

  const renderValidityText = (v: typeof radialValidity) => v.worst && (
    <>
      <strong>{t(v.count === 1 ? 'chart.validity_points_one' : 'chart.validity_points_many', { count: v.count })}</strong>
      {' '}{t(v.curvesAffected === 1 ? 'chart.validity_across_one' : 'chart.validity_across_many', { count: v.curvesAffected })}
      {' '}{t('chart.validity_outside')}{' '}
      {t('chart.validity_worst_case')} <strong>{fmtBblMin(v.worst.flowrate)} {v.worst.unit}</strong>
      {' '}{t('chart.validity_on_curve', { label: v.worst.label })} — {fmtRatio(v.worst.ratio)}×{' '}
      {t(v.worst.boundary === 'upper' ? 'chart.validity_above' : 'chart.validity_below')}
      {' '}({fmtBblMin(v.worst.limit)} {v.worst.unit}).
    </>
  );

  const [xdefinedLimit, setxDefinedLimit] = useState(false);
  const [ydefinedLimit, setyDefinedLimit] = useState(false);
  const [xLimit, setxLimit] = useState(['', '']);
  const [yLimit, setyLimit] = useState(['', '']);
  const [guidedReading, setGuidedReading] = useState<any>(null);

  const autoYLog = useMemo<boolean | null>(() => {
    if (visibleChart === 'B') {
      const yValues = flowRegime === 'radial' ? analyse.volumeToBt : analyse.pvbtPoints;
      return spansOrders(yValues || []);
    }
    if (visibleChart === 'A' && flowRegime === 'linear') {
      const ys = linearChartCurves
        .flatMap(c => {
          const pts = (c.outputMode === 'volume' ? c.acidVolumePoints : c.pvbtPoints) || [];
          const within = c.withinValidityRange || [];
          return pts.filter((_, i) => within[i] !== false);
        });
      return spansOrders(ys);
    }
    return null;
  }, [visibleChart, flowRegime, analyse.pvbtPoints, linearChartCurves]);

  useEffect(() => {
    if (!userToggledYLog && autoYLog !== null) setyIsLog(autoYLog);
  }, [autoYLog, userToggledYLog]);

  const prevFlowRegimeRef = useRef(flowRegime);
  useEffect(() => {
    if (prevFlowRegimeRef.current !== flowRegime) {
      if (flowRegime === 'radial') {
        if (visibleChart !== 'A' && visibleChart !== 'design' && visibleChart !== 'B' && visibleChart !== 'skin') {
          dispatch(setVisibleChart('A'));
        }
      } else if (flowRegime === 'linear' && (visibleChart === 'design' || visibleChart === 'skin')) {
        dispatch(setVisibleChart('A'));
      }
      prevFlowRegimeRef.current = flowRegime;
    }
  }, [flowRegime, visibleChart, dispatch]);

  useEffect(() => {
    if (visibleChart === 'design' && flowRegime === 'radial' && radialProcessed) {
      dispatch(fetchDesignPlot() as any);
    }
  }, [visibleChart, flowRegime, radialProcessed, dispatch]);

  useEffect(() => {
    let raf = 0;
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(handleAnimationComplete);
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(raf);
    };
  }, [visibleChart]);

  const showChart = (chart: string) => {
    if (visibleChart === chart) return;
    dispatch(setVisibleChart(chart));
    if (wrapperRef.current) {
        const rect = wrapperRef.current.getBoundingClientRect();
        if (rect.top < 70) {
            wrapperRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }
  };

  const optSetup = useSelector((state: RootState) => state.optSetup);
  const sweepParameter = optSetup?.analitical_param;

  const getXAxisName = (param?: string) => {
    switch (param) {
      case 'temperature':
        return t("chart.ax_system_temp_c");
      case 'porosity':
      case 'core porosity':
        return t("chart.ax_core_porosity");
      case 'acid_concentration':
      case 'acid concentration':
        return t("chart.ax_acid_concentration");
      case 'core_length':
      case 'core length':
        return t("chart.ax_core_length");
      case 'wellbore_size':
      case 'wellbore size':
      case 'core_diameter':
      case 'core diameter':
        return flowRegime === 'radial' ? t("chart.ax_wellbore_size") : t("chart.ax_core_diameter");
      default:
        return analyse.id ? analyse.id : t("chart.ax_sweep_parameter");
    }
  };

  const getRadialSweepAxisName = (param: string) => {
    switch (param) {
      case 'temperature': return t("chart.ax_system_temp_c");
      case 'porosity': return t("chart.ax_porosity");
      case 'acid_concentration': return t("chart.ax_acid_concentration");
      case 'wellbore_diameter': return t("chart.ax_wellbore_diameter");
      case 'payzone_thickness': return t("chart.ax_payzone_thickness");
      default: return param;
    }
  };

  // Estado do Analysis Chart: ou ha dado plotavel do regime ATUAL, ou ha uma mensagem explicita.
  const analysisForCurrentRegime = analyse.regime === flowRegime;
  const analysisPlottable = analyse.status === 'ok' && analysisForCurrentRegime && (
    flowRegime === 'radial'
      ? (analyse.radial?.sweepValues.length ?? 0) > 0
      : analyse.analiticalpoints.length > 0
  );
  const optPathName = t('chart.series_opt_path');

  const analysisMessage: string | null = analysisPlottable ? null
    : analyse.status === 'loading' && analysisForCurrentRegime ? t('chart.msg_calculating')
    : analyse.status === 'error' && analysisForCurrentRegime ? t('chart.msg_failed', { error: analyse.error ? translateIfKey(t, analyse.error) : t('chart.unknown_error') })
    : analyse.status === 'ok' && analysisForCurrentRegime
      ? (flowRegime === 'radial' && analyse.radial?.hasClippedVolume
          ? t('chart.msg_all_clipped')
          : t('chart.msg_no_points'))
    : analyse.status !== 'idle' && !analysisForCurrentRegime
      ? t('chart.msg_other_regime', { last: t(analyse.regime === 'radial' ? 'chart.regime_radial' : 'chart.regime_linear'), current: t(flowRegime === 'radial' ? 'chart.regime_radial' : 'chart.regime_linear') })
    : t('chart.msg_idle');

  useEffect(() => {
    const isRadial = flowRegime === 'radial';

    // Sem dado plotavel nao ha opcao de grafico: o painel de mensagem (analysisMessage) assume.
    if (!analysisPlottable) {
      setChartOptionsA({});
      return;
    }

    if (isRadial && analyse.radial) {
      const r = analyse.radial;
      // sweepValues is Kelvin whenever the swept parameter is temperature (the backend's
      // native unit); every other parameter is already in its display unit. formatSweepX is
      // the SAME function analysisTable.ts uses for the Analysis table's own 'x' column, so
      // this chart and that table round the identical point identically.
      const toSweepX = (x: number) => formatSweepX(x, r.sweepParam);
      const xRadial = xdefinedLimit ? resolveAxisLimit(xLimit[0], xLimit[1], false) : {};
      const rateColor = CURVE_PALETTE[0];
      const volColor = CURVE_PALETTE[3];
      setChartOptionsA({
        tooltip: { trigger: "axis" },
        legend: { top: 0 },
        toolbox: { feature: { dataZoom: { yAxisIndex: 'none' }, restore: {} } },
        dataZoom: [
          { type: 'inside', xAxisIndex: 0 },
          { type: 'slider', xAxisIndex: 0, bottom: 4, height: 14, showDataShadow: false, handleSize: '80%', showDetail: false }
        ],
        grid: { bottom: 60, left: 70, right: 70, top: 50, containLabel: true },
        xAxis: {
          z: 10,
          name: getRadialSweepAxisName(r.sweepParam),
          nameLocation: 'middle',
          nameGap: 30,
          type: "value",
          scale: true,
          min: xRadial.min,
          max: xRadial.max,
          splitLine: { show: grid }
        },
        yAxis: [
          {
            type: 'value',
            name: t('chart.axis_opt_rate'),
            nameLocation: 'middle',
            nameGap: 55,
            scale: true,
            splitLine: { show: grid }
          },
          {
            type: 'value',
            position: 'right',
            name: t('chart.axis_opt_volume'),
            nameLocation: 'middle',
            nameGap: 55,
            scale: true,
            splitLine: { show: false }
          }
        ],
        series: [
          {
            name: t('chart.series_opt_rate'),
            type: 'line',
            yAxisIndex: 0,
            showSymbol: true,
            smooth: true,
            data: r.sweepValues.map((x, i) => [toSweepX(x), r.optimumRate[i]]),
            lineStyle: { type: 'solid', width: 2, color: rateColor },
            itemStyle: { color: rateColor }
          },
          {
            name: t('chart.series_opt_volume'),
            type: 'line',
            yAxisIndex: 1,
            showSymbol: true,
            smooth: true,
            data: r.sweepValues.map((x, i) => [toSweepX(x), r.optimumVolume[i]]),
            lineStyle: { type: 'dashed', width: 2, color: volColor },
            itemStyle: { color: volColor }
          }
        ]
      });
      return;
    }

    const xAxisIsLog = xisLog;
    const yAxisIsLog = false;
    const showOptimumMarker = opt;

    const analysisSerie = ({
      name: `${analyse.id} ${t('chart.series_variation')}`,
      type: "line",
      data: analyse.analiticalpoints.map((x, index) => {
        const yVal = analyse.pvbtPoints?.[index];
        return [
          Number(x?.toFixed(4) || 0),
          Number(yVal?.toFixed(4) || 0),
        ];
      }),
      color: CURVE_PALETTE[0],
      showSymbol: true,
      smooth: true,
      markPoint: showOptimumMarker ? {
        data: [
          {
            type: "min",
            name: t("chart.minimum"),
            symbolSize: 30,
            label: {
              formatter: `${t('chart.mark_optimum')}: {@[1]}`,
              position: "top",
              color: "#fff",
              backgroundColor: "#24a424",
              padding: 5,
              borderRadius: 5,
            },
            itemStyle: {
              color: "#24a424",
            },
          },
        ],
      } : null,
    });

    const xRes = xdefinedLimit ? resolveAxisLimit(xLimit[0], xLimit[1], xAxisIsLog) : {};
    const yRes = ydefinedLimit ? resolveAxisLimit(yLimit[0], yLimit[1], yAxisIsLog) : {};

    setChartOptionsA({
      tooltip: {
        trigger: "axis",
      },
      legend: {
        orient: 'vertical',
        right: 10,
        top: '10%'
      },
      toolbox: {
        feature: {
          dataZoom: { yAxisIndex: 'none' },
          restore: {},
        }
      },
      dataZoom: [
        { type: 'inside', xAxisIndex: 0 },
        { type: 'slider', xAxisIndex: 0, bottom: 0 }
      ],
      grid: { bottom: 60, left: 50, right: 40, top: 30, containLabel: true },
      xAxis: {
        z: 10,
        name: getXAxisName(sweepParameter),
        nameLocation: 'middle',
        nameGap: 25,
        type: xAxisIsLog ? "log" : "value",
        min: xRes.min,
        max: xRes.max,
        splitLine: { show: grid }
      },
      yAxis: {
        z: 10,
        name: t('chart.axis_pvbt'),
        nameLocation: 'middle',
        nameGap: 45,
        type: yAxisIsLog ? "log" : "value",
        min: yRes.min,
        max: yRes.max,
        splitLine: { show: grid }
      },
      series: analysisSerie,
    });
  }, [analyse, opt, xisLog, yisLog, xdefinedLimit, ydefinedLimit, xLimit, yLimit, grid, flowRegime, sweepParameter, analysisPlottable, t, lang]);

  useEffect(() => {
    const round4 = (p: [number, number] | null) =>
      p == null ? null : [Number(p[0].toFixed(4)), Number(p[1].toFixed(4))];

    if (flowRegime === 'radial') {
      const solids: ([number, number] | null)[][] = [];
      const dasheds: ([number, number] | null)[][] = [];
      const allCurvesSeries = radialChartCurves.flatMap((curve, ci) => {
        const curveColor = CURVE_PALETTE[ci % CURVE_PALETTE.length];
        const fps = curve.flowratepoints || [];
        const { solid, dashed, bandBelow, bandAbove } = splitByValidity(
          fps,
          curve.acidvolumepoints || [],
          curve.within_validity_range || [],
          curve.metadata || null
        );
        solids.push(solid);
        dasheds.push(dashed);

        const meta = curve.metadata;
        const markAreaData: { xAxis: number }[][] = [];
        if (meta && bandBelow) markAreaData.push([{ xAxis: fps[0] }, { xAxis: Number(meta.validity_min_gal_ft_min.toFixed(4)) }]);
        if (meta && bandAbove) markAreaData.push([{ xAxis: Number(meta.validity_max_gal_ft_min.toFixed(4)) }, { xAxis: fps[fps.length - 1] }]);

        const markPointData: any[] = [];

        if (meta && bandBelow) {
          const firstSolid = solid.find(p => p !== null);
          if (firstSolid) {
            markPointData.push({
              coord: round4(firstSolid),
              symbol: 'circle',
              symbolSize: 8,
              itemStyle: { color: curveColor, borderColor: '#fff', borderWidth: 1.5 },
              label: { show: false },
            });
          }
        }
        if (meta && bandAbove) {
          const lastSolid = [...solid].reverse().find(p => p !== null);
          if (lastSolid) {
            markPointData.push({
              coord: round4(lastSolid),
              symbol: 'circle',
              symbolSize: 8,
              itemStyle: { color: curveColor, borderColor: '#fff', borderWidth: 1.5 },
              label: { show: false },
            });
          }
        }

        const curveEndPoint = [...dashed].reverse().find(p => p !== null) ?? [...solid].reverse().find(p => p !== null);
        if (curveEndPoint) {
          markPointData.push({
            coord: round4(curveEndPoint),
            symbol: 'none',
            label: {
              show: true,
              position: 'right',
              color: curveColor,
              fontSize: 10,
              fontWeight: 600,
              formatter: curve.target_label,
            },
          });
        }

        const markPoint = markPointData.length > 0 ? { data: markPointData } : undefined;

        return [
          {
            name: curve.target_label,
            type: "line",
            data: solid.map(round4),
            color: curveColor,
            showSymbol: false,
            smooth: true,
            connectNulls: false,
            markPoint,
            ...(markAreaData.length ? {
              markArea: {
                silent: true,
                itemStyle: { color: OUT_OF_WINDOW_BAND },
                data: markAreaData
              }
            } : {}),
          },
          {
            name: curve.target_label,
            type: "line",
            data: dashed.map(round4),
            showSymbol: false,
            smooth: true,
            connectNulls: false,
            lineStyle: { type: 'dashed', color: OUT_OF_WINDOW_GRAY },
            itemStyle: { color: OUT_OF_WINDOW_GRAY },
            tooltip: { show: false },
            z: 1,
          },
        ];
      });

      const optimalPoints = getOptimalPointsForDesign(radialCurves).sort((a, b) => a.optimalFlowrate - b.optimalFlowrate);

      // Extremo Y real do que aparece no grafico: todo ponto finito das series
      // solid+dashed de cada curva (Item 3), mais o caminho de otimo. NAO usar
      // pvbtpoints aqui -- esse campo nunca e desenhado neste grafico (a serie
      // plotada e sempre acidvolumepoints, acima); misturar os dois so alargava
      // o eixo pra baixo com valores de uma serie invisivel (ex.: caso real com
      // acidvolumepoints minimo ~899 virava eixo comecando em 10 por causa de
      // pvbtpoints ~4, quando devia comecar em 100).
      const allPlottedYs: number[] = [];
      for (const s of [...solids, ...dasheds]) {
        for (const p of s) {
          if (p && Number.isFinite(p[1]) && p[1] > 0) allPlottedYs.push(p[1]);
        }
      }
      for (const p of optimalPoints) {
        if (Number.isFinite(p.optimalVolume) && p.optimalVolume > 0) allPlottedYs.push(p.optimalVolume);
      }
      const simRadialLogAxis = allPlottedYs.length
        ? toLogDecadeAxis(Math.min(...allPlottedYs), Math.max(...allPlottedYs))
        : undefined;

      const xResRadialSim = xdefinedLimit ? resolveAxisLimit(xLimit[0], xLimit[1], false) : {};
      const yResRadialSim = ydefinedLimit ? resolveAxisLimit(yLimit[0], yLimit[1], true) : {};

      setChartOptions({
        tooltip: {
          trigger: "axis",
          formatter: (params: TooltipComponentFormatterCallbackParams | TooltipComponentFormatterCallbackParams[]) => {
            const paramArray = Array.isArray(params) ? params : [params];
            let tooltipContent = `${t('chart.tt_injection_rate', { value: (paramArray[0] as any).axisValue ?? "" })}<br/>`;
            const seen = new Set<string>();
            paramArray.forEach((item) => {
              const it = item as any;
              if (it.seriesName === optPathName) return;
              if (it.value == null || it.value[1] == null) return;
              if (seen.has(it.seriesName)) return;
              seen.add(it.seriesName);
              tooltipContent += `
                <div style="display: flex; align-items: center;">
                  <span style="display:inline-block;width:10px;height:10px;background-color:${it.color};margin-right:5px;"></span>
                  ${it.seriesName}: <strong>${it.value[1]}</strong>
                </div>
              `;
            });
            return tooltipContent;
          }
        },
        legend: { show: false },
        toolbox: resetZoomToolbox(chartRefA, t('chart.reset_zoom'), true),
        dataZoom: [
          { type: 'inside', xAxisIndex: 0 },
          { type: 'slider', xAxisIndex: 0, bottom: 4, height: 14, showDataShadow: false, handleSize: '80%', showDetail: false }
        ],
        grid: { bottom: 60, left: 60, right: 40, top: 80, containLabel: true },
        xAxis: {
          z: 10,
          name: t('chart.axis_inj_rate'),
          nameLocation: 'middle',
          nameGap: 35,
          type: "value",
          min: xResRadialSim.min,
          max: xResRadialSim.max,
          splitLine: { show: grid }
        },
        yAxis: {
          z: 10,
          name: t('chart.axis_acid_volume'),
          nameLocation: 'middle',
          nameGap: 65,
          type: "log",
          logBase: 10,
          min: yResRadialSim.min ?? (simRadialLogAxis?.min ?? undefined),
          max: yResRadialSim.max ?? (simRadialLogAxis?.max ?? undefined),
          splitLine: { show: grid, interval: 0 },
          axisTick: { interval: 0 },
          axisLabel: {
            interval: (() => {
              const effMin = yResRadialSim.min ?? simRadialLogAxis?.min;
              const effMax = yResRadialSim.max ?? simRadialLogAxis?.max;
              return effMin && effMax && (Math.log10(effMax) - Math.log10(effMin)) > 6 ? 1 : 0;
            })(),
            formatter: (val: number) =>
              Math.abs(val) >= 1e6
                ? val.toExponential(0).replace('+', '')
                : new Intl.NumberFormat(numberLocale(lang)).format(val)
          }
        },
        series: [
          ...allCurvesSeries,
          ...(simShowOptimumPath ? [{
            name: optPathName,
            type: "line",
            data: optimalPoints.length > 1 ? optimalPoints.map(p => [p.optimalFlowrate, p.optimalVolume]) : [],
            lineStyle: { type: 'dashed', width: 3, color: '#4A90E2' },
            itemStyle: { color: '#4A90E2' },
            symbol: 'none',
            z: 20,
            markPoint: optimalPoints.length === 1 ? {
              data: [
                {
                  name: t('chart.optimum'),
                  coord: [optimalPoints[0].optimalFlowrate, optimalPoints[0].optimalVolume],
                  symbol: 'pin',
                  symbolSize: 40,
                  itemStyle: { color: '#4A90E2' },
                  label: { show: false }
                }
              ]
            } : undefined
          }] : []),
        ],
      });
    } else {
      const validCurves = linearChartCurves;
      const allOutputModes = validCurves.map((curve) => curve.outputMode).filter(Boolean);
      const allVolume = allOutputModes.length > 0 && allOutputModes.every((m) => m === 'volume');
      const yAxisName = allVolume ? t('chart.axis_acid_volume_gal') : 'PVBt';

      const solids: ([number, number] | null)[][] = [];

      const allCurvesSeries = validCurves.flatMap((curve, ci) => {
        const curveColor = CURVE_PALETTE[ci % CURVE_PALETTE.length];
        const fps = curve.flowratePoints || [];
        const yPoints = curve.outputMode === 'volume' ? curve.acidVolumePoints : curve.pvbtPoints;
        const { solid, dashed, bandBelow, bandAbove } = splitByValidity(
          fps,
          yPoints || [],
          curve.withinValidityRange || [],
          curve.metadata || null
        );
        solids.push(solid);

        const v = readValidity(curve.metadata);
        const markAreaData: { xAxis: number }[][] = [];
        if (v && bandBelow) markAreaData.push([{ xAxis: fps[0] }, { xAxis: Number(v.min.toFixed(4)) }]);
        if (v && bandAbove) markAreaData.push([{ xAxis: Number(v.max.toFixed(4)) }, { xAxis: fps[fps.length - 1] }]);

        const markPointData: any[] = [];
        const optMarker = opt ? linearOptimumMarker(analyzeLinearOptimum(curve), fps) : null;
        if (optMarker) {
          markPointData.push({
            coord: [Number(optMarker.x.toFixed(4)), Number(optMarker.y.toFixed(4))],
            name: t("chart.optimum"),
            symbolSize: 30,
            label: {
              formatter: `${t('chart.mark_optimum')}: ${Number(optMarker.y.toFixed(4))}`,
              position: "top",
              color: "#fff",
              backgroundColor: "#24a424",
              padding: 5,
              borderRadius: 5,
            },
            itemStyle: { color: "#24a424" },
          });
        }

        if (v && bandBelow) {
          const firstSolid = solid.find(p => p !== null);
          if (firstSolid) {
            markPointData.push({
              coord: round4(firstSolid),
              symbol: 'circle',
              symbolSize: 8,
              itemStyle: { color: curveColor, borderColor: '#fff', borderWidth: 1.5 },
              label: { show: true, position: 'bottom', color: curveColor, fontSize: 10, formatter: curve.id }
            });
          }
        }
        if (v && bandAbove) {
          const lastSolid = [...solid].reverse().find(p => p !== null);
          if (lastSolid) {
            markPointData.push({
              coord: round4(lastSolid),
              symbol: 'circle',
              symbolSize: 8,
              itemStyle: { color: curveColor, borderColor: '#fff', borderWidth: 1.5 },
              label: { show: true, position: 'top', color: curveColor, fontSize: 10, formatter: curve.id }
            });
          }
        }

        const markPoint = markPointData.length > 0 ? { data: markPointData } : undefined;

        return [
          {
            name: curve.id,
            type: "line",
            data: solid.map(round4),
            color: curveColor,
            showSymbol: true,
            smooth: true,
            connectNulls: false,
            markPoint,
            ...(markAreaData.length ? {
              markArea: {
                silent: true,
                itemStyle: { color: OUT_OF_WINDOW_BAND },
                data: markAreaData
              }
            } : {}),
          },
          {
            name: curve.id,
            type: "line",
            data: dashed.map(round4),
            showSymbol: false,
            smooth: true,
            connectNulls: false,
            lineStyle: { type: 'dashed', color: OUT_OF_WINDOW_GRAY },
            itemStyle: { color: OUT_OF_WINDOW_GRAY },
            tooltip: { show: false },
            z: 1,
          },
        ];
      });

      const yRange = validityYRange(solids, yisLog);
      const xResLinearSim = xdefinedLimit ? resolveAxisLimit(xLimit[0], xLimit[1], xisLog) : {};
      const yResLinearSim = ydefinedLimit ? resolveAxisLimit(yLimit[0], yLimit[1], yisLog) : {};

      setChartOptions({
        tooltip: {
          trigger: "axis",
          formatter: (params: TooltipComponentFormatterCallbackParams | TooltipComponentFormatterCallbackParams[]) => {
            const paramArray = Array.isArray(params) ? params : [params];
            let tooltipContent = `${(paramArray[0] as any).axisValue ?? ""}<br/>`;
            const seen = new Set<string>();
            paramArray.forEach((item) => {
              const it = item as any;
              if (it.value == null || it.value[1] == null) return;
              if (seen.has(it.seriesName)) return;
              seen.add(it.seriesName);
              tooltipContent += `
                <div style="display: flex; align-items: center;">
                  <span style="display:inline-block;width:10px;height:10px;background-color:${it.color};margin-right:5px;"></span>
                  ${yAxisName} → <strong>${it.value[1]}</strong>
                </div>
              `;
            });
            return tooltipContent;
          }
        },
        legend: { orient: 'vertical', right: 10, top: '10%' },
        toolbox: resetZoomToolbox(chartRefA, t('chart.reset_zoom'), false),
        dataZoom: [
          { type: 'inside', xAxisIndex: 0 },
          { type: 'slider', xAxisIndex: 0, bottom: 4, height: 14, showDataShadow: false, handleSize: '80%', showDetail: false }
        ],
        grid: { bottom: 60, left: 50, right: 100, top: 40, containLabel: true },
        xAxis: {
          z: 10,
          name: t('chart.axis_flowrate'),
          nameLocation: 'middle',
          nameGap: 35,
          type: xisLog ? "log" : "value",
          min: xResLinearSim.min,
          max: xResLinearSim.max,
          splitLine: { show: grid }
        },
        yAxis: {
          z: 10,
          name: yAxisName,
          nameLocation: 'middle',
          nameGap: 65,
          type: yisLog ? "log" : "value",
          min: yResLinearSim.min ?? yRange?.min,
          max: yResLinearSim.max ?? yRange?.max,
          splitLine: { show: grid }
        },
        series: allCurvesSeries,
      });
    }
  }, [linearChartCurves, radialChartCurves, radialCurves, flowRegime, opt, xisLog, yisLog, xdefinedLimit, ydefinedLimit, xLimit, yLimit, grid, simActiveTargets, simShowOptimumPath, t, lang]);

  useEffect(() => {
    if (visibleChart === 'design' && flowRegime === 'radial' && designPlotData?.series?.length) {
      const allRates = designPlotData.series.flatMap((s: any) => s.optimum_rate_series.map((pt: any) => pt[0]));
      const allVols = designPlotData.series.flatMap((s: any) => s.optimum_volume_series.map((pt: any) => pt[0]));
      const allLengths = designPlotData.series.flatMap((s: any) => s.optimum_rate_series.map((pt: any) => pt[1]));

      const rateMin = allRates.length ? Math.min(...allRates) : 0.02;
      const rateMax = allRates.length ? Math.max(...allRates) : 2000;
      const volMin = allVols.length ? Math.min(...allVols) : 0.01;
      const volMax = allVols.length ? Math.max(...allVols) : 1000;
      const lengthMin = allLengths.length ? Math.min(...allLengths) : 1;
      const lengthMax = allLengths.length ? Math.max(...allLengths) : 20;

      const yAxisMin = Math.pow(10, Math.floor(Math.log10(lengthMin)));
      const yAxisMax = Math.pow(10, Math.ceil(Math.log10(lengthMax)));

      const decRate = Math.log10(rateMax / rateMin);
      const decVol = Math.log10(volMax / volMin);
      const W = Number.isFinite(decRate) && Number.isFinite(decVol) && decRate >= 0 && decVol >= 0
        ? decRate + decVol + 0.5
        : 1;

      const rateAxisMin = Math.pow(10, Math.floor(Math.log10(rateMin)));
      const volAxisMax = Math.pow(10, Math.ceil(Math.log10(volMax)));
      const W_int = Math.ceil(W);
      
      const rateAxisMax = rateAxisMin * Math.pow(10, W_int);
      const volAxisMin = volAxisMax / Math.pow(10, W_int);
      
      const rateToVolFactor = volAxisMin / rateAxisMin;

      const yResDesign = ydefinedLimit ? resolveAxisLimit(yLimit[0], yLimit[1], true) : {};
      const xResDesignRate = xdefinedLimit ? resolveAxisLimit(xLimit[0], xLimit[1], true) : {};

      let guidedReadingMarkLineData: any[] = [];
      let guidedReadingMarkPointData: any[] = [];
      if (guidedReading && guidedReading.reading) {
        const r = guidedReading.reading;
        const vX = r.vOpt;
        const qX_mapped = r.qOpt * rateToVolFactor;
        const y = r.length;

        guidedReadingMarkPointData = [
          {
            coord: [vX, y],
            symbol: 'circle',
            symbolSize: 6,
            itemStyle: { color: 'purple', borderColor: '#fff', borderWidth: 1 },
            label: {
              show: true,
              position: 'top',
              color: 'purple',
              fontSize: 10,
              fontWeight: 'bold',
              backgroundColor: 'rgba(255,255,255,0.85)',
              padding: [2, 4],
              formatter: `V = ${fmtSig3(r.vOpt)} gal/ft`,
            },
          },
          {
            coord: [qX_mapped, y],
            symbol: 'circle',
            symbolSize: 6,
            itemStyle: { color: 'purple', borderColor: '#fff', borderWidth: 1 },
            label: {
              show: true,
              position: 'bottom',
              color: 'purple',
              fontSize: 10,
              fontWeight: 'bold',
              backgroundColor: 'rgba(255,255,255,0.85)',
              padding: [2, 4],
              formatter: `q = ${fmtSig3(r.qOpt)} gal/(ft.min)`,
            },
          },
        ];

        const arrowStyle = {
            lineStyle: { type: 'dashdot' as const, color: 'purple', width: 2 },
            symbol: ['none', 'arrow'],
            symbolSize: [8, 12],
            animation: false,
            silent: true
        };

        const yTop = yResDesign.max ?? yAxisMax;
        const yBottom = yResDesign.min ?? yAxisMin;

        if (guidedReading.mode === 'volume') {
            guidedReadingMarkLineData.push(
                [ { coord: [vX, yTop] }, { coord: [vX, y], ...arrowStyle } ],
                [ { coord: [vX, y] }, { coord: [qX_mapped, y], ...arrowStyle } ],
                [ { coord: [qX_mapped, y] }, { coord: [qX_mapped, yBottom], ...arrowStyle } ]
            );
        } else if (guidedReading.mode === 'rate') {
            guidedReadingMarkLineData.push(
                [ { coord: [qX_mapped, yBottom] }, { coord: [qX_mapped, y], ...arrowStyle } ],
                [ { coord: [qX_mapped, y] }, { coord: [vX, y], ...arrowStyle } ],
                [ { coord: [vX, y] }, { coord: [vX, yTop], ...arrowStyle } ]
            );
        } else if (guidedReading.mode === 'length') {
            guidedReadingMarkLineData.push(
                [ { coord: [volAxisMax, y] }, { coord: [vX, y], ...arrowStyle } ],
                [ { coord: [vX, y] }, { coord: [vX, yTop], ...arrowStyle } ]
            );
            guidedReadingMarkLineData.push(
                [ { coord: [volAxisMin, y] }, { coord: [qX_mapped, y], ...arrowStyle } ],
                [ { coord: [qX_mapped, y] }, { coord: [qX_mapped, yBottom], ...arrowStyle } ]
            );
        }
      }

      const designSeries = designPlotData.series.flatMap((s: any, idx: number) => {
          const color = CURVE_PALETTE[idx % CURVE_PALETTE.length];
          if (!designActiveTemps.has(String(s.temperature_k))) return [];
          const showRate = designSeriesFilter !== 'volume';
          const showVolume = designSeriesFilter !== 'rate';
          const isSelectedTarget = guidedReading && guidedReading.temperatureK === s.temperature_k;

          if (isSelectedTarget) {
              console.assert(guidedReading.temperatureK === s.temperature_k, "AS DUAS PONTAS DA SETA SAO DA MESMA TEMPERATURA");
          }

          const out: any[] = [];
          if (showRate) {
              out.push({
                  name: t('chart.series_rate_at', { temp: roundCelsius(s.temperature_k, 2) }),
                  type: 'line',
                  smooth: true,
                  showSymbol: false,
                  xAxisIndex: 0,
                  data: s.optimum_rate_series,
                  lineStyle: { type: 'solid', width: 2 },
                  itemStyle: { color }
              });
          }
          if (showVolume) {
              out.push({
                  name: t('chart.series_volume_at', { temp: roundCelsius(s.temperature_k, 2) }),
                  type: 'line',
                  smooth: true,
                  showSymbol: false,
                  xAxisIndex: 1,
                  data: s.optimum_volume_series,
                  lineStyle: { type: 'dashed', width: 2 },
                  itemStyle: { color },
                  markLine: isSelectedTarget && guidedReadingMarkLineData.length > 0 ? {
                      data: guidedReadingMarkLineData,
                      symbol: ['none', 'none']
                  } : undefined,
                  markPoint: isSelectedTarget && guidedReadingMarkPointData.length > 0 ? {
                      data: guidedReadingMarkPointData,
                      symbolSize: 6,
                      animation: false,
                  } : undefined
              });
          }
          return out;
      });

      setDesignChartOptions({
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'cross', axis: 'y', snap: false },
          formatter: function(params: any) {
            if (!params || !params.length) return "";
            const yValue = params[0].value[1];
            let html = `<strong>${t('chart.tt_wormhole_length', { value: yValue })}</strong><br/>`;
            params.forEach((param: any) => {
               const colorSpan = `<span style="display:inline-block;margin-right:5px;border-radius:10px;width:9px;height:9px;background-color:${param.color}"></span>`;
               const xValue = param.value[0];
               let xStr = xValue >= 10000 || xValue <= 0.0001 ? xValue.toExponential(4) : xValue.toFixed(4);
               html += `${colorSpan}${param.seriesName}: <strong>${xStr}</strong><br/>`;
            });
            return html;
          }
        },
        legend: { show: false },
        grid: { 
          top: 80, 
          bottom: 60, 
          left: 50, 
          right: 50, 
          containLabel: true 
        },
        toolbox: resetZoomToolbox(chartRefDesign, t('chart.reset_zoom'), false),
        dataZoom: [
          { type: 'inside', xAxisIndex: [0, 1], filterMode: 'none' },
          { type: 'slider', xAxisIndex: [0, 1], bottom: 4, height: 14, showDataShadow: false, handleSize: '80%', showDetail: false, filterMode: 'none' }
        ],
        yAxis: [
          {
            type: 'log',
            name: t('chart.axis_wormhole_length'),
            nameLocation: 'middle',
            nameGap: 65,
            min: yResDesign.min ?? yAxisMin,
            max: yResDesign.max ?? yAxisMax,
            logBase: 10,
            splitLine: { show: grid }
          },
          {
            type: 'log',
            position: 'right',
            name: t('chart.axis_wormhole_length'),
            nameLocation: 'middle',
            nameGap: 65,
            min: yResDesign.min ?? yAxisMin,
            max: yResDesign.max ?? yAxisMax,
            logBase: 10,
            splitLine: { show: false }
          }
        ],

        xAxis: [
            {
                type: 'log',
                name: t('chart.axis_opt_rate'),
                position: 'bottom',
                nameLocation: 'middle',
                nameGap: 30,
                min: xResDesignRate.min ?? rateAxisMin,
                max: xResDesignRate.max ?? rateAxisMax,
                logBase: 10,
                splitLine: { 
                  show: false 
                },
                axisLabel: {
                  formatter: (value: any) => {
                    const num = Number(value);
                    if (num >= 10000 || num <= 0.0001) return num.toExponential(0);
                    return value.toString();
                  }
                }
            },
            {
                type: 'log',
                name: t('chart.axis_opt_volume'),
                position: 'top',
                nameLocation: 'middle',
                nameGap: 30,
                min: volAxisMin,
                max: volAxisMax,
                logBase: 10,
                splitLine: { 
                  show: true,
                  lineStyle: { type: 'dashed', opacity: 0.5 }
                },
                axisLabel: {
                  formatter: (value: any) => {
                    const num = Number(value);
                    if (num >= 10000 || num <= 0.0001) return num.toExponential(0);
                    return value.toString();
                  }
                }
            }
        ],
        series: designSeries as any
      });
    }
  }, [designPlotData, flowRegime, visibleChart, grid, guidedReading, designActiveTemps, designSeriesFilter, xdefinedLimit, ydefinedLimit, xLimit, yLimit, t, lang]);

  useEffect(() => {
    if (visibleChart === 'skin' && skinEvolutionData && Object.keys(skinEvolutionData).length > 0) {
      const skinKeys = Object.keys(skinEvolutionData);
      const activeKeys = skinKeys.filter((q) => skinActiveFlowrates.has(q));

      const skinVolumeVals = activeKeys
        .flatMap((q) => skinEvolutionData[q].map((p: { x: number; y: number }) => p.x))
        .filter((v: number) => typeof v === 'number' && isFinite(v));
      const skinVolumeRange = skinVolumeVals.length
        ? { min: Math.min(...skinVolumeVals), max: Math.max(...skinVolumeVals) }
        : undefined;
      const xResSkin = xdefinedLimit ? resolveAxisLimit(xLimit[0], xLimit[1], true) : {};
      const yResSkin = ydefinedLimit ? resolveAxisLimit(yLimit[0], yLimit[1], false) : {};
      const skinXAuto = toLogDecadeAxis(skinVolumeRange?.min, skinVolumeRange?.max);

      setSkinChartOptions({
        tooltip: {
            trigger: 'axis',
            formatter: function (params: any) {
                if (!params.length) return "";
                let tooltipText = `${t('chart.tt_volume', { value: params[0].value[0].toFixed(1) })}<br/>`;
                params.forEach((param: any) => {
                    tooltipText += `${t('chart.tt_skin', { name: param.seriesName, value: param.value[1].toFixed(2) })}<br/>`;
                });
                return tooltipText;
            }
        },
        legend: { show: false },
        toolbox: resetZoomToolbox(chartRefSkin, t('chart.reset_zoom'), true),
        grid: { top: 70, bottom: 60, left: 55, right: 40, containLabel: true },
        dataZoom: [
          { type: 'inside', xAxisIndex: 0 },
          { type: 'slider', xAxisIndex: 0, bottom: 4, height: 14, showDataShadow: false, handleSize: '80%', showDetail: false }
        ],
        xAxis: {
            name: t('chart.axis_acid_volume_paren'),
            type: 'log',
            nameLocation: 'middle',
            nameGap: 35,
            min: xResSkin.min ?? skinXAuto?.min,
            max: xResSkin.max ?? skinXAuto?.max,
            axisLabel: {
              formatter: (val: number) => new Intl.NumberFormat(numberLocale(lang), { notation: val >= 1e6 ? 'compact' : 'standard' }).format(val)
            }
        },
        yAxis: {
            name: t('chart.axis_skin'),
            type: 'value',
            min: yResSkin.min,
            max: yResSkin.max ?? 0,
            nameLocation: 'middle',
            nameGap: 40
        },
        series: activeKeys.map((q) => ({
            name: `${q} bbl/min`,
            type: 'line',
            smooth: true,
            showSymbol: false,
            itemStyle: { color: CURVE_PALETTE[skinKeys.indexOf(q) % CURVE_PALETTE.length] },
            lineStyle: { color: CURVE_PALETTE[skinKeys.indexOf(q) % CURVE_PALETTE.length] },
            data: skinEvolutionData[q].map((point: {x: number, y: number}) => [point.x, point.y])
        }))
      });
    }
  }, [skinEvolutionData, visibleChart, skinActiveFlowrates, xdefinedLimit, ydefinedLimit, xLimit, yLimit, t, lang]);

  const optionsList = useMemo(() => {
    return flowRegime === 'radial'
      ? [
          { id: 'pvbt', label: "Simulation Chart", value: 'A' },
          { id: 'design', label: "Design Plot", value: 'design' },
          { id: 'analysis', label: "Analysis Chart", value: 'B' },
          { id: 'skin', label: "Skin Evolution", value: 'skin' }
        ]
      : [
          { id: 'pvbt', label: "Simulation Chart", value: 'A' },
          { id: 'analysis', label: "Analysis Chart", value: 'B' }
        ];
  }, [flowRegime]);

  return (
    <section ref={wrapperRef} className="blueprint" style={{ padding: '14px 16px 16px', background: '#fff', scrollMarginTop: '70px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <LayoutGroup>
          <div className="seg" style={{ display: 'flex', position: 'relative' }}>
            {optionsList.map((opt) => (
              <motion.label
                key={opt.id}
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
                className="seg-opt"
                style={{
                  position: 'relative',
                }}
              >
                <input
                  type="radio"
                  name="chart-tab"
                  value={opt.value}
                  checked={visibleChart === opt.value}
                  onChange={() => showChart(opt.value)}
                />
                <span style={{ position: 'relative', zIndex: 1 }}>{opt.label}</span>
                {visibleChart === opt.value && flowRegime === 'radial' && !shouldReduceMotion && (
                  <motion.span
                    layoutId="radial-active-tab"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'var(--primary-color, #1a73e8)',
                      borderRadius: '4px',
                      zIndex: 0
                    }}
                    transition={{ type: "spring", stiffness: 500, damping: 40 }}
                  />
                )}
              </motion.label>
            ))}
          </div>
        </LayoutGroup>
        <span style={{ flex: 1 }}></span>
        {flowRegime === 'radial' && (
          <div style={{ display: 'flex', gap: '6px', marginRight: '16px' }}>
            <button className="btn" style={{ fontSize: '11px', padding: '4px 8px' }} onClick={() => {
              import('../tools/export').then(exp => {
                if (visibleChart === 'A') {
                  exp.exportRadialSimulationAll(radialSimulationCurves, currentSimulationId);
                } else if (visibleChart === 'design') {
                  exp.exportRadialDesignPlotTable(designPlotData, radialState.payzoneThickness, radialState.targetMode === 'length' ? radialCurves.map(c => c.target) : undefined);
                } else if (visibleChart === 'B') {
                  if (analysisPlottable) exp.exportRadialAnalysisTable(analyse.radial);
                } else if (visibleChart === 'skin') {
                  exp.exportRadialSkinTable(skinEvolutionData, radialState.targetMode === 'skin' ? radialCurves[0]?.target : undefined);
                }
              });
            }}>{t('chart.export_data')}</button>
          </div>
        )}
        {flowRegime === 'linear' && (
          <>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', cursor: 'pointer' }}>
              <input type="checkbox" checked={opt} onChange={(e) => setOpt(e.target.checked)} />{t('chart.pvbt_optimum')}
            </label>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', cursor: 'pointer' }}>
              <input type="checkbox" checked={xisLog} onChange={(e) => setxIsLog(e.target.checked)} />X-Log
            </label>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', cursor: 'pointer' }}>
              <input type="checkbox" checked={yisLog} onChange={(e) => { setyIsLog(e.target.checked); setUserToggledYLog(true); }} />Y-Log
            </label>
          </>
        )}
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', cursor: 'pointer' }}>
          <input type="checkbox" checked={grid} onChange={(e) => setGrid(e.target.checked)} />{t('chart.grid')}
        </label>
        <div style={{ width: '1px', height: '14px', background: '#ccc', margin: '0 4px' }}></div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', color: '#666' }} title={t("chart.the_gray_hatched_region_with")}>
          <span style={{ display: 'inline-block', width: '14px', height: '12px', background: 'rgba(97,97,97,0.15)', borderLeft: '2px solid #616161' }}></span>
          {t("chart.outside_validated_window")}
        </div>
      </div>

      {(() => {
        const isLog = visibleChart === 'design' ? { x: true, y: true }
          : visibleChart === 'skin' ? { x: true, y: false }
          : visibleChart === 'A' ? (flowRegime === 'radial' ? { x: false, y: true } : { x: xisLog, y: yisLog })
          : (flowRegime === 'radial' ? { x: false, y: true } : { x: xisLog, y: false });

        const xPreview = xdefinedLimit ? resolveAxisLimit(xLimit[0], xLimit[1], isLog.x) : {};
        const yPreview = ydefinedLimit ? resolveAxisLimit(yLimit[0], yLimit[1], isLog.y) : {};

        return (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                <label><input type="checkbox" checked={xdefinedLimit} onChange={(e) => setxDefinedLimit(e.target.checked)} /> {t('chart.x_limits')}</label>
                {xdefinedLimit && (
                  <>
                    <input type="text" className="input" style={{ width: '70px', minHeight: '24px', padding: '0 4px', borderRadius: '4px' }} placeholder={t("chart.min_auto")} value={xLimit[0]} onChange={(e) => setxLimit([e.target.value, xLimit[1]])} />
                    <input type="text" className="input" style={{ width: '70px', minHeight: '24px', padding: '0 4px', borderRadius: '4px' }} placeholder={t("chart.max_auto")} value={xLimit[1]} onChange={(e) => setxLimit([xLimit[0], e.target.value])} />
                  </>
                )}
              </div>
              {xPreview.error && <span style={{ fontSize: '10.5px', color: '#c0392b' }}>{t(xPreview.error)}</span>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                <label><input type="checkbox" checked={ydefinedLimit} onChange={(e) => setyDefinedLimit(e.target.checked)} /> {t('chart.y_limits')}</label>
                {ydefinedLimit && (
                  <>
                    <input type="text" className="input" style={{ width: '70px', minHeight: '24px', padding: '0 4px', borderRadius: '4px' }} placeholder={t("chart.min_auto")} value={yLimit[0]} onChange={(e) => setyLimit([e.target.value, yLimit[1]])} />
                    <input type="text" className="input" style={{ width: '70px', minHeight: '24px', padding: '0 4px', borderRadius: '4px' }} placeholder={t("chart.max_auto")} value={yLimit[1]} onChange={(e) => setyLimit([yLimit[0], e.target.value])} />
                  </>
                )}
              </div>
              {yPreview.error && <span style={{ fontSize: '10.5px', color: '#c0392b' }}>{t(yPreview.error)}</span>}
            </div>
          </div>
        );
      })()}

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', margin: '16px 2px 6px' }}>
        <h5 style={{ margin: 0, fontSize: '18px', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
          {visibleChart === 'A' ? "Simulation Chart" : visibleChart === 'design' ? "Design Plot" : "Analysis Chart"}
        </h5>
        <span className="text-muted" style={{ fontSize: '11.5px' }}>
          {visibleChart === 'A' ? (flowRegime === 'radial' ? t('chart.sub_sim_radial') : t('chart.sub_sim_linear')) : visibleChart === 'design' ? t('chart.sub_design') : (flowRegime === 'radial' ? t('chart.sub_analysis_radial') : t('chart.sub_analysis_linear'))}
        </span>
      </div>

      {visibleChart === 'A' && flowRegime === 'radial' && radialProcessed && radialValidity.worst && (
        <div role="alert" style={{
          margin: '0 2px 10px', padding: '9px 12px', fontSize: '12px', lineHeight: 1.5,
          border: `1px solid ${SEVERITY_COLORS.warn}`, borderLeft: `4px solid ${SEVERITY_COLORS.warn}`,
          borderRadius: '6px', background: '#fdf5ea', color: '#7a4a12',
        }}>
          {renderValidityText(radialValidity)}
        </div>
      )}

      {visibleChart === 'A' && flowRegime === 'linear' && linearValidity.worst && (
        <div role="alert" style={{
          margin: '0 2px 10px', padding: '9px 12px', fontSize: '12px', lineHeight: 1.5,
          border: `1px solid ${SEVERITY_COLORS.warn}`, borderLeft: `4px solid ${SEVERITY_COLORS.warn}`,
          borderRadius: '6px', background: '#fdf5ea', color: '#7a4a12',
        }}>
          {renderValidityText(linearValidity)}
        </div>
      )}

      {visibleChart === 'design' && (designPlotData?.outside_calibrated_range?.length ?? 0) > 0 && (
        <div role="alert" style={{ margin: '0 2px 10px', padding: '9px 12px', fontSize: '12px', lineHeight: 1.5, border: `1px solid ${SEVERITY_COLORS.warn}`, borderLeft: `4px solid ${SEVERITY_COLORS.warn}`, borderRadius: '6px', background: '#fdf5ea', color: '#7a4a12' }}>
          <strong>{t("chart.outside_calibrated_range")}</strong> {designPlotData!.outside_calibrated_range!.map((k: number) => roundCelsius(k, 2)).join(', ')} °C — {t('chart.design_outside_range', { lo: T_CALIBRATED_C[0], hi: T_CALIBRATED_C[1] })}
        </div>
      )}

      {visibleChart === 'design' && designPlotData?.has_clipped_volume && (
        <PhysicalLimitNote lang={lang} swept="length" />
      )}

      {visibleChart === 'B' && flowRegime === 'radial' && analysisPlottable && analyse.radial?.hasClippedVolume && (
        <PhysicalLimitNote lang={lang} swept={analyse.radial.sweepParam} />
      )}

      {visibleChart === 'B' && flowRegime === 'radial' && analysisPlottable && (analyse.radial?.outsideCalibratedRange.length ?? 0) > 0 && (
        <div role="alert" style={{ margin: '0 2px 10px', padding: '9px 12px', fontSize: '12px', lineHeight: 1.5, border: `1px solid ${SEVERITY_COLORS.warn}`, borderLeft: `4px solid ${SEVERITY_COLORS.warn}`, borderRadius: '6px', background: '#fdf5ea', color: '#7a4a12' }}>
          <strong>{t("chart.outside_calibrated_range")}</strong> {t('chart.analysis_outside_range', { count: analyse.radial!.outsideCalibratedRange.length, lo: T_CALIBRATED_C[0], hi: T_CALIBRATED_C[1] })}
        </div>
      )}

      {visibleChart === 'B' && flowRegime === 'radial' && analysisPlottable && (analyse.radial?.skippedValues.length ?? 0) > 0 && (
        <div role="status" style={{ margin: '0 2px 10px', padding: '9px 12px', fontSize: '12px', border: `1px solid ${SEVERITY_COLORS.warn}`, borderRadius: '6px', background: '#fdf5ea', color: '#7a4a12' }}>
          {t("chart.no_interior_optimum_exists_for")} {analyse.radial!.skippedValues.map(v => Number(v.toPrecision(4))).join(', ')} — {t("chart.these_values_were_skipped")}
        </div>
      )}

      {visibleChart === 'design' && flowRegime === 'radial' && !!designPlotData?.series?.length && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '0 2px 12px', padding: '10px 14px', border: '1px solid #ddd', borderRadius: '6px' }}>
          <ChipRow
            legendLabel={t("chart.temperatures")}
            items={designPlotData.series.map((s: any, idx: number) => ({
              id: String(s.temperature_k),
              label: `${roundCelsius(s.temperature_k, 2).toLocaleString(numberLocale(lang), { minimumFractionDigits: 2, maximumFractionDigits: 2 })} °C`,
              color: CURVE_PALETTE[idx % CURVE_PALETTE.length],
            }))}
            active={designActiveTemps}
            onToggle={(id) => setDesignActiveTemps((prev) => toggleInSet(prev, id))}
          />
          <SegmentedControl
            legendLabel={t("chart.show")}
            options={[
              { value: 'rate', label: t('chart.legend_rate'), preview: 'solid' },
              { value: 'volume', label: t('chart.legend_volume'), preview: 'dashed' },
              { value: 'both', label: t("chart.both") },
            ]}
            value={designSeriesFilter}
            onChange={setDesignSeriesFilter}
          />
        </div>
      )}

      {visibleChart === 'design' && flowRegime === 'radial' && !!designPlotData?.series?.length && (
        <DesignPlotReader series={designPlotData.series} onReadingChange={setGuidedReading} />
      )}

      {visibleChart === 'A' && flowRegime === 'radial' && radialCurves.length > 0 && (
        <div style={{ margin: '0 2px 12px', padding: '10px 14px', border: '1px solid #ddd', borderRadius: '6px' }}>
          <ChipRow
            legendLabel={t("chart.targets")}
            items={radialCurves.map((c, idx) => ({
              id: c.target_label,
              label: c.target_label,
              color: CURVE_PALETTE[idx % CURVE_PALETTE.length],
            }))}
            active={simActiveTargets}
            onToggle={(id) => setSimActiveTargets((prev) => toggleInSet(prev, id))}
            extra={
              <Chip
                item={{ id: '__optimum_path__', label: t('chart.legend_opt_path'), color: '#4A90E2' }}
                isActive={simShowOptimumPath}
                onToggle={() => setSimShowOptimumPath((prev) => !prev)}
              />
            }
          />
        </div>
      )}

      {visibleChart === 'skin' && skinEvolutionData && Object.keys(skinEvolutionData).length > 0 && (
        <div style={{ margin: '0 2px 12px', padding: '10px 14px', border: '1px solid #ddd', borderRadius: '6px' }}>
          <ChipRow
            legendLabel={t("chart.flow_rates")}
            items={Object.keys(skinEvolutionData).map((q, idx) => ({
              id: q,
              label: `${q} bbl/min`,
              color: CURVE_PALETTE[idx % CURVE_PALETTE.length],
            }))}
            active={skinActiveFlowrates}
            onToggle={(id) => setSkinActiveFlowrates((prev) => toggleInSet(prev, id))}
          />
        </div>
      )}

      <div ref={containerRef} style={{ width: '100%', height: visibleChart === 'design' ? '70vh' : '520px', minHeight: visibleChart === 'design' ? '600px' : 'auto', position: 'relative' }}>
        <AnimatePresence mode="wait">
          {visibleChart === 'A' && (
            <motion.div
              key="A"
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -24 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              onAnimationComplete={handleAnimationComplete}
              style={{ height: "100%", width: "100%", position: "absolute", top: 0, left: 0 }}
            >
              <ReactECharts option={chartOptions} ref={chartRefA} notMerge={true} style={{ height: "100%", width: "100%" }} />
            </motion.div>
          )}
          {visibleChart === 'B' && (
            <motion.div
              key="B"
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -24 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              onAnimationComplete={handleAnimationComplete}
              style={{ height: "100%", width: "100%", position: "absolute", top: 0, left: 0 }}
            >
              {analysisMessage ? (
                <div role="status" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center', fontSize: '13.5px', color: analyse.status === 'error' && analysisForCurrentRegime ? '#c0392b' : 'var(--color-text-muted, #666)' }}>
                  {analysisMessage}
                </div>
              ) : (
                <ReactECharts option={chartOptionsA} ref={chartRefB} notMerge={true} style={{ height: "100%", width: "100%" }} />
              )}
            </motion.div>
          )}
          {visibleChart === 'design' && (
            <motion.div
              key="design"
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -24 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              onAnimationComplete={handleAnimationComplete}
              style={{ height: "100%", width: "100%", position: "absolute", top: 0, left: 0 }}
            >
              <ReactECharts option={designChartOptions} ref={chartRefDesign} notMerge={true} style={{ height: "100%", width: "100%" }} />
            </motion.div>
          )}
          {visibleChart === 'skin' && (
            <motion.div
              key="skin"
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -24 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              onAnimationComplete={handleAnimationComplete}
              style={{ height: "100%", width: "100%", position: "absolute", top: 0, left: 0 }}
            >
              <ReactECharts option={skinChartOptions} ref={chartRefSkin} notMerge={true} style={{ height: "100%", width: "100%" }} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};

export default ChartComponent;

