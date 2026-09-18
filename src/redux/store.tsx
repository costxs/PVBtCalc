import { configureStore } from "@reduxjs/toolkit";
import setupSlice from './setup/slice'
import resultSlice from './results/slice'
import paramSlice from './parameters/slice'
import curvesSlice from './storageresults/slice'
import userSlice from './user/slice'
import optsetupSlice from './optsetup/slice'
import analysisSlice from './analysisresults/slice'
import radialSlice from './radial/slice'
import uiSlice from './ui/slice'
const store = configureStore({
    reducer: {
        setup: setupSlice,
        results: resultSlice,
        parameters: paramSlice,
        resultCurves: curvesSlice,
        user: userSlice,
        optSetup: optsetupSlice,
        analysisResult : analysisSlice,
        radial: radialSlice,
        ui: uiSlice,
    },
});

export default store

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch