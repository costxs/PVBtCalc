import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { RootState } from "../store";
import handleAuthError from "../services/fetchAuth";
import { computeBeta, ftToLambda, lambdaToFt, lambdaToSkin, L_CHAR } from "./targetConversion";

export type FlowRegime = "linear" | "radial";
export type TargetMode = "length" | "skin";
export type WellboreSizeMode = "radius" | "diameter";
export type OutputMode = "pvbt" | "volume";

const DEFAULT_TARGETS_FT = [5, 10, 15, 20];

// Janela de validade da vazao (gal/(ft.min) desde a Fase 8 -- antes bbl/min
// -- ja convertido no backend via units.flowrate_to_display). null quando o
// backend nao conseguiu achar q_opt interior para esse alvo. `type` (nao
// `interface`) de proposito: assim e atribuivel a Record<string, number> --
// o contrato ValidityAwareCurve de tools/validityWindow.ts (Fase 7) le o
// metadata generico por sufixo de chave, sem depender deste tipo.
export type RadialCurveValidity = {
  q_opt_gal_ft_min: number;
  validity_min_gal_ft_min: number;
  validity_max_gal_ft_min: number;
};

// Bloco "Adjusted Parameters" para o request atual -- espelha o payload de
// /getparameters no Linear. Emitido pelo backend (routes/pvbtRadialCurve.py)
// junto da resposta principal para o painel poder confirmar visualmente qual
// AcidSetup foi resolvido a partir de system.acid_system.
export interface RadialAdjustedParameters {
  ro: number;
  X: number;
  x: number;
  n: number;
  a: number;
  b: number;
  k0: number;
  f: number;
}

export interface RadialCurveResult {
  target: number;
  target_label: string;
  flowratepoints: number[];
  // NOTA (divida Fase 5): o backend (Fase 2) agora emite null por elemento
  // onde status[i] === "clipped". Estes tipos ainda dizem number[]; corrigir
  // para (number | null)[] exige propagar pela cadeia storageresults/results/
  // Results.tsx -- fora do escopo da Fase 3 (que so consome metadata).
  pvbtpoints: number[] | null;
  acidvolumepoints: number[] | null;
  insterticialvelocity: number[];
  ida: number[];
  volumetobt: number[];
  timetobt: number[];
  wormholevelocity: number[];
  darcyvelocity: number[];
  status: string[];
  // array paralelo a status/flowratepoints -- mesmo indice, mesmo ponto (SoA).
  within_validity_range: boolean[];
  metadata: RadialCurveValidity | null;
}

export const fetchSkinEvolution = createAsyncThunk("radial/fetchSkin", async (_, { getState, dispatch }) => {
  const state = getState() as RootState;
  const { setup, radial } = state;
  const token = state.user.token;

  const globalSetup = radial.lastRunSetup || setup;
  const globalRadial = radial.lastRunRadial || radial;

  const wellboreRadiusIn = globalRadial.wellboreSizeMode === "diameter" ? globalRadial.wellboreSize / 2 : globalRadial.wellboreSize;

  const payload = {
    acid_type: globalSetup.acid_type,
    acid_concentration: globalSetup.acid_concentration,
    temperature_k: globalRadial.radialTemperatureK,
    core_porosity: globalSetup.core_porosity,
    wellbore_radius_in: wellboreRadiusIn,
    payzone_thickness_ft: globalRadial.payzoneThickness,
    rock_type: globalSetup.rock_type,
    flowrates_to_compare: radial.skinFlowrates,
    target: radial.targetsLambda?.[0] ?? 5.0
  };

  const response = await fetch("http://localhost:8000/skinevolution", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  handleAuthError(response, dispatch);
  return data;
});

export const fetchDesignPlot = createAsyncThunk("radial/fetchDesignPlot", async (_, { getState, dispatch }) => {
  const state = getState() as RootState;
  const { setup, radial } = state;
  const token = state.user.token;

  const wellboreRadiusIn = radial.wellboreSizeMode === "diameter" ? radial.wellboreSize / 2 : radial.wellboreSize;
  const beta = computeBeta(wellboreRadiusIn);

  const targets = radial.targetsLambda.map((lambda) =>
    radial.targetMode === "length" ? lambdaToFt(lambda, L_CHAR) : lambdaToSkin(lambda, beta)
  );

    const payload = {
    simulation_id: setup.id,
    system: {
      rock_type: setup.rock_type,
      porosity: setup.core_porosity,
      acid_system: setup.acid_type,
      acid_concentration: setup.acid_concentration,
      temperature_k: radial.radialTemperatureK,
    },
    geometry: {
      wellbore_radius_in: wellboreRadiusIn,
      payzone_thickness_ft: radial.payzoneThickness,
      drainage_radius_ft: radial.drainageRadius,
    },
    radial_targets: {
      target_mode: radial.targetMode,
      targets,
    },
    flowrate_sweep: {
      min: setup.minimum_flowrate,
      max: setup.flowrate,
      steps: setup.step_numbers,
    },
    temperatures_to_compare: radial.designTemperatures,
  };

  const response = await fetch("http://localhost:8000/designplot", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  handleAuthError(response, dispatch);
  return data;
});

// Response contract of /pvbtradialcurve (routes/pvbtRadialCurve.py):
// { output_mode: "pvbt" | "volume", curves: RadialCurveResult[], parameters: RadialAdjustedParameters }

export const fetchRadialCurve = createAsyncThunk("radial/fetch", async (_, { getState, dispatch }) => {
  const state = getState() as RootState;
  const { setup, radial } = state;
  const token = state.user.token;

  const wellboreRadiusIn = radial.wellboreSizeMode === "diameter" ? radial.wellboreSize / 2 : radial.wellboreSize;
  const beta = computeBeta(wellboreRadiusIn);

  // The backend contract expects targets in the CURRENT display unit
  // (ft for "length", skin for "skin"), not lambda -- lambda is only
  // the frontend's internal canonical representation.
  const targets = radial.targetsLambda.map((lambda) =>
    radial.targetMode === "length" ? lambdaToFt(lambda, L_CHAR) : lambdaToSkin(lambda, beta)
  );

    const payload = {
    simulation_id: setup.id,
    system: {
      rock_type: setup.rock_type,
      porosity: setup.core_porosity,
      acid_system: setup.acid_type,
      acid_concentration: setup.acid_concentration,
      temperature_k: radial.radialTemperatureK,
    },
    geometry: {
      wellbore_radius_in: wellboreRadiusIn,
      payzone_thickness_ft: radial.payzoneThickness,
      drainage_radius_ft: radial.drainageRadius,
    },
    radial_targets: {
      target_mode: radial.targetMode,
      targets,
    },
    flowrate_sweep: {
      min: setup.minimum_flowrate,
      max: setup.flowrate,
      steps: setup.step_numbers,
    },
  };

  const response = await fetch("http://localhost:8000/pvbtradialcurve", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  handleAuthError(response, dispatch);
  return data;
});

// Bug (2026-09): flowRegime nunca era persistido -- resetava pra "linear"
// em toda recarga, mesmo com curvas radiais salvas em resultCurves
// (storageresults/slice.tsx, que ESSE sim persiste via localStorage). O
// filtro por regime em Chart.tsx/Results.tsx (ver comentarios la) so evita
// misturar curvas de regimes diferentes; sem restaurar flowRegime tambem,
// o usuario cai sempre na aba Linear e as curvas radiais ficam "escondidas"
// (filtradas fora) ate ele trocar manualmente pra Radial de novo.
const FLOW_REGIME_STORAGE_KEY = "radialFlowRegime";

function loadPersistedFlowRegime(): FlowRegime {
  const raw = localStorage.getItem(FLOW_REGIME_STORAGE_KEY);
  return raw === "radial" ? "radial" : "linear";
}

const radialSlice = createSlice({
  name: "radial",
  initialState: {
    flowRegime: loadPersistedFlowRegime() as FlowRegime,
    wellboreSize: 3,
    wellboreSizeMode: "diameter" as WellboreSizeMode,
    payzoneThickness: 1,
    drainageRadius: null as number | null,
    targetMode: "length" as TargetMode,
    targetsLambda: DEFAULT_TARGETS_FT.map((ft) => ftToLambda(ft)) as number[],
    loading: false,
    error: false,
    processed: false,
    outputMode: "pvbt" as OutputMode,
    curves: [] as RadialCurveResult[],
    // l_ft (Fase 8): comprimento do wormhole por ponto, devolvido pelo
    // backend (generate_skin_evolution) para a tabela por aba -- antes so x/y.
    skinEvolutionData: {} as Record<string, {x: number, y: number, l_ft: number}[]>,
    skinEvolutionLoading: false,
    skinEvolutionError: false,
    skinFlowrates: [0.8, 1.6, 3.2] as number[],
    radialTemperatureK: 338.71,
    designTemperatures: [297.04, 338.71, 422.04] as number[],
    designPlotData: null as { series: { temperature_k: number, optimum_rate_series: number[][], optimum_volume_series: number[][] }[], has_clipped_volume?: boolean } | null,
    designPlotLoading: false,
    designPlotError: false,
    lastRunSetup: null as any,
    lastRunRadial: null as any,
  },
  reducers: {
    setFlowRegime: (state, action) => {
      state.flowRegime = action.payload;
      localStorage.setItem(FLOW_REGIME_STORAGE_KEY, action.payload);
    },
    setRadialGeometry: (state, action) => {
      const { wellboreSize, wellboreSizeMode, payzoneThickness, drainageRadius } = action.payload;
      state.wellboreSize = wellboreSize;
      state.wellboreSizeMode = wellboreSizeMode;
      state.payzoneThickness = payzoneThickness;
      state.drainageRadius = drainageRadius;
    },
    setTargetMode: (state, action) => {
      // Only changes how targetsLambda is RENDERED. The canonical
      // targetsLambda array itself is never touched here -- see
      // targetConversion.ts for why.
      state.targetMode = action.payload;
    },
    addTarget: (state, action) => {
      // action.payload must already be lambda (dimensionless) --
      // convert with parseTargetInput() at the call site, never
      // dispatch the raw text/number the user typed.
      if (state.targetsLambda.length >= 6) return;
      state.targetsLambda.push(action.payload);
    },
    removeTarget: (state, action) => {
      state.targetsLambda.splice(action.payload, 1);
    },
    resetRadial: (state) => {
      state.wellboreSize = 3;
      state.wellboreSizeMode = "diameter";
      state.payzoneThickness = 1;
      state.drainageRadius = null;
      state.targetMode = "length";
      state.targetsLambda = DEFAULT_TARGETS_FT.map((ft) => ftToLambda(ft));
      state.processed = false;
    },
    addSkinFlowrate: (state, action) => {
      if (!state.skinFlowrates.includes(action.payload)) {
        state.skinFlowrates.push(action.payload);
        state.skinFlowrates.sort((a, b) => a - b);
      }
    },
    removeSkinFlowrate: (state, action) => {
      state.skinFlowrates.splice(action.payload, 1);
    },
    clearSkinChartData: (state) => {
      state.skinEvolutionData = {};
    },
    setLastRunState: (state, action) => {
      state.lastRunSetup = action.payload.setup;
      state.lastRunRadial = action.payload.radial;
    },
    setRadialTemperatureK: (state, action) => {
      state.radialTemperatureK = action.payload;
    },
    addDesignTemperature: (state, action) => {
      if (!state.designTemperatures.includes(action.payload)) {
        state.designTemperatures.push(action.payload);
        state.designTemperatures.sort((a, b) => a - b);
      }
    },
    removeDesignTemperature: (state, action) => {
      state.designTemperatures.splice(action.payload, 1);
    },
    // Item 3 (cache/persistencia): "abrir" uma simulacao radial salva no
    // IndexedDB (tools/simulationStoreIO.ts) restaura o grafico/tabela com
    // os dados EXATOS congelados naquele snapshot -- curves/design/skin ja
    // vem prontos do chamador (curves convertidas de volta pro formato
    // RadialCurveResult via exportSimulations.toRawRadialCurve, MESMA
    // funcao que o export ja usava). lastRunSetup e so o minimo pra
    // isActiveRadialRun/export tratarem essa simulacao como valida depois.
    // NAO toca wellboreSize/targetsLambda/etc: se o usuario depois visitar
    // as abas Design/Skin, Chart.tsx ja refaz o fetch com a config ATUAL do
    // formulario (comportamento existente, fora de escopo mudar aqui).
    restoreRadialSnapshot: (state, action) => {
      const p = action.payload as {
        simulationId: string;
        curves: RadialCurveResult[];
        designSeries: { temperature_k: number; optimum_rate_series: number[][]; optimum_volume_series: number[][] }[] | null;
        skinSeries: Record<string, { x: number; y: number; l_ft: number }[]> | null;
        rock: string; acid: string; concentration: number | null; porosity: number | null;
      };
      state.flowRegime = "radial";
      localStorage.setItem(FLOW_REGIME_STORAGE_KEY, "radial");
      state.curves = p.curves;
      state.designPlotData = p.designSeries ? { series: p.designSeries } : null;
      state.skinEvolutionData = p.skinSeries ?? {};
      state.processed = true;
      state.error = false;
      state.lastRunSetup = {
        id: p.simulationId, rock_type: p.rock, acid_type: p.acid,
        acid_concentration: p.concentration, core_porosity: p.porosity,
      };
    },
  },
  extraReducers(builder) {
    builder
      .addCase(fetchRadialCurve.pending, (state) => {
        state.loading = true;
        state.processed = false;
        state.error = false;
      })
      .addCase(fetchRadialCurve.fulfilled, (state, action) => {
        state.loading = false;
        state.processed = true;
        state.outputMode = action.payload["output_mode"];
        state.curves = action.payload["curves"] || [];
      })
      .addCase(fetchRadialCurve.rejected, (state) => {
        state.loading = false;
        state.processed = false;
        state.error = true;
      })
      .addCase(fetchSkinEvolution.pending, (state) => {
        state.skinEvolutionLoading = true;
        state.skinEvolutionError = false;
      })
      .addCase(fetchSkinEvolution.fulfilled, (state, action) => {
        state.skinEvolutionLoading = false;
        state.skinEvolutionData = action.payload;
      })
      .addCase(fetchSkinEvolution.rejected, (state) => {
        state.skinEvolutionLoading = false;
        state.skinEvolutionError = true;
      })
      .addCase(fetchDesignPlot.pending, (state) => {
        state.designPlotLoading = true;
        state.designPlotError = false;
      })
      .addCase(fetchDesignPlot.fulfilled, (state, action) => {
        state.designPlotLoading = false;
        state.designPlotData = action.payload;
      })
      .addCase(fetchDesignPlot.rejected, (state) => {
        state.designPlotLoading = false;
        state.designPlotError = true;
      });
  },
});

export const { setFlowRegime, setRadialGeometry, setTargetMode, addTarget, removeTarget, resetRadial, addSkinFlowrate, removeSkinFlowrate, clearSkinChartData, setLastRunState, setRadialTemperatureK, addDesignTemperature, removeDesignTemperature, restoreRadialSnapshot } = radialSlice.actions;
export default radialSlice.reducer;
