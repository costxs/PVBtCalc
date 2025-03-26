import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { RootState } from "../store";
import handleAuthError from "../services/fetchAuth";
// 🔹 Criando a Action Assíncrona para buscar funcionários
export const fetchAnalitical = createAsyncThunk("analysis/fetch", async (_, {getState,dispatch}) => {
    const state = getState() as RootState
    const setup = state.optSetup
    const token = state.user.token
    const setupEntries = Object.entries(setup);
    console.log(setupEntries)
    // Removendo o primeiro e o último item
    const response = await fetch("http://127.0.0.1:8000/pvbtanalitical", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json", // Informar que estamos enviando JSON
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

// 🔹 Criando o Slice do Redux
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
