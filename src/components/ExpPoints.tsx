export default function ExpSection(){
    const headers = ["#","q0","PVBt"]
    const data = [
        ["1",0.54,0.54]
    ]
    return(
        <>
            <div className="w-3/3 h-full bg-slate-400 p-[0.6vw] flex flex-col justify-between">
                <p className="text-[1.2vw] font-bold ">Plot Experimental Points</p>
                <div className="flex flex-col space-y-[2vh]">
                    <input type="number" className="bg-slate-700 text-white p-[0.7vh] shadow-md rounded" placeholder="Flowrate"/>
                    <input type="number" className="bg-slate-700 text-white p-[0.7vh] shadow-md rounded" placeholder="PVBt"/>
                </div>
                <div className=" border">
                    <table className="border border-gray-700 text-bla bg-gray-100 shadow-md min-w-full text-[0.8vw]">
                            <thead>
                            <tr className="bg-gray-300">
                                {headers.map((header, index) => (
                                <th key={index} className="border border-gray-700 px-[0.3vw] py-[0.4vh] text-center">
                                    {header}
                                </th>
                                ))}
                            </tr>
                            </thead>
                            <tbody>
                            {data.map((row, rowIndex) => (
                                <tr key={rowIndex} className="text-center">
                                {row.map((cell, cellIndex) => (
                                    <td key={cellIndex} className="border border-gray-500 px-[0.3vw] py-[0.4vh]">
                                    {cell}
                                    </td>
                                ))}
                                </tr>
                            ))}
                            </tbody>
                        </table>
                </div>
                
                <div className="">
                    <button className="p-[0.7vh] text-[0.9vw] w-full font-semibold border rounded shadow-md bg-cyan-300">Export Points to PVBt Chart</button>
                </div>
            </div>
        </>
    )
}