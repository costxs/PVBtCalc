import ReactECharts from "echarts-for-react";
import { useSelector } from "react-redux";
import { RootState } from "../redux/store";
import { useEffect, useRef, useState } from "react";
import type { TooltipComponentFormatterCallbackParams } from "echarts";
import { CurveAnalysis } from "../redux/analysisresults/slice";

const ChartComponent = () => {
  const { curves } = useSelector((state: RootState) => state.resultCurves);
  const analyse: CurveAnalysis = useSelector((state: RootState) => state.analysisResult);
  const chartRefA = useRef(null);
  const chartRefB = useRef(null);

  const [opt, setOpt] = useState(false);
  const [visibleChart, setVisibleChart] = useState('A'); 
  const [chartOptions, setChartOptions] = useState({});
  const [chartOptionsA, setChartOptionsA] = useState({});
  const [xisLog, setxIsLog] = useState(false);
  const [yisLog, setyIsLog] = useState(false);
  const [grid, setGrid] = useState(true);

  // Keep limits functionality but they are hidden unless actively used, or just keep them minimal
  const [xdefinedLimit, setxDefinedLimit] = useState(false);
  const [ydefinedLimit, setyDefinedLimit] = useState(false);
  const [xLimit, setxLimit] = useState(['', '']);
  const [yLimit, setyLimit] = useState(['', '']);

  useEffect(() => {
    if (visibleChart === "A" && chartRefA.current) {
      (chartRefA.current as any).getEchartsInstance().resize();
    }
    if (visibleChart === "B" && chartRefB.current) {
      (chartRefB.current as any).getEchartsInstance().resize();
    }
  }, [visibleChart]);

  const showChart = (chart: string) => {
    setVisibleChart('');
    setTimeout(() => {
      setVisibleChart(chart as any);
    }, 0);
  };

  useEffect(() => {
    const analysisSerie = ({
      name: analyse.id + ' variation',
      type: "line",
      data: analyse.analiticalpoints ? analyse.analiticalpoints.map((x, index) => [
        x?.toFixed(4) || 0,
        analyse.pvbtPoints?.[index]?.toFixed(4) || 0,
      ]) : [],
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
      grid: {
        bottom: 40,
        left: 40,
        right: 40,
        top: 30
      },
      xAxis: {
        name: analyse.id ? analyse.id : 'analyzed',
        nameLocation: 'middle',
        nameGap: 25,
        type: xisLog ? "log" : "value",
        min: xdefinedLimit ? xLimit[0] : undefined,
        max: xdefinedLimit ? xLimit[1] : undefined,
        splitLine: { show: grid }
      },
      yAxis: {
        name: "PVBt",
        type: yisLog ? "log" : "value",
        min: ydefinedLimit ? yLimit[0] : undefined,
        max: ydefinedLimit ? yLimit[1] : undefined,
        splitLine: { show: grid }
      },
      series: analysisSerie,
    });
  }, [analyse, opt, xisLog, yisLog, xdefinedLimit, ydefinedLimit, grid]);

  useEffect(() => {
    const allCurvesSeries = curves.map((curve) => ({
      name: curve.id,
      type: "line",
      data: curve.flowratePoints ? curve.flowratePoints.map((x, index) => [x?.toFixed(4) || 0, curve.pvbtPoints?.[index]?.toFixed(4) || 0]) : [],
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
    }));
    
    setChartOptions({
      tooltip: {
        trigger: "axis",
        formatter: (params: TooltipComponentFormatterCallbackParams | TooltipComponentFormatterCallbackParams[]) => {
          const paramArray = Array.isArray(params) ? params : [params];
          let tooltipContent = `${(paramArray[0] as any).axisValue ?? ""}<br/>`;
          paramArray.forEach((item) => {
            tooltipContent += `
              <div style="display: flex; align-items: center;">
                <span style="display:inline-block;width:10px;height:10px;background-color:${(item as any).color};margin-right:5px;"></span>
                ${'PVBt'} → <strong>${(item as any).value[1]}</strong>
              </div>
            `;
          });
          return tooltipContent;
        }
      },
      legend: {
        orient: 'vertical',
        right: 10,
        top: '10%'
      },
      grid: {
        bottom: 40,
        left: 40,
        right: 40,
        top: 30
      },
      xAxis: {
        name: "Flowrate",
        nameLocation: 'middle',
        nameGap: 25,
        type: xisLog ? "log" : "value",
        min: xdefinedLimit ? xLimit[0] : undefined,
        max: xdefinedLimit ? xLimit[1] : undefined,
        splitLine: { show: grid }
      },
      yAxis: {
        name: "PVBt",
        type: yisLog ? "log" : "value",
        min: ydefinedLimit ? yLimit[0] : undefined,
        max: ydefinedLimit ? yLimit[1] : undefined,
        splitLine: { show: grid }
      },
      series: allCurvesSeries,
    });
  }, [curves, opt, xisLog, yisLog, xdefinedLimit, ydefinedLimit, grid]);

  return (
    <section className="blueprint" style={{ padding: '14px 16px 16px', background: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div className="seg">
          <label className="seg-opt">
            <input type="radio" name="chart-tab" value="pvbt" checked={visibleChart === 'A'} onChange={() => showChart('A')} />
            PVBt Chart
          </label>
          <label className="seg-opt">
            <input type="radio" name="chart-tab" value="analysis" checked={visibleChart === 'B'} onChange={() => showChart('B')} />
            Analysis Chart
          </label>
        </div>
        <span style={{ flex: 1 }}></span>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', cursor: 'pointer' }}>
          <input type="checkbox" checked={opt} onChange={(e) => setOpt(e.target.checked)} />PVBt Optimum
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', cursor: 'pointer' }}>
          <input type="checkbox" checked={xisLog} onChange={(e) => setxIsLog(e.target.checked)} />X-Log
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', cursor: 'pointer' }}>
          <input type="checkbox" checked={yisLog} onChange={(e) => setyIsLog(e.target.checked)} />Y-Log
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', cursor: 'pointer' }}>
          <input type="checkbox" checked={grid} onChange={(e) => setGrid(e.target.checked)} />Grid
        </label>
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
        <h5 style={{ margin: 0, fontSize: '18px', letterSpacing: '0.07em', textTransform: 'uppercase' }}>{visibleChart === 'A' ? "PVBt Chart" : "Analysis Chart"}</h5>
        <span className="text-muted" style={{ fontSize: '11.5px' }}>{visibleChart === 'A' ? "Pore volumes injected to breakthrough vs. injection rate" : "PVBt at fixed flowrate across the swept parameter"}</span>
      </div>

      <div style={{ width: '100%', height: '400px' }}>
        {visibleChart === 'A' && (
          <ReactECharts option={chartOptions} ref={chartRefA} notMerge={true} style={{ height: "100%", width: "100%" }} />
        )}
        {visibleChart === 'B' && (
          <ReactECharts option={chartOptionsA} ref={chartRefB} notMerge={true} style={{ height: "100%", width: "100%" }} />
        )}
      </div>
    </section>
  );
};

export default ChartComponent;
