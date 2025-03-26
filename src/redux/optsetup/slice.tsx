// setupMirrorSlice.ts (Redux B)
import { createSlice } from "@reduxjs/toolkit";
import { setGeometry, setSystem, setParameter, resetParameter } from "../setup/slice"; // Redux A

const setupMirrorSlice = createSlice({
  name: "setupMirror",
  initialState: {
    analitical_param:'temperature',
    acid_type: 'HCl',
    acid_concentration: 0.15,
    core_diameter: 1.5,
    core_length: 6,
    core_porosity: 0.15,
    rock_type: 'Indiana Limestone',
    temperature: 24.05,
    flowrate: '',
    minimum_analitical:'',
    step_numbers: 50,
  },
  reducers: {
    setAnalitical:(state, action)=>{
        state.minimum_analitical = action.payload
    },
    setOders:(state,action)=>{
        const {key, value} = action.payload
        if (state.hasOwnProperty(key)) {
            (state as any)[key] = value;
          }
    },
    setflowrate:(state, action)=>{
        state.flowrate = action.payload
    },
    setParam:(state, action)=>{
        state.analitical_param = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(setGeometry, (state, action) => {
        state.rock_type = action.payload['rock'];
        state.core_length = action.payload['length'];
        state.core_diameter = action.payload['diameter'];
        state.core_porosity = action.payload['porosity'];
      })
      .addCase(setSystem, (state, action) => {
        state.acid_type = action.payload['acidtype'];
        state.acid_concentration = action.payload['concentration'];
        state.temperature = action.payload['temperature'];
        state.step_numbers = action.payload['steps'];
        state.flowrate = action.payload['iflowrate'];
        // ⛔ NÃO pega: id, optimum, minimum_flowrate
      })
      .addCase(setParameter, (state, action) => {
        const { key, value } = action.payload;
        // só copia se for uma chave permitida
        const allowedKeys = [
          "acid_type",
          "acid_concentration",
          "core_diameter",
          "core_length",
          "core_porosity",
          "rock_type",
          "temperature",
          "step_numbers"
        ];
        if (allowedKeys.includes(key)) {
          (state as any)[key] = value;
        }
      })
      .addCase(resetParameter, (state) => {
        // reset apenas os campos herdados
        state.acid_concentration = 0;
        state.core_diameter = 0;
        state.core_length = 0;
        state.core_porosity = 0;
        state.temperature = 0;
        state.flowrate = '';
        state.acid_type = '';
        state.rock_type = '';
        state.step_numbers = 0;
      });
  },
});
export const {setAnalitical, setParam, setflowrate, setOders} = setupMirrorSlice.actions
export default setupMirrorSlice.reducer;
