import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface UiState {
  visibleChart: string;
}

const initialState: UiState = {
  visibleChart: 'A', // 'A' = Simulation, 'B' = Analysis, 'design' = Design Plot, 'skin' = Skin Evolution
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setVisibleChart: (state, action: PayloadAction<string>) => {
      state.visibleChart = action.payload;
    },
  },
});

export const { setVisibleChart } = uiSlice.actions;
export default uiSlice.reducer;
