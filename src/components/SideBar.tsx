import { BiSolidFileImport, BiSolidFileExport  } from "react-icons/bi";
import { GrTest } from "react-icons/gr";
import { RootState } from "../redux/store";
import { useDispatch, useSelector } from "react-redux";
import {logout} from "../redux/user/slice"

const Sidebar = () => {
  const {username} = useSelector((state:RootState)=>state.user)
  const dispatch = useDispatch()
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
        <a href="#" className="flex pointer-events-none opacity-60 items-center gap-4 text-gray-700 hover:text-gray-900">
          <BiSolidFileExport  size={'2vw'} />
          <span className="font-bold">Export</span>
        </a>
      </div>
      <div className="flex flex-col items-center justify-center space-y-[2vh] mt-[5vh]">
        <div className="flex items-center justify-center">
          <img src="\image.png" alt="" className="w-[4.5vw] h-auto" />
          <img src="\LCPETROGREY_icon.png" alt="" className="w-[5vw] h-auto" />
        </div>
        <div className="flex items-center justify-center">
          <img src="\EPM_icon.png" alt="" className="w-[4vw] h-auto" />
          <img src="\logo-br-min.png" alt="" className="w-[4vw] h-auto" />
        </div>
        <img src="\logoCenpes.png" alt="" className="w-full h-auto" />
      </div>
    </div>
  );
};

export default Sidebar;
