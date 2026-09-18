import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type Language = "pt" | "en";

interface UiState {
  visibleChart: string;
  language: Language;
}

const LANGUAGE_STORAGE_KEY = "pvbtcalc.language";
const FLOW_REGIME_STORAGE_KEY = "radialFlowRegime";

function loadPersistedLanguage(): Language {
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored === "pt" || stored === "en") return stored;
  return "en";
}

function getInitialVisibleChart(): string {
  try {
    const storedRegime = localStorage.getItem(FLOW_REGIME_STORAGE_KEY);
    if (storedRegime === "radial") {
      return "design";
    }
  } catch {
    // ignore
  }
  return "A";
}

const initialState: UiState = {
  visibleChart: getInitialVisibleChart(), // 'A' = Simulation, 'B' = Analysis, 'design' = Design Plot, 'skin' = Skin Evolution
  language: loadPersistedLanguage(),
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setVisibleChart: (state, action: PayloadAction<string>) => {
      state.visibleChart = action.payload;
    },
    setLanguage: (state, action: PayloadAction<Language>) => {
      state.language = action.payload;
      localStorage.setItem(LANGUAGE_STORAGE_KEY, action.payload);
    },
  },
});

export const { setVisibleChart, setLanguage } = uiSlice.actions;
export default uiSlice.reducer;
