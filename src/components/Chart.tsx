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
import { Chip, ChipRow, SegmentedControl, toggleInSet } from "./ChartControls";
import { splitByValidity, collectValidityOffenders, readValidity, fmtBblMin, fmtRatio } from "../tools/validityWindow";
import { resolveAxisLimit } from "../tools/axisLimits";
import { SEVERITY_COLORS } from "../tools/pointSeverity";
import { setVisibleChart } from "../redux/ui/slice";
import { matchesFlowRegime } from "../tools/regimeFilter";

// Rotulos do crosshair do Design Plot (guidedReadingMarkPointData, abaixo):
// toFixed(3)/toFixed(4) fixo produzia "15.000" -- em pt-BR (ponto de milhar)
// isso le como "quinze mil", nao "quinze virgula zero". 3 algarismos
// significativos com ponto decimal (mesma convencao do resto do app, que ja
// usa "." em unidades como "gal/(ft.min)") remove a ambiguidade sem trocar
// pra virgula: "V = 15.0", "q = 0.241".
const fmtSig3 = (v: number): string => (Number.isFinite(v) ? v.toPrecision(3) : String(v));

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

  // Export (Chart.tsx export buttons): radialState.curves e o payload CRU do
  // backend (RadialCurveResult, chaves snake_case: flowratepoints, target_label,
  // etc.) -- so serve pro grafico. export.tsx precisa das curvas camelCase de
  // state.resultCurves (mesma fonte da tabela Simulation/Analysis, com
  // rock/acid/porosity/concentration/metadata), filtradas para o RUN atual
  // (lastRunSetup.id, nao o `id` do campo ao vivo -- que pode ter mudado sem
  // recalcular).
  const currentSimulationId: string = radialState.lastRunSetup?.id ?? '';
  const radialSimulationCurves = flowRegime === 'radial' && currentSimulationId
    ? curves.filter((c) => c.flowRegime === 'radial' && c.id.startsWith(`${currentSimulationId} · `))
    : [];
  const visibleChart = useSelector((state: RootState) => state.ui.visibleChart);
  const isPt = useSelector((state: RootState) => state.ui.language) === 'pt';

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

  // Quadro de controle acima do grafico (substitui a legenda nativa do
  // ECharts, Design/Simulation-radial/Skin). Estado mora aqui, no componente
  // PAI do AnimatePresence -- os motion.div dos graficos sao desmontados a
  // cada troca de aba (mode="wait"), entao guardar isto dentro deles perderia
  // a selecao ao voltar pra aba. Reseta (tudo ligado) so quando chega dado
  // novo de uma simulacao (nao a cada troca de aba).
  const [designActiveTemps, setDesignActiveTemps] = useState<Set<string>>(new Set());
  const [designSeriesFilter, setDesignSeriesFilter] = useState<'rate' | 'volume' | 'both'>('both');
  const [simActiveTargets, setSimActiveTargets] = useState<Set<string>>(new Set());
  const [simShowOptimumPath, setSimShowOptimumPath] = useState(true);
  const [skinActiveFlowrates, setSkinActiveFlowrates] = useState<Set<string>>(new Set());


  // Assinatura estavel do CONJUNTO de temperaturas, nao a referencia de
  // designPlotData -- Chart.tsx:~275 refaz fetchDesignPlot toda vez que a
  // aba 'design' fica ativa (mesmo sem novo Calculate), entao o objeto muda
  // de identidade a cada troca de aba mesmo com as MESMAS temperaturas.
  // Resetar direto em designPlotData apagaria os chips ligados/desligados
  // toda vez que o usuario voltasse pra aba -- exatamente o que o pedido
  // ("trocar de aba e voltar, estado mantido") proibe. So reseta quando o
  // conjunto de temperaturas de verdade muda (novo Calculate ou temperatura
  // de comparacao adicionada/removida).
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
      // Bug (2026-09): sem o filtro de regime, uma curva radial salva
      // (sobrevive a reload via localStorage) entrava nesse array e podia
      // virar a sugestao de Y-Log do grafico Linear com base em magnitudes
      // de outro regime -- mesma causa-raiz do filtro em validCurves (linha
      // ~690, ramo de desenho da serie).
      const linearCurves = curves.filter(c => matchesFlowRegime(c.flowRegime, 'linear'));
      const ys = linearCurves
        .filter(c => c.flowratePoints && c.flowratePoints.length > 0)
        .flatMap(c => {
          const pts = (c.outputMode === 'volume' ? c.acidVolumePoints : c.pvbtPoints) || [];
          const within = c.withinValidityRange || [];
          return pts.filter((_, i) => within[i] !== false);
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

  const prevFlowRegimeRef = useRef(flowRegime);
  useEffect(() => {
    if (prevFlowRegimeRef.current !== flowRegime) {
      if (flowRegime === 'radial') {
        dispatch(setVisibleChart('design'));
      } else if (flowRegime === 'linear' && (visibleChart === 'design' || visibleChart === 'skin')) {
        dispatch(setVisibleChart('A'));
      }
      prevFlowRegimeRef.current = flowRegime;
    }
  }, [flowRegime, visibleChart, dispatch]);

  useEffect(() => {
    if (flowRegime === 'radial' && visibleChart === 'A') {
      dispatch(setVisibleChart('design'));
    }
  }, []);



  useEffect(() => {
    if (visibleChart === 'design' && flowRegime === 'radial' && radialProcessed) {
      dispatch(fetchDesignPlot() as any);
    }
  }, [visibleChart, flowRegime, radialProcessed, dispatch]);

  // Layout fix: Radial agora usa a MESMA coluna de grid do Linear (App.tsx),
  // que muda de 2 colunas para empilhado no breakpoint `lg` -- a largura do
  // container do grafico ativo muda nesse cruzamento. echarts-for-react ja
  // observa o elemento via ResizeObserver (size-sensor) e chama resize()
  // sozinho na maioria dos casos; este listener e so um reforco explicito
  // (pedido) para garantir o resize mesmo se o sensor demorar/nao disparar.
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
    // Analysis Chart mantem a escala padrao no radial: X sempre linear
    // (checkbox X-Log removido nesse regime, `xisLog` deixa de ser
    // consultado), Y ja era sempre log/value fixo por isRadial (nunca leu
    // yisLog). `opt` (checkbox removido no radial) tambem sai do marker.
    const xAxisIsLog = !isRadial && xisLog;
    const yAxisIsLog = isRadial;
    const showOptimumMarker = !isRadial && opt;

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
      markPoint: showOptimumMarker ? {
        data: [
          {
            type: "min",
            name: isPt ? "Mínimo" : "Minimum",
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
      grid: { bottom: 60, left: 50, right: 40, top: 30 },
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
        name: isRadial ? "Acid Volume (gal/ft)" : "PVBt (dimensionless)",
        type: yAxisIsLog ? "log" : "value",
        min: yRes.min,
        max: yRes.max,
        splitLine: { show: grid }
      },
      series: analysisSerie,
    });
  }, [analyse, opt, xisLog, yisLog, xdefinedLimit, ydefinedLimit, xLimit, yLimit, grid, flowRegime, sweepParameter]);

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
      const dasheds: ([number, number] | null)[][] = [];
      // Quadro de controle (chips por alvo, ver JSX) substitui a legenda:
      // curva desligada nem entra em solids/dasheds (Y-log range e a serie
      // de otimo tambem reagem, so isso -- nenhum dado recalculado).
      const allCurvesSeries = radialCurves.flatMap((curve, ci) => {
        const curveColor = CURVE_PALETTE[ci % CURVE_PALETTE.length];
        if (!simActiveTargets.has(curve.target_label)) return [];
        const fps = curve.flowratepoints || [];
        const { solid, dashed, bandBelow, bandAbove } = splitByValidity(
          fps,
          curve.acidvolumepoints || [],
          curve.within_validity_range || [],
          curve.metadata || null
        );
        solids.push(solid);
        dasheds.push(dashed);

        // Borda externa da faixa = extremo REAL do sweep (fps[0] / ultimo)
        const meta = curve.metadata;
        const markAreaData: { xAxis: number }[][] = [];
        if (meta && bandBelow) markAreaData.push([{ xAxis: fps[0] }, { xAxis: Number(meta.validity_min_gal_ft_min.toFixed(4)) }]);
        if (meta && bandAbove) markAreaData.push([{ xAxis: Number(meta.validity_max_gal_ft_min.toFixed(4)) }, { xAxis: fps[fps.length - 1] }]);

        // O marcador verde de "Minimo" por curva (antes controlado pelo
        // checkbox "PVBt Optimum", removido no radial) saiu -- o otimo deste
        // grafico agora e so o chip "Optimum path" (serie agregada abaixo).
        const markPointData: any[] = [];

        // Marcadores de fronteira da janela de validade: SEM rotulo (Item 5) --
        // so um circulo mudo no ponto de transicao solid/dashed. O nome da
        // curva vai num marcador separado, no ultimo ponto de verdade da
        // curva, pra nao ser confundido com o limite de validade.
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

        // Rotulo identificador da curva ("5.00 ft" etc.): no ultimo ponto
        // plotado de verdade (fim do tracejado quando existe, senao fim do
        // solido), a direita -- nunca no limite de validade.
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

      // X sempre linear, Y sempre log neste grafico (Item 1) -- isLog aqui e
      // so pra validar o limite manual (Mín > 0 em log), nunca pra decidir o
      // tipo do eixo.
      const xResRadialSim = xdefinedLimit ? resolveAxisLimit(xLimit[0], xLimit[1], false) : {};
      const yResRadialSim = ydefinedLimit ? resolveAxisLimit(yLimit[0], yLimit[1], true) : {};

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
        // Legenda nativa desligada -- substituida pelo quadro de controle
        // (chips por alvo + chip "Optimum path") acima do grafico, ver JSX.
        legend: { show: false },
        toolbox: { top: 10, right: 10, feature: { dataZoom: { yAxisIndex: 'none' }, restore: {}, myResetZoom: { show: true, title: 'Reset Zoom', icon: 'path://M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z', onclick: () => { const chart = (chartRefA.current as any); if (chart) { chart.getEchartsInstance().dispatchAction({ type: 'dataZoom', start: 0, end: 100 }); } } } } },
        dataZoom: [
          { type: 'inside', xAxisIndex: 0 },
          { type: 'slider', xAxisIndex: 0, bottom: 4, height: 14, showDataShadow: false, handleSize: '80%', showDetail: false }
        ],
        grid: { bottom: 60, left: 60, right: 40, top: 80, containLabel: true },
        xAxis: {
          z: 10,
          name: "Injection Rate, gal/(ft.min)",
          nameLocation: 'middle',
          nameGap: 35,
          type: "value",
          min: xResRadialSim.min,
          max: xResRadialSim.max,
          splitLine: { show: grid }
        },
        yAxis: {
          z: 10,
          name: "Acid Volume, gal/ft",
          nameLocation: 'middle',
          nameGap: 65,
          type: "log",
          logBase: 10,
          min: yResRadialSim.min ?? (simRadialLogAxis?.min ?? undefined),
          max: yResRadialSim.max ?? (simRadialLogAxis?.max ?? undefined),
          // Item 3: linha de grade em TODA decada, sempre -- so o TEXTO do
          // rotulo pode pular (a cada 2 decadas) quando o eixo cobre mais de
          // 6 decadas, pra nao amontoar. splitLine/axisTick com interval:0
          // ignoram o algoritmo de auto-espacamento do ECharts (que senao
          // decide sozinho quais decadas mostrar, igual ao axisLabel).
          splitLine: { show: grid, interval: 0 },
          axisTick: { interval: 0 },
          axisLabel: {
            // Decadas do eixo REALMENTE renderizado (limite manual, quando
            // ativo, tem prioridade sobre o auto) -- decide pular rotulo
            // alternado (>6 decadas) olhando pro range que vai pra tela, nao
            // so o auto por tras dele.
            interval: (() => {
              const effMin = yResRadialSim.min ?? simRadialLogAxis?.min;
              const effMax = yResRadialSim.max ?? simRadialLogAxis?.max;
              return effMin && effMax && (Math.log10(effMax) - Math.log10(effMin)) > 6 ? 1 : 0;
            })(),
            // >=1e6: notacao cientifica (1e9, 1e12, ...) em vez de "bi"/"tri"
            // compacto -- mais claro pra ordem de grandeza de volume de acido.
            // Abaixo disso, separador pt-BR (ponto de milhar) como antes.
            formatter: (val: number) =>
              Math.abs(val) >= 1e6
                ? val.toExponential(0).replace('+', '')
                : new Intl.NumberFormat('pt-BR').format(val)
          }
        },
        series: [
          ...allCurvesSeries,
          ...(simShowOptimumPath ? [{
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
          }] : []),
        ],
      });
    } else {
      // Bug (2026-09): sem esse filtro por regime, uma curva radial salva
      // (resultCurves persiste em localStorage, sobrevive a reload) entrava
      // aqui igual e era desenhada como se fosse linear -- flowRegime
      // undefined so existe em curvas salvas ANTES do campo existir
      // (legado), tratadas como linear por serem dessa epoca.
      const validCurves = curves.filter(curve => matchesFlowRegime(curve.flowRegime, 'linear') && curve.flowratePoints && curve.flowratePoints.length > 0);
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
            name: isPt ? "Mínimo" : "Minimum",
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
  }, [curves, radialCurves, flowRegime, opt, xisLog, yisLog, xdefinedLimit, ydefinedLimit, xLimit, yLimit, grid, simActiveTargets, simShowOptimumPath]);

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

      // Item 2: Y Limits vale para os dois eixos Y (mesmo Wormhole Length,
      // espelhados). X Limits vale so pro eixo de Rate (inferior) -- o eixo
      // de Volume (superior) e o par mapeado dele (Fig. 29/38 do artigo,
      // relacao FIXA por decadas via rateToVolFactor/W_int) e continua
      // decada-arredondado a partir do DADO, sem tocar nele aqui.
      const yResDesign = ydefinedLimit ? resolveAxisLimit(yLimit[0], yLimit[1], true) : {};
      const xResDesignRate = xdefinedLimit ? resolveAxisLimit(xLimit[0], xLimit[1], true) : {};

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
              // Fundo semitransparente -- o rotulo fica em cima das curvas
              // do grafico e ficava ilegivel sem contraste.
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

        // Setas terminam exatamente nas bordas do eixo Y RENDERIZADO (auto ou
        // Y Limits manual, quando ativo) -- nunca fora delas, senao o
        // ECharts descarta o segmento inteiro em vez de corta-lo.
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

      // Quadro de controle (acima do grafico, ver JSX) substitui a legenda
      // nativa: filtra as series aqui em vez de depender do
      // legend.selected/dispatchAction do ECharts, que vive dentro da
      // instancia e se perderia quando o AnimatePresence desmonta o grafico
      // ao trocar de aba (o pedido explicito e manter o estado ao voltar).
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
                  name: `Rate (${s.temperature_k} K)`,
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
              });
          }
          return out;
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
        // Legenda nativa desligada -- substituida pelo quadro de controle
        // (chips de temperatura + segmented Rate/Volume/Ambos) acima do
        // grafico, ver JSX. Nomes das series ficam (tooltip/crosshair ainda
        // usam seriesName).
        legend: { show: false },
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
            min: yResDesign.min ?? yAxisMin,
            max: yResDesign.max ?? yAxisMax,
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
            min: yResDesign.min ?? yAxisMin,
            max: yResDesign.max ?? yAxisMax,
            logBase: 10,
            splitLine: { show: false }
          }
        ],

        // EIXOS X (Duplo)
        xAxis: [
            {
                // 1. EIXO INFERIOR (Rate) -- X Limits so vale pra este; o de
                // Volume (par mapeado, abaixo) fica de fora de proposito.
                type: 'log',
                name: 'Optimum Injection Rate, gal/(ft·min)',
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
  }, [designPlotData, flowRegime, visibleChart, grid, guidedReading, designActiveTemps, designSeriesFilter, xdefinedLimit, ydefinedLimit, xLimit, yLimit]);

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
                let tooltipText = `Volume: ${params[0].value[0].toFixed(1)} gal/ft<br/>`;
                params.forEach((param: any) => {
                    tooltipText += `${param.seriesName}: Skin ${param.value[1].toFixed(2)}<br/>`;
                });
                return tooltipText;
            }
        },
        // Legenda nativa desligada -- substituida pelo quadro de controle
        // (chips por vazao) acima do grafico, ver JSX.
        legend: { show: false },
        toolbox: { top: 10, right: 10, feature: { dataZoom: { yAxisIndex: 'none' }, restore: {}, myResetZoom: { show: true, title: 'Reset Zoom', icon: 'path://M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z', onclick: () => { const chart = (chartRefSkin.current as any); if (chart) { chart.getEchartsInstance().dispatchAction({ type: 'dataZoom', start: 0, end: 100 }); } } } } },
        grid: { top: 70, bottom: 60, left: 55, right: 40, containLabel: true },
        dataZoom: [
          { type: 'inside', xAxisIndex: 0 },
          { type: 'slider', xAxisIndex: 0, bottom: 4, height: 14, showDataShadow: false, handleSize: '80%', showDetail: false }
        ],
        xAxis: {
            name: 'Acid Volume (gal/ft)',
            type: 'log', // Escala logaritmica
            nameLocation: 'middle',
            nameGap: 35,
            min: xResSkin.min ?? skinXAuto?.min,
            max: xResSkin.max ?? skinXAuto?.max,
            axisLabel: {
              formatter: (val: number) => new Intl.NumberFormat('pt-BR', { notation: val >= 1e6 ? 'compact' : 'standard' }).format(val)
            }
        },
        yAxis: {
            name: 'Skin',
            type: 'value',
            min: yResSkin.min,
            max: yResSkin.max ?? 0, // CRÍTICO (sem limite manual): teto em 0
            nameLocation: 'middle',
            nameGap: 40
        },
        // Cor explicita por indice (mesma paleta/indice do chip no quadro de
        // controle, ver JSX) -- antes o auto-assign do ECharts nao tinha
        // como o chip saber a cor de antemao.
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
  }, [skinEvolutionData, visibleChart, skinActiveFlowrates, xdefinedLimit, ydefinedLimit, xLimit, yLimit]);

  const optionsList = useMemo(() => {
    return flowRegime === 'radial'
      ? [
          { id: 'design', label: 'Design Plot', value: 'design' },
          { id: 'pvbt', label: 'Simulation Chart', value: 'A' },
          { id: 'analysis', label: 'Analysis Chart', value: 'B' },
          { id: 'skin', label: 'Skin Evolution', value: 'skin' }
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
                  exp.exportRadialSimulationAll(radialSimulationCurves, currentSimulationId);
                } else if (visibleChart === 'design') {
                  exp.exportRadialDesignPlotTable(designPlotData, radialState.payzoneThickness, radialState.targetMode === 'length' ? radialCurves.map(c => c.target) : undefined);
                } else if (visibleChart === 'skin') {
                  exp.exportRadialSkinTable(skinEvolutionData, radialState.targetMode === 'skin' ? radialCurves[0]?.target : undefined);
                }
              });
            }}>Export Chart Data</button>
          </div>
        )}
        {/* PVBt Optimum / X-Log / Y-Log: escalas radiais agora sao fixas por
            grafico (Design/Skin/Simulation ja hardcoded; Analysis forcado
            abaixo) e o "otimo" do Simulation Chart virou o chip "Optimum
            path" (ver quadro de controle) -- os 3 toggles so fazem sentido
            no Linear, onde continuam do jeito que estavam. */}
        {flowRegime === 'linear' && (
          <>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', cursor: 'pointer' }}>
              <input type="checkbox" checked={opt} onChange={(e) => setOpt(e.target.checked)} />PVBt Optimum
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
          <input type="checkbox" checked={grid} onChange={(e) => setGrid(e.target.checked)} />Grid
        </label>
        <div style={{ width: '1px', height: '14px', background: '#ccc', margin: '0 4px' }}></div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', color: '#666' }} title={isPt ? "Região hachurada em cinza com a linha tracejada indica trechos do gráfico cujos valores estão fora da janela física validada pelo modelo (±1 ordem de grandeza do ponto ótimo)." : "The gray hatched region with the dashed line marks stretches of the chart whose values fall outside the physical window validated by the model (±1 order of magnitude around the optimum point)."}>
          <span style={{ display: 'inline-block', width: '14px', height: '12px', background: 'rgba(97,97,97,0.15)', borderLeft: '2px solid #616161' }}></span>
          {isPt ? "Fora da Janela Validada" : "Outside Validated Window"}
        </div>
      </div>

      {(() => {
        // Escala (log/linear) de cada eixo NO GRAFICO ATIVO agora -- so pra
        // decidir a mensagem de validacao aqui embaixo (ex.: "Mín deve ser >
        // 0 em log"). Espelha o `type` de cada xAxis/yAxis ja hardcoded ou
        // condicional em cada efeito acima; nao decide nada sozinho.
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
                <label><input type="checkbox" checked={xdefinedLimit} onChange={(e) => setxDefinedLimit(e.target.checked)} /> X Limits:</label>
                {xdefinedLimit && (
                  <>
                    <input type="text" className="input" style={{ width: '70px', minHeight: '24px', padding: '0 4px', borderRadius: '4px' }} placeholder={isPt ? "Mín (auto)" : "Min (auto)"} value={xLimit[0]} onChange={(e) => setxLimit([e.target.value, xLimit[1]])} />
                    <input type="text" className="input" style={{ width: '70px', minHeight: '24px', padding: '0 4px', borderRadius: '4px' }} placeholder={isPt ? "Máx (auto)" : "Max (auto)"} value={xLimit[1]} onChange={(e) => setxLimit([xLimit[0], e.target.value])} />
                  </>
                )}
              </div>
              {xPreview.error && <span style={{ fontSize: '10.5px', color: '#c0392b' }}>{xPreview.error}</span>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                <label><input type="checkbox" checked={ydefinedLimit} onChange={(e) => setyDefinedLimit(e.target.checked)} /> Y Limits:</label>
                {ydefinedLimit && (
                  <>
                    <input type="text" className="input" style={{ width: '70px', minHeight: '24px', padding: '0 4px', borderRadius: '4px' }} placeholder={isPt ? "Mín (auto)" : "Min (auto)"} value={yLimit[0]} onChange={(e) => setyLimit([e.target.value, yLimit[1]])} />
                    <input type="text" className="input" style={{ width: '70px', minHeight: '24px', padding: '0 4px', borderRadius: '4px' }} placeholder={isPt ? "Máx (auto)" : "Max (auto)"} value={yLimit[1]} onChange={(e) => setyLimit([yLimit[0], e.target.value])} />
                  </>
                )}
              </div>
              {yPreview.error && <span style={{ fontSize: '10.5px', color: '#c0392b' }}>{yPreview.error}</span>}
            </div>
          </div>
        );
      })()}

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
          {isPt ? (
            <>
              <strong>{radialValidity.count} {radialValidity.count === 1 ? 'ponto' : 'pontos'}</strong>
              {' '}em {radialValidity.curvesAffected} {radialValidity.curvesAffected === 1 ? 'curva' : 'curvas'}
              {' '}fora da janela validada pelo artigo (±1 ordem de grandeza em torno de q_opt).{' '}
              Pior caso: <strong>{fmtBblMin(radialValidity.worst.flowrate)} {radialValidity.worst.unit}</strong>
              {' '}na curva “{radialValidity.worst.label}” — {fmtRatio(radialValidity.worst.ratio)}×{' '}
              {radialValidity.worst.boundary === 'upper' ? 'acima do limite superior' : 'abaixo do limite inferior'}
              {' '}({fmtBblMin(radialValidity.worst.limit)} {radialValidity.worst.unit}).
            </>
          ) : (
            <>
              <strong>{radialValidity.count} {radialValidity.count === 1 ? 'point' : 'points'}</strong>
              {' '}across {radialValidity.curvesAffected} {radialValidity.curvesAffected === 1 ? 'curve' : 'curves'}
              {' '}fall outside the window validated by the paper (±1 order of magnitude around q_opt).{' '}
              Worst case: <strong>{fmtBblMin(radialValidity.worst.flowrate)} {radialValidity.worst.unit}</strong>
              {' '}on curve “{radialValidity.worst.label}” — {fmtRatio(radialValidity.worst.ratio)}×{' '}
              {radialValidity.worst.boundary === 'upper' ? 'above the upper limit' : 'below the lower limit'}
              {' '}({fmtBblMin(radialValidity.worst.limit)} {radialValidity.worst.unit}).
            </>
          )}
        </div>
      )}

      {visibleChart === 'A' && flowRegime === 'linear' && linearValidity.worst && (
        <div role="alert" style={{
          margin: '0 2px 10px', padding: '9px 12px', fontSize: '12px', lineHeight: 1.5,
          border: `1px solid ${SEVERITY_COLORS.warn}`, borderLeft: `4px solid ${SEVERITY_COLORS.warn}`,
          borderRadius: '6px', background: '#fdf5ea', color: '#7a4a12',
        }}>
          {isPt ? (
            <>
              <strong>{linearValidity.count} {linearValidity.count === 1 ? 'ponto' : 'pontos'}</strong>
              {' '}em {linearValidity.curvesAffected} {linearValidity.curvesAffected === 1 ? 'curva' : 'curvas'}
              {' '}fora da janela validada pelo artigo (±1 ordem de grandeza em torno de q_opt).{' '}
              Pior caso: <strong>{fmtBblMin(linearValidity.worst.flowrate)} cm³/min</strong>
              {' '}na curva “{linearValidity.worst.label}” — {fmtRatio(linearValidity.worst.ratio)}×{' '}
              {linearValidity.worst.boundary === 'upper' ? 'acima do limite superior' : 'abaixo do limite inferior'}
              {' '}({fmtBblMin(linearValidity.worst.limit)} cm³/min).
            </>
          ) : (
            <>
              <strong>{linearValidity.count} {linearValidity.count === 1 ? 'point' : 'points'}</strong>
              {' '}across {linearValidity.curvesAffected} {linearValidity.curvesAffected === 1 ? 'curve' : 'curves'}
              {' '}fall outside the window validated by the paper (±1 order of magnitude around q_opt).{' '}
              Worst case: <strong>{fmtBblMin(linearValidity.worst.flowrate)} cm³/min</strong>
              {' '}on curve “{linearValidity.worst.label}” — {fmtRatio(linearValidity.worst.ratio)}×{' '}
              {linearValidity.worst.boundary === 'upper' ? 'above the upper limit' : 'below the lower limit'}
              {' '}({fmtBblMin(linearValidity.worst.limit)} cm³/min).
            </>
          )}
        </div>
      )}

      {visibleChart === 'design' && designPlotData?.has_clipped_volume && (
        <div role="alert" style={{
          margin: '0 2px 10px', padding: '9px 12px', fontSize: '12px', lineHeight: 1.5,
          border: `1px solid ${SEVERITY_COLORS.warn}`, borderLeft: `4px solid ${SEVERITY_COLORS.warn}`,
          borderRadius: '6px', background: '#fdf5ea', color: '#7a4a12',
        }}>
          {isPt ? (
            <>
              <strong>Aviso de Limite Físico:</strong> Alguns comprimentos alvo exigiram volumes otimizados &gt; 1000 gal/ft e foram <strong>truncados</strong>.
              A mediana de tratamentos reais em campo é ~75 gal/ft, com teto raramente superior a 700 gal/ft (Burton et al.). Valores acima de 1000 gal/ft distorcem a escala e indicam regimes inviáveis.
            </>
          ) : (
            <>
              <strong>Physical Limit Warning:</strong> Some target lengths required optimized volumes &gt; 1000 gal/ft and were <strong>clipped</strong>.
              The median of real field treatments is ~75 gal/ft, with a ceiling rarely above 700 gal/ft (Burton et al.). Values above 1000 gal/ft distort the scale and indicate infeasible regimes.
            </>
          )}
        </div>
      )}

      {visibleChart === 'design' && flowRegime === 'radial' && !!designPlotData?.series?.length && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '0 2px 12px', padding: '10px 14px', border: '1px solid #ddd', borderRadius: '6px' }}>
          <ChipRow
            legendLabel={isPt ? "Temperaturas:" : "Temperatures:"}
            items={designPlotData.series.map((s: any, idx: number) => ({
              id: String(s.temperature_k),
              label: `${s.temperature_k.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} K`,
              color: CURVE_PALETTE[idx % CURVE_PALETTE.length],
            }))}
            active={designActiveTemps}
            onToggle={(id) => setDesignActiveTemps((prev) => toggleInSet(prev, id))}
          />
          <SegmentedControl
            legendLabel={isPt ? "Mostrar:" : "Show:"}
            options={[
              { value: 'rate', label: 'Rate', preview: 'solid' },
              { value: 'volume', label: 'Volume', preview: 'dashed' },
              { value: 'both', label: isPt ? 'Ambos' : 'Both' },
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
            legendLabel={isPt ? "Alvos:" : "Targets:"}
            items={radialCurves.map((c, idx) => ({
              id: c.target_label,
              label: c.target_label,
              color: CURVE_PALETTE[idx % CURVE_PALETTE.length],
            }))}
            active={simActiveTargets}
            onToggle={(id) => setSimActiveTargets((prev) => toggleInSet(prev, id))}
            extra={
              <Chip
                item={{ id: '__optimum_path__', label: 'Optimum path', color: '#4A90E2' }}
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
            legendLabel={isPt ? "Vazões:" : "Flow rates:"}
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

