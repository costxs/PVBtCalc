import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { RootState } from "../store";
import handleAuthError from "../services/fetchAuth";
import { fetchRadialCurve } from "../radial/slice";
import { API_BASE } from "../../services/api";
export const fetchParam = createAsyncThunk("param/fetch", async (_, {getState,dispatch}) => {
    const state = getState() as RootState
    const setup = state.setup
    const token = state.user.token
    const setupEntries = Object.entries(setup);
    const filteredSetup = Object.fromEntries(setupEntries.slice(1, -3));
    const response = await fetch(`${API_BASE}/getparameters`, {
      method: "POST",
      headers: {
        Authorization:`Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(filteredSetup),
    });
    const data = await response.json();
    handleAuthError(response,dispatch)
    return data;
  });
  

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
    f:0,
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
            state.f = params["f"];
        })
  },
});
export default parametersSlice.reducer;
