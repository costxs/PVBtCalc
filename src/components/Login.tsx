import { useState } from "react";
import {fetchLogin} from "../redux/user/slice";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../redux/store";
export default function LoginScreen(){
    const [password, setPassword] = useState("");
    const [username, setUsername] = useState("");
    const dispatch = useDispatch()
    const isPt = useSelector((state: RootState) => state.ui.language) === "pt";
    const handleLogin = () => {
        if (!username) {
            alert(isPt ? "Preencha o nome de usuário" : "Enter your username");
            return;
        }
        if (!password){
            alert(isPt ? "Preencha a senha" : "Enter your password");
            return;
        }
        dispatch(fetchLogin({username, password}) as any);
    };

    return(
        <>
        <div className="flex items-center justify-center  w-full h-full">
            <div className="w-[40%] h-[50%] bg-slate-300 flex flex-col items-center pt-5 space-y-10 rounded-lg shadow-2xl border-slate-400 border">
                <div className="flex flex-col justify-center items-center">
                    <img src="PVBtCalcLogo.png" alt="" className="w-32 h-auto" />
                    <div className="relative flex font-extrabold text-2xl">
                        <p>PVBtCalc</p>
                    </div>
                </div>
                <div className="space-y-5 flex flex-col w-[50%]">
                    <input type="text" name="" value={username} onChange={(e)=> setUsername(e.target.value)} id="" className="bg-white  rounded-lg h-[2rem] shadow-md p-1 ps-5" placeholder={isPt ? "Usuário" : "Username"}/>
                    <input type="password" name="" value={password} onChange={(e)=> setPassword(e.target.value)} id="" className="bg-white rounded-lg h-[2rem] shadow-md p-1 ps-5" placeholder={isPt ? "Senha" : "Password"}/>
                </div>
                <button className="uppercase bg-blue-500 p-2 font-bold rounded-2xl w-[20%] shadow-md hover:scale-110 transition-all cursor-pointer" onClick={handleLogin}>Login</button>
            </div>
        </div>
        </>
    )
}