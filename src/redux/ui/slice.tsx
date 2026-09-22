import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type Language = "pt" | "en";

interface UiState {
  visibleChart: string;
  language: Language;
}

const LANGUAGE_STORAGE_KEY = "pvbtcalc.language";

function loadPersistedLanguage(): Language {
  // Default is English; a stored choice wins. Never inferred from navigator.language.
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === "pt" || stored === "en") return stored;
  } catch { /* storage blocked: use the default */ }
  return "en";
}

function getInitialVisibleChart(): string {
  return "A";
}

const initialState: UiState = {
  visibleChart: getInitialVisibleChart(),
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
      try { localStorage.setItem(LANGUAGE_STORAGE_KEY, action.payload); } catch { /* storage blocked: the choice lasts for this session */ }
    },
  },
});

export const { setVisibleChart, setLanguage } = uiSlice.actions;
export default uiSlice.reducer;
