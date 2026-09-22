import React from 'react';
import { Eq, Frac, Ressalva, InfoBox, DocTable, SomSection } from './primitives';

export const sections: SomSection[] = [
  { id: 'intro', heading: 'Introduction' },
  { id: 'nomenclature', heading: 'Nomenclature' },
  { id: 'properties', heading: 'Acid–rock system properties' },
  { id: 'linear', heading: 'Linear model' },
  { id: 'radial', heading: 'Radial model' },
  { id: 'parameters', heading: 'Acid–mineral system parameters' },
  { id: 'validity', heading: 'Validity window' },
  { id: 'quantities', heading: 'Reported quantities' },
  { id: 'export', heading: 'Exporting results' },
  { id: 'references', heading: 'References' },
];

export const subsections: SomSection[] = [
  { id: 'intro-matrix', heading: 'Matrix acidizing in carbonates' },
  { id: 'intro-model', heading: 'The Ali and Ziauddin (2019) model' },
  { id: 'intro-scope', heading: 'Scope of PVBtCalc' },
  { id: 'nomenclature-tables', heading: 'Symbols in the exported tables' },
  { id: 'linear-qopt', heading: 'Optimum rate in the linear model' },
  { id: 'radial-skin', heading: 'Skin factor' },
];

const ContentEn: React.FC = () => (
  <>
    <p className="som-title">PVBtCalc</p>
    <p className="som-subtitle">Theoretical Background and Mathematical Modeling</p>
    <p className="som-tagline">Wormhole growth model for matrix acidizing — linear and radial flow</p>

    <InfoBox titulo="About this document">
      <p>It describes the equations actually implemented in PVBtCalc, the provenance of each one, and the points where the implementation goes beyond what the original reference derives. The primary reference is ALI and ZIAUDDIN (2019); each equation carries, immediately below it, the section or equation it comes from.</p>
    </InfoBox>

    <h2 id="intro">Introduction</h2>

    <h3 id="intro-matrix">Matrix acidizing in carbonates</h3>
    <p>Matrix acidizing is the injection of acid into the formation below fracturing pressure, in order to remove formation damage. Unlike sandstones, the acid dissolves the carbonate matrix itself in an unstable fashion, producing highly branched conductive channels known as <em>wormholes</em> (Ali; Ziauddin, 2019).</p>
    <p>What is observed, in the laboratory and in the field, is that the acid opens narrow branched conductive channels that penetrate the formation far beyond the diffusely dissolved region. These are the <em>wormholes</em>. The mechanism is one of instability: any initial heterogeneity — a larger pore, a vug — takes more flow, dissolves faster, becomes still more conductive, and the process feeds on itself. The practical result is that a modest amount of acid produces disproportionate penetration, with strongly negative skin factors.</p>

    <h3 id="intro-model">The Ali and Ziauddin (2019) model</h3>
    <p>ALI and ZIAUDDIN (2019) propose a mechanistic model intended to meet three requirements at once: to have an analytical form, to have parameters set by the acid–mineral system rather than fitted to each core, and to hold in both linear and radial geometry under the same parameterization.</p>
    <p>The development proceeds in four steps:</p>
    <ol>
      <li>a relation between the velocity inside the wormhole and the Darcy velocity, fitted from experimental data and expressed through acid–mineral system coefficients (Section 2 of the paper);</li>
      <li>an acid mass balance along the channel, with consumption governed by first-order kinetics, from which the PVBT expression for linear flow follows (Eq. 11);</li>
      <li>the derivative of that expression with respect to rate, whose zero locates the bottom of the U-shaped curve (Eqs. 33 and 34);</li>
      <li>the reformulation of the same balance in radial coordinates, with a growing flow area, culminating in the injection time and the absolute acid volume (Eqs. 41 and 42, Section 3 of the paper).</li>
    </ol>
    <p>The validation presented by the authors runs on two fronts: against linear-core PVBT data for several acid–rock systems (Section 4), and against radial experiments and documented field treatments (Sections 5 and 6), the latter including the BURTON et al. (2018) set.</p>

    <h3 id="intro-scope">Scope of PVBtCalc</h3>
    <p>PVBtCalc implements this model in both regimes. On top of it, it adds what design use requires and the paper does not supply in closed form: numerical solution of the optimum rate, rate and temperature sweeps, flagging of the physical validity window, skin evolution, and consolidated export of results. The highlighted boxes throughout this document mark exactly where the implementation goes beyond what the paper derives — the distinction is deliberate and should not be erased.</p>

    <h2 id="nomenclature">Nomenclature</h2>

    <h3 id="nomenclature-tables">Symbols in the exported tables</h3>
    <p>Below are the nomenclatures of the four table forms, one per chart type, plus the Inputs sheet. The column headers abbreviate the model symbols; the correspondence is as follows.</p>

    <h4>Design Plot — "Design ⟨T⟩ C" sheets</h4>
    <DocTable
      headers={['Header', 'Symbol', 'Meaning', 'Unit']}
      rows={[
        [<>Wormhole Length [ft]</>, <>l</>, <>Wormhole length</>, <>ft</>],
        [<>q_opt [gal/(ft.min)]</>, <>q<sub>opt</sub></>, <>Optimum rate for that length, normalized per foot of zone</>, <>gal/(ft·min)</>],
        [<>V_opt [gal/ft]</>, <>V<sub>A</sub>(q<sub>opt</sub>)</>, <>Acid volume at the optimum rate — the same function as the V<sub>A</sub> column, evaluated at q<sub>opt</sub></>, <>gal/ft</>],
        [<>tbt [min]</>, <>M·τ</>, <>Time to breakthrough at the optimum rate — t<sub>b</sub> in the paper's nomenclature</>, <>min</>],
        [<>Temperature [°C]</>, <>T</>, <>Temperature of the curve</>, <>°C</>],
        [<>Note</>, <>—</>, <>Row diagnostic — see the table of values below</>, <>text</>],
      ]}
    />
    <p className="sm-nota">The sheet name follows the pattern Design ⟨T⟩ C, with the temperature in degrees Celsius to two decimal places — for example, Design 23.89 C. When two temperatures round to the same name, a numeric suffix is appended.</p>

    <h4>Simulation Chart — "Sim ⟨target⟩ ft" sheets</h4>
    <DocTable
      headers={['Header', 'Symbol', 'Meaning', 'Unit']}
      rows={[
        [<>q0 [gal/(ft.min)]</>, <>q<sub>o</sub></>, <>Swept injection rate, normalized per foot of zone</>, <>gal/(ft·min)</>],
        [<>V_A [gal/ft]</>, <>V<sub>A</sub></>, <>Acid volume up to the target length (Eq. 42)</>, <>gal/ft</>],
        [<>iv [m/s]</>, <>v<sub>o</sub> / φ<sub>t</sub></>, <>Interstitial velocity — uses total porosity; the flowing fraction does not enter this column</>, <>m/s</>],
        [<>wv [m/s]</>, <>v(λ = 0)</>, <>Wormhole velocity, evaluated at the wellbore face</>, <>m/s</>],
        [<>dv [m/s]</>, <>v<sub>o</sub></>, <>Darcy velocity</>, <>m/s</>],
        [<>1/Da</>, <>1 / Da(λ)</>, <>Inverse Damköhler, evaluated at the curve's target length</>, <>—</>],
        [<>tbt [s]</>, <>M·τ</>, <>Time to breakthrough</>, <>s</>],
        [<>Note</>, <>—</>, <>Row diagnostic</>, <>text</>],
      ]}
    />

    <h4>Skin Evolution — "Skin ⟨rate⟩ bbl-min" sheets</h4>
    <DocTable
      headers={['Header', 'Symbol', 'Meaning', 'Unit']}
      rows={[
        [<>V_A [gal/ft]</>, <>V<sub>A</sub></>, <>Cumulative acid volume</>, <>gal/ft</>],
        [<>skin</>, <>S</>, <>Skin factor — see the corresponding section</>, <>—</>],
        [<>Wormhole Length [ft]</>, <>l</>, <>Wormhole length</>, <>ft</>],
        [<>Note</>, <>—</>, <>Row diagnostic</>, <>text</>],
      ]}
    />

    <p className="sm-nota">The tbt column appears in both tables and denotes the same quantity — the paper's t<sub>b</sub>, defined in Section 2 as "the breakthrough time in seconds" — but in different units: minutes in Design, seconds in Simulation. Check the bracket before comparing values across the two sheets. The computation paths also differ — in Design it is obtained as the ratio V_opt / q_opt, which equals M·τ through the identity V<sub>A</sub> = M · q<sub>o</sub> · τ; in Simulation, by direct evaluation of M · τ(λ). The two agree by construction, but they do not share code.</p>

    <h4>Optimum Analysis — "Analysis" sheet</h4>
    <DocTable
      headers={['Header', 'Symbol', 'Meaning', 'Unit']}
      rows={[
        [<>⟨parameter⟩ [unit]</>, <>—</>, <>Swept value. The header follows the chosen parameter: Temperature [°C], Porosity, Acid Concentration, Wellbore Diameter [in] or Payzone Thickness [ft]</>, <>varies</>],
        [<>q_opt [gal/(ft.min)]</>, <>q<sub>opt</sub></>, <>Optimum rate at that swept value, for the fixed target length</>, <>gal/(ft·min)</>],
        [<>V_opt [gal/ft]</>, <>V<sub>A</sub>(q<sub>opt</sub>)</>, <>Acid volume at the optimum</>, <>gal/ft</>],
        [<>tbt [min]</>, <>M·τ</>, <>Time to breakthrough at the optimum — it is V_opt / q_opt</>, <>min</>],
        [<>Note</>, <>—</>, <>Row diagnostic</>, <>text</>],
      ]}
    />

    <h4>Inputs — "Inputs" sheet</h4>
    <p>Collects the session's input parameters. Temperature appears as a single row, Temperature (°C).</p>

    <h4>Values of the Note column</h4>
    <DocTable
      headers={['Value', 'When it appears']}
      rows={[
        [<>(empty)</>, <>Ordinary row, nothing flagged.</>],
        [<>Minimum at the edge of the simulated range; q_opt = ⟨…⟩</>, <>Simulation: the smallest V<sub>A</sub> in the sweep is the first or the last row — the true minimum lies outside the swept range. In linear mode, the same note in cm³/min.</>],
        [<>Minimum V_A of this simulation; q_opt = ⟨…⟩</>, <>Simulation: the smallest V<sub>A</sub> lies inside the swept range. In linear mode, "Minimum PVBT of this simulation".</>],
        [<>Target ⟨t⟩ ft (Wormhole Length = ⟨l⟩ ft)</>, <>Design: the row is the closest to a requested target length, within half a grid step.</>],
        [<>Target ⟨t⟩ ft not reached — table ends at ⟨l⟩ ft (limit 1000 gal/ft)</>, <>Design: one requested target exceeds the last tabulated length. It sits on the last row.</>],
        [<>Targets ⟨t₁⟩ and ⟨t₂⟩ ft not reached — table ends at ⟨l⟩ ft (limit 1000 gal/ft)</>, <>Design: two targets not reached — joined by "and", no comma.</>],
        [<>Targets ⟨t₁⟩, ⟨t₂⟩ and ⟨t₃⟩ ft not reached — table ends at ⟨l⟩ ft (limit 1000 gal/ft)</>, <>Design: three or more — commas between the first ones, "and" before the last. All missed targets go into a single note, on the last row.</>],
        [<>Outside calibrated range (⟨min⟩–⟨max⟩ °C)</>, <>Analysis: the swept value lies outside the model's calibrated temperature range. The note carries the calibrated range, not the rejected value.</>],
        [<>No interior optimum — point omitted</>, <>Analysis: the sweep found no interior minimum at that point. Fixed string, no interpolated values.</>],
        [<>Series truncated — ⟨value⟩ ⟨unit⟩ exceeds the 1000 gal/ft limit</>, <>Analysis: the volume at the optimum passed the physical ceiling from that point on. The unit follows the swept parameter — for example, Series truncated — 36.85 °C exceeds the 1000 gal/ft limit or Series truncated — 0.62 fraction exceeds the 1000 gal/ft limit.</>],
        [<>Target skin (closest to ⟨…⟩)</>, <>Skin: the row is the closest to the requested target skin.</>],
        [<>Final skin</>, <>Skin: no target skin was set — the note marks the last point.</>],
      ]}
      caption='More than one note may appear on the same row, joined by "; ". The exported file is always produced in English, regardless of the interface language.'
    />

    <h2 id="properties">Acid–rock system properties</h2>
    <p>The interface and the exported files use degrees Celsius. The Eq. 18 correlation, however, is fitted in Kelvin, and the calculation is carried out in Kelvin: conversion happens only at input and at display. The calibrated range, 283–478 K, corresponds to 9.85–204.85 °C.</p>
    <p>The diffusion coefficient depends on temperature and concentration through an empirical correlation (T in Kelvin):</p>
    <Eq n="18" fonte="ALI; ZIAUDDIN (2019), Eq. 18, Section 2.">
      D<sub>m</sub> = exp( <Frac num="−2270" den="T" /> + 1.326 · C<sub>Ao</sub> − 12.11 )
    </Eq>

    <p>The effective kinetic constant combines that coefficient with the system parameter:</p>
    <Eq fonte="ALI; ZIAUDDIN (2019), Section 2 — definition used alongside Table 1; k₀ is tabulated per acid–mineral system.">
      k<sub>eff</sub> = k<sub>0</sub> · D<sub>m</sub>
    </Eq>

    <p>The volumetric dissolving power is not constant: it depends on the acid density, which in turn varies with temperature. That is why the adjusted-parameters panel displays the density (ro) next to X, and the value of X changes when the temperature changes.</p>
    <Eq n="4" fonte="ALI; ZIAUDDIN (2019), Eq. 4 — here β is the mass dissolving power, not the dimensionless radius.">
      X = β<sub>mass</sub> · <Frac num={<>ρ<sub>acid</sub></>} den={<>ρ<sub>rock</sub></>} />
    </Eq>

    <h2 id="linear">Linear model</h2>
    <p>Ali and Ziauddin (2019) proposed an analytical mechanistic model whose parameters are set by the acid–mineral system itself, applicable to both linear and radial flow. In linear flow — characterized by a cylindrical core with injection through one face, where the flow area is constant along the path — the fluid velocity inside the <em>wormhole</em> (v) relates to the Darcy velocity (v<sub>o</sub>) through the following equation:</p>
    <Eq n="29" fonte="ALI; ZIAUDDIN (2019), Eq. 29, Section 2. Coefficients a, b, n from Table 1.">
      v = <Frac num={<>v<sub>o</sub></>} den={<>a · A<sub>o</sub><sup>(n−1)</sup> + b · v<sub>o</sub></>} />
    </Eq>

    <p>Through an acid mass balance along the channel, governed by first-order kinetics, the model establishes the Pore Volumes to <em>Breakthrough</em> (PVBT) (Ali; Ziauddin, 2019). This dimensionless formulation makes it possible to compare cores of different dimensions:</p>
    <Eq n="11" fonte="ALI; ZIAUDDIN (2019), Eq. 11, Section 2 — result of the mass balance for linear flow.">
      PVBT = [ (1 − φ<sub>t</sub>) / (φ<sub>t</sub> · λ · C<sub>Ao</sub> · X · ω · Da) ] · ( e<sup>Da·λ</sup> − 1 )
    </Eq>

    <h3 id="linear-qopt">Optimum rate in the linear model</h3>
    <p>The optimum injection rate (q<sub>opt</sub>) lies at the minimum of the PVBT curve, found by setting the derivative of the expression with respect to rate to zero (Ali; Ziauddin, 2019). For the linear regime, the authors supply an explicit approximation that avoids iterative methods:</p>
    <Eq n="34" fonte="ALI; ZIAUDDIN (2019), Eq. 34, Section 2 — presented by the authors as an explicit approximation to the root of Eq. 33.">
      q<sub>opt</sub> ≈ a<sub>q</sub> · ( 1 + 1.3·b<sub>q</sub> − 2.6·b<sub>q</sub><sup>2</sup> ) / ( 1 + 2.7·b<sub>q</sub> )
    </Eq>
    <p className="sm-nota">with a<sub>q</sub> = a · A<sup>n</sup> · k<sub>eff</sub> · l<sub>c</sub> and b<sub>q</sub> = −e<sup>(−1 − b·k<sub>eff</sub>·l<sub>c</sub>)</sup>.</p>

    <h2 id="radial">Radial model</h2>
    <p>In radial flow, the flow area expands as the <em>wormhole</em> advances, which sharply reduces the fluid velocity and raises acid consumption at the walls (Ali; Ziauddin, 2019). Integrating this balance yields the absolute acid volume (V<sub>A</sub>) required to reach the target length:</p>
    <Eq n="36" fonte="ALI; ZIAUDDIN (2019), Eq. 36, Section 3 — dimensionless form of Eq. 35.">
      ω = <Frac num="1" den={<>(a / A<sub>o</sub>) · [ 2·h·π·L²·(β + λ) ]<sup>n</sup> + b · v<sub>o</sub></>} />
    </Eq>

    <p>Because the fluid slows down, the acid stays in contact with the wall longer and is consumed faster. Eq. 37 describes that consumption, and its integration (Eqs. 38 and 39) gives how much live acid survives to the tip of the channel. PVBtCalc does not solve those two numerically: the integration has a closed-form solution, summarized in the function α(λ):</p>
    <Eq fonte="Closed-form integration of Eqs. 37–39 of ALI; ZIAUDDIN (2019), Section 3. Explicit form obtained in this implementation.">
      α(λ) = [ a · (2·h·π·L²)<sup>n</sup> / ( A<sub>o</sub> · (n + 1) ) ] · [ (β + λ)<sup>n+1</sup> − β<sup>n+1</sup> ] + b · v<sub>o</sub> · λ
    </Eq>

    <p>The endpoint of Section 3 of the paper is the absolute acid volume:</p>
    <Eq n="42" fonte="ALI; ZIAUDDIN (2019), Eq. 42, Section 3 — acid volume up to length λ in radial flow.">
      V<sub>A</sub> = [ L · A<sub>o</sub> / ( C<sub>Ao</sub> · X ) ] · ∫<sub>0</sub><sup>λ</sup> ( e<sup>Da·ω·α</sup> / ω ) dλ
    </Eq>

    <h3 id="radial-skin">Skin factor</h3>
    <p>The skin quantifies damage or stimulation around the wellbore. For a dominant wormhole — an open channel whose conductivity far exceeds that of the matrix — the HAWKINS (1956) formula reduces to:</p>
    <Eq fonte="Limiting form of the HAWKINS (1956) equation for an altered-zone permeability far above that of the matrix; convention adopted by ALI; ZIAUDDIN (2019) in Fig. 27.">
      S = − ln [ ( r<sub>w</sub> + l ) / r<sub>w</sub> ]
    </Eq>

    <h2 id="parameters">Acid–mineral system parameters</h2>
    <p>The coefficients a, b, n and k<sub>0</sub> come from Table 1 of the paper, indexed by mineral × acid system. It is this parameterization that supports the claim described in "The Ali and Ziauddin (2019) model": the table's own caption records that "the same parameter values are used for both linear and radial flow".</p>
    <DocTable
      headers={['System (limestone)', 'n', 'a', 'b', <>k<sub>0</sub></>]}
      rows={[
        [<>HCl without inhibitor</>, <>0.65</>, <>2.68·10⁻⁴</>, <>17.3</>, <>2.43·10⁷</>],
        [<>HCl with inhibitor</>, <>0.65</>, <>5.10·10⁻⁴</>, <>35.1</>, <>2.43·10⁶</>],
        [<>Emulsified acid</>, <>0.65</>, <>4.61·10⁻⁴</>, <>15.5</>, <>2.85·10⁷</>],
      ]}
      caption="Taken from ALI and ZIAUDDIN (2019), Table 1 — limestone rows."
    />

    <h2 id="validity">Validity window</h2>
    <p>The model describes the dominant-wormhole regime — the one in which a preferential channel forms and acid consumption is minimal. Outside it, at very low rates, the channel ceases to exist as a distinct structure and dissolution becomes compact and uniform, a regime these equations do not represent. The paper bounds the experimentally observed range at one order of magnitude on each side of the optimum rate:</p>
    <Eq fonte="Range reported by ALI; ZIAUDDIN (2019), Section 2, from dissolution patterns in linear cores. Operational criterion of PVBtCalc.">
      <Frac num={<>q<sub>opt</sub></>} den="10" /> ≤ q<sub>o</sub> ≤ 10 · q<sub>opt</sub>
    </Eq>
    <p>Outside that window, PVBtCalc flags the affected points in the charts and in the table. The model's behavior in that region is not merely imprecise: the predicted volume diverges to infinity, whereas the real physical behavior saturates at a finite value.</p>

    <Ressalva titulo="The window was observed in linear flow">
      <p>The one-order-of-magnitude bound appears in Section 2, from photographs of dissolution patterns in linear cores. The paper does not repeat that observation specifically for radial flow. PVBtCalc extends the same range to both regimes by analogy.</p>
      <p>For the radial regime, the paper offers validation of a different nature, described in Section 6: comparison against field treatments documented by BURTON et al. (2018), whose volumes range from 5 to 700 gal/ft, with a median of 75 gal/ft. Calculated volumes well above that range indicate a configuration outside the practical domain.</p>
    </Ressalva>

    <p>There is a second limit, on temperature. The diffusion correlation was fitted over data between 9.85 and 204.85 °C. Outside that range PVBtCalc omits the point and records the corresponding note, rather than extrapolating the correlation.</p>

    <h2 id="quantities">Reported quantities</h2>
    <DocTable
      headers={['Quantity', 'Meaning', 'Unit']}
      rows={[
        [<>q<sub>0</sub></>, <>Injection rate, normalized per foot of zone</>, <>gal/(ft·min)</>],
        [<>V<sub>A</sub></>, <>Acid volume, normalized per foot of zone</>, <>gal/ft</>],
        [<>iv</>, <>Interstitial velocity — Darcy divided by total porosity</>, <>m/s</>],
        [<>wv</>, <>Wormhole velocity, evaluated at the wellbore face (λ = 0)</>, <>m/s</>],
        [<>dv</>, <>Darcy velocity</>, <>m/s</>],
        [<>1/Da</>, <>Inverse Damköhler, evaluated at the curve's target</>, <>—</>],
        [<>tbt</>, <>Time to breakthrough — t<sub>b</sub> in the paper's nomenclature</>, <>s</>],
      ]}
    />
    <p className="sm-nota">The wv and 1/Da columns are evaluated at different points of the wormhole — wv at the wellbore face, 1/Da at the curve's target length — and therefore should not be compared with each other. In the radial regime, 1/Da varies with length by construction; in the linear one, it stays constant.</p>
    <p>Normalization per foot of zone follows the convention adopted by ALI and ZIAUDDIN (2019) from Fig. 27 onward, and allows treatments over intervals of different thicknesses to be compared.</p>

    <h2 id="export">Exporting results</h2>
    <p>The EXPORT menu, in the sidebar, gathers the charts and tables of a calculation session into a single file.</p>
    <ol>
      <li>Run the desired calculations in the RUNNER. Each tab — Design Plot, Simulation Chart, Skin Evolution and Analysis Chart — contributes its chart and its table.</li>
      <li>Open EXPORT. The saved curves are listed by Simulation ID.</li>
      <li>Select the curves to include. The generated file gathers, for each one: a header block with rock, acid system, concentration, porosity, temperature and geometry; the image of each chart produced; and the corresponding table, with the labels and units shown on screen.</li>
      <li>Confirm to download.</li>
    </ol>
    <p className="sm-nota">The exported file is always produced in English, even with the interface in Portuguese, and always with temperature in degrees Celsius.</p>

    <h2 id="references">References</h2>
    <p className="sm-nota">The primary reference is the only one consulted directly. The others are cited as discussed in the paper; check the full bibliographic data in the paper's own reference list before reusing them in a formal document.</p>
    <p>ALI, M.; ZIAUDDIN, M. Carbonate acidizing: A mechanistic model for wormhole growth in linear and radial flow. <em>Journal of Petroleum Science and Engineering</em>, v. 186, 106776, 2019. Available at: https://www.sciencedirect.com/science/article/pii/S0920410519311945</p>
    <p>BURTON, R. C. et al. Field treatment study — acid volumes and resulting skin. Cited in Ali and Ziauddin (2019), Sections 5 and 6, 2018.</p>
    <p>HAWKINS, M. F. A note on the skin effect. <em>Journal of Petroleum Technology</em>, v. 8, n. 12, 1956.</p>
  </>
);

export default ContentEn;
