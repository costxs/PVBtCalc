import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { RootState } from "../store";
import handleAuthError from "../services/fetchAuth";
// 🔹 Criando a Action Assíncrona para buscar funcionários
export const fetchCurve = createAsyncThunk("curve/fetch", async (_, {getState, dispatch}) => {
    const state = getState() as RootState
    const setup = state.setup
    const token = state.user.token
    const setupEntries = Object.entries(setup);
    // Removendo o primeiro e o último item
    const filteredSetup = Object.fromEntries(setupEntries.slice(1, -1));
    const response = await fetch("https://pvbtcalc-back.onrender.com/pvbtcurve", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json", // Informar que estamos enviando JSON
      },
      body: JSON.stringify(filteredSetup),
    });
    const data = await response.json();
    handleAuthError(response,dispatch)
    return data;
  });
  

// 🔹 Criando o Slice do Redux
const resultSlice = createSlice({
  name: "results",
  initialState: {
    id:'',
    acid:'',
    rock:'',
    length:0,
    diameter:0,
    porosity:0,
    concentration:0,
    temperature:0,
    pvbtPoints:[],
    flowratePoints:[],
    intersticialVelocity:[],
    iDa:[],
    volumeToBt:[],
    timeToBt:[],
    wormholeVelocity:[],
    darcyVelocity:[],
    loading:false,
    error:false,
    processed:false,
   },
  reducers: {
    setId:(state, action)=>{
        state.id = action.payload
    },
    setSystem:(state,action)=>{
        const {acid, rock} = action.payload
        state.acid = acid
        state.rock = rock
    },
    setOthers:(state,action)=>{
        
        state.acid = action.payload.acid_type
        state.rock = action.payload.rock_type
        state.length = action.payload.core_length
        state.diameter = action.payload.core_diameter
        state.porosity = action.payload.core_porosity
        state.concentration = action.payload.acid_concentration
        state.temperature = action.payload.temperature
    }
  },
  extraReducers(builder) {
      builder
        .addCase(fetchCurve.pending, (state)=>{
            state.loading = true;
            state.processed = false;
            state.error = false;
        })
        .addCase(fetchCurve.fulfilled, (state, action) => {
            state.loading = false;
            state.processed = true;
            state.pvbtPoints = action.payload['pvbtpoints'];
            state.flowratePoints = action.payload['flowratepoints'];
            state.intersticialVelocity = action.payload['insterticialvelocity'];
            state.iDa = action.payload['ida'];
            state.volumeToBt = action.payload['volumetobt'];
            state.timeToBt = action.payload['timetobt'];
            state.wormholeVelocity = action.payload['wormholevelocity'];
            state.darcyVelocity = action.payload['darcyvelocity'];
        })
        .addCase(fetchCurve.rejected, (state)=>{
            state.loading = false;
            state.processed = false;
            state.error = true;
        })
  },
});
export const {setId, setSystem, setOthers} = resultSlice.actions
export default resultSlice.reducer;
