import {createSlice } from "@reduxjs/toolkit";
  

const setupSlice = createSlice({
  name: "setup",
  initialState: {
    id:'',
    acid_type:'HCl',
    acid_concentration:0.15,
    core_diameter:1.5,
    core_length:6,
    core_porosity:0.15,
    rock_type:'Indiana Limestone', 
    temperature:24.05,
    flowrate:10,
    minimum_flowrate:0.5,
    step_numbers:50,
    optimum:false
   },
  reducers: {
    setGeometry:(state, action)=>{
        state.rock_type = action.payload['rock']
        state.core_length = action.payload['length'];
        state.core_diameter = action.payload['diameter'];
        state.core_porosity = action.payload['porosity'];
    },
    setSystem:(state, action)=>{
        state.id = action.payload['id']
        state.acid_type = action.payload['acidtype'];
        state.acid_concentration = action.payload['concentration'];
        state.temperature = action.payload['temperature'];
        state.step_numbers = action.payload['steps'];
        state.flowrate = action.payload['iflowrate'];
        state.minimum_flowrate = action.payload['ffflowrate'];
        state.optimum = action.payload['optimum'];
    },
    setParameter: (state, action) => {
        const { key, value } = action.payload;
        if (state.hasOwnProperty(key)) {
          (state as any)[key] = value;
        }
      },
    resetParameter:(state) =>{
        state.id = '';
        (state.acid_concentration as any) = false;
        (state.core_diameter as any) = false;
        (state.core_length as any) = false;
        (state.core_porosity as any) = false;
        (state.temperature as any) = false;
        (state.flowrate as any) = false;
        (state.minimum_flowrate as any) = false;
    }
  },
});

export const {setGeometry, setSystem, setParameter, resetParameter} = setupSlice.actions
export default setupSlice.reducer;
