# PVBtCalc — bilingual "SOBRE O MODELO" tab

**Purpose of this file.** A self-contained implementation brief. It carries the full Portuguese and English content of the theoretical-background page, so no attachment is needed. Read it end to end before editing anything.

**Language of this brief:** English. **Language of the content payload:** Portuguese and English, verbatim — do not reword either.

---

## 1. Objective

The app has a tab currently named "SOBRE O MODELO" carrying the theoretical background of the wormhole model. Make it bilingual: the same page available in Portuguese and English, switchable by the user, with the two versions guaranteed to stay structurally in sync.

---

## 2. Report before you edit

Do not change any file until you have answered these. Paste the grep output, not a summary.

1. `grep -rn "SobreOModelo\|SOBRE O MODELO" src/` — where does the tab component live, how is it mounted, what is it called?
2. `grep -rn "createSlice" src/` — does a `ui` slice already exist in the Redux store, or only feature slices?
3. Does the project already have any i18n mechanism — a library, a strings file, a locale context? If not, say so explicitly. Do not add one.

If any assumption in this brief contradicts what you find, stop and report the contradiction instead of adapting silently.

---

## 3. Architecture

Prose does not fit key-value i18n. Two hundred keys holding whole sentences is harder to maintain than two prose files side by side, and a translator loses the paragraph context. So: **two content modules, shared primitives.**

```
src/components/SobreOModelo/
  index.tsx        ← wrapper: reads the language, injects the <style>, renders content
  primitives.tsx   ← Eq, Frac, Ressalva, DocTable — structure only, no user-facing text
  content.pt.tsx   ← Portuguese prose (Section 7 of this brief)
  content.en.tsx   ← English prose (Section 8 of this brief)
```

`primitives.tsx` holds the CSS and the components. If the equation-box style changes, it changes for both languages at once — which is the divergence that actually causes trouble.

### Primitive contracts

```tsx
// Numbered equation with a provenance line underneath.
<Eq n="42" fonte="ALI; ZIAUDDIN (2019), Eq. 42, Section 3 — ...">
  V_A = ...
</Eq>

// Amber callout marking where the implementation goes beyond the paper.
<Ressalva titulo="...">body</Ressalva>

// Table: header row + body rows + optional caption below.
<DocTable headers={[...]} rows={[[...], ...]} caption="..." />
```

In the content payload below, the markers map as follows:

| Marker in the payload | Component |
|---|---|
| `> EQ  <body>  ·  (n)  ·  <provenance>` | `<Eq n fonte>` |
| `> RESSALVA  <title>  ·  <body>` | `<Ressalva titulo>` |
| A markdown table | `<DocTable>` |
| A line in italics on its own | a muted note paragraph (`.sm-nota`) |
| `## heading` | `<h2>` |
| `### heading` | `<h3>` |

Subscripts and superscripts in the payload are written as `x_{sub}` and `x^{sup}`. Render them as real `<sub>` / `<sup>`, not as literal braces.

**Sections carry no numbers.** This is deliberate — an earlier revision had gaps in the numbering after sections were removed. Do not add numbering back.

---

## 4. Language state

The project already uses Redux Toolkit. Add `language: 'pt' | 'en'` to a `ui` slice (create the slice if none exists).

- Initialise from `localStorage.getItem('pvbtcalc.language')`.
- Fall back to `navigator.language.startsWith('pt') ? 'pt' : 'en'`.
- Persist on every change.

Reason for putting it in the store rather than in component state: it becomes the seam for translating the rest of the interface later, and the choice survives tab switches.

---

## 5. The toggle

A two-button segmented control in the tab header — `PT` / `EN`. Not a dropdown: with two options a dropdown costs an extra click for nothing.

---

## 6. Parity guard — do not skip this

Each content module exports its section list:

```ts
export const sections: { id: string; heading: string }[] = [
  { id: 'intro', heading: '...' },
  ...
];
```

Add a test asserting the two `id` arrays are identical, in the same order:

```ts
expect(ptSections.map(s => s.id)).toEqual(enSections.map(s => s.id));
```

Without this, a section added to one language and forgotten in the other ships silently, and nobody notices until someone opens the app in the other language. Both modules must expose exactly these ten section ids, in this order:

`intro` · `nomenclature` · `properties` · `linear` · `radial` · `parameters` · `validity` · `quantities` · `export` · `references`

And these six subsection ids:

`intro-matrix` · `intro-model` · `intro-scope` · `nomenclature-tables` · `linear-qopt` · `radial-skin`

---

## 7. Out of scope for this task

Do not touch, and do not "improve while you are there":

- the export writers (`export_workbook.py`, `src/tools/export.tsx`);
- the chart axis labels;
- the guided-reading control;
- anything about the flowing fraction;
- the `tbt` units. Design is in minutes, Simulation is in seconds. That is intentional and documented. Do not unify them.

---

## 8. Verification

1. Toggle PT → EN → PT. Content switches, scroll position and tab state survive.
2. Reload the page. The chosen language persists.
3. Run the parity test. It must pass.
4. Open in a browser with `navigator.language = 'en-US'` and cleared localStorage — the page must open in English.
5. Confirm no user-facing string remains hard-coded in `index.tsx` or `primitives.tsx`.

---

## 9. Content payload — Portuguese (`content.pt.tsx`)

Verbatim. Do not reword, do not re-translate, do not renumber.

```markdown
**PVBtCalc**

Fundamentação Teórica e Modelagem Matemática

Modelo de crescimento de wormhole em acidificação de matriz — fluxo linear e radial

**Introdução**

**Acidificação de matriz em carbonatos**

A acidificação de matriz é a injeção de ácido na formação em pressão abaixo da pressão de fratura, com o objetivo de remover danos de formação. Diferentemente dos arenitos, o ácido dissolve a própria matriz do carbonato de maneira instável, gerando canais condutivos altamente ramificados conhecidos como *wormholes* (Ali; Ziauddin, 2019).

O que se observa, em laboratório e em campo, é que o ácido abre canais condutivos estreitos e ramificados que penetram a formação muito além da região dissolvida de forma difusa. São os *wormholes*. O mecanismo é de instabilidade: qualquer heterogeneidade inicial — um poro maior, uma vugulosidade — recebe mais fluxo, dissolve mais rápido, torna-se ainda mais condutiva, e o processo se realimenta. O resultado prático é que uma quantidade modesta de ácido produz penetração desproporcional, com fatores de skin fortemente negativos.

**O modelo de Ali e Ziauddin (2019)**

ALI e ZIAUDDIN (2019) propõem um modelo mecanicista cuja proposta é atender simultaneamente a três requisitos: ter forma analítica, ter parâmetros determinados pelo sistema ácido-mineral em vez de por ajuste a cada testemunho, e valer nas geometrias linear e radial com a mesma parametrização.

O desenvolvimento segue quatro etapas:

1.  uma relação entre a velocidade dentro do wormhole e a velocidade de Darcy, ajustada a partir de dados experimentais e expressa por coeficientes do sistema ácido-mineral (Seção 2 do artigo);

2.  um balanço de massa de ácido ao longo do canal, com consumo governado por cinética de primeira ordem, do qual resulta a expressão de PVBT para fluxo linear (Eq. 11);

3.  a derivada dessa expressão em relação à vazão, cujo zero localiza o fundo da curva em U (Eqs. 33 e 34);

4.  a reformulação do mesmo balanço em coordenadas radiais, com a área de escoamento crescente, culminando no tempo de injeção e no volume absoluto de ácido (Eqs. 41 e 42, Seção 3 do artigo).

A validação apresentada pelos autores é em duas frentes: contra dados de PVBT de testemunhos lineares para diversos sistemas ácido-rocha (Seção 4), e contra experimentos radiais e tratamentos de campo documentados (Seções 5 e 6), estes últimos incluindo o conjunto de BURTON et al. (2018).

**Escopo do PVBtCalc**

O PVBtCalc implementa esse modelo nos dois regimes. Sobre ele, acrescenta o que o uso em projeto exige e o artigo não fornece em forma fechada: solução numérica da vazão ótima, varredura de vazão e de temperatura, sinalização da faixa de validade física, evolução do skin e exportação consolidada dos resultados. As caixas em destaque ao longo deste documento marcam exatamente onde a implementação vai além do que o artigo deduz — a distinção é deliberada e não deve ser apagada.

**Nomenclatura**

**Símbolos das tabelas exportadas**

Abaixo estão as nomenclaturas das três formas de tabela, uma por tipo de gráfico, além da aba Inputs. Os cabeçalhos das colunas abreviam os símbolos do modelo; a correspondência é a seguinte.

**Design Plot — abas “Design ⟨T⟩ K”**

| **Cabeçalho**          | **Símbolo**                    | **Significado**                                                                                    | **Unidade**  |
|------------------------|--------------------------------|----------------------------------------------------------------------------------------------------|--------------|
| L \[ft\]               | l                              | Comprimento do wormhole — ver nota de colisão de símbolo abaixo                                    | ft           |
| q_opt \[gal/(ft.min)\] | q<sub>opt</sub>                | Vazão ótima para aquele comprimento, normalizada por pé de zona                                    | gal/(ft·min) |
| V_opt \[gal/ft\]       | V<sub>A</sub>(q<sub>opt</sub>) | Volume de ácido na vazão ótima — mesma função da coluna V<sub>A</sub>, avaliada em q<sub>opt</sub> | gal/ft       |
| tbt \[min\]            | M·τ                            | Tempo até breakthrough na vazão ótima — t<sub>b</sub> na nomenclatura do artigo                    | min          |
| Temperatura \[K\]      | T                              | Temperatura da curva                                                                               | K            |
| Nota                   | —                              | Diagnóstico da linha — ver tabela de valores abaixo                                                | texto        |

**Simulation Chart — abas “Sim ⟨alvo⟩ ft”**

| **Cabeçalho**       | **Símbolo**                   | **Significado**                                                                             | **Unidade**  |
|---------------------|-------------------------------|---------------------------------------------------------------------------------------------|--------------|
| q0 \[gal/(ft.min)\] | q<sub>o</sub>                 | Vazão de injeção varrida, normalizada por pé de zona                                        | gal/(ft·min) |
| V_A \[gal/ft\]      | V<sub>A</sub>                 | Volume de ácido até o comprimento alvo (Eq. 42)                                             | gal/ft       |
| iv \[m/s\]          | v<sub>o</sub> / φ<sub>t</sub> | Velocidade intersticial — usa a porosidade total; o flowing fraction não entra nesta coluna | m/s          |
| wv \[m/s\]          | v(λ = 0)                      | Velocidade no wormhole, avaliada na face do poço                                            | m/s          |
| dv \[m/s\]          | v<sub>o</sub>                 | Velocidade de Darcy                                                                         | m/s          |
| 1/Da                | 1 / Da(λ)                     | Inverso do Damköhler, avaliado no comprimento alvo da curva                                 | —            |
| tbt \[s\]           | M·τ                           | Tempo até breakthrough                                                                      | s            |
| Nota                | —                             | Diagnóstico da linha                                                                        | texto        |

**Skin Evolution — abas “Skin ⟨vazão⟩ bbl-min”**

| **Cabeçalho**      | **Símbolo**   | **Significado**                            | **Unidade** |
|--------------------|---------------|--------------------------------------------|-------------|
| V_A \[gal/ft\]     | V<sub>A</sub> | Volume de ácido acumulado                  | gal/ft      |
| skin               | S             | Fator de skin — ver a seção correspondente | —           |
| comprimento \[ft\] | l             | Comprimento do wormhole                    | ft          |
| Nota               | —             | Diagnóstico da linha                       | texto       |

*Colisão de símbolo: a coluna L \[ft\] da tabela Design designa o comprimento do wormhole, que nesta nomenclatura é l minúsculo — L está reservado ao comprimento característico (1 m, constante). A mesma grandeza aparece como “comprimento \[ft\]” na tabela Skin e como nome de aba na Simulation.*

*A coluna tbt aparece nas duas tabelas e designa a mesma grandeza — o t<sub>b</sub> do artigo, definido na Seção 2 como “the breakthrough time in seconds” — mas em unidades diferentes: minutos no Design, segundos na Simulation. Atenção ao colchete antes de comparar valores entre as duas abas. Os caminhos de cálculo também diferem — no Design ela é obtida como a razão V_opt / q_opt, que equivale a M·τ pela identidade V<sub>A</sub> = M · q<sub>o</sub> · τ; na Simulation, por avaliação direta de M · τ(λ). Os dois concordam por construção, mas não compartilham código.*

**Valores da coluna Nota**

| **Valor**                                                                      | **Quando aparece**                                                                                                        |
|--------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------|
| (vazio)                                                                        | Linha comum, sem destaque.                                                                                                |
| Mínimo na borda da faixa simulada; q_opt = …                                   | Simulation: o menor V<sub>A</sub> da varredura é a primeira ou a última linha — o mínimo real está fora da faixa varrida. |
| Mínimo na borda da faixa simulada                                              | O mesmo caso, quando a curva não traz os metadados de q<sub>opt</sub>.                                                    |
| V_A mínimo desta simulação; q_opt = …                                          | Simulation: o menor V<sub>A</sub> está no interior da faixa varrida.                                                      |
| V_A mínimo desta simulação                                                     | O mesmo caso, sem metadados.                                                                                              |
| Alvo ⟨t⟩ ft (L = ⟨L⟩ ft)                                                       | Design: a linha é a mais próxima de um comprimento-alvo pedido, dentro de meio passo da malha.                            |
| Alvo(s) ⟨…⟩ ft não atingido(s) — tabela termina em ⟨…⟩ ft (limite 1000 gal/ft) | Design: um ou mais alvos pedidos excedem o último comprimento tabulado. Fica na última linha.                             |
| Skin alvo (mais próximo de ⟨…⟩)                                                | Skin: a linha é a mais próxima do skin-alvo pedido.                                                                       |
| Skin final                                                                     | Skin: nenhum skin-alvo foi definido — a nota marca o último ponto.                                                        |

*Mais de uma nota pode aparecer na mesma linha, concatenadas por “; ”.*

**Propriedades do sistema ácido-rocha**

O coeficiente de difusão depende da temperatura e da concentração, por correlação empírica (T em Kelvin):

D<sub>m</sub> = exp( −2270 / T + 1,326 · C<sub>Ao</sub> − 12,11 )   (18)

> *ALI; ZIAUDDIN (2019), Eq. 18, Seção 2.*

A constante cinética efetiva combina esse coeficiente com o parâmetro do sistema:

k<sub>eff</sub> = k<sub>0</sub> · D<sub>m</sub>

> *ALI; ZIAUDDIN (2019), Seção 2 — definição empregada junto à Tabela 1; k₀ é tabelado por sistema ácido-mineral.*

O poder de dissolução volumétrico não é constante: depende da densidade do ácido, que por sua vez varia com a temperatura. Por isso o painel de parâmetros ajustados exibe a densidade (ro) ao lado de X, e o valor de X muda quando a temperatura muda.

X = β<sub>mássico</sub> · ( ρ<sub>ácido</sub> / ρ<sub>rocha</sub> )   (4)

> *ALI; ZIAUDDIN (2019), Eq. 4 — aqui β é o poder de dissolução mássico, não o raio adimensional.*

**Modelo linear**

Ali e Ziauddin (2019) propuseram um modelo mecanicista analítico cujos parâmetros são definidos pelo próprio sistema ácido-mineral, sendo aplicável tanto para fluxo linear quanto radial. No fluxo linear — caracterizado por um corpo de prova cilíndrico com injeção por uma das faces, onde a área de escoamento é constante ao longo do caminho —, a velocidade do fluido no interior do *wormhole* (v) relaciona-se com a velocidade de Darcy (v<sub>o</sub>) através da seguinte equação:

v = v<sub>o</sub> / ( a · A<sub>o</sub><sup>(n−1)</sup> + b · v<sub>o</sub> )   (29)

> *ALI; ZIAUDDIN (2019), Eq. 29, Seção 2. Coeficientes a, b, n da Tabela 1.*

Através de um balanço de massa de ácido ao longo do canal, governado por cinética de primeira ordem, o modelo estabelece o Volume de Poros até o *Breakthrough* (PVBT) (Ali; Ziauddin, 2019). Essa formulação adimensional viabiliza a comparação entre testemunhos de dimensões variadas:

PVBT = \[ (1 − φ<sub>t</sub>) / (φ<sub>t</sub> · λ · C<sub>Ao</sub> · X · ω · Da) \] · ( e<sup>Da·λ</sup> − 1 )   (11)

> *ALI; ZIAUDDIN (2019), Eq. 11, Seção 2 — resultado do balanço de massa para fluxo linear.*

**Vazão ótima no modelo linear**

A vazão ótima de injeção (q<sub>opt</sub>) encontra-se no ponto de mínimo da curva de PVBT, identificado ao se anular a derivada da expressão em relação à vazão (Ali; Ziauddin, 2019). Para o regime linear, os autores fornecem uma aproximação explícita que dispensa métodos iterativos:

q<sub>opt</sub> ≈ a<sub>q</sub> · ( 1 + 1,3·b<sub>q</sub> − 2,6·b<sub>q</sub><sup>2</sup> ) / ( 1 + 2,7·b<sub>q</sub> )   (34)

> *ALI; ZIAUDDIN (2019), Eq. 34, Seção 2 — apresentada pelos autores como aproximação explícita da raiz da Eq. 33.*

*com a<sub>q</sub> = a · A<sup>n</sup> · k<sub>eff</sub> · l<sub>c</sub> e b<sub>q</sub> = −e<sup>(−1 − b·k_eff·l_c)</sup>.*

**Modelo radial**

No fluxo radial, a área de escoamento expande conforme o *wormhole* avança, o que reduz drasticamente a velocidade do fluido e eleva o consumo de ácido nas paredes (Ali; Ziauddin, 2019). A integração deste balanço resulta no volume absoluto de ácido (V<sub>A</sub>) necessário para atingir o comprimento alvo:

ω = 1 / ( (a / A<sub>o</sub>) · \[ 2·h·π·L²·(β + λ) \]<sup>n</sup> + b · v<sub>o</sub> )   (36)

> *ALI; ZIAUDDIN (2019), Eq. 36, Seção 3 — forma adimensional da Eq. 35.*

Como o fluido fica mais lento, o ácido permanece mais tempo em contato com a parede e se consome mais rápido. A Eq. 37 descreve esse consumo, e sua integração (Eqs. 38 e 39) fornece quanto ácido vivo sobrevive até a ponta do canal. O PVBtCalc não resolve essas duas numericamente: a integração tem solução fechada, resumida na função α(λ):

α(λ) = \[ a · (2·h·π·L²)<sup>n</sup> / ( A<sub>o</sub> · (n + 1) ) \] · \[ (β + λ)<sup>n+1</sup> − β<sup>n+1</sup> \] + b · v<sub>o</sub> · λ

> *Integração fechada das Eqs. 37–39 de ALI; ZIAUDDIN (2019), Seção 3. Forma explícita obtida nesta implementação.*

O destino final da Seção 3 do artigo é o volume absoluto de ácido:

V<sub>A</sub> = \[ L · A<sub>o</sub> / ( C<sub>Ao</sub> · X ) \] · ∫<sub>0</sub><sup>λ</sup> ( e<sup>Da·ω·α</sup> / ω ) dλ   (42)

> *ALI; ZIAUDDIN (2019), Eq. 42, Seção 3 — volume de ácido até o comprimento λ em fluxo radial.*

**Fator de skin**

O skin quantifica o dano ou a estimulação ao redor do poço. Para um wormhole dominante — um canal aberto, cuja condutividade é muito superior à da matriz — a fórmula de HAWKINS (1956) se reduz a:

S = − ln \[ ( r<sub>w</sub> + l ) / r<sub>w</sub> \]

> *Forma-limite da equação de HAWKINS (1956) para permeabilidade da zona alterada muito superior à da matriz; convenção adotada por ALI; ZIAUDDIN (2019) na Fig. 27.*

**Parâmetros do sistema ácido-mineral**

Os coeficientes a, b, n e k<sub>0</sub> vêm da Tabela 1 do artigo, indexada por mineral × sistema ácido. É esta parametrização que sustenta a proposta descrita em “O modelo de Ali e Ziauddin (2019)”: o próprio título da tabela registra que “the same parameter values are used for both linear and radial flow”.

| **Sistema (calcário)** | **n** | **a**     | **b** | **k<sub>0</sub>** |
|------------------------|-------|-----------|-------|-------------------|
| HCl sem inibidor       | 0,65  | 2,68·10⁻⁴ | 17,3  | 2,43·10⁷          |
| HCl com inibidor       | 0,65  | 5,10·10⁻⁴ | 35,1  | 2,43·10⁶          |
| Ácido emulsificado     | 0,65  | 4,61·10⁻⁴ | 15,5  | 2,85·10⁷          |

*Extraída de ALI e ZIAUDDIN (2019), Tabela 1 — linhas de calcário.*

**Faixa de validade**

O modelo descreve o regime de wormhole dominante — aquele em que se forma um canal preferencial e o consumo de ácido é mínimo. Fora dele, em vazões muito baixas, o canal deixa de existir como estrutura distinta e a dissolução se torna compacta e uniforme, regime que estas equações não representam. O artigo delimita a faixa observada experimentalmente em uma ordem de grandeza para cada lado da vazão ótima:

q<sub>opt</sub> / 10 ≤ q<sub>o</sub> ≤ 10 · q<sub>opt</sub>

> *Faixa reportada por ALI; ZIAUDDIN (2019), Seção 2, a partir de padrões de dissolução em testemunhos lineares. Critério operacional do PVBtCalc.*

Fora dessa janela, o PVBtCalc sinaliza os pontos afetados nos gráficos e na tabela. O comportamento do modelo nessa região não é apenas impreciso: o volume previsto diverge para infinito, enquanto o comportamento físico real satura em valor finito.

**A janela foi observada em fluxo linear**

A delimitação de uma ordem de grandeza aparece na Seção 2, a partir de fotografias de padrões de dissolução em testemunhos lineares. O artigo não repete essa observação especificamente para o fluxo radial. O PVBtCalc estende a mesma faixa aos dois regimes por analogia.

Para o regime radial, o artigo oferece validação de outra natureza, descrita na Seção 6: comparação contra tratamentos de campo documentados por BURTON et al. (2018), cujos volumes variam de 5 a 700 gal/ft, com mediana de 75 gal/ft. Volumes calculados muito acima dessa faixa indicam configuração fora do domínio prático.

**Grandezas reportadas**

| **Grandeza**  | **Significado**                                                  | **Unidade**  |
|---------------|------------------------------------------------------------------|--------------|
| q<sub>0</sub> | Vazão de injeção, normalizada por pé de zona                     | gal/(ft·min) |
| V<sub>A</sub> | Volume de ácido, normalizado por pé de zona                      | gal/ft       |
| iv            | Velocidade intersticial — Darcy dividida pela porosidade total   | m/s          |
| wv            | Velocidade no wormhole, avaliada na face do poço (λ = 0)         | m/s          |
| dv            | Velocidade de Darcy                                              | m/s          |
| 1/Da          | Inverso do Damköhler, avaliado no alvo da curva                  | —            |
| tbt           | Tempo até breakthrough — t<sub>b</sub> na nomenclatura do artigo | s            |

*As colunas wv e 1/Da são avaliadas em pontos diferentes do wormhole — wv na face do poço, 1/Da no comprimento alvo da curva — e portanto não devem ser comparadas entre si. No regime radial, 1/Da varia com o comprimento por construção; no linear, permanece constante.*

A normalização por pé de zona segue a convenção adotada por ALI e ZIAUDDIN (2019) a partir da Fig. 27, e permite comparar tratamentos em intervalos de espessuras distintas.

**Exportação de resultados**

O menu EXPORT, na barra lateral, reúne gráficos e tabelas de uma sessão de cálculo em um único arquivo.

1.  Execute os cálculos desejados no RUNNER. Cada aba — Design Plot, Simulation Chart, Skin Evolution e Analysis Chart — contribui com seu gráfico e sua tabela.

2.  Abra EXPORT. As curvas salvas aparecem listadas por Simulation ID.

3.  Selecione as curvas a incluir. O arquivo gerado reúne, para cada uma: bloco de cabeçalho com rocha, sistema ácido, concentração, porosidade, temperatura e geometria; a imagem de cada gráfico gerado; e a tabela correspondente, com os rótulos e unidades exibidos na tela.

4.  Confirme para baixar.

**Referências**

*A referência primária é a única consultada diretamente. As demais são citadas conforme discutidas no artigo; conferir os dados bibliográficos completos na lista de referências do próprio artigo antes de reaproveitá-las em documento formal.*

ALI, M.; ZIAUDDIN, M. Carbonate acidizing: A mechanistic model for wormhole growth in linear and radial flow. *Journal of Petroleum Science and Engineering*, v. 186, 106776, 2019. Disponível em: https://www.sciencedirect.com/science/article/pii/S0920410519311945

BURTON, R. C. et al. Estudo de tratamentos de campo — volumes de ácido e skin resultante. Citado em Ali e Ziauddin (2019), Seções 5 e 6, 2018.

HAWKINS, M. F. A note on the skin effect. *Journal of Petroleum Technology*, v. 8, n. 12, 1956.
```

---

## 10. Content payload — English (`content.en.tsx`)

Verbatim. Do not reword, do not re-translate, do not renumber.

```markdown
**PVBtCalc**

Theoretical Background and Mathematical Modelling

Wormhole growth model for carbonate matrix acidizing — linear and radial flow

**Introduction**

**Matrix acidizing in carbonates**

Matrix acidizing is the injection of acid into the formation at a pressure below the fracture pressure, with the aim of removing formation damage. Unlike sandstones, the acid dissolves the carbonate matrix itself in an unstable manner, generating highly branched conductive channels known as *wormholes* (Ali; Ziauddin, 2019).

What is observed, both in the laboratory and in the field, is that the acid opens narrow, branched conductive channels that penetrate the formation far beyond the diffusely dissolved region. These are the *wormholes*. The mechanism is one of instability: any initial heterogeneity — a larger pore, a vug — receives more flow, dissolves faster, becomes still more conductive, and the process feeds on itself. The practical outcome is that a modest amount of acid produces disproportionate penetration, with strongly negative skin factors.

**The Ali and Ziauddin (2019) model**

ALI and ZIAUDDIN (2019) propose a mechanistic model intended to satisfy three requirements at once: to have an analytical form, to have parameters determined by the acid-mineral system rather than by fitting to each core, and to hold in both linear and radial geometry under the same parameterisation.

The development proceeds in four stages:

1.  a relation between the velocity inside the wormhole and the Darcy velocity, fitted from experimental data and expressed through acid-mineral system coefficients (Section 2 of the paper);

2.  a mass balance of acid along the channel, with consumption governed by first-order kinetics, from which the PVBT expression for linear flow follows (Eq. 11);

3.  the derivative of that expression with respect to flow rate, whose zero locates the bottom of the U-shaped curve (Eqs. 33 and 34);

4.  the reformulation of the same balance in radial coordinates, with a growing flow area, culminating in the injection time and the absolute acid volume (Eqs. 41 and 42, Section 3 of the paper).

The validation presented by the authors runs on two fronts: against linear-core PVBT data for a range of acid-rock systems (Section 4), and against radial experiments and documented field treatments (Sections 5 and 6), the latter including the BURTON et al. (2018) dataset.

**Scope of PVBtCalc**

PVBtCalc implements this model in both regimes. On top of it, the tool adds what design use requires and the paper does not supply in closed form: numerical solution of the optimum flow rate, flow-rate and temperature sweeps, flagging of the physical validity range, skin evolution, and consolidated export of results. The highlighted boxes throughout this document mark precisely where the implementation goes beyond what the paper derives — the distinction is deliberate and must not be erased.

**Nomenclature**

**Symbols used in the exported tables**

Below are the symbols for the three table shapes, one per chart type, alongside the Inputs sheet. The column headers abbreviate the symbols listed above; the correspondence is as follows.

**Design Plot — sheets “Design ⟨T⟩ K”**

| **Header**             | **Symbol**                     | **Meaning**                                                                                                | **Unit**     |
|------------------------|--------------------------------|------------------------------------------------------------------------------------------------------------|--------------|
| L \[ft\]               | l                              | Wormhole length — see the symbol-clash note below                                                          | ft           |
| q_opt \[gal/(ft.min)\] | q<sub>opt</sub>                | Optimum flow rate for that length, normalised per foot of zone                                             | gal/(ft·min) |
| V_opt \[gal/ft\]       | V<sub>A</sub>(q<sub>opt</sub>) | Acid volume at the optimum flow rate — same function as column V<sub>A</sub>, evaluated at q<sub>opt</sub> | gal/ft       |
| tbt \[min\]            | M·τ                            | Time to breakthrough at the optimum flow rate — t<sub>b</sub> in the paper's nomenclature                  | min          |
| Temperatura \[K\]      | T                              | Temperature of the curve                                                                                   | K            |
| Nota                   | —                              | Row diagnostic — see the table of values below                                                             | text         |

**Simulation Chart — sheets “Sim ⟨target⟩ ft”**

| **Header**          | **Symbol**                    | **Meaning**                                                                                  | **Unit**     |
|---------------------|-------------------------------|----------------------------------------------------------------------------------------------|--------------|
| q0 \[gal/(ft.min)\] | q<sub>o</sub>                 | Swept injection flow rate, normalised per foot of zone                                       | gal/(ft·min) |
| V_A \[gal/ft\]      | V<sub>A</sub>                 | Acid volume up to the target length (Eq. 42)                                                 | gal/ft       |
| iv \[m/s\]          | v<sub>o</sub> / φ<sub>t</sub> | Interstitial velocity — uses total porosity; the flowing fraction does not enter this column | m/s          |
| wv \[m/s\]          | v(λ = 0)                      | Wormhole velocity, evaluated at the wellbore face                                            | m/s          |
| dv \[m/s\]          | v<sub>o</sub>                 | Darcy velocity                                                                               | m/s          |
| 1/Da                | 1 / Da(λ)                     | Inverse Damköhler number, evaluated at the curve's target length                             | —            |
| tbt \[s\]           | M·τ                           | Time to breakthrough                                                                         | s            |
| Nota                | —                             | Row diagnostic                                                                               | text         |

**Skin Evolution — sheets “Skin ⟨rate⟩ bbl-min”**

| **Header**         | **Symbol**    | **Meaning**                    | **Unit** |
|--------------------|---------------|--------------------------------|----------|
| V_A \[gal/ft\]     | V<sub>A</sub> | Cumulative acid volume         | gal/ft   |
| skin               | S             | Skin factor — see that section | —        |
| comprimento \[ft\] | l             | Wormhole length                | ft       |
| Nota               | —             | Row diagnostic                 | text     |

*Symbol clash: column L \[ft\] in the Design table denotes the wormhole length, which in this nomenclature is lower-case l — L is reserved for the characteristic length (1 m, constant). The same quantity appears as “comprimento \[ft\]” in the Skin table and as the sheet name in the Simulation table.*

*The column tbt appears in both tables and denotes the same quantity — the paper's t<sub>b</sub>, defined in Section 2 as “the breakthrough time in seconds” — but in different units: minutes in Design, seconds in Simulation. Check the bracket before comparing values across the two sheets. The computation paths also differ — in Design it is obtained as the ratio V_opt / q_opt, which equals M·τ through the identity V<sub>A</sub> = M · q<sub>o</sub> · τ; in Simulation, by direct evaluation of M · τ(λ). The two agree by construction but share no code.*

**Values of the Nota column**

| **Value**                                                                      | **When it appears**                                                                                                             |
|--------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------|
| (empty)                                                                        | Ordinary row, not highlighted.                                                                                                  |
| Mínimo na borda da faixa simulada; q_opt = …                                   | Simulation: the lowest V<sub>A</sub> in the sweep is the first or the last row — the true minimum lies outside the swept range. |
| Mínimo na borda da faixa simulada                                              | The same case, when the curve carries no q<sub>opt</sub> metadata.                                                              |
| V_A mínimo desta simulação; q_opt = …                                          | Simulation: the lowest V<sub>A</sub> lies inside the swept range.                                                               |
| V_A mínimo desta simulação                                                     | The same case, without metadata.                                                                                                |
| Alvo ⟨t⟩ ft (L = ⟨L⟩ ft)                                                       | Design: the row is the closest to a requested target length, within half a grid step.                                           |
| Alvo(s) ⟨…⟩ ft não atingido(s) — tabela termina em ⟨…⟩ ft (limite 1000 gal/ft) | Design: one or more requested targets exceed the last tabulated length. Attached to the last row.                               |
| Skin alvo (mais próximo de ⟨…⟩)                                                | Skin: the row is the closest to the requested target skin.                                                                      |
| Skin final                                                                     | Skin: no target skin was set — the note marks the last point instead.                                                           |

*More than one note may appear on the same row, joined by “; ”. The strings themselves are emitted in Portuguese by the export writer and are reproduced here verbatim.*

**Properties of the acid-rock system**

The diffusion coefficient depends on temperature and concentration through an empirical correlation (T in Kelvin):

D<sub>m</sub> = exp( −2270 / T + 1.326 · C<sub>Ao</sub> − 12.11 )   (18)

> *ALI; ZIAUDDIN (2019), Eq. 18, Section 2.*

The effective kinetic constant combines this coefficient with the system parameter:

k<sub>eff</sub> = k<sub>0</sub> · D<sub>m</sub>

> *ALI; ZIAUDDIN (2019), Section 2 — definition used alongside Table 1; k₀ is tabulated per acid-mineral system.*

The volumetric dissolving power is not constant: it depends on the acid density, which in turn varies with temperature. That is why the adjusted-parameters panel displays the density (ro) next to X, and the value of X changes when the temperature changes.

X = β<sub>mass</sub> · ( ρ<sub>acid</sub> / ρ<sub>rock</sub> )   (4)

> *ALI; ZIAUDDIN (2019), Eq. 4 — here β is the gravimetric dissolving power, not the dimensionless radius.*

**Linear model**

Ali and Ziauddin (2019) proposed an analytical mechanistic model whose parameters are set by the acid-mineral system itself, applicable to both linear and radial flow. In linear flow — characterised by a cylindrical core with injection through one of its faces, where the flow area is constant along the path — the fluid velocity inside the wormhole (v) relates to the Darcy velocity (v<sub>o</sub>) through the following equation:

v = v<sub>o</sub> / ( a · A<sub>o</sub><sup>(n−1)</sup> + b · v<sub>o</sub> )   (29)

> *ALI; ZIAUDDIN (2019), Eq. 29, Section 2. Coefficients a, b, n from Table 1.*

Through a mass balance of acid along the channel, governed by first-order kinetics, the model establishes the Pore Volumes to Breakthrough (PVBT) (Ali; Ziauddin, 2019). Being dimensionless, this formulation makes it possible to compare cores of differing dimensions:

PVBT = \[ (1 − φ<sub>t</sub>) / (φ<sub>t</sub> · λ · C<sub>Ao</sub> · X · ω · Da) \] · ( e<sup>Da·λ</sup> − 1 )   (11)

> *ALI; ZIAUDDIN (2019), Eq. 11, Section 2 — result of the mass balance for linear flow.*

**Optimum flow rate in the linear model**

The optimum injection rate (q<sub>opt</sub>) sits at the minimum of the PVBT curve, found by setting the derivative of the expression with respect to flow rate to zero (Ali; Ziauddin, 2019). For the linear regime, the authors supply an explicit approximation that dispenses with iterative methods:

q<sub>opt</sub> ≈ a<sub>q</sub> · ( 1 + 1.3·b<sub>q</sub> − 2.6·b<sub>q</sub><sup>2</sup> ) / ( 1 + 2.7·b<sub>q</sub> )   (34)

> *ALI; ZIAUDDIN (2019), Eq. 34, Section 2 — presented by the authors as an explicit approximation to the root of Eq. 33.*

*with a<sub>q</sub> = a · A<sup>n</sup> · k<sub>eff</sub> · l<sub>c</sub> and b<sub>q</sub> = −e<sup>(−1 − b·k_eff·l_c)</sup>.*

**Radial model**

In radial flow the flow area expands as the wormhole advances, which sharply reduces the fluid velocity and raises acid consumption at the walls (Ali; Ziauddin, 2019). Integrating this balance yields the absolute acid volume (V<sub>A</sub>) required to reach the target length:

ω = 1 / ( (a / A<sub>o</sub>) · \[ 2·h·π·L²·(β + λ) \]<sup>n</sup> + b · v<sub>o</sub> )   (36)

> *ALI; ZIAUDDIN (2019), Eq. 36, Section 3 — dimensionless form of Eq. 35.*

Because the fluid slows down, the acid stays in contact with the wall for longer and is consumed faster. Eq. 37 describes that consumption, and its integration (Eqs. 38 and 39) gives how much live acid survives to the tip of the channel. PVBtCalc does not solve those two numerically: the integration has a closed-form solution, condensed into the function α(λ):

α(λ) = \[ a · (2·h·π·L²)<sup>n</sup> / ( A<sub>o</sub> · (n + 1) ) \] · \[ (β + λ)<sup>n+1</sup> − β<sup>n+1</sup> \] + b · v<sub>o</sub> · λ

> *Closed-form integration of Eqs. 37–39 of ALI; ZIAUDDIN (2019), Section 3. Explicit form obtained in this implementation.*

The endpoint of Section 3 of the paper is the absolute acid volume:

V<sub>A</sub> = \[ L · A<sub>o</sub> / ( C<sub>Ao</sub> · X ) \] · ∫<sub>0</sub><sup>λ</sup> ( e<sup>Da·ω·α</sup> / ω ) dλ   (42)

> *ALI; ZIAUDDIN (2019), Eq. 42, Section 3 — acid volume up to length λ in radial flow.*

**Skin factor**

The skin quantifies the damage or the stimulation around the wellbore. For a dominant wormhole — an open channel whose conductivity far exceeds that of the matrix — the HAWKINS (1956) formula reduces to:

S = − ln \[ ( r<sub>w</sub> + l ) / r<sub>w</sub> \]

> *Limiting form of the HAWKINS (1956) equation for an altered-zone permeability far above that of the matrix; convention adopted by ALI; ZIAUDDIN (2019) in Fig. 27.*

**Acid-mineral system parameters**

The coefficients a, b, n and k<sub>0</sub> come from Table 1 of the paper, indexed by mineral × acid system. It is this parameterisation that underpins the proposal described under “The Ali and Ziauddin (2019) model”: the table's own caption records that “the same parameter values are used for both linear and radial flow”.

| **System (limestone)** | **n** | **a**     | **b** | **k<sub>0</sub>** |
|------------------------|-------|-----------|-------|-------------------|
| HCl without inhibitor  | 0.65  | 2.68·10⁻⁴ | 17.3  | 2.43·10⁷          |
| HCl with inhibitor     | 0.65  | 5.10·10⁻⁴ | 35.1  | 2.43·10⁶          |
| Emulsified acid        | 0.65  | 4.61·10⁻⁴ | 15.5  | 2.85·10⁷          |

*Taken from ALI and ZIAUDDIN (2019), Table 1 — limestone rows.*

**Validity range**

The model describes the dominant-wormhole regime — a dominant channel forms and acid consumption is at its lowest. Outside it, at very low flow rates, the channel ceases to exist as a distinct structure and dissolution becomes compact and uniform — a regime these equations do not represent. The paper bounds the experimentally observed range at one order of magnitude on either side of the optimum flow rate:

q<sub>opt</sub> / 10 ≤ q<sub>o</sub> ≤ 10 · q<sub>opt</sub>

> *Range reported by ALI; ZIAUDDIN (2019), Section 2, from dissolution patterns in linear cores. Operational criterion of PVBtCalc.*

Outside that window, PVBtCalc flags the affected points in the charts and in the table. The model's behaviour in that region is not merely imprecise: the predicted volume diverges to infinity, whereas the real physical behaviour saturates at a finite value.

**The window was observed in linear flow**

The one-order-of-magnitude bound appears in Section 2, drawn from photographs of dissolution patterns in linear cores. The paper does not repeat that observation specifically for radial flow. PVBtCalc extends the same range to both regimes by analogy.

For the radial regime, the paper offers validation of a different nature, described in Section 6: comparison against field treatments documented by BURTON et al. (2018), whose volumes range from 5 to 700 gal/ft, with a median of 75 gal/ft. Computed volumes well above that range indicate a configuration outside the practical domain.

**Reported quantities**

| **Quantity**  | **Meaning**                                                      | **Unit**     |
|---------------|------------------------------------------------------------------|--------------|
| q<sub>0</sub> | Injection flow rate, normalised per foot of zone                 | gal/(ft·min) |
| V<sub>A</sub> | Acid volume, normalised per foot of zone                         | gal/ft       |
| iv            | Interstitial velocity — Darcy velocity divided by total porosity | m/s          |
| wv            | Wormhole velocity, evaluated at the wellbore face (λ = 0)        | m/s          |
| dv            | Darcy velocity                                                   | m/s          |
| 1/Da          | Inverse Damköhler number, evaluated at the curve's target        | —            |
| tbt           | Time to breakthrough — t<sub>b</sub> in the paper's nomenclature | s            |

*Columns wv and 1/Da are evaluated at different points along the wormhole — wv at the wellbore face, 1/Da at the curve's target length — and therefore must not be compared with one another. In the radial regime, 1/Da varies with length by construction; in the linear regime it stays constant.*

Normalisation per foot of zone follows the convention adopted by ALI and ZIAUDDIN (2019) from Fig. 27 onwards, and allows treatments over intervals of differing thickness to be compared.

**Exporting results**

The EXPORT menu, in the sidebar, gathers the charts and tables of a calculation session into a single file.

1.  Run the calculations you need in the RUNNER. Each tab — Design Plot, Simulation Chart, Skin Evolution and Analysis Chart — contributes its chart and its table.

2.  Open EXPORT. The saved curves are listed by Simulation ID.

3.  Select the curves to include. For each one, the generated file gathers: a header block with rock, acid system, concentration, porosity, temperature and geometry; the image of every chart produced; and the corresponding table, with the labels and units shown on screen.

4.  Confirm to download.

**References**

*The primary reference is the only one consulted directly. The others are cited as discussed within that paper; check the full bibliographic details in the paper's own reference list before reusing them in a formal document.*

ALI, M.; ZIAUDDIN, M. Carbonate acidizing: A mechanistic model for wormhole growth in linear and radial flow. *Journal of Petroleum Science and Engineering*, v. 186, 106776, 2019. Available at: https://www.sciencedirect.com/science/article/pii/S0920410519311945

BURTON, R. C. et al. Field-treatment study — acid volumes and resulting skin. Cited in Ali and Ziauddin (2019), Sections 5 and 6, 2018.

HAWKINS, M. F. A note on the skin effect. *Journal of Petroleum Technology*, v. 8, n. 12, 1956.
```
