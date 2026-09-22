import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { RootState } from "../store";
import handleAuthError from "../services/fetchAuth";
import { API_BASE } from "../../services/api";
import { computeBeta, lambdaToFt, lambdaToSkin, L_CHAR } from "../radial/targetConversion";

// FastAPI devolve {detail: "texto"} (HTTPException) ou {detail: [{loc, msg}]} (422).
const describeError = (status: number, body: any): string => {
  const d = body?.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d) && d.length) {
    return d.map((e: any) => `${(e.loc ?? []).slice(1).join(".") || "request"}: ${String(e.msg ?? e).replace(/^Value error, /, "")}`).join("; ");
  }
  // dictionary key + params, decoded by translateIfKey where the error is shown
  return `error.request_failed?${JSON.stringify({ status })}`;
};

const postJson = async (path: string, token: string, body: unknown, dispatch: any) => {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("error.unreachable");
  }
  handleAuthError(response, dispatch);
  let data: any = null;
  try { data = await response.json(); } catch { /* corpo nao-JSON: cai na mensagem por status */ }
  if (!response.ok) throw new Error(describeError(response.status, data));
  return data;
};

export const fetchAnalitical = createAsyncThunk("analysis/fetch", async (_, { getState, dispatch, rejectWithValue }) => {
  const state = getState() as RootState;
  const setup = { ...state.optSetup } as any;
  try {
    return await postJson("/pvbtanalitical", state.user.token as string, setup, dispatch);
  } catch (e: any) {
    return rejectWithValue(e.message as string);
  }
});

export interface RadialSweepArgs {
  sweepParam: "temperature" | "porosity" | "acid_concentration" | "wellbore_diameter" | "payzone_thickness";
  minimum: number;
  maximum: number;
  targetIndex: number;
}

export interface RadialOptimumResult {
  sweepParam: string;
  sweepValues: number[];
  optimumRate: number[];
  optimumVolume: number[];
  hasClippedVolume: boolean;
  firstClippedValue: number | null;
  skippedValues: number[];
  outsideCalibratedRange: number[];
  targetMode: "length" | "skin";
  target: number;
}

export const fetchRadialOptimumSweep = createAsyncThunk(
  "analysis/fetchRadial",
  async (args: RadialSweepArgs, { getState, dispatch, rejectWithValue }) => {
    const state = getState() as RootState;
    const { setup, radial } = state;
    const radiusIn = radial.wellboreSizeMode === "diameter" ? radial.wellboreSize / 2 : radial.wellboreSize;
    const lambda = radial.targetsLambda[args.targetIndex];
    if (lambda === undefined) return rejectWithValue("Select a target wormhole length.");
    const target = radial.targetMode === "length" ? lambdaToFt(lambda, L_CHAR) : lambdaToSkin(lambda, computeBeta(radiusIn));

    const payload = {
      sweep_param: args.sweepParam,
      minimum: args.minimum,
      maximum: args.maximum,
      steps: 30,
      target_mode: radial.targetMode,
      target,
      acid_system: setup.acid_type,
      acid_concentration: setup.acid_concentration,
      rock_type: setup.rock_type,
      porosity: setup.core_porosity,
      temperature_k: radial.radialTemperatureK,
      wellbore_radius_in: radiusIn,
      payzone_thickness_ft: radial.payzoneThickness,
      flow_min_bbl_min: setup.minimum_flowrate,
      flow_max_bbl_min: setup.flowrate,
    };
    try {
      const data = await postJson("/pvbtradialoptimum", state.user.token as string, payload, dispatch);
      const result: RadialOptimumResult = {
        sweepParam: data.sweep_param,
        sweepValues: data.sweep_values,
        optimumRate: data.optimum_rate,
        optimumVolume: data.optimum_volume,
        hasClippedVolume: !!data.has_clipped_volume,
        firstClippedValue: data.first_clipped_value ?? null,
        skippedValues: data.skipped_values ?? [],
        outsideCalibratedRange: data.outside_calibrated_range ?? [],
        targetMode: radial.targetMode,
        target,
      };
      return result;
    } catch (e: any) {
      return rejectWithValue(e.message as string);
    }
  }
);

export type AnalysisStatus = "idle" | "loading" | "ok" | "error";

interface CurveAnalysis {
  id: string;
  acid: string;
  rock: string;
  pvbtPoints: number[];
  analiticalpoints: number[];
  intersticialVelocity: number[];
  iDa: number[];
  volumeToBt: number[];
  timeToBt: number[];
  wormholeVelocity: number[];
  darcyVelocity: number[];
  status: AnalysisStatus;
  regime: "linear" | "radial" | null;
  error: string | null;
  radial: RadialOptimumResult | null;
}

const resultSlice = createSlice({
  name: "resultsBehavior",
  initialState: {
    id:'',
    acid:'',
    rock:'',
    pvbtPoints:[],
    analiticalpoints:[],
    intersticialVelocity:[],
    iDa:[],
    volumeToBt:[],
    timeToBt:[],
    wormholeVelocity:[],
    darcyVelocity:[],
    status: "idle",
    regime: null,
    error: null,
    radial: null,
   } as CurveAnalysis,
  reducers: {
    setId:(state, action)=>{
        state.id = action.payload
    },
    setSystem:(state,action)=>{
        const {acid, rock} = action.payload
        state.acid = acid
        state.rock = rock
    }
  },
  extraReducers(builder) {
      builder
        .addCase(fetchAnalitical.pending, (state)=>{
            state.status = "loading";
            state.regime = "linear";
            state.error = null;
        })
        .addCase(fetchAnalitical.fulfilled, (state, action) => {
            const p = action.payload;
            // Payload malformado (sem 'analyzed'/'analiticalpoints') nunca vira grafico vazio
            // com legenda "undefined": vira erro explicito.
            if (!p || typeof p.analyzed !== "string" || !Array.isArray(p.analiticalpoints)) {
                state.status = "error";
                state.error = "error.unexpected_response"; // dictionary key, translated where shown
                return;
            }
            state.status = "ok";
            state.id = p['analyzed']
            state.pvbtPoints = p['pvbtpoints'];
            state.analiticalpoints = p['analiticalpoints'];
            state.intersticialVelocity = p['insterticialvelocity'];
            state.iDa = p['ida'];
            state.volumeToBt = p['volumetobt'];
            state.timeToBt = p['timetobt'];
            state.wormholeVelocity = p['wormholevelocity'];
            state.darcyVelocity = p['darcyvelocity'];
        })
        .addCase(fetchAnalitical.rejected, (state, action)=>{
            state.status = "error";
            state.error = (action.payload as string) ?? action.error.message ?? "error.analysis_failed";
        })
        .addCase(fetchRadialOptimumSweep.pending, (state) => {
            state.status = "loading";
            state.regime = "radial";
            state.error = null;
            state.radial = null;
        })
        .addCase(fetchRadialOptimumSweep.fulfilled, (state, action) => {
            state.status = "ok";
            state.radial = action.payload;
        })
        .addCase(fetchRadialOptimumSweep.rejected, (state, action) => {
            state.status = "error";
            state.error = (action.payload as string) ?? action.error.message ?? "error.analysis_failed";
        });
  },
});
export type {CurveAnalysis};
export const {setId, setSystem} = resultSlice.actions
export default resultSlice.reducer;
