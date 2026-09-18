import ReactECharts from "echarts-for-react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../redux/store";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion, LayoutGroup } from "motion/react";
import type { TooltipComponentFormatterCallbackParams } from "echarts";
import { CurveAnalysis } from "../redux/analysisresults/slice";
import { fetchDesignPlot } from "../redux/radial/slice";
import { getOptimalPointsForDesign } from "../tools/chartDataUtils";
import DesignPlotReader from "./DesignPlotReader";
import { splitByValidity, collectValidityOffenders, readValidity, fmtBblMin, fmtRatio } from "../tools/validityWindow";
import { SEVERITY_COLORS } from "../tools/pointSeverity";
import { setVisibleChart } from "../redux/ui/slice";

const toLogDecadeAxis = (lo: number | undefined, hi: number | undefined) => {
  if (lo === undefined || hi === undefined || !(lo > 0) || !(hi > 0)) return undefined;
  return { 
    min: 10 ** Math.floor(Math.log10(lo)), 
    max: 10 ** Math.ceil(Math.log10(hi)) 
  };
};

// Trecho fora da janela validada: cinza tracejado. Vermelho fica reservado
// para erro numerico de verdade (status !== "ok"), nunca para "fora da janela".
const OUT_OF_WINDOW_GRAY = "#616161";
const OUT_OF_WINDOW_BAND = "rgba(97,97,97,0.05)"; // Opacidade reduzida para evitar que faixas sobrepostas fiquem pretas

// Paleta padrao do ECharts 5. Fixada explicitamente porque cada curva (radial
// OU linear, Fase 7.3) agora emite 2 series (solid + dashed) -- sem cor
// explicita o auto-assign pulava uma cor por curva. Cor estavel por indice:
// nao pisca entre renders (era Math.random() no ramo linear) e o markArea da
// 7.4 pinta a faixa de fundo na cor da curva dona daquele trecho.
const CURVE_PALETTE = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc'];

// Fase 7.7: range do eixo Y calculado SO com pontos dentro da janela de
// validade. `solid` (splitByValidity) ja e exatamente o conjunto de vertices
// confiaveis -- reusamos ele, sem inventar um segundo mecanismo de filtro.
// Pontos fora da janela seguem desenhados (tracejado) mas podem sair da area
// visivel: a propria pesquisa ja mostrou que nao representam comportamento
// fisico real. Nenhuma curva com ponto dentro da janela => undefined
// (auto-range do ECharts, fallback -- senao o eixo ficaria sem referencia).
// isLog: margem multiplicativa e so entram valores > 0.
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
const Y_LOG_AUTO_RATIO = 1000; // calibrado para o Simulation; mesma grandeza no Analysis

const spansOrders = (values: (number | null | undefined)[]): boolean => {
  const pos = values.filter(
    (v): v is number => typeof v === "number" && Number.isFinite(v) && v > 0,
  );
  if (pos.length < 2) return false;
  const lo = Math.min(...pos);
  const hi = Math.max(...pos);
  const ratio = hi / lo;
  // TEMP (debug auto Y-Log): razao exata usada na comparacao. REMOVER.
  console.log("[auto-Y-Log] spansOrders", { n: pos.length, lo, hi, ratio, threshold: Y_LOG_AUTO_RATIO });
  return ratio >= Y_LOG_AUTO_RATIO;
};

const ChartComponent = () => {
  const dispatch = useDispatch();
  const { curves } = useSelector((state: RootState) => state.resultCurves);
  const analyse: CurveAnalysis = useSelector((state: RootState) => state.analysisResult);
  const radialState = useSelector((state: RootState) => state.radial);
  const { flowRegime, curves: radialCurves, processed: radialProcessed, skinEvolutionData, designPlotData } = radialState;
  const visibleChart = useSelector((state: RootState) => state.ui.visibleChart);

  // Resumo agregado (contagem + pior ponto) para o banner de validade.
  // Barato; radialCurves so muda num novo Calculate.
  const radialValidity = flowRegime === 'radial'
    ? collectValidityOffenders(radialCurves)
    : { count: 0, curvesAffected: 0, worst: null };

  // Fase 7.5: mesmo resumo do banner radial, agora no ramo linear. O store
  // linear (storageresults) usa chaves camelCase; collectValidityOffenders
  // espera o contrato ValidityAwareCurve (snake_case, igual ao radial), entao
  // adaptamos aqui -- passar `curves` cru era no-op silencioso (flowratepoints/
  // within_validity_range undefined => nenhum ponto contava). id da curva entra
  // como target_label pra "em N curvas" / "na curva X" funcionarem igual ao
  // radial. Nenhum calculo novo: mesma funcao, mesmo metadata do backend.
  const linearValidity = flowRegime === 'linear'
    ? collectValidityOffenders(
        curves
          .filter(c => c.flowratePoints && c.flowratePoints.length > 0)
          .map(c => ({
            target_label: c.id,
            flowratepoints: c.flowratePoints,
            within_validity_range: c.withinValidityRange,
            metadata: c.metadata ?? null,
          }))
      )
    : { count: 0, curvesAffected: 0, worst: null };

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
  // Latch da Item 1: enquanto false, `yisLog` e derivado do dado (auto Y-Log);
  // no primeiro clique do usuario na checkbox Y-Log vira true e a escolha
  // manual passa a mandar -- auto-deteccao para de sobrescrever pelo resto da
  // sessao. Nao reseta em novo Calculate (decisao simples; revisar se incomodar).
  const [userToggledYLog, setUserToggledYLog] = useState(false);
  const [grid, setGrid] = useState(true);

  const [xdefinedLimit, setxDefinedLimit] = useState(false);
  const [ydefinedLimit, setyDefinedLimit] = useState(false);
  const [xLimit, setxLimit] = useState(['', '']);
  const [yLimit, setyLimit] = useState(['', '']);
  const [guidedReading, setGuidedReading] = useState<any>(null);

  // Item 1 (auto Y-Log): valor sugerido para `yisLog`, calculado do dado do
  // grafico VISIVEL. Analysis (B) -> pvbtPoints crus. Simulation linear (A) ->
  // pontos DENTRO da janela validada de todas as curvas salvas (mesmo filtro
  // da Fase 7.7). Simulation radial -> null (eixo log fixo, nada a sugerir).
  const autoYLog = useMemo<boolean | null>(() => {
    if (visibleChart === 'B') {
      const yValues = flowRegime === 'radial' ? analyse.volumeToBt : analyse.pvbtPoints;
      return spansOrders(yValues || []);
    }
    if (visibleChart === 'A' && flowRegime === 'linear') {
      const ys = curves
        .filter(c => c.flowratePoints && c.flowratePoints.length > 0)
        .flatMap(c => {
          const pts = (c.outputMode === 'volume' ? c.acidVolumePoints : c.pvbtPoints) || [];
          const within = c.withinValidityRange || [];
          return pts.filter((_, i) => within[i] !== false);
        });
      // TEMP (debug auto Y-Log): array Y bruto que alimenta spansOrders. REMOVER.
      console.log("[auto-Y-Log] Simulation linear Y-array", {
        outputMode: curves.map(c => c.outputMode),
        flowratePointsSample: curves.map(c => c.flowratePoints?.slice(0, 3)),
        ys,
      });
      return spansOrders(ys);
    }
    return null;
  }, [visibleChart, flowRegime, analyse.pvbtPoints, curves]);

  // Aplica a sugestao enquanto o usuario nao tiver mexido na checkbox Y-Log.
  // setyIsLog com o mesmo valor e no-op no React -- sem loop com os effects
  // de montagem do grafico (que tem yisLog nas deps).
  useEffect(() => {
    if (!userToggledYLog && autoYLog !== null) setyIsLog(autoYLog);
  }, [autoYLog, userToggledYLog]);

  useEffect(() => {
    if (flowRegime === 'linear' && visibleChart === 'design') {
      dispatch(setVisibleChart('A'));
    }
  }, [flowRegime]);



  useEffect(() => {
    if (visibleChart === 'design' && flowRegime === 'radial' && radialProcessed) {
      dispatch(fetchDesignPlot() as any);
    }
  }, [visibleChart, flowRegime, radialProcessed, dispatch]);

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

  // Mapa para definir o título do Eixo X com base no sweepParameter
  const getXAxisName = (param?: string) => {
    switch (param) {
      case 'temperature':
        return "System Temperature (°C)";
      case 'porosity':
      case 'core porosity':
        return "Core Porosity (fraction)";
      case 'acid_concentration':
      case 'acid concentration':
        return "Acid Concentration (w/w)";
      case 'core_length':
      case 'core length':
        return "Core Length (in)";
      case 'wellbore_size':
      case 'wellbore size':
      case 'core_diameter':
      case 'core diameter':
        return flowRegime === 'radial' ? "Wellbore Size (in)" : "Core Diameter (in)";
      default:
        return analyse.id ? analyse.id : "Sweep Parameter";
    }
  };

  useEffect(() => {
    const isRadial = flowRegime === 'radial';
    const analysisSerie = ({
      name: analyse.id + ' variation',
      type: "line",
      data: analyse.analiticalpoints ? analyse.analiticalpoints.map((x, index) => {
        const yVal = isRadial ? analyse.volumeToBt?.[index] : analyse.pvbtPoints?.[index];
        return [
          Number(x?.toFixed(4) || 0),
          Number(yVal?.toFixed(4) || 0),
        ];
      }) : [],
      color: "#" + Math.floor(Math.random() * 16777215).toString(16),
      showSymbol: true,
      smooth: true,
      markPoint: opt ? {
        data: [
          {
            type: "min",
            name: "Mínimo",
            symbolSize: 30,
            label: {
              formatter: "optimum: {@[1]}",
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
      grid: { bottom: 60, left: 50, right: 40, top: 30 },
      xAxis: {
        z: 10,
        name: getXAxisName(sweepParameter),
        nameLocation: 'middle',
        nameGap: 25,
        type: xisLog ? "log" : "value",
        min: xdefinedLimit ? xLimit[0] : undefined,
        max: xdefinedLimit ? xLimit[1] : undefined,
        splitLine: { show: grid }
      },
      yAxis: {
        z: 10,
        name: isRadial ? "Acid Volume (gal/ft)" : "PVBt (dimensionless)",
        type: isRadial ? "log" : "value",
        min: ydefinedLimit ? yLimit[0] : undefined,
        max: ydefinedLimit ? yLimit[1] : undefined,
        splitLine: { show: grid }
      },
      series: analysisSerie,
    });
  }, [analyse, opt, xisLog, yisLog, xdefinedLimit, ydefinedLimit, grid, flowRegime, sweepParameter]);

  useEffect(() => {
    // Compartilhado pelos dois ramos (radial e linear): arredonda o vertice
    // [x,y] que splitByValidity emite, preservando o null que quebra a linha.
    const round4 = (p: [number, number] | null) =>
      p == null ? null : [Number(p[0].toFixed(4)), Number(p[1].toFixed(4))];

    if (flowRegime === 'radial') {
      // Cada curva vira DOIS traces de mesmo nome (1 item de legenda controla
      // os dois): solid = dentro da janela (cor da curva), dashed cinza = fora.
      // splitByValidity injeta o vertice exato do cruzamento nos dois, entao
      // os segmentos se encontram na borda sem buraco. markArea sombreia o
      // fundo fora da janela -- por curva, e faixas de curvas distintas se
      // somam visualmente (opacidade baixa).
      const solids: ([number, number] | null)[][] = [];
      const allCurvesSeries = radialCurves.flatMap((curve, ci) => {
        const curveColor = CURVE_PALETTE[ci % CURVE_PALETTE.length];
        const fps = curve.flowratepoints || [];
        const { solid, dashed, bandBelow, bandAbove } = splitByValidity(
          fps,
          curve.acidvolumepoints || [],
          curve.within_validity_range || [],
          curve.metadata || null
        );
        solids.push(solid);

        // Borda externa da faixa = extremo REAL do sweep (fps[0] / ultimo)
        const meta = curve.metadata;
        const markAreaData: { xAxis: number }[][] = [];
        if (meta && bandBelow) markAreaData.push([{ xAxis: fps[0] }, { xAxis: Number(meta.validity_min_gal_ft_min.toFixed(4)) }]);
        if (meta && bandAbove) markAreaData.push([{ xAxis: Number(meta.validity_max_gal_ft_min.toFixed(4)) }, { xAxis: fps[fps.length - 1] }]);

        const markPointData: any[] = [];
        if (opt) {
          markPointData.push({
            type: "min",
            name: "Mínimo",
            symbolSize: 30,
            label: {
              formatter: "optimum: {@[1]}",
              position: "top",
              color: "#fff",
              backgroundColor: "#24a424",
              padding: 5,
              borderRadius: 5,
            },
            itemStyle: { color: "#24a424" },
          });
        }

        if (meta && bandBelow) {
          const firstSolid = solid.find(p => p !== null);
          if (firstSolid) {
            markPointData.push({
              coord: round4(firstSolid),
              symbol: 'circle',
              symbolSize: 8,
              itemStyle: { color: curveColor, borderColor: '#fff', borderWidth: 1.5 },
              label: { show: true, position: 'bottom', color: curveColor, fontSize: 10, formatter: curve.target_label }
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
              label: { show: true, position: 'top', color: curveColor, fontSize: 10, formatter: curve.target_label }
            });
          }
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

      // yAxis radial e sempre log -> isLog = true.
      const simRadialYs = flowRegime === 'radial' ? [
    ...(pvbtMinMax ? [pvbtMinMax.min, pvbtMinMax.max] : []),
    ...(acidVolMinMax ? [acidVolMinMax.min, acidVolMinMax.max] : [])
  ] : [];
  const simRadialLogAxis = flowRegime === 'radial' ? toLogDecadeAxis(Math.min(...simRadialYs), Math.max(...simRadialYs)) : undefined;

      setChartOptions({
        tooltip: {
          trigger: "axis",
          formatter: (params: TooltipComponentFormatterCallbackParams | TooltipComponentFormatterCallbackParams[]) => {
            const paramArray = Array.isArray(params) ? params : [params];
            let tooltipContent = `Injection Rate: ${(paramArray[0] as any).axisValue ?? ""}<br/>`;
            const seen = new Set<string>();
            paramArray.forEach((item) => {
              const it = item as any;
              if (it.seriesName === "Optimum injection rates path") return;
              // ponto de quebra (null) do trace solid ou dashed
              if (it.value == null || it.value[1] == null) return;
              // solid + dashed compartilham nome: uma linha so por curva
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
        legend: { orient: 'horizontal', right: 10, top: 10 },
        toolbox: { feature: { dataZoom: { yAxisIndex: 'none' }, restore: {}, myResetZoom: { show: true, title: 'Reset Zoom', icon: 'path://M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z', onclick: () => { const chart = (chartRefA.current as any); if (chart) { chart.getEchartsInstance().dispatchAction({ type: 'dataZoom', start: 0, end: 100 }); } } } } },
        dataZoom: [
          { type: 'inside', xAxisIndex: 0 },
          { type: 'slider', xAxisIndex: 0, bottom: 4, height: 14, showDataShadow: false, handleSize: '80%', showDetail: false }
        ],
        grid: { bottom: 60, left: 60, right: 40, top: 60, containLabel: true },
        xAxis: {
          z: 10,
          name: "Injection Rate, gal/(ft.min)",
          nameLocation: 'middle',
          nameGap: 35,
          type: "value",
          min: xdefinedLimit ? xLimit[0] : undefined,
          max: xdefinedLimit ? xLimit[1] : undefined,
          splitLine: { show: grid }
        },
        yAxis: {
          z: 10,
          name: "Acid Volume, gal/ft",
          nameLocation: 'middle',
          nameGap: 65,
          type: "log",
          logBase: 10,
          min: ydefinedLimit ? yLimit[0] : (simRadialLogAxis?.min ?? undefined),
          max: ydefinedLimit ? yLimit[1] : (simRadialLogAxis?.max ?? undefined),
          splitLine: { show: grid },
          axisLabel: {
            formatter: (val: number) => new Intl.NumberFormat('pt-BR', { notation: val >= 1e6 ? 'compact' : 'standard' }).format(val)
          }
        },
        series: [
          ...allCurvesSeries,
          {
            name: "Optimum injection rates path",
            type: "line",
            data: optimalPoints.length > 1 ? optimalPoints.map(p => [p.optimalFlowrate, p.optimalVolume]) : [],
            lineStyle: { type: 'dashed', width: 3, color: '#4A90E2' },
            itemStyle: { color: '#4A90E2' },
            symbol: 'none',
            z: 20,
            markPoint: optimalPoints.length === 1 ? {
              data: [
                {
                  name: "Optimum",
                  coord: [optimalPoints[0].optimalFlowrate, optimalPoints[0].optimalVolume],
                  symbol: 'pin',
                  symbolSize: 40,
                  itemStyle: { color: '#4A90E2' },
                  label: { show: false }
                }
              ]
            } : undefined
          }
        ],
      });
    } else {
      const validCurves = curves.filter(curve => curve.flowratePoints && curve.flowratePoints.length > 0);
      const allOutputModes = validCurves.map((curve) => curve.outputMode).filter(Boolean);
      const allVolume = allOutputModes.length > 0 && allOutputModes.every((m) => m === 'volume');
      const yAxisName = allVolume ? "Acid Volume (gal)" : "PVBt";

      // Fase 7.3: espelha o ramo radial -- cada curva vira DOIS traces de
      // mesmo nome (1 item de legenda controla os dois): solid = dentro da
      // janela recomendada, dashed CINZA neutro = fora. Vermelho fica
      // reservado a erro numerico de verdade (status !== "ok"), marcado por
      // linha na tabela (Results.tsx), nunca aqui. splitByValidity (DOM-free,
      // testada) injeta o vertice do cruzamento nos dois traces; o interpY
      // dela e geometrico (casa com Y-log) -- diferenca desprezivel no Y
      // linear sob smooth:true. Banner fica para 7.5.
      //
      // Fase 7.4: markArea sombreia o fundo FORA da janela -- por curva,
      // reusando bandBelow/bandAbove do splitByValidity (mesma funcao, sem
      // calculo novo). Cinza OUT_OF_WINDOW_BAND (mesma base #616161 da linha
      // tracejada); nunca vermelho (erro numerico) nem amarelo (colide com
      // CURVE_PALETTE[2]). Limite interno da unidade linear via readValidity
      // (Fase 7.1); borda externa = extremo REAL do sweep (fps[0] / ultimo),
      // nao {xAxis:'min'|'max'} -- esses resolvem para o menor/maior x que
      // sobrou NA SERIE, e splitByValidity descarta o x dos pontos clipped
      // (null puro), entao a faixa ancorava no 1o ponto nao clipado.
      // Rodadas distintas se somam em opacidade baixa, sem logica de uniao.
      // metadata=null (sem otimo interior) => sem faixa, mesmo "silencio" da
      // linha (7.3) e do banner (7.5) -- mesmo codepath do 7.6.
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
        if (opt) {
          markPointData.push({
            type: "min",
            name: "Mínimo",
            symbolSize: 30,
            label: {
              formatter: "optimum: {@[1]}",
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

      // yAxis linear acompanha o toggle Y-Log.
      const yRange = validityYRange(solids, yisLog);

      setChartOptions({
        tooltip: {
          trigger: "axis",
          formatter: (params: TooltipComponentFormatterCallbackParams | TooltipComponentFormatterCallbackParams[]) => {
            const paramArray = Array.isArray(params) ? params : [params];
            let tooltipContent = `${(paramArray[0] as any).axisValue ?? ""}<br/>`;
            const seen = new Set<string>();
            paramArray.forEach((item) => {
              const it = item as any;
              // ponto de quebra (null) de um dos traces solid/dashed (Fase 7.3)
              if (it.value == null || it.value[1] == null) return;
              // solid + dashed compartilham nome: uma linha so por curva
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
        toolbox: { feature: { dataZoom: { yAxisIndex: 'none' }, restore: {}, myResetZoom: { show: true, title: 'Reset Zoom', icon: 'path://M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z', onclick: () => { const chart = (chartRefA.current as any); if (chart) { chart.getEchartsInstance().dispatchAction({ type: 'dataZoom', start: 0, end: 100 }); } } } } },
        dataZoom: [
          { type: 'inside', xAxisIndex: 0 },
          { type: 'slider', xAxisIndex: 0, bottom: 4, height: 14, showDataShadow: false, handleSize: '80%', showDetail: false }
        ],
        grid: { bottom: 60, left: 50, right: 100, top: 40, containLabel: true },
        xAxis: {
          z: 10,
          name: "Flowrate",
          nameLocation: 'middle',
          nameGap: 35,
          type: xisLog ? "log" : "value",
          min: xdefinedLimit ? xLimit[0] : undefined,
          max: xdefinedLimit ? xLimit[1] : undefined,
          splitLine: { show: grid }
        },
        yAxis: {
          z: 10,
          name: yAxisName,
          nameLocation: 'middle',
          nameGap: 65,
          type: yisLog ? "log" : "value",
          min: ydefinedLimit ? yLimit[0] : undefined,
          max: ydefinedLimit ? yLimit[1] : undefined,
          splitLine: { show: grid }
        },
        series: allCurvesSeries,
      });
    }
  }, [curves, radialCurves, flowRegime, opt, xisLog, yisLog, xdefinedLimit, ydefinedLimit, grid]);

  useEffect(() => {
    if (visibleChart === 'design' && flowRegime === 'radial' && designPlotData?.series?.length) {
      // 1. Calcular os limites dos dados já cortados (backend descarta
      // v_opt_norm > 1000 gal/ft em generate_design_plot, PVBTradialFunc.py)
      const allRates = designPlotData.series.flatMap((s: any) => s.optimum_rate_series.map((pt: any) => pt[0]));
      const allVols = designPlotData.series.flatMap((s: any) => s.optimum_volume_series.map((pt: any) => pt[0]));
      const allLengths = designPlotData.series.flatMap((s: any) => s.optimum_rate_series.map((pt: any) => pt[1]));

      const rateMin = allRates.length ? Math.min(...allRates) : 0.02;
      const rateMax = allRates.length ? Math.max(...allRates) : 2000;
      const volMin = allVols.length ? Math.min(...allVols) : 0.01;
      const volMax = allVols.length ? Math.max(...allVols) : 1000;
      const lengthMin = allLengths.length ? Math.min(...allLengths) : 1;
      const lengthMax = allLengths.length ? Math.max(...allLengths) : 20;

      // Eixo Y arredondado para decadas inteiras (como a Fig. 38 do artigo:
      // 1 a 100), nao lengthMin/10..lengthMax*10 -- essa folga de uma decada
      // por ponta comprime as curvas e anuncia comprimentos inexistentes, e
      // pior, faz o ECharts descartar (sem cortar) qualquer segmento de seta
      // que aponte fora da extensao auto-calculada do eixo.
      const yAxisMin = Math.pow(10, Math.floor(Math.log10(lengthMin)));
      const yAxisMax = Math.pow(10, Math.ceil(Math.log10(lengthMax)));

      // Regra do artigo (Fig. 29/38): os dois eixos X NAO sao auto-fit independentes
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
      
      // Preparar as setas da leitura guiada (markLine)
      let guidedReadingMarkLineData: any[] = [];
      // Rotulos com o valor REAL (r.qOpt/r.vOpt/r.length), nao qX_mapped --
      // qX_mapped e so a posicao (mapeada para o espaco do eixo de volume,
      // ja que o markLine/markPoint esta pendurado na serie "Volume",
      // xAxisIndex 1). O crosshair nativo do ECharts nao serve para isso:
      // com 2 eixos X e so a serie Volume tendo dado de verdade no ponto,
      // o rotulo que o usuario via vinha por cima do segmento errado e com
      // o numero de posicao (qX_mapped), nao o valor fisico (bug reportado
      // apos verificacao visual, ver conversa). Marcador explicito fixa
      // posicao E valor ao mesmo tempo, sem depender do axisPointer.
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
              formatter: `V = ${r.vOpt.toFixed(3)} gal/ft`,
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
              formatter: `q = ${r.qOpt.toFixed(4)} gal/(ft.min)`,
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

        // Setas terminam exatamente nas bordas do eixo Y (yAxisMin/Max),
        // nunca fora delas -- valores fora da extensao do eixo fazem o
        // ECharts descartar o segmento inteiro em vez de corta-lo.
        const yTop = yAxisMax;
        const yBottom = yAxisMin;

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
          const isSelectedTarget = guidedReading && guidedReading.temperatureK === s.temperature_k;
          
          if (isSelectedTarget) {
              console.assert(guidedReading.temperatureK === s.temperature_k, "AS DUAS PONTAS DA SETA SAO DA MESMA TEMPERATURA");
          }

          return [
              {
                  name: `Rate (${s.temperature_k} K)`,
                  type: 'line',
                  smooth: true,
                  showSymbol: false,
                  xAxisIndex: 0,
                  data: s.optimum_rate_series,
                  lineStyle: { type: 'solid', width: 2 },
                  itemStyle: { color }
              },
              {
                  name: `Volume (${s.temperature_k} K)`,
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
              }
          ];
      });

      setDesignChartOptions({
        tooltip: {
          trigger: 'axis',
          // snap:false -- so nao, o rotulo do crosshair do eixo Y fica
          // atrelado a serie que tem dado no ponto (Volume, xAxisIndex 1);
          // como o eixo espelhado da direita (yAxis[1]) nao tem NENHUMA
          // serie pendurada nele, ele nao tem o que "encaixar" (snap) e cai
          // no valor continuo puro do pixel do mouse -- os dois rotulos
          // divergiam (um encaixado na grade, outro continuo) mesmo com
          // min/max identicos nos dois eixos. Sem snap, os dois leem a
          // mesma transformacao continua pixel->valor e ficam identicos.
          axisPointer: { type: 'cross', axis: 'y', snap: false },
          formatter: function(params: any) {
            if (!params || !params.length) return "";
            const yValue = params[0].value[1];
            let html = `<strong>Wormhole Length: ${yValue} ft</strong><br/>`;
            params.forEach((param: any) => {
               const colorSpan = `<span style="display:inline-block;margin-right:5px;border-radius:10px;width:9px;height:9px;background-color:${param.color}"></span>`;
               const xValue = param.value[0];
               let xStr = xValue >= 10000 || xValue <= 0.0001 ? xValue.toExponential(4) : xValue.toFixed(4);
               html += `${colorSpan}${param.seriesName}: <strong>${xStr}</strong><br/>`;
            });
            return html;
          }
        },
        legend: { 
          orient: 'horizontal', 
          bottom: 0, 
          type: 'scroll', 
          padding: [10, 0, 0, 0], 
          itemGap: 20 
        },
        grid: { 
          top: 80, 
          bottom: 60, 
          left: 50, 
          right: 50, 
          containLabel: true 
        },
        toolbox: { feature: { dataZoom: { yAxisIndex: 'none' }, restore: {}, myResetZoom: { show: true, title: 'Reset Zoom', icon: 'path://M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z', onclick: () => { const chart = (chartRefDesign.current as any); if (chart) { chart.getEchartsInstance().dispatchAction({ type: 'dataZoom', start: 0, end: 100 }); } } } } },
        dataZoom: [
          { type: 'inside', xAxisIndex: [0, 1], filterMode: 'none' },
          { type: 'slider', xAxisIndex: [0, 1], bottom: 4, height: 14, showDataShadow: false, handleSize: '80%', showDetail: false, filterMode: 'none' }
        ],
        // EIXOS Y (Duplos: esquerda e direita)
        yAxis: [
          {
            type: 'log',
            name: 'Wormhole Length, ft',
            nameLocation: 'middle',
            nameGap: 65,
            min: yAxisMin,
            max: yAxisMax,
            logBase: 10,
            splitLine: { show: grid }
          },
          {
            // Mesmo min/max do eixo esquerdo -- se divergirem, o eixo
            // espelhado da direita mostra outra escala e a leitura lateral
            // fica errada de forma silenciosa (cada eixo parece certo
            // isoladamente).
            type: 'log',
            position: 'right',
            name: 'Wormhole Length, ft',
            nameLocation: 'middle',
            nameGap: 65,
            min: yAxisMin,
            max: yAxisMax,
            logBase: 10,
            splitLine: { show: false }
          }
        ],
        
        // EIXOS X (Duplo)
        xAxis: [
            {
                // 1. EIXO INFERIOR (Rate)
                type: 'log',
                name: 'Optimum Injection Rate, gal/(ft·min)',
                position: 'bottom',
                nameLocation: 'middle',
                nameGap: 30,
                min: rateAxisMin,
                max: rateAxisMax,
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
                // 2. EIXO SUPERIOR (Volume)
                type: 'log',
                name: 'Acid Volume @ Optimum Rate, gal/ft',
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
  }, [designPlotData, flowRegime, visibleChart, grid, guidedReading]);

  useEffect(() => {
    if (visibleChart === 'skin' && skinEvolutionData && Object.keys(skinEvolutionData).length > 0) {
      setSkinChartOptions({
        tooltip: {
            trigger: 'axis',
            formatter: function (params: any) {
                if (!params.length) return "";
                let tooltipText = `Volume: ${params[0].value[0].toFixed(1)} gal/ft<br/>`;
                params.forEach((param: any) => {
                    tooltipText += `${param.seriesName}: Skin ${param.value[1].toFixed(2)}<br/>`;
                });
                return tooltipText;
            }
        },
        legend: {
            data: Object.keys(skinEvolutionData).map(q => `${q} bbl/min`)
        },
        toolbox: { feature: { dataZoom: { yAxisIndex: 'none' }, restore: {}, myResetZoom: { show: true, title: 'Reset Zoom', icon: 'path://M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z', onclick: () => { const chart = (chartRefSkin.current as any); if (chart) { chart.getEchartsInstance().dispatchAction({ type: 'dataZoom', start: 0, end: 100 }); } } } } },
        dataZoom: [
          { type: 'inside', xAxisIndex: 0 },
          { type: 'slider', xAxisIndex: 0, bottom: 4, height: 14, showDataShadow: false, handleSize: '80%', showDetail: false }
        ],
        xAxis: {
            name: 'Acid Volume (gal/ft)',
            type: 'log', // Escala logaritmica
            nameLocation: 'middle',
            nameGap: 35,
            ...toLogDecadeAxis((value as any).min, (value as any).max),
            axisLabel: {
              formatter: (val: number) => new Intl.NumberFormat('pt-BR', { notation: val >= 1e6 ? 'compact' : 'standard' }).format(val)
            }
        },
        yAxis: {
            name: 'Skin',
            type: 'value',
            max: 0, // CRÍTICO: Fixar o teto em 0
            nameLocation: 'middle',
            nameGap: 40
        },
        series: Object.keys(skinEvolutionData).map(q => ({
            name: `${q} bbl/min`,
            type: 'line',
            smooth: true,
            showSymbol: false,
            data: skinEvolutionData[q].map((point: {x: number, y: number}) => [point.x, point.y])
        }))
      });
    }
  }, [skinEvolutionData, visibleChart]);

  const optionsList = useMemo(() => {
    return flowRegime === 'radial'
      ? [
          { id: 'design', label: 'Design Plot', value: 'design' },
          { id: 'pvbt', label: 'Simulation Chart', value: 'A' },
          { id: 'skin', label: 'Skin Evolution', value: 'skin' },
          { id: 'analysis', label: 'Analysis Chart', value: 'B' }
        ]
      : [
          { id: 'pvbt', label: 'Simulation Chart', value: 'A' },
          { id: 'analysis', label: 'Analysis Chart', value: 'B' }
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
                  // Ordem FIXA: nunca reordena ao clicar (sem `order` -- a
                  // posicao e so a ordem natural de optionsList) -- so o
                  // indicador (motion.span abaixo) desliza entre as posicoes
                  // fixas via layoutId compartilhado.
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
                  radialCurves.forEach(c => exp.exportRadialSimulationTable(c as any));
                } else if (visibleChart === 'design') {
                  exp.exportRadialDesignPlotTable(designPlotData, radialState.payzoneThickness, radialState.targetMode === 'length' ? radialCurves[0]?.target : undefined);
                } else if (visibleChart === 'skin') {
                  exp.exportRadialSkinTable(skinEvolutionData, radialState.targetMode === 'skin' ? radialCurves[0]?.target : undefined);
                }
              });
            }}>Export Chart Data</button>
            <button className="btn btn-green" style={{ fontSize: '11px', padding: '4px 8px' }} onClick={() => {
              import('../tools/export').then(exp => {
                exp.exportRadialAll(radialState, radialCurves as any[], radialState.targetMode === 'length' ? radialCurves[0]?.target : undefined, radialState.targetMode === 'skin' ? radialCurves[0]?.target : undefined);
              });
            }}>Exportar tudo</button>
          </div>
        )}
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', cursor: 'pointer' }}>
          <input type="checkbox" checked={opt} onChange={(e) => setOpt(e.target.checked)} />PVBt Optimum
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', cursor: 'pointer' }}>
          <input type="checkbox" checked={xisLog} onChange={(e) => setxIsLog(e.target.checked)} />X-Log
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', cursor: 'pointer' }}>
          <input type="checkbox" checked={yisLog} onChange={(e) => { setyIsLog(e.target.checked); setUserToggledYLog(true); }} />Y-Log
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', cursor: 'pointer' }}>
          <input type="checkbox" checked={grid} onChange={(e) => setGrid(e.target.checked)} />Grid
        </label>
        <div style={{ width: '1px', height: '14px', background: '#ccc', margin: '0 4px' }}></div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', color: '#666' }} title="Região hachurada em cinza com a linha tracejada indica trechos do gráfico cujos valores estão fora da janela física validada pelo modelo (±1 ordem de grandeza do ponto ótimo).">
          <span style={{ display: 'inline-block', width: '14px', height: '12px', background: 'rgba(97,97,97,0.15)', borderLeft: '2px solid #616161' }}></span>
          Fora da Janela Validada
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
          <label><input type="checkbox" checked={xdefinedLimit} onChange={(e) => setxDefinedLimit(e.target.checked)} /> X Limits:</label>
          {xdefinedLimit && (
            <>
              <input type="text" className="input" style={{ width: '60px', minHeight: '24px', padding: '0 4px', borderRadius: '4px' }} placeholder="min" value={xLimit[0]} onChange={(e) => setxLimit([e.target.value, xLimit[1]])} />
              <input type="text" className="input" style={{ width: '60px', minHeight: '24px', padding: '0 4px', borderRadius: '4px' }} placeholder="max" value={xLimit[1]} onChange={(e) => setxLimit([xLimit[0], e.target.value])} />
            </>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
          <label><input type="checkbox" checked={ydefinedLimit} onChange={(e) => setyDefinedLimit(e.target.checked)} /> Y Limits:</label>
          {ydefinedLimit && (
            <>
              <input type="text" className="input" style={{ width: '60px', minHeight: '24px', padding: '0 4px', borderRadius: '4px' }} placeholder="min" value={yLimit[0]} onChange={(e) => setyLimit([e.target.value, yLimit[1]])} />
              <input type="text" className="input" style={{ width: '60px', minHeight: '24px', padding: '0 4px', borderRadius: '4px' }} placeholder="max" value={yLimit[1]} onChange={(e) => setyLimit([yLimit[0], e.target.value])} />
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', margin: '16px 2px 6px' }}>
        <h5 style={{ margin: 0, fontSize: '18px', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
          {visibleChart === 'A' ? "Simulation Chart" : visibleChart === 'design' ? "Design Plot" : "Analysis Chart"}
        </h5>
        <span className="text-muted" style={{ fontSize: '11.5px' }}>
          {visibleChart === 'A' ? (flowRegime === 'radial' ? "Radial Injection Efficiency (Volume vs Flowrate)" : "Pore volumes injected to breakthrough vs. injection rate") : visibleChart === 'design' ? "Tunnel advancement sizing mapping optimal flowrates and volumes" : (flowRegime === 'radial' ? "Acid Volume at fixed flowrate across the swept parameter" : "PVBt at fixed flowrate across the swept parameter")}
        </span>
      </div>

      {visibleChart === 'A' && flowRegime === 'radial' && radialProcessed && radialValidity.worst && (
        <div role="alert" style={{
          margin: '0 2px 10px', padding: '9px 12px', fontSize: '12px', lineHeight: 1.5,
          border: `1px solid ${SEVERITY_COLORS.warn}`, borderLeft: `4px solid ${SEVERITY_COLORS.warn}`,
          borderRadius: '6px', background: '#fdf5ea', color: '#7a4a12',
        }}>
          <strong>{radialValidity.count} {radialValidity.count === 1 ? 'ponto' : 'pontos'}</strong>
          {' '}em {radialValidity.curvesAffected} {radialValidity.curvesAffected === 1 ? 'curva' : 'curvas'}
          {' '}fora da janela validada pelo artigo (±1 ordem de grandeza em torno de q_opt).{' '}
          Pior caso: <strong>{fmtBblMin(radialValidity.worst.flowrate)} {radialValidity.worst.unit}</strong>
          {' '}na curva “{radialValidity.worst.label}” — {fmtRatio(radialValidity.worst.ratio)}×{' '}
          {radialValidity.worst.boundary === 'upper' ? 'acima do limite superior' : 'abaixo do limite inferior'}
          {' '}({fmtBblMin(radialValidity.worst.limit)} {radialValidity.worst.unit}).
        </div>
      )}

      {visibleChart === 'A' && flowRegime === 'linear' && linearValidity.worst && (
        <div role="alert" style={{
          margin: '0 2px 10px', padding: '9px 12px', fontSize: '12px', lineHeight: 1.5,
          border: `1px solid ${SEVERITY_COLORS.warn}`, borderLeft: `4px solid ${SEVERITY_COLORS.warn}`,
          borderRadius: '6px', background: '#fdf5ea', color: '#7a4a12',
        }}>
          <strong>{linearValidity.count} {linearValidity.count === 1 ? 'ponto' : 'pontos'}</strong>
          {' '}em {linearValidity.curvesAffected} {linearValidity.curvesAffected === 1 ? 'curva' : 'curvas'}
          {' '}fora da janela validada pelo artigo (±1 ordem de grandeza em torno de q_opt).{' '}
          Pior caso: <strong>{fmtBblMin(linearValidity.worst.flowrate)} cm³/min</strong>
          {' '}na curva “{linearValidity.worst.label}” — {fmtRatio(linearValidity.worst.ratio)}×{' '}
          {linearValidity.worst.boundary === 'upper' ? 'acima do limite superior' : 'abaixo do limite inferior'}
          {' '}({fmtBblMin(linearValidity.worst.limit)} cm³/min).
        </div>
      )}

      {visibleChart === 'design' && designPlotData?.has_clipped_volume && (
        <div role="alert" style={{
          margin: '0 2px 10px', padding: '9px 12px', fontSize: '12px', lineHeight: 1.5,
          border: `1px solid ${SEVERITY_COLORS.warn}`, borderLeft: `4px solid ${SEVERITY_COLORS.warn}`,
          borderRadius: '6px', background: '#fdf5ea', color: '#7a4a12',
        }}>
          <strong>Aviso de Limite Físico:</strong> Alguns comprimentos alvo exigiram volumes otimizados &gt; 1000 gal/ft e foram <strong>truncados</strong>. 
          A mediana de tratamentos reais em campo é ~75 gal/ft, com teto raramente superior a 700 gal/ft (Burton et al.). Valores acima de 1000 gal/ft distorcem a escala e indicam regimes inviáveis.
        </div>
      )}

      {visibleChart === 'design' && flowRegime === 'radial' && !!designPlotData?.series?.length && (
        <DesignPlotReader series={designPlotData.series} onReadingChange={setGuidedReading} />
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
              <ReactECharts option={chartOptionsA} ref={chartRefB} notMerge={true} style={{ height: "100%", width: "100%" }} />
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

