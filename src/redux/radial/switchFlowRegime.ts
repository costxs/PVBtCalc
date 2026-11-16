import type { AppDispatch, RootState } from "../store";
import { setFlowRegime } from "./slice";
import { setParameter } from "../setup/slice";
import { setVisibleChart } from "../ui/slice";

export const LINEAR_FLOWRATE_DEFAULTS = { min: 0.5, max: 10 };
export const RADIAL_FLOWRATE_DEFAULTS = { min: 0.1, max: 5 };

/** Troca o regime como o alternador do painel 01: ajusta a aba de gráfico e, se a
 *  varredura ainda estiver no padrão do outro regime, troca para o padrão deste. */
export const switchFlowRegime = (regime: "linear" | "radial") =>
  (dispatch: AppDispatch, getState: () => RootState) => {
    const { setup, ui } = getState();
    const fflowrate = Number(setup.minimum_flowrate);
    const iflowrate = Number(setup.flowrate);
    dispatch(setFlowRegime(regime));
    if (regime === "radial") {
      dispatch(setVisibleChart("A"));
      if (fflowrate === LINEAR_FLOWRATE_DEFAULTS.min && iflowrate === LINEAR_FLOWRATE_DEFAULTS.max) {
        dispatch(setParameter({ key: "minimum_flowrate", value: RADIAL_FLOWRATE_DEFAULTS.min }));
        dispatch(setParameter({ key: "flowrate", value: RADIAL_FLOWRATE_DEFAULTS.max }));
      }
    } else {
      if (ui.visibleChart === "design" || ui.visibleChart === "skin") {
        dispatch(setVisibleChart("A"));
      }
      if (fflowrate === RADIAL_FLOWRATE_DEFAULTS.min && iflowrate === RADIAL_FLOWRATE_DEFAULTS.max) {
        dispatch(setParameter({ key: "minimum_flowrate", value: LINEAR_FLOWRATE_DEFAULTS.min }));
        dispatch(setParameter({ key: "flowrate", value: LINEAR_FLOWRATE_DEFAULTS.max }));
      }
    }
  };
