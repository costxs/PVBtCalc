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
  const [isLog, setIsLog] = useState(false);
  const [xdefinedLimit, setxDefinedLimit] = useState(false);
  const [ydefinedLimit, setyDefinedLimit] = useState(false);
  const [xLimit, setxLimit] = useState(['','']);
  const [yLimit, setyLimit] = useState(['','']); 
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
      type: isLog ? "log" : "value", // Agora o eixo X é categórico
      min: xdefinedLimit ? xLimit[0] : undefined,
      max: xdefinedLimit ? xLimit[1] : undefined,
    },
    yAxis: {
        name: "PVBt",
        type: isLog? "log" : "value",
        min: ydefinedLimit ? yLimit[0] : undefined,
        max: ydefinedLimit ? yLimit[1] : undefined,
    },
    series: allCurvesSeries,
  });
  },[curves, opt, isLog, xdefinedLimit, ydefinedLimit]);
  return (
    <div className="max-w-full p-4 px-0 pt-0 bg-white shadow-md rounded-sm border-3 border-dashed border-gray-500">
      <div className="max-w-full py-2 px-3 bg-gray-200 flex items-center space-x-2  mb-[2vh] text-nowrap overflow-x-auto border-b border-dashed pb-1">
        <div className="flex items-center justify-center w-fit space-x-1 me-4">
          <input checked={opt} onChange={(e)=>setOpt(e.target.checked)} type="checkbox" />
          <label htmlFor="">PVBt Optimum</label>
        </div>
        <div className="flex items-center justify-center w-fit space-x-1">
          <input checked={isLog} onChange={(e)=>setIsLog(e.target.checked)} type="checkbox" />
          <label htmlFor="" >Log-scale</label>
        </div>
        <div className="flex space-x-2 items-center justify-center w-fit">
          <input checked={xdefinedLimit} onChange={(e)=> setxDefinedLimit(e.target.checked)}  type="checkbox" />
          <label htmlFor="">X Axis Limites:</label>
          <input
              value={xLimit[0]}
              onChange={(e) => {
                const newLimit = [...xLimit];
                newLimit[0] = (e.target.value);
                setxLimit(newLimit);
              }}
              className=" w-1/6 px-0.5" 
              placeholder="min" 
              type="number" 
              />
          <input 
              value={xLimit[1]}
              onChange={(e) => {
                const newLimit = [...xLimit];
                newLimit[1] = (e.target.value);
                setxLimit(newLimit);
              }} 
              className=" w-1/6  px-0.5" 
              placeholder="max" 
              type="number" 
              />
        </div>
        <div className="flex space-x-2 items-center justify-center w-fit">
          <input checked={ydefinedLimit} onChange={(e)=> setyDefinedLimit(e.target.checked)}  type="checkbox" />
          <label htmlFor="">Y Axis Limites:</label>
          <input
              value={yLimit[0]}
              onChange={(e) => {
                const newLimit = [...yLimit];
                newLimit[0] = (e.target.value);
                setyLimit(newLimit);
              }} 
              className=" w-1/6 px-0.5" 
              placeholder="min" 
              type="text" 
              />
          <input
              value={yLimit[1]}
              onChange={(e) => {
                const newLimit = [...yLimit];
                newLimit[1] = (e.target.value);
                setyLimit(newLimit);
              }}  
              className=" w-1/6 px-0.5" 
              placeholder="max" 
              type="text" 
              />
        </div>
      </div>
      <ReactECharts option={chartOptions} notMerge={true} style={{ height: "50vh", width: "100%" }} />
    </div>
  );
};

export default ChartComponent;
