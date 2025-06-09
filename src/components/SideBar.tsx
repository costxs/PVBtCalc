import { BiSolidFileExport  } from "react-icons/bi";
import { GrTest } from "react-icons/gr";
import { RootState } from "../redux/store";
import { useDispatch, useSelector } from "react-redux";
import {logout} from "../redux/user/slice"
import { useState } from "react";
import { Curve } from "../redux/storageresults/slice";
import exportCurveAsVerticalTable from "../tools/export";
const Sidebar = () => {
  const {username} = useSelector((state:RootState)=>state.user)
  const dispatch = useDispatch()
  const {ids, curves} = useSelector((state:RootState)=> state.resultCurves)
  const [exp, setExp] = useState(false);
  const [curve, setCurve] = useState(null);

  const handleID = (id: string) => {
    setCurve((curves as any).find((c:Curve)=> c.id === id));
    
  }
  console.log(curve)
  const handleExport = () =>{
    if(curve){
      exportCurveAsVerticalTable(curve as any);
    }
    setExp(false);
  }

  const handleExp = () => {
    setExp(true);
  }
  const handleLogout = () =>{
      dispatch(logout())
  }
  return (
    <div className={`flex flex-col bg-sky-200 shadow-md border-r border-gray-300  p-4 transition-all duration-300 h-full min-w-[10vw] max-w-[10vw]`}>

      <div className="justify-items-center mb-2 mt-10">
        <img src="src\assets\brasao.png" className="max-w-32" alt="" />
        <div className="my-[2vh] flex flex-col">
            <span className="font-bold text-[1.8vw]">PVBtCalc</span>
            <img src="\PVBtCalcLogo.png" className="w-[10vw] h-auto" alt="" />
        </div>
      </div>

      {/* Links do Menu */}
      <div className="flex flex-col gap-10 mt-10">
        <div className="w-full my-[2vh] flex flex-col justify-center items-center space-y-1">
          <p className="text-nowrap">User: <span className="font-bold">{username}</span></p>
          <button className="bg-amber-500 p-1 rounded shadow-md w-1/2 cursor-pointer hover:scale-105" onClick={handleLogout}>LOGOUT</button>
        </div>
        <a href="#" className="flex items-center gap-4 text-gray-700 hover:text-gray-900 pointer-events-none">
          <GrTest size={'2vw'} className="text-blue-700"/>
          <span className="font-bold text-blue-700 ">Runner</span>
        </a>
        <a onClick={handleExp} className="flex items-center cursor-pointer gap-4 text-gray-700 hover:text-gray-900">
          <BiSolidFileExport  size={'2vw'} />
          <span className="font-bold">Export</span>
        </a>
      </div>
      <div className="flex flex-col items-center justify-center space-y-[2vh] mt-[5vh]">
        <div className="flex items-center justify-center">
          <img src="\image.png" alt="" className="w-[5vw] h-auto" />
        </div>
        <div className="flex items-center justify-center">
          <img src="\LCPETROGREY_icon.png" alt="" className="w-[6vw] h-auto" />
        </div>  
      </div>
      <div className={`absolute top-[30%] px-[0.7vw] py-[2vh] space-y-[5vh] left-[30%] shadow-2xl rounded border-2 flex items-center flex-col bg-slate-300 min-w-[20vw] h-fit w-fit ${exp?'block':'hidden'}`}>
        <p className="font-semibold">Select a Curve and click to export</p>
        <ul className="w-full divide-y border">
          {ids.map((id)=>(
            <li onClick={()=>handleID(id)} className={`cursor-pointer font-semibold w-full  p-[0.3vw] ${(curve?((curve as any).id === id ? 'bg-sky-500':'bg-white'):'bg-white')}`}>{id}</li>
          ))}
        </ul>
        <div className="flex space-x-[0.5vw]">

          <button className="text-center w-6/12 p-[1vh] shadow-md rounded-md cursor-pointer hover:scale-105 active:scale-95 bg-lime-600" onClick={handleExport}>Export</button>
          <button className="text-center w-6/12 p-[1vh] shadow-md rounded-md cursor-pointer hover:scale-105 active:scale-95 bg-orange-600" onClick={()=>setExp(false)}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
