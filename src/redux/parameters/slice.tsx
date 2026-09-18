import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
// 🔹 Criando a Action Assíncrona para buscar funcionários
import { RootState } from "../store";
import handleAuthError from "../services/fetchAuth";
import { fetchRadialCurve } from "../radial/slice";
// 🔹 Criando a Action Assíncrona para buscar funcionários
export const fetchParam = createAsyncThunk("param/fetch", async (_, {getState,dispatch}) => {
    const state = getState() as RootState
    const setup = state.setup
    const token = state.user.token
    const setupEntries = Object.entries(setup);
    // Removendo o primeiro e o último item
    const filteredSetup = Object.fromEntries(setupEntries.slice(1, -3));
    const response = await fetch("http://localhost:8000/getparameters", {
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
        // Modo Radial nao chama fetchParam (o endpoint /getparameters e
        // Linear-only: espera core_diameter/core_length, nao a geometria
        // radial) -- em vez disso, /pvbtradialcurve devolve o bloco de
        // parametros junto da resposta principal (ver RadialAdjustedParameters
        // em redux/radial/slice.tsx) e este reducer o consome aqui.
        .addCase(fetchRadialCurve.fulfilled, (state, action) => {
            const params = action.payload["parameters"];
            if (!params) return;
            state.ro = params["ro"];
            state.X = params["X"];
            state.x = params["x"];
            state.n = params["n"];
            state.a = params["a"];
            state.b = params["b"];
            state.k0 = params["k0"];
        })
  },
});
export default parametersSlice.reducer;
