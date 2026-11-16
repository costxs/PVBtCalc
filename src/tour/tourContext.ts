import { createContext, useContext } from "react";
import type { TourTrack } from "./types";

export interface TourApi {
  /** abre uma trilha manualmente (botão "Tour guiado" ou Sobre o Modelo) */
  startTour: (track: TourTrack) => void;
  /** abre só se nunca foi concluída e nenhuma outra estiver aberta */
  maybeStart: (track: TourTrack) => void;
  /** true depois de saber do backend o que já foi concluído */
  ready: boolean;
  active: TourTrack | null;
}

// Fora do provider (ex.: um componente renderizado sozinho em teste) o tour não faz nada.
const NO_TOUR: TourApi = { startTour: () => {}, maybeStart: () => {}, ready: false, active: null };

export const TourContext = createContext<TourApi>(NO_TOUR);
export const useTour = (): TourApi => useContext(TourContext);
