import {FaChartBar} from "react-icons/fa";
import { BiSolidFileImport, BiSolidFileExport  } from "react-icons/bi";
import { GrTest } from "react-icons/gr";
import { useDispatch } from "react-redux";
import {logout} from "../redux/user/slice"

const Sidebar = () => {
  const dispatch = useDispatch()
  const handleLogout = () =>{
      dispatch(logout())
  }
  return (
    <div className={`flex flex-col bg-sky-200 shadow-md border-r border-gray-300  p-4 transition-all duration-300 h-full min-w-[10vw] max-w-[10vw]`}>

      <div className="justify-items-center mb-2 mt-10">
        <img src="src\assets\brasao.png" className="max-w-32" alt="" />
        <div className="my-[2vh] flex flex-col">
            <span className="font-bold text-3xl">PVBtCalc</span>
            <img src="\PVBtCalcLogo.png" alt="" />
        </div>
      </div>

      {/* Links do Menu */}
      <div className="flex flex-col gap-10 mt-10">
        <a href="#" className="flex items-center gap-4 text-gray-700 hover:text-gray-900">
          <GrTest size={'2vw'} className="text-blue-700"/>
          <span className="font-bold text-blue-700">Runner</span>
        </a>
        <a href="#" className="flex pointer-events-none opacity-60 items-center gap-4 text-gray-700 hover:text-gray-900">
          <BiSolidFileExport  size={'2vw'} />
          <span className="font-bold">Export</span>
        </a>
        <a href="#" className="flex pointer-events-none opacity-60 items-center gap-4 text-gray-700 hover:text-gray-900">
          <BiSolidFileImport size={'2vw'} />
          <span className="font-bold">Import</span>
        </a>
        <a href="#" className="flex pointer-events-none opacity-60 items-center gap-4 text-gray-700 hover:text-gray-900">
          <FaChartBar size={'2vw'} />
          <span className="font-bold">Tests Details</span>
        </a>
        <div className="w-full flex justify-center">
          <button className="bg-amber-500 p-1 rounded shadow-md cursor-pointer hover:scale-105" onClick={handleLogout}>LOGOUT</button>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center space-y-[2vh] mt-[5vh]">
        <div className="flex">
          <img src="\image.png" alt="" className="w-[50%] h-[10vh]" />
          <img src="\LCPETROGREY_icon.png" alt="" className="w-24 h-[10vh]" />
        </div>
        <div className="flex">
          <img src="\EPM_icon.png" alt="" className="w-[50%] h-auto" />
          <img src="\logo-br-min.png" alt="" className="w-[50%] h-auto" />
        </div>
        <img src="\logoCenpes.png" alt="" className="w-full h-auto" />
      </div>
    </div>
  );
};

export default Sidebar;
