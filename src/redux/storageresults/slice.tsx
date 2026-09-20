import { createSlice } from "@reduxjs/toolkit";

interface Curve {
    id: string;
    acid: string;
    rock: string;
    length?: number,
    diameter?: number,
    porosity: number,
    concentration: number,
    temperature: number,
    wellboreRadiusIn?: number,
    payzoneThicknessFt?: number,
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
    withinValidityRange?: boolean[];
    metadata?: Record<string, number> | null;
    flowingFraction?: number | null;
  }

interface CurvesState {
    curves: Curve[];
    ids: string[];
    }
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
            metadata: action.payload.metadata,
            flowingFraction: action.payload.flowingFraction
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
