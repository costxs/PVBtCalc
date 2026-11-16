/**
 * Textos do tour guiado — PRIMEIRA VERSÃO, SÓ EM PORTUGUÊS, PARA REVISÃO.
 *
 * Por enquanto o tour aparece em português nos dois idiomas da interface. Depois da
 * revisão, os textos vão para en.ts/pt.ts com as chaves tour.<trilha>.<id>.title/body.
 *
 * Base: pvbtcalc-tour/src/tour/tourSteps.ts (manual v3 + ALI & ZIAUDDIN, 2019),
 * conferida contra a interface atual. Os nomes entre aspas são os rótulos da tela em
 * português. `anchor` casa com data-tour / data-tour-alt nos componentes.
 */
import type { TourDefinition, TourTrack } from "../tour/types";

const linear: TourDefinition = {
  track: "linear",
  initialChart: "lsim",
  steps: [
    {
      id: "welcome",
      anchor: null,
      title: "Bem-vindo ao PVBtCalc",
      body:
        "Este tour mostra, em poucos passos, como montar e ler uma simulação. Use as setas do " +
        "teclado ou os botões para avançar e voltar, e Esc para sair. Para rever o tour depois, " +
        "use o botão \"Tour guiado\" no menu lateral.",
    },
    {
      id: "nav",
      anchor: "nav",
      title: "Menu lateral",
      body:
        "\"Simulador\" monta e calcula as simulações. \"Exportar\" reúne as simulações da sessão " +
        "em arquivos. \"Sobre o Modelo\" traz as equações e as fontes. \"Feedback\" envia " +
        "comentários à equipe, e o botão de idioma alterna entre português e inglês.",
    },
    {
      id: "regime",
      anchor: "lin.regime",
      title: "Regime de escoamento",
      body:
        "Linear representa o ensaio em testemunho: o ácido entra por uma face de um plugue " +
        "cilíndrico e a área de escoamento é constante ao longo do caminho. Radial representa o " +
        "poço. Os campos abaixo mudam conforme a escolha.",
    },
    {
      id: "simId",
      anchor: "lin.simId",
      title: "ID da Simulação",
      body:
        "Nome que identifica a curva no gráfico e nos resultados, por exemplo HCl_25C. Sem ele, " +
        "o botão \"Calcular\" fica desativado. Se o nome já existir, o campo fica vermelho e o " +
        "novo cálculo só substitui o anterior depois de confirmado.",
    },
    {
      id: "rock",
      anchor: "lin.rock",
      title: "Tipo de Rocha e Porosidade",
      body:
        "O tipo de rocha define a fração de escoamento (f), a parcela do volume poroso que " +
        "recebe fluxo. A porosidade do testemunho é digitada como fração: 0,15 para 15 %.",
    },
    {
      id: "core",
      anchor: "lin.core",
      title: "Geometria do testemunho e temperatura",
      body:
        "Comprimento e diâmetro do testemunho em polegadas; temperatura do sistema em °C. A " +
        "temperatura entra no coeficiente de difusão pela Eq. 18 e também altera a densidade " +
        "do ácido.",
    },
    {
      id: "acid",
      anchor: "lin.acid",
      title: "Sistema Ácido e Concentração",
      body:
        "O sistema ácido escolhe a linha da Tabela 1 do artigo (calcário), de onde vêm os " +
        "coeficientes a, b, n e k₀. A concentração é a fração mássica: 0,15 para 15 % m/m.",
    },
    {
      id: "sweep",
      anchor: "lin.sweep",
      title: "Varredura de vazão",
      body:
        "Vazões inicial e final, em cm³/min, e o número de passos de cálculo (10 a 200). Mais " +
        "passos dão uma curva mais detalhada e um cálculo mais demorado.",
    },
    {
      id: "calculate",
      anchor: "lin.calc",
      title: "Calcular",
      body:
        "\"Calcular\" resolve a simulação e desenha a curva. \"Redefinir parâmetros\" volta os " +
        "campos aos valores padrão. A etiqueta à direita mostra se já há resultado calculado e " +
        "com quantos passos.",
    },
    {
      id: "params",
      anchor: "lin.params",
      title: "Parâmetros Ajustados e Pressão de Entrada",
      body:
        "\"Parâmetros Ajustados\" lista os valores que o modelo usa para a rocha e o ácido " +
        "escolhidos (densidade do ácido, poder de dissolução, a, b, n, k₀ e f); passe o cursor " +
        "sobre um parâmetro para ver a descrição. \"Pressão de Entrada\" estima a pressão na " +
        "face de injeção pela lei de Darcy.",
    },
    {
      id: "chartTabs",
      anchor: "lin.chartTabs",
      title: "Simulation Chart e Analysis Chart",
      body:
        "O Simulation Chart mostra o PVBt em função da vazão de injeção. O Analysis Chart mostra " +
        "o resultado da varredura feita no painel 04.",
    },
    {
      id: "chartOptions",
      anchor: "lin.chartOpts",
      chart: "lsim",
      title: "Opções de exibição",
      body:
        "\"PVBt Ótimo\" marca o mínimo de cada curva. X-Log e Y-Log usam eixos logarítmicos e " +
        "\"Grade\" liga a grade. \"Fora da Janela Validada\" é a legenda da área hachurada em " +
        "cinza. Logo abaixo, \"Limites de X\" e \"Limites de Y\" fixam os eixos.",
    },
    {
      id: "validity",
      anchor: "lin.banner",
      chart: "lsim",
      title: "Janela de validade",
      body:
        "O modelo vale de um décimo a dez vezes a vazão ótima (uma ordem de grandeza para cada " +
        "lado). Quando há pontos fora dessa faixa, este aviso informa quantos são e qual é o " +
        "pior caso; no gráfico, esses trechos ficam hachurados.",
    },
    {
      id: "simChart",
      anchor: "lin.chart",
      chart: "lsim",
      title: "Simulation Chart",
      body:
        "PVBt é o número de volumes porosos de ácido injetados até o breakthrough; o eixo " +
        "horizontal é a vazão de injeção. O ponto mais baixo da curva é a vazão ótima " +
        "(Eqs. 33 e 34).",
    },
    {
      id: "experimental",
      anchor: "lin.expCurves",
      title: "Plotar Curvas Experimentais",
      body:
        "Para comparar o modelo com o laboratório: dê um ID à curva, digite pares de vazão " +
        "(cm³/min) e PVBt medidos, inclua cada par com \"Adicionar à Tabela\" e envie o conjunto " +
        "com \"Enviar pontos ao Gráfico PVBt\".",
    },
    {
      id: "optimumAnalysis",
      anchor: "lin.optAnalysis",
      chart: "lana",
      title: "Análise do Ótimo",
      body:
        "Varre um parâmetro (temperatura, comprimento, diâmetro, porosidade ou concentração) " +
        "entre um mínimo e um máximo, numa vazão fixa, e plota o PVBt nessa vazão contra o " +
        "parâmetro no Analysis Chart. Os demais dados vêm do painel 01.",
    },
    {
      id: "savedRuns",
      anchor: "lin.savedRun",
      chart: "lsim",
      title: "Parâmetros Ótimos",
      body:
        "Escolha uma simulação salva para ver o sistema, o PVBt mínimo, a faixa de vazão e a " +
        "tabela ponto a ponto. \"Exportar\" baixa só essa simulação; \"Excluir\" a remove da " +
        "sessão e do gráfico.",
    },
  ],
};

const radial: TourDefinition = {
  track: "radial",
  initialChart: "rsim",
  steps: [
    {
      id: "regime",
      anchor: "rad.regime",
      title: "Regime radial",
      body:
        "Radial representa o poço: a área de escoamento cresce à medida que o wormhole avança, " +
        "e a velocidade do fluido cai ao longo do canal (Eq. 35). Comprimento e diâmetro do " +
        "testemunho dão lugar ao tamanho do poço e à espessura da zona produtora.",
    },
    {
      id: "rock",
      anchor: "rad.rock",
      title: "Tipo de Rocha e Porosidade",
      body:
        "Funcionam como no regime linear: o tipo de rocha define a fração de escoamento (f) e a " +
        "porosidade é digitada como fração.",
    },
    {
      id: "geometry",
      anchor: "rad.geom",
      title: "Poço e zona produtora",
      body:
        "Tamanho do poço em polegadas, com o seletor ao lado indicando se o valor é diâmetro ou " +
        "raio. A espessura da zona produtora (ft) é o intervalo tratado; vazões e volumes são " +
        "informados por pé dessa espessura.",
    },
    {
      id: "acid",
      anchor: "rad.acid",
      title: "Temperatura e ácido",
      body:
        "Sistema ácido e concentração funcionam como no regime linear. A temperatura precisa " +
        "estar na faixa calibrada da Eq. 18, de 9,85 a 204,85 °C; fora dela o campo fica " +
        "vermelho e o cálculo fica bloqueado.",
    },
    {
      id: "advanced",
      anchor: "rad.advanced",
      title: "Avançado",
      body:
        "Guarda o raio de drenagem (ft), que é opcional. Com ele, os resultados saem em PVBt; " +
        "sem ele, saem em volume de ácido por pé (gal/ft), e o ótimo passa a ser o ponto de " +
        "menor volume.",
    },
    {
      id: "mode",
      anchor: "rad.mode",
      title: "Comprimento ou Skin",
      body:
        "\"Comprimento\" define o alvo como penetração do wormhole, em pés. \"Skin\" define o " +
        "alvo como fator de skin, um número negativo. O campo de alvos abaixo muda de unidade " +
        "conforme a escolha.",
    },
    {
      id: "targets",
      anchor: "rad.targets",
      title: "Alvos",
      body:
        "Os alvos a resolver, até 6. Digite o valor e clique em \"+ adicionar\" ou tecle Enter; " +
        "o × remove um alvo. Cada alvo gera uma curva, e o cálculo exige pelo menos um.",
    },
    {
      id: "sweep",
      anchor: "rad.sweep",
      chart: "rsim",
      title: "Varredura de vazão",
      body:
        "Vazões mínima e máxima em bbl/min e o número de passos. A linha abaixo mostra a mesma " +
        "faixa em gal/(ft·min), a unidade dos gráficos (vazão × 42 ÷ espessura).",
    },
    {
      id: "window",
      anchor: "rad.window",
      chart: "rsim",
      title: "Janela de varredura recomendada",
      body:
        "Aparece depois do cálculo: para cada alvo, a vazão ótima e a faixa de uma ordem de " +
        "grandeza para cada lado, que é a faixa validada pelo artigo. Use-a para ajustar a " +
        "varredura.",
    },
    {
      id: "tempsCompare",
      anchor: "rad.tempsCompare",
      chart: "rdes",
      title: "Temperaturas a comparar (°C)",
      body:
        "Este campo aparece com o Design Plot aberto. Cada temperatura listada (até 6, dentro " +
        "da faixa calibrada) gera uma curva no Design Plot.",
    },
    {
      id: "flowsCompare",
      anchor: "rad.flowsCompare",
      chart: "rskin",
      title: "Vazões a comparar (bbl/min)",
      body:
        "Este campo aparece com o Skin Evolution aberto, no lugar da varredura. Cada vazão " +
        "listada (até 6) gera uma curva no Skin Evolution; sem nenhuma vazão, o skin não é " +
        "calculado.",
    },
    {
      id: "calculate",
      anchor: "rad.calc",
      chart: "rsim",
      title: "Calcular",
      body:
        "Resolve a simulação radial no servidor e preenche os gráficos. Fica desativado sem ID, " +
        "sem alvo ou com temperatura fora da faixa. Depois do cálculo, o botão passa a mostrar " +
        "\"Calculado\", e a etiqueta mostra quantos passos foram resolvidos.",
    },
    {
      id: "chartTabs",
      anchor: "rad.chartTabs",
      chart: "rsim",
      title: "Os quatro gráficos",
      body:
        "Simulation Chart, Design Plot, Analysis Chart e Skin Evolution. \"Exportar Dados do " +
        "Gráfico\" baixa a tabela do gráfico que está aberto.",
    },
    {
      id: "simChart",
      anchor: "rad.chartSim",
      chart: "rsim",
      title: "Simulation Chart",
      body:
        "Volume de ácido por pé (Eq. 42) — ou PVBt, quando há raio de drenagem — contra a vazão " +
        "de injeção em gal/(ft·min), uma curva por alvo, com o ótimo marcado. Os chips acima do " +
        "gráfico ligam e desligam cada curva e a trajetória ótima.",
    },
    {
      id: "validity",
      anchor: "rad.banner",
      chart: "rsim",
      title: "Janela de validade",
      body:
        "O mesmo limite do regime linear, aplicado a cada alvo: uma ordem de grandeza para cada " +
        "lado da vazão ótima daquele alvo. O aviso conta os pontos fora da faixa e aponta o " +
        "pior caso; no gráfico, esses trechos ficam hachurados.",
    },
    {
      id: "designPlot",
      anchor: "rad.designLegend",
      chart: "rdes",
      title: "Design Plot",
      body:
        "Vazão ótima no eixo inferior, volume de ácido nessa vazão no eixo superior e " +
        "comprimento do wormhole no eixo vertical, uma curva por temperatura. Os chips ligam e " +
        "desligam temperaturas, e \"Mostrar\" escolhe as curvas de vazão, de volume ou ambas.",
    },
    {
      id: "guidedReading",
      anchor: "rad.readFrom",
      chart: "rdes",
      title: "Leitura guiada",
      body:
        "Em \"Ler de\", escolha uma das três grandezas (volume, vazão ótima ou comprimento do " +
        "wormhole) e a temperatura, e digite um valor: a ferramenta lê as outras duas na curva " +
        "e traça a leitura no gráfico.",
    },
    {
      id: "optimumAnalysis",
      anchor: "rad.optAnalysis",
      chart: "rana",
      title: "Análise do Ótimo",
      body:
        "Varre temperatura, porosidade, concentração, diâmetro do poço ou espessura da zona entre " +
        "um mínimo e um máximo e calcula a vazão ótima para o alvo escolhido em cada valor. Os " +
        "demais dados vêm do painel 01.",
    },
    {
      id: "analysisChart",
      anchor: "rad.chartAnalysis",
      chart: "rana",
      title: "Analysis Chart",
      body:
        "Mostra o resultado do painel 04: a vazão ótima (linha cheia, eixo esquerdo) e o volume " +
        "de ácido nessa vazão (linha tracejada, eixo direito) contra o parâmetro varrido.",
    },
    {
      id: "skinChart",
      anchor: "rad.chartSkin",
      chart: "rskin",
      title: "Skin Evolution",
      body:
        "Fator de skin contra o volume de ácido injetado (gal/ft), uma curva por vazão de " +
        "\"Vazões a comparar\". O skin segue Hawkins (1956) no limite de wormhole dominante.",
    },
  ],
};

const exportTour: TourDefinition = {
  track: "export",
  initialChart: null,
  steps: [
    {
      id: "nav",
      anchor: "nav.export",
      title: "Exportar",
      body:
        "Reúne as simulações calculadas nesta sessão em arquivos: dados de entrada, a tabela de " +
        "cada gráfico e, conforme o formato, as figuras. Vale para os regimes linear e radial.",
    },
    {
      id: "saved",
      anchor: "exp.saved",
      title: "Simulações Salvas",
      body:
        "Cópia guardada neste navegador, que sobrevive ao recarregar a página. \"Abrir\" " +
        "restaura a simulação; também dá para renomear e excluir. Esses dados não vão para " +
        "outro computador.",
    },
    {
      id: "selectAll",
      anchor: "exp.selectAll",
      title: "Selecionar as simulações",
      body:
        "Marque as simulações a incluir ou use \"Selecionar tudo\"; o número entre parênteses é " +
        "o total da sessão. Simulações sem resultado calculado ficam desativadas.",
    },
    {
      id: "table",
      anchor: "exp.table",
      title: "Lista da sessão",
      body:
        "Cada simulação aparece com regime, rocha, ácido, temperatura e alvos. A marca ATIVA " +
        "indica a simulação radial atual, a única com as abas Design e Skin disponíveis para " +
        "exportação.",
    },
    {
      id: "formats",
      anchor: "exp.formats",
      title: "Formatos",
      body:
        "Planilha completa (.xlsx): no radial, abas Inputs, Design, Sim, Skin e Chart Summary; " +
        "no linear, Inputs, Figures, Sim e Experimental, com figuras embutidas. Pacote de " +
        "figuras (.zip): PNG a 300 dpi, em 1 ou 2 colunas (padrão Elsevier/JPSE). Somente " +
        "tabelas: sem imagens, arquivo mais leve.",
    },
    {
      id: "limits",
      anchor: "exp.limits",
      title: "Restrições",
      body:
        "No linear, a planilha completa junta todas as curvas selecionadas num arquivo, e " +
        "\"Somente tabelas\" gera um arquivo por curva; o pacote de figuras não existe para o " +
        "linear. Simulações radiais que não são a ativa saem sem as abas Design e Skin.",
    },
    {
      id: "folder",
      anchor: "exp.folder",
      title: "Pasta de destino",
      body:
        "Escolha uma pasta (Chrome ou Edge) ou deixe sem escolher para usar a pasta de " +
        "downloads do navegador.",
    },
    {
      id: "button",
      anchor: "exp.button",
      title: "Exportar",
      body:
        "Gera os arquivos. As figuras são desenhadas no servidor, então o download pode levar " +
        "alguns segundos; o resultado de cada arquivo aparece na tabela logo abaixo.",
    },
  ],
};

export const TOURS: Record<TourTrack, TourDefinition> = { linear, radial, export: exportTour };

/** todos os data-tour citados — usado pelo teste-guarda */
export const ALL_ANCHORS: string[] = [
  ...new Set(
    Object.values(TOURS).flatMap((t) => t.steps.map((s) => s.anchor).filter((a): a is string => !!a)),
  ),
];
