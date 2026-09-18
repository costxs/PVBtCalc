import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import handleAuthError from "../services/fetchAuth";
// 🔹 Criando a Action Assíncrona para buscar funcionários
export const fetchLogin = createAsyncThunk("login/fetch", async ({username, password}:{username:string; password:string},{dispatch}) => {
    const formData = new URLSearchParams();
    formData.append("username",username);
    formData.append("password",password);
  
    const response = await fetch("http://localhost:8000/auth/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
    });
  
    const data = await response.json();
    handleAuthError(response, dispatch);
    return data;
  });

// 🔹 Criando o Slice do Redux
const loginSlice = createSlice({
  name: "user",
  initialState: { logged: !!localStorage.getItem("tokenPVBtCalc"), token:localStorage.getItem("tokenPVBtCalc"), username:localStorage.getItem("usernamePVBtCalc"), loading: false, error: false },
  reducers: {
    logout: (state)=>{
        state.token = null;
        state.logged = false;
        state.username = null;
        localStorage.removeItem("tokenPVBtCalc");
        localStorage.removeItem("usernamePVBtCalc");
    }
  },
  extraReducers(builder) {
      builder
        .addCase(fetchLogin.pending, (state)=>{
            state.loading = true;
            state.error = false;
        })
        .addCase(fetchLogin.fulfilled, (state, action) => {
            state.loading = false;
            state.token = action.payload["access_token"]
            state.username = action.payload["user"]
            console.log(action.payload)
            localStorage.setItem("usernamePVBtCalc",action.payload["user"])
            localStorage.setItem("tokenPVBtCalc", action.payload["access_token"])

            if (state.token){
                state.logged = true
            }
            else{
                state.logged = false
            }
        })
        .addCase(fetchLogin.rejected, (state)=>{
            state.loading = false;
            state.error = true;
        })
  },
});
export const {logout} = loginSlice.actions;
export default loginSlice.reducer;
