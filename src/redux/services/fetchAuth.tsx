import {logout} from "../user/slice"
import { ThunkDispatch, UnknownAction } from "@reduxjs/toolkit";
export default function handleAuthError(response:Response, dispatch:ThunkDispatch<unknown, unknown, UnknownAction>){
    if (response.status === 401){
        dispatch(logout())
        alert("Sua sessão expirou. Faça login novamente.");
    }
}