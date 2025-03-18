import ReactECharts from "echarts-for-react";
import { useSelector } from "react-redux";
import { RootState } from "../redux/store";
import { useEffect, useState } from "react";
import type { TooltipComponentFormatterCallbackParams } from "echarts";

const ChartComponent = () => {
  const {curves} = useSelector((state:RootState)=>state.resultCurves);
  //const curves = curvesobj.curves
  const [opt, setOpt] = useState(false);
  const [chartOptions, setChartOptions] = useState({});

  useEffect(() =>{
  const allCurvesSeries = curves.map((curve) => ({
    name: curve.id, // Usa o ID da curva como nome na legenda
    type: "line",
    data: curve.flowratePoints.map((x, index) => [x.toFixed(4), curve.pvbtPoints[index].toFixed(4)]), // Mapeia X e Y
    color: "#" + Math.floor(Math.random() * 16777215).toString(16), // Gera cor aleatória
    showSymbol: true,
    smooth: true,
    markPoint: opt ? {
      data: [
        {
          type: "min", // 🔥 Marca automaticamente o ponto mínimo da série
          name: "Mínimo",
          symbolSize: 30, // Tamanho do marcador
          label: {
            formatter: "optimum: {@[1]}", // Exibe o valor do eixo Y
            position: "top",
            color: "#fff",
            backgroundColor: "#24a424",
            padding: 5,
            borderRadius: 5,
          },
          itemStyle: {
            color: "#24a424", // Cor do marcador
          },
        },
      ],
    }: null,
  }));
  // Configuração do gráfico
  setChartOptions( {
    title: {
      text: "PVBt Chart",
      left: "center",
      textStyle: {
        color: "#333",
      },
    },
    tooltip: {
      trigger: "axis",
      formatter: (params: TooltipComponentFormatterCallbackParams | TooltipComponentFormatterCallbackParams[]) => {
        
        const paramArray = Array.isArray(params) ? params : [params];
        
        let tooltipContent = `${(paramArray[0] as any).axisValue ?? ""}<br/>`; // Valor do eixo X
      
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
    xAxis: {
      name: "Flowrate",
      type: "value", // Agora o eixo X é categórico
    },
    yAxis: {
        name: "PVBt",
        type: "value",
    },
    series: allCurvesSeries,
  });
  },[curves, opt]);
  return (
    <div className="w-full p-4 bg-white shadow-md rounded-sm border-3 border-dashed border-gray-500">
      <div className="w-full flex space-x-1">
        <input checked={opt} onChange={(e)=>setOpt(e.target.checked)} type="checkbox" />
        <label htmlFor="">Show PVBt Optimum</label>
      </div>
      <ReactECharts option={chartOptions} notMerge={true} style={{ height: "50vh", width: "100%" }} />
    </div>
  );
};

export default ChartComponent;
