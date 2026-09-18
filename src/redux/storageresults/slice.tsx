import { createSlice } from "@reduxjs/toolkit";

// 🔹 Criando a Action Assíncrona para buscar funcionários

interface Curve {
    id: string;
    acid: string;
    rock: string;
    // length/diameter sao do modelo LINEAR (core geometry) -- o radial nao
    // tem esses campos (sua geometria e wellboreRadiusIn/payzoneThicknessFt
    // abaixo), por isso opcionais em vez do antigo hardcode 0 no dispatch
    // radial (SimuCard.tsx), que vazava pro export como "length: 0".
    length?: number,
    diameter?: number,
    porosity: number,
    concentration: number,
    // Unidade depende de flowRegime: Celsius pro linear (setup.temperature),
    // Kelvin pro radial (radialTemperatureK) -- export.tsx roula o rotulo
    // certo a partir de flowRegime, nao deste campo sozinho.
    temperature: number,
    // Geometria RADIAL (undefined no linear) -- Fase columnsConfig/export:
    // sem isso o export nao tinha como mostrar wellbore/payzone (soline
    // 0 herdado do linear).
    wellboreRadiusIn?: number,
    payzoneThicknessFt?: number,
    // Alvo numerico desta curva (radial) -- targetLabel ja existia como
    // string formatada para exibicao; este e o valor cru, para metadados.
    target?: number,
    pvbtPoints: number[] | null;
    flowratePoints: number[];
    intersticialVelocity: number[];
    iDa: number[];
    volumeToBt: number[];
    timeToBt: number[];
    wormholeVelocity: number[];
    darcyVelocity: number[];
    flowRegime?: 'linear' | 'radial';
    targetLabel?: string;
    outputMode?: 'pvbt' | 'volume';
    acidVolumePoints?: number[];
    statusPoints?: string[];
    // paralelo a flowratePoints/statusPoints (SoA). false = vazao fora da
    // janela [q_opt/10, q_opt*10] validada pelo artigo.
    withinValidityRange?: boolean[];
    // metadata da janela de validade. Chaves *_gal_ft_min (radial, Fase 8 --
    // antes *_bbl_min) ou *_cm3_min (linear, Fase 6). null/undefined quando
    // o backend nao achou q_opt
    // interior. Fase 4 adicionou statusPoints/withinValidityRange mas nunca
    // metadata; Fase 6 fecha essa lacuna (Chart.tsx/SimuCard.tsx leem daqui).
    metadata?: Record<string, number> | null;
  }

interface CurvesState {
    curves: Curve[];
    ids: string[];
    }
// 🔹 Criando o Slice do Redux
const loadedCurves = JSON.parse(localStorage.getItem("curves") || "[]") as Curve[];
const loadedIds = JSON.parse(localStorage.getItem("ids") || "[]") as string[];

const uniqueCurvesMap = new Map<string, Curve>();
loadedCurves.forEach(c => uniqueCurvesMap.set(c.id, c));
const uniqueCurves = Array.from(uniqueCurvesMap.values());
const uniqueIds = Array.from(new Set(loadedIds));

const curvesSlice = createSlice({
  name: "result_curves",
  initialState: {
    curves: uniqueCurves,
    ids: uniqueIds,
  } as CurvesState,
  reducers: {
    addCurve:(state, action)=>{
        const newCurve = {
            id: action.payload.id,
            acid: action.payload.acid,
            rock: action.payload.rock,
            length: action.payload.length,
            diameter: action.payload.diameter,
            porosity: action.payload.porosity,
            concentration: action.payload.concentration,
            temperature: action.payload.temperature,
            wellboreRadiusIn: action.payload.wellboreRadiusIn,
            payzoneThicknessFt: action.payload.payzoneThicknessFt,
            target: action.payload.target,
            pvbtPoints: action.payload.pvbtPoints,
            flowratePoints: action.payload.flowratePoints,
            intersticialVelocity: action.payload.intersticialVelocity,
            iDa: action.payload.iDa,
            volumeToBt: action.payload.volumeToBt,
            timeToBt: action.payload.timeToBt,
            wormholeVelocity: action.payload.wormholeVelocity,
            darcyVelocity: action.payload.darcyVelocity,
            flowRegime: action.payload.flowRegime,
            targetLabel: action.payload.targetLabel,
            outputMode: action.payload.outputMode,
            acidVolumePoints: action.payload.acidVolumePoints,
            statusPoints: action.payload.statusPoints,
            withinValidityRange: action.payload.withinValidityRange,
            metadata: action.payload.metadata
        };

        const existingIndex = state.curves.findIndex(c => c.id === action.payload.id);
        if (existingIndex >= 0) {
            state.curves[existingIndex] = newCurve;
        } else {
            state.curves.push(newCurve);
            state.ids.push(action.payload.id);
        }

        localStorage.setItem("curves", JSON.stringify(state.curves));
        localStorage.setItem("ids", JSON.stringify(state.ids));
    },
    removeCurve:(state,action)=>{
        state.curves = state.curves.filter(curve => curve.id !== action.payload);
        state.ids = state.ids.filter(id => id !== action.payload);
        localStorage.setItem("curves", JSON.stringify(state.curves));
        localStorage.setItem("ids", JSON.stringify(state.ids));
    },
    clearAll:(state)=>{
      state.curves = []
      state.ids = []
      localStorage.removeItem("curves")
      localStorage.removeItem("ids")
    }
  }
});
export const {addCurve, removeCurve, clearAll} = curvesSlice.actions
export type {Curve};
export default curvesSlice.reducer;
