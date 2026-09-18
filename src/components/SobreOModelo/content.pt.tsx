import React from 'react';
import { Eq, Frac, Ressalva, DocTable, SomSection } from './primitives';

export const sections: SomSection[] = [
  { id: 'intro', heading: 'Introdução' },
  { id: 'nomenclature', heading: 'Nomenclatura' },
  { id: 'properties', heading: 'Propriedades do sistema ácido-rocha' },
  { id: 'linear', heading: 'Modelo linear' },
  { id: 'radial', heading: 'Modelo radial' },
  { id: 'parameters', heading: 'Parâmetros do sistema ácido-mineral' },
  { id: 'validity', heading: 'Faixa de validade' },
  { id: 'quantities', heading: 'Grandezas reportadas' },
  { id: 'export', heading: 'Exportação de resultados' },
  { id: 'references', heading: 'Referências' },
];

export const subsections: SomSection[] = [
  { id: 'intro-matrix', heading: 'Acidificação de matriz em carbonatos' },
  { id: 'intro-model', heading: 'O modelo de Ali e Ziauddin (2019)' },
  { id: 'intro-scope', heading: 'Escopo do PVBtCalc' },
  { id: 'nomenclature-tables', heading: 'Símbolos das tabelas exportadas' },
  { id: 'linear-qopt', heading: 'Vazão ótima no modelo linear' },
  { id: 'radial-skin', heading: 'Fator de skin' },
];

const ContentPt: React.FC = () => (
  <>
    <p className="som-title">PVBtCalc</p>
    <p className="som-subtitle">Fundamentação Teórica e Modelagem Matemática</p>
    <p className="som-tagline">Modelo de crescimento de wormhole em acidificação de matriz — fluxo linear e radial</p>

    <h2 id="intro">Introdução</h2>

    <h3 id="intro-matrix">Acidificação de matriz em carbonatos</h3>
    <p>A acidificação de matriz é a injeção de ácido na formação em pressão abaixo da pressão de fratura, com o objetivo de remover danos de formação. Diferentemente dos arenitos, o ácido dissolve a própria matriz do carbonato de maneira instável, gerando canais condutivos altamente ramificados conhecidos como <em>wormholes</em> (Ali; Ziauddin, 2019).</p>
    <p>O que se observa, em laboratório e em campo, é que o ácido abre canais condutivos estreitos e ramificados que penetram a formação muito além da região dissolvida de forma difusa. São os <em>wormholes</em>. O mecanismo é de instabilidade: qualquer heterogeneidade inicial — um poro maior, uma vugulosidade — recebe mais fluxo, dissolve mais rápido, torna-se ainda mais condutiva, e o processo se realimenta. O resultado prático é que uma quantidade modesta de ácido produz penetração desproporcional, com fatores de skin fortemente negativos.</p>

    <h3 id="intro-model">O modelo de Ali e Ziauddin (2019)</h3>
    <p>ALI e ZIAUDDIN (2019) propõem um modelo mecanicista cuja proposta é atender simultaneamente a três requisitos: ter forma analítica, ter parâmetros determinados pelo sistema ácido-mineral em vez de por ajuste a cada testemunho, e valer nas geometrias linear e radial com a mesma parametrização.</p>
    <p>O desenvolvimento segue quatro etapas:</p>
    <ol>
      <li>uma relação entre a velocidade dentro do wormhole e a velocidade de Darcy, ajustada a partir de dados experimentais e expressa por coeficientes do sistema ácido-mineral (Seção 2 do artigo);</li>
      <li>um balanço de massa de ácido ao longo do canal, com consumo governado por cinética de primeira ordem, do qual resulta a expressão de PVBT para fluxo linear (Eq. 11);</li>
      <li>a derivada dessa expressão em relação à vazão, cujo zero localiza o fundo da curva em U (Eqs. 33 e 34);</li>
      <li>a reformulação do mesmo balanço em coordenadas radiais, com a área de escoamento crescente, culminando no tempo de injeção e no volume absoluto de ácido (Eqs. 41 e 42, Seção 3 do artigo).</li>
    </ol>
    <p>A validação apresentada pelos autores é em duas frentes: contra dados de PVBT de testemunhos lineares para diversos sistemas ácido-rocha (Seção 4), e contra experimentos radiais e tratamentos de campo documentados (Seções 5 e 6), estes últimos incluindo o conjunto de BURTON et al. (2018).</p>

    <h3 id="intro-scope">Escopo do PVBtCalc</h3>
    <p>O PVBtCalc implementa esse modelo nos dois regimes. Sobre ele, acrescenta o que o uso em projeto exige e o artigo não fornece em forma fechada: solução numérica da vazão ótima, varredura de vazão e de temperatura, sinalização da faixa de validade física, evolução do skin e exportação consolidada dos resultados. As caixas em destaque ao longo deste documento marcam exatamente onde a implementação vai além do que o artigo deduz — a distinção é deliberada e não deve ser apagada.</p>

    <h2 id="nomenclature">Nomenclatura</h2>

    <h3 id="nomenclature-tables">Símbolos das tabelas exportadas</h3>
    <p>Abaixo estão as nomenclaturas das três formas de tabela, uma por tipo de gráfico, além da aba Inputs. Os cabeçalhos das colunas abreviam os símbolos do modelo; a correspondência é a seguinte.</p>

    <h4>Design Plot — abas "Design ⟨T⟩ K"</h4>
    <DocTable
      headers={['Cabeçalho', 'Símbolo', 'Significado', 'Unidade']}
      rows={[
        [<>L [ft]</>, <>l</>, <>Comprimento do wormhole — ver nota de colisão de símbolo abaixo</>, <>ft</>],
        [<>q_opt [gal/(ft.min)]</>, <>q<sub>opt</sub></>, <>Vazão ótima para aquele comprimento, normalizada por pé de zona</>, <>gal/(ft·min)</>],
        [<>V_opt [gal/ft]</>, <>V<sub>A</sub>(q<sub>opt</sub>)</>, <>Volume de ácido na vazão ótima — mesma função da coluna V<sub>A</sub>, avaliada em q<sub>opt</sub></>, <>gal/ft</>],
        [<>tbt [min]</>, <>M·τ</>, <>Tempo até breakthrough na vazão ótima — t<sub>b</sub> na nomenclatura do artigo</>, <>min</>],
        [<>Temperatura [K]</>, <>T</>, <>Temperatura da curva</>, <>K</>],
        [<>Nota</>, <>—</>, <>Diagnóstico da linha — ver tabela de valores abaixo</>, <>texto</>],
      ]}
    />

    <h4>Simulation Chart — abas "Sim ⟨alvo⟩ ft"</h4>
    <DocTable
      headers={['Cabeçalho', 'Símbolo', 'Significado', 'Unidade']}
      rows={[
        [<>q0 [gal/(ft.min)]</>, <>q<sub>o</sub></>, <>Vazão de injeção varrida, normalizada por pé de zona</>, <>gal/(ft·min)</>],
        [<>V_A [gal/ft]</>, <>V<sub>A</sub></>, <>Volume de ácido até o comprimento alvo (Eq. 42)</>, <>gal/ft</>],
        [<>iv [m/s]</>, <>v<sub>o</sub> / φ<sub>t</sub></>, <>Velocidade intersticial — usa a porosidade total; o flowing fraction não entra nesta coluna</>, <>m/s</>],
        [<>wv [m/s]</>, <>v(λ = 0)</>, <>Velocidade no wormhole, avaliada na face do poço</>, <>m/s</>],
        [<>dv [m/s]</>, <>v<sub>o</sub></>, <>Velocidade de Darcy</>, <>m/s</>],
        [<>1/Da</>, <>1 / Da(λ)</>, <>Inverso do Damköhler, avaliado no comprimento alvo da curva</>, <>—</>],
        [<>tbt [s]</>, <>M·τ</>, <>Tempo até breakthrough</>, <>s</>],
        [<>Nota</>, <>—</>, <>Diagnóstico da linha</>, <>texto</>],
      ]}
    />

    <h4>Skin Evolution — abas "Skin ⟨vazão⟩ bbl-min"</h4>
    <DocTable
      headers={['Cabeçalho', 'Símbolo', 'Significado', 'Unidade']}
      rows={[
        [<>V_A [gal/ft]</>, <>V<sub>A</sub></>, <>Volume de ácido acumulado</>, <>gal/ft</>],
        [<>skin</>, <>S</>, <>Fator de skin — ver a seção correspondente</>, <>—</>],
        [<>comprimento [ft]</>, <>l</>, <>Comprimento do wormhole</>, <>ft</>],
        [<>Nota</>, <>—</>, <>Diagnóstico da linha</>, <>texto</>],
      ]}
    />

    <p className="sm-nota">Colisão de símbolo: a coluna L [ft] da tabela Design designa o comprimento do wormhole, que nesta nomenclatura é l minúsculo — L está reservado ao comprimento característico (1 m, constante). A mesma grandeza aparece como "comprimento [ft]" na tabela Skin e como nome de aba na Simulation.</p>

    <p className="sm-nota">A coluna tbt aparece nas duas tabelas e designa a mesma grandeza — o t<sub>b</sub> do artigo, definido na Seção 2 como "the breakthrough time in seconds" — mas em unidades diferentes: minutos no Design, segundos na Simulation. Atenção ao colchete antes de comparar valores entre as duas abas. Os caminhos de cálculo também diferem — no Design ela é obtida como a razão V_opt / q_opt, que equivale a M·τ pela identidade V<sub>A</sub> = M · q<sub>o</sub> · τ; na Simulation, por avaliação direta de M · τ(λ). Os dois concordam por construção, mas não compartilham código.</p>

    <h4>Valores da coluna Nota</h4>
    <DocTable
      headers={['Valor', 'Quando aparece']}
      rows={[
        [<>(vazio)</>, <>Linha comum, sem destaque.</>],
        [<>Mínimo na borda da faixa simulada; q_opt = …</>, <>Simulation: o menor V<sub>A</sub> da varredura é a primeira ou a última linha — o mínimo real está fora da faixa varrida.</>],
        [<>Mínimo na borda da faixa simulada</>, <>O mesmo caso, quando a curva não traz os metadados de q<sub>opt</sub>.</>],
        [<>V_A mínimo desta simulação; q_opt = …</>, <>Simulation: o menor V<sub>A</sub> está no interior da faixa varrida.</>],
        [<>V_A mínimo desta simulação</>, <>O mesmo caso, sem metadados.</>],
        [<>Alvo ⟨t⟩ ft (L = ⟨L⟩ ft)</>, <>Design: a linha é a mais próxima de um comprimento-alvo pedido, dentro de meio passo da malha.</>],
        [<>Alvo(s) ⟨…⟩ ft não atingido(s) — tabela termina em ⟨…⟩ ft (limite 1000 gal/ft)</>, <>Design: um ou mais alvos pedidos excedem o último comprimento tabulado. Fica na última linha.</>],
        [<>Skin alvo (mais próximo de ⟨…⟩)</>, <>Skin: a linha é a mais próxima do skin-alvo pedido.</>],
        [<>Skin final</>, <>Skin: nenhum skin-alvo foi definido — a nota marca o último ponto.</>],
      ]}
      caption="Mais de uma nota pode aparecer na mesma linha, concatenadas por “; ”."
    />

    <h2 id="properties">Propriedades do sistema ácido-rocha</h2>
    <p>O coeficiente de difusão depende da temperatura e da concentração, por correlação empírica (T em Kelvin):</p>
    <Eq n="18" fonte="ALI; ZIAUDDIN (2019), Eq. 18, Seção 2.">
      D<sub>m</sub> = exp( <Frac num="−2270" den="T" /> + 1,326 · C<sub>Ao</sub> − 12,11 )
    </Eq>

    <p>A constante cinética efetiva combina esse coeficiente com o parâmetro do sistema:</p>
    <Eq fonte="ALI; ZIAUDDIN (2019), Seção 2 — definição empregada junto à Tabela 1; k₀ é tabelado por sistema ácido-mineral.">
      k<sub>eff</sub> = k<sub>0</sub> · D<sub>m</sub>
    </Eq>

    <p>O poder de dissolução volumétrico não é constante: depende da densidade do ácido, que por sua vez varia com a temperatura. Por isso o painel de parâmetros ajustados exibe a densidade (ro) ao lado de X, e o valor de X muda quando a temperatura muda.</p>
    <Eq n="4" fonte="ALI; ZIAUDDIN (2019), Eq. 4 — aqui β é o poder de dissolução mássico, não o raio adimensional.">
      X = β<sub>mássico</sub> · <Frac num={<>ρ<sub>ácido</sub></>} den={<>ρ<sub>rocha</sub></>} />
    </Eq>

    <h2 id="linear">Modelo linear</h2>
    <p>Ali e Ziauddin (2019) propuseram um modelo mecanicista analítico cujos parâmetros são definidos pelo próprio sistema ácido-mineral, sendo aplicável tanto para fluxo linear quanto radial. No fluxo linear — caracterizado por um corpo de prova cilíndrico com injeção por uma das faces, onde a área de escoamento é constante ao longo do caminho —, a velocidade do fluido no interior do <em>wormhole</em> (v) relaciona-se com a velocidade de Darcy (v<sub>o</sub>) através da seguinte equação:</p>
    <Eq n="29" fonte="ALI; ZIAUDDIN (2019), Eq. 29, Seção 2. Coeficientes a, b, n da Tabela 1.">
      v = <Frac num={<>v<sub>o</sub></>} den={<>a · A<sub>o</sub><sup>(n−1)</sup> + b · v<sub>o</sub></>} />
    </Eq>

    <p>Através de um balanço de massa de ácido ao longo do canal, governado por cinética de primeira ordem, o modelo estabelece o Volume de Poros até o <em>Breakthrough</em> (PVBT) (Ali; Ziauddin, 2019). Essa formulação adimensional viabiliza a comparação entre testemunhos de dimensões variadas:</p>
    <Eq n="11" fonte="ALI; ZIAUDDIN (2019), Eq. 11, Seção 2 — resultado do balanço de massa para fluxo linear.">
      PVBT = [ (1 − φ<sub>t</sub>) / (φ<sub>t</sub> · λ · C<sub>Ao</sub> · X · ω · Da) ] · ( e<sup>Da·λ</sup> − 1 )
    </Eq>

    <h3 id="linear-qopt">Vazão ótima no modelo linear</h3>
    <p>A vazão ótima de injeção (q<sub>opt</sub>) encontra-se no ponto de mínimo da curva de PVBT, identificado ao se anular a derivada da expressão em relação à vazão (Ali; Ziauddin, 2019). Para o regime linear, os autores fornecem uma aproximação explícita que dispensa métodos iterativos:</p>
    <Eq n="34" fonte="ALI; ZIAUDDIN (2019), Eq. 34, Seção 2 — apresentada pelos autores como aproximação explícita da raiz da Eq. 33.">
      q<sub>opt</sub> ≈ a<sub>q</sub> · ( 1 + 1,3·b<sub>q</sub> − 2,6·b<sub>q</sub><sup>2</sup> ) / ( 1 + 2,7·b<sub>q</sub> )
    </Eq>
    <p className="sm-nota">com a<sub>q</sub> = a · A<sup>n</sup> · k<sub>eff</sub> · l<sub>c</sub> e b<sub>q</sub> = −e<sup>(−1 − b·k<sub>eff</sub>·l<sub>c</sub>)</sup>.</p>

    <h2 id="radial">Modelo radial</h2>
    <p>No fluxo radial, a área de escoamento expande conforme o <em>wormhole</em> avança, o que reduz drasticamente a velocidade do fluido e eleva o consumo de ácido nas paredes (Ali; Ziauddin, 2019). A integração deste balanço resulta no volume absoluto de ácido (V<sub>A</sub>) necessário para atingir o comprimento alvo:</p>
    <Eq n="36" fonte="ALI; ZIAUDDIN (2019), Eq. 36, Seção 3 — forma adimensional da Eq. 35.">
      ω = <Frac num="1" den={<>(a / A<sub>o</sub>) · [ 2·h·π·L²·(β + λ) ]<sup>n</sup> + b · v<sub>o</sub></>} />
    </Eq>

    <p>Como o fluido fica mais lento, o ácido permanece mais tempo em contato com a parede e se consome mais rápido. A Eq. 37 descreve esse consumo, e sua integração (Eqs. 38 e 39) fornece quanto ácido vivo sobrevive até a ponta do canal. O PVBtCalc não resolve essas duas numericamente: a integração tem solução fechada, resumida na função α(λ):</p>
    <Eq fonte="Integração fechada das Eqs. 37–39 de ALI; ZIAUDDIN (2019), Seção 3. Forma explícita obtida nesta implementação.">
      α(λ) = [ a · (2·h·π·L²)<sup>n</sup> / ( A<sub>o</sub> · (n + 1) ) ] · [ (β + λ)<sup>n+1</sup> − β<sup>n+1</sup> ] + b · v<sub>o</sub> · λ
    </Eq>

    <p>O destino final da Seção 3 do artigo é o volume absoluto de ácido:</p>
    <Eq n="42" fonte="ALI; ZIAUDDIN (2019), Eq. 42, Seção 3 — volume de ácido até o comprimento λ em fluxo radial.">
      V<sub>A</sub> = [ L · A<sub>o</sub> / ( C<sub>Ao</sub> · X ) ] · ∫<sub>0</sub><sup>λ</sup> ( e<sup>Da·ω·α</sup> / ω ) dλ
    </Eq>

    <h3 id="radial-skin">Fator de skin</h3>
    <p>O skin quantifica o dano ou a estimulação ao redor do poço. Para um wormhole dominante — um canal aberto, cuja condutividade é muito superior à da matriz — a fórmula de HAWKINS (1956) se reduz a:</p>
    <Eq fonte="Forma-limite da equação de HAWKINS (1956) para permeabilidade da zona alterada muito superior à da matriz; convenção adotada por ALI; ZIAUDDIN (2019) na Fig. 27.">
      S = − ln [ ( r<sub>w</sub> + l ) / r<sub>w</sub> ]
    </Eq>

    <h2 id="parameters">Parâmetros do sistema ácido-mineral</h2>
    <p>Os coeficientes a, b, n e k<sub>0</sub> vêm da Tabela 1 do artigo, indexada por mineral × sistema ácido. É esta parametrização que sustenta a proposta descrita em "O modelo de Ali e Ziauddin (2019)": o próprio título da tabela registra que "the same parameter values are used for both linear and radial flow".</p>
    <DocTable
      headers={['Sistema (calcário)', 'n', 'a', 'b', <>k<sub>0</sub></>]}
      rows={[
        [<>HCl sem inibidor</>, <>0,65</>, <>2,68·10⁻⁴</>, <>17,3</>, <>2,43·10⁷</>],
        [<>HCl com inibidor</>, <>0,65</>, <>5,10·10⁻⁴</>, <>35,1</>, <>2,43·10⁶</>],
        [<>Ácido emulsificado</>, <>0,65</>, <>4,61·10⁻⁴</>, <>15,5</>, <>2,85·10⁷</>],
      ]}
      caption="Extraída de ALI e ZIAUDDIN (2019), Tabela 1 — linhas de calcário."
    />

    <h2 id="validity">Faixa de validade</h2>
    <p>O modelo descreve o regime de wormhole dominante — aquele em que se forma um canal preferencial e o consumo de ácido é mínimo. Fora dele, em vazões muito baixas, o canal deixa de existir como estrutura distinta e a dissolução se torna compacta e uniforme, regime que estas equações não representam. O artigo delimita a faixa observada experimentalmente em uma ordem de grandeza para cada lado da vazão ótima:</p>
    <Eq fonte="Faixa reportada por ALI; ZIAUDDIN (2019), Seção 2, a partir de padrões de dissolução em testemunhos lineares. Critério operacional do PVBtCalc.">
      <Frac num={<>q<sub>opt</sub></>} den="10" /> ≤ q<sub>o</sub> ≤ 10 · q<sub>opt</sub>
    </Eq>
    <p>Fora dessa janela, o PVBtCalc sinaliza os pontos afetados nos gráficos e na tabela. O comportamento do modelo nessa região não é apenas impreciso: o volume previsto diverge para infinito, enquanto o comportamento físico real satura em valor finito.</p>

    <Ressalva titulo="A janela foi observada em fluxo linear">
      <p>A delimitação de uma ordem de grandeza aparece na Seção 2, a partir de fotografias de padrões de dissolução em testemunhos lineares. O artigo não repete essa observação especificamente para o fluxo radial. O PVBtCalc estende a mesma faixa aos dois regimes por analogia.</p>
      <p>Para o regime radial, o artigo oferece validação de outra natureza, descrita na Seção 6: comparação contra tratamentos de campo documentados por BURTON et al. (2018), cujos volumes variam de 5 a 700 gal/ft, com mediana de 75 gal/ft. Volumes calculados muito acima dessa faixa indicam configuração fora do domínio prático.</p>
    </Ressalva>

    <h2 id="quantities">Grandezas reportadas</h2>
    <DocTable
      headers={['Grandeza', 'Significado', 'Unidade']}
      rows={[
        [<>q<sub>0</sub></>, <>Vazão de injeção, normalizada por pé de zona</>, <>gal/(ft·min)</>],
        [<>V<sub>A</sub></>, <>Volume de ácido, normalizado por pé de zona</>, <>gal/ft</>],
        [<>iv</>, <>Velocidade intersticial — Darcy dividida pela porosidade total</>, <>m/s</>],
        [<>wv</>, <>Velocidade no wormhole, avaliada na face do poço (λ = 0)</>, <>m/s</>],
        [<>dv</>, <>Velocidade de Darcy</>, <>m/s</>],
        [<>1/Da</>, <>Inverso do Damköhler, avaliado no alvo da curva</>, <>—</>],
        [<>tbt</>, <>Tempo até breakthrough — t<sub>b</sub> na nomenclatura do artigo</>, <>s</>],
      ]}
    />
    <p className="sm-nota">As colunas wv e 1/Da são avaliadas em pontos diferentes do wormhole — wv na face do poço, 1/Da no comprimento alvo da curva — e portanto não devem ser comparadas entre si. No regime radial, 1/Da varia com o comprimento por construção; no linear, permanece constante.</p>
    <p>A normalização por pé de zona segue a convenção adotada por ALI e ZIAUDDIN (2019) a partir da Fig. 27, e permite comparar tratamentos em intervalos de espessuras distintas.</p>

    <h2 id="export">Exportação de resultados</h2>
    <p>O menu EXPORT, na barra lateral, reúne gráficos e tabelas de uma sessão de cálculo em um único arquivo.</p>
    <ol>
      <li>Execute os cálculos desejados no RUNNER. Cada aba — Design Plot, Simulation Chart, Skin Evolution e Analysis Chart — contribui com seu gráfico e sua tabela.</li>
      <li>Abra EXPORT. As curvas salvas aparecem listadas por Simulation ID.</li>
      <li>Selecione as curvas a incluir. O arquivo gerado reúne, para cada uma: bloco de cabeçalho com rocha, sistema ácido, concentração, porosidade, temperatura e geometria; a imagem de cada gráfico gerado; e a tabela correspondente, com os rótulos e unidades exibidos na tela.</li>
      <li>Confirme para baixar.</li>
    </ol>

    <h2 id="references">Referências</h2>
    <p className="sm-nota">A referência primária é a única consultada diretamente. As demais são citadas conforme discutidas no artigo; conferir os dados bibliográficos completos na lista de referências do próprio artigo antes de reaproveitá-las em documento formal.</p>
    <p>ALI, M.; ZIAUDDIN, M. Carbonate acidizing: A mechanistic model for wormhole growth in linear and radial flow. <em>Journal of Petroleum Science and Engineering</em>, v. 186, 106776, 2019. Disponível em: https://www.sciencedirect.com/science/article/pii/S0920410519311945</p>
    <p>BURTON, R. C. et al. Estudo de tratamentos de campo — volumes de ácido e skin resultante. Citado em Ali e Ziauddin (2019), Seções 5 e 6, 2018.</p>
    <p>HAWKINS, M. F. A note on the skin effect. <em>Journal of Petroleum Technology</em>, v. 8, n. 12, 1956.</p>
  </>
);

export default ContentPt;
