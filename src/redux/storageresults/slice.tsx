import { createSlice } from "@reduxjs/toolkit";

// 🔹 Criando a Action Assíncrona para buscar funcionários

interface Curve {
    id: string;
    acid: string;
    rock: string;
    length: number,
    diameter: number,
    porosity: number,
    concentration: number,
    temperature: number,
    pvbtPoints: number[];
    flowratePoints: number[];
    intersticialVelocity: number[];
    iDa: number[];
    volumeToBt: number[];
    timeToBt: number[];
    wormholeVelocity: number[];
    darcyVelocity: number[];
  }

interface CurvesState {
    curves: Curve[];
    ids: string[];
    }
// 🔹 Criando o Slice do Redux
const curvesSlice = createSlice({
  name: "result_curves",
  initialState: {
    curves: JSON.parse(localStorage.getItem("curves") || "[]"), // 🔥 Carrega do localStorage
    ids: JSON.parse(localStorage.getItem("ids") || "[]"), // 🔥 Carrega do localStorage
  } as CurvesState,
  reducers: {
    addCurve:(state, action)=>{
        state.curves.push({
            id: action.payload.id,
            acid: action.payload.acid,
            rock: action.payload.rock,
            length: action.payload.length,
            diameter: action.payload.diameter,
            porosity: action.payload.porosity,
            concentration: action.payload.concentration,
            temperature: action.payload.temperature,
            pvbtPoints: action.payload.pvbtPoints,
            flowratePoints: action.payload.flowratePoints,
            intersticialVelocity: action.payload.intersticialVelocity,
            iDa: action.payload.iDa,
            volumeToBt: action.payload.volumeToBt,
            timeToBt: action.payload.timeToBt,
            wormholeVelocity: action.payload.wormholeVelocity,
            darcyVelocity: action.payload.darcyVelocity
        });
        state.ids.push(action.payload.id);
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
