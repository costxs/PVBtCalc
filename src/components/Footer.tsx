import { FaLinkedin } from "react-icons/fa";
import { FaSquareGithub } from "react-icons/fa6";
export default function FooterSection(){
    return(
        <>
        <div className="flex flex-col items-center justify-center space-y-5 min-h-[20vh] w-full bg-slate-800 py-[3vh] px-[1vw]">
            <div>
                <p className="text-gray-300 text-justify"> &copy; 2025 Luiz Valente. Web application developed as a Final Graduation Project. All rights reserved.</p>
            </div>
                <div className="w-full bg-slate-800 text-white flex items-center justify-center space-y-[1vh]">
                    <div className="w-1/3">
                        <a href="" className="underline font-bold text-[1vw] text-orange-400">View usage guide</a>
                    </div>
                    <div className="flex space-x-1 justify-center items-center w-1/3">
                        <a href="https://www.linkedin.com/in/luiz-valente/" className="hover:scale-110 transition-all" target="blank">
                            <FaLinkedin className="size-[2.5vw] text-blue-500"/>
                        </a>
                        <a href="https://github.com/ByteAngler" className="hover:scale-110 transition-all" target="blank">
                            <FaSquareGithub className="size-[2.5vw] text-white"/>
                        </a>
                    </div>
                    <div className="w-1/3 px-[3vw]">
                        <p>
                            <h3 className="uppercase font-bold pb-[1vh]">Models</h3>
                            <ul className="text-[0.6vw] space-y-1">
                                <li>
                                    <p className="inline">Acid corelation: </p><strong>Perry, R. H.</strong> (1934). <em>Perry's Chemical Engineers' Handbook</em>.
                                </li>
                                <li>
                                    <p className="inline">PVBt Model: </p><strong>Ali, M., & Ziauddin, M.</strong> (2020). <em>Operating conditions for both plain acid and emulsified acid with and without corrosion inhibitor</em>. <em>Journal of Petroleum Science and Engineering</em>, 2020.
                                </li>
                            </ul>
                        </p>
                    </div>
                </div>
        </div>
        </>
    )
}