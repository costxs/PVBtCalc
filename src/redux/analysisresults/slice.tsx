import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { RootState } from "../store";
import handleAuthError from "../services/fetchAuth";
import { API_BASE } from "../../services/api";
export const fetchAnalitical = createAsyncThunk("analysis/fetch", async (_, {getState,dispatch}) => {
    const state = getState() as RootState
    const setup = { ...state.optSetup } as any
    const radial = state.radial
    
    if (radial.flowRegime === 'radial') {
      setup.flow_regime = 'radial';
      setup.target_mode = radial.targetMode;
      setup.target = radial.targetsLambda?.[0] ?? 5.0;
      setup.wellbore_radius_in = radial.wellboreSize;
      setup.payzone_thickness_ft = radial.payzoneThickness;
    }
    
    const token = state.user.token
    const setupEntries = Object.entries(setup);
    console.log(setupEntries)
    const response = await fetch(`${API_BASE}/pvbtanalitical`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(setup),
    });
    const data = await response.json();
    handleAuthError(response,dispatch)
    return data;
  });
  

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
        .addCase(fetchAnalitical.pending, ()=>{
        })
        .addCase(fetchAnalitical.fulfilled, (state, action) => {
            state.id = action.payload['analyzed']
            state.pvbtPoints = action.payload['pvbtpoints'];
            state.analiticalpoints = action.payload['analiticalpoints'];
            state.intersticialVelocity = action.payload['insterticialvelocity'];
            state.iDa = action.payload['ida'];
            state.volumeToBt = action.payload['volumetobt'];
            state.timeToBt = action.payload['timetobt'];
            state.wormholeVelocity = action.payload['wormholevelocity'];
            state.darcyVelocity = action.payload['darcyvelocity'];
        })
        .addCase(fetchAnalitical.rejected, ()=>{
        })
  },
});
export type {CurveAnalysis};
export const {setId, setSystem} = resultSlice.actions
export default resultSlice.reducer;
