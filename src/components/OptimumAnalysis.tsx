export default function OptimalAnalysis(){
    return(
        <>
            <div className="w-full h-full bg-slate-400 rounded-sm p-[0.6vw] flex flex-col justify-between pointer-events-none opacity-30" aria-disabled={true}>
                <p className="text-[1.2vw] font-bold">Optimum Analysis</p>
                <div className="flex flex-col space-y-2">
                    <div className="flex flex-col space-y-0.5">
                        <label htmlFor="" className="font-semibold ps-2">Select a Parameter</label>
                        <select name="optimum" id="" className="bg-white rounded p-[0.7vh] font-bold">
                            <option value="">Pore Volume to BreakTrough</option>
                        </select>
                    </div>
                    <div className="flex flex-col">
                        <div className="flex justify-around space-x-2">
                            <input type="number" className="bg-slate-700 text-white p-[0.7vh] shadow-md rounded" placeholder="Inital"/>
                            <input type="number" className="bg-slate-700 text-white p-[0.7vh] shadow-md rounded" placeholder="Final"/>
                        </div>
                    </div>
                    <div className="mt-5">
                        <label htmlFor="" className="font-semibold">Number of Steps</label>
                        <input type="range" className="w-full"/>
                    </div>
                </div>
                <div className=" border">
                </div>
                <div className="">
                    <button className="p-[0.7vh] text-[0.9vw] w-full font-semibold border rounded shadow-md bg-sky-500">Analyse</button>
                </div>
            </div>
        </>
    )
}