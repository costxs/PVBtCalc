import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
// 🔹 Criando a Action Assíncrona para buscar funcionários
import { RootState } from "../store";
import handleAuthError from "../services/fetchAuth";
// 🔹 Criando a Action Assíncrona para buscar funcionários
export const fetchParam = createAsyncThunk("param/fetch", async (_, {getState,dispatch}) => {
    const state = getState() as RootState
    const setup = state.setup
    const token = state.user.token
    const setupEntries = Object.entries(setup);
    // Removendo o primeiro e o último item
    const filteredSetup = Object.fromEntries(setupEntries.slice(1, -3));
    const response = await fetch("https://pvbtcalcapi-production.up.railway.app/getparameters", {
      method: "POST",
      headers: {
        Authorization:`Bearer ${token}`,
        "Content-Type": "application/json", // Informar que estamos enviando JSON
      },
      body: JSON.stringify(filteredSetup),
    });
    const data = await response.json();
    handleAuthError(response,dispatch)
    return data;
  });
  

// 🔹 Criando o Slice do Redux
const parametersSlice = createSlice({
  name: "results",
  initialState: {
    ro:0,
    X:0,
    x:0,
    n:0,
    a:0,
    b:0,
    k0:0,
   },
  reducers: {

  },
  extraReducers(builder) {
      builder
        .addCase(fetchParam.pending, ()=>{

        })
        .addCase(fetchParam.fulfilled, (state, action) => {

            state.ro = action.payload["ro"];
            state.X = action.payload['X'];
            state.x = action.payload['x'];
            state.n = action.payload['n'];
            state.a = action.payload['a'];
            state.b = action.payload['b'];
            state.k0 = action.payload['k0']
        })
        .addCase(fetchParam.rejected, ()=>{

        })
  },
});
export default parametersSlice.reducer;
