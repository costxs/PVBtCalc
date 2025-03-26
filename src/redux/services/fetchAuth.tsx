import {logout} from "../user/slice"
import { ThunkDispatch, UnknownAction } from "@reduxjs/toolkit";
import { clearAll } from "../storageresults/slice";
export default function handleAuthError(response:Response, dispatch:ThunkDispatch<unknown, unknown, UnknownAction>){
    if (response.status === 401){
        dispatch(logout())
        dispatch(clearAll())
        alert("Sua sessão expirou. Faça login novamente.");
    }
}