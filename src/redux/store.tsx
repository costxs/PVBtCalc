import { configureStore } from "@reduxjs/toolkit";
import setupSlice from './setup/slice'
import resultSlice from './results/slice'
import paramSlice from './parameters/slice'
import curvesSlice from './storageresults/slice'
const store = configureStore({
    reducer: {
        setup: setupSlice,
        results: resultSlice,
        parameters: paramSlice,
        resultCurves: curvesSlice
    },
});

export default store

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch