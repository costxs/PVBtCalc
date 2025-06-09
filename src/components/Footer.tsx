import { FaLinkedin } from "react-icons/fa";
import { FaSquareGithub } from "react-icons/fa6";
export default function FooterSection(){
    return(
        <>
        <div className="flex flex-col items-center justify-center space-y-4 min-h-[20vh] w-full bg-slate-800 py-[3vh] px-[1vw]">
            <div>
                <p className="text-gray-300 text-justify"> &copy; 2025 Luiz Valente. Web application developed as a Final Graduation Project. All rights reserved.</p>
            </div>
            <div className="flex">
                <a href="https://www.linkedin.com/in/luiz-valente/" className="hover:scale-110 transition-all" target="blank">
                    <FaLinkedin className="size-[2.5vw] text-blue-500"/>
                </a>
                <a href="https://github.com/ByteAngler" className="hover:scale-110 transition-all" target="blank">
                    <FaSquareGithub className="size-[2.5vw] text-white"/>
                </a>
            </div>
                <div className="w-full bg-slate-800 text-white flex justify-center space-y-[1vh]">
                    <div className="w-1/3 px-[2vw]">
                        <h1 className="uppercase font-bold pb-[1vh]">Financial Support</h1>
                        <p className="text-[0.65vw] space-y-1 pb-[1vh]">This project was partially funded by Petrobras through <strong>project 2019/00154-4</strong>, entitled <strong>"Study of Carbonate Acidification Using Low Reactivity Systems."</strong></p>
                        <h1 className="uppercase font-bold pb-[1vh]">Development</h1>
                        <p className="text-[0.65vw] space-y-1">Luiz Guilherme Valente Cardoso, Cláudio Regis dos Santos Lucas, Pedro Tupã Pandava Aum, Laboratório de Ciência e Engenharia de Petróleo (LCPETRO), Universidade Federal do Pará (UFPA)</p>
                                           
                    </div>
                    <div className="w-1/3 px-[2vw]">
                        <h1 className="uppercase font-bold pb-[1vh]">Related Publication</h1>
                        <p className="text-[0.65vw] space-y-1">CARDOSO, Luiz Guilherme Valente et al. Desenvolvimento de Um Software In House para Análise do Pore Volume To Breakthrough (PVBt) na Estimulação Ácida em Carbonatos. In: ANAIS DO 11º CONGRESSO BRASILEIRO DE PETRóLEO E GáS, 2022, Belém. Anais eletrônicos, Galoá, 2022. Avaliable in: <a 
                            href="https://proceedings.science/pdpetro-2022/trabalhos/desenvolvimento-de-um-software-in-house-para-analise-do-pore-volume-to-breakthro?lang=pt-br"
                            target="blank"
                            className="text-blue-500 underline"
                        >
                            Anais do 11º Congresso Brasileiro de Petróleo e Gás
                            </a></p>

                    </div>
                    <div className="w-1/3 px-[2vw]">
                        <div>   
                            <h3 className="uppercase font-bold pb-[1vh]">Models</h3>
                            <ul className="text-[0.65vw] space-y-1">
                                <li>
                                    <p className="inline">Acid corelation: </p><strong>Perry, R. H.</strong> (1934). <em>Perry's Chemical Engineers' Handbook</em>.
                                </li>
                                <li>
                                    <p className="inline">PVBt Model: </p><strong>Ali, M., & Ziauddin, M.</strong> (2020). <em>Operating conditions for both plain acid and emulsified acid with and without corrosion inhibitor</em>. <em>Journal of Petroleum Science and Engineering</em>, 2020.
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
        </div>
        </>
    )
}