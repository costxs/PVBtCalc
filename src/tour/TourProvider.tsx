/**
 * Estado do tour: trilha aberta, passo atual e o que já foi concluído.
 *
 * A conclusão fica no banco (GET/PATCH /me/onboarding), não em localStorage: assim o
 * tour não reaparece em outra máquina. Quem já tinha conta quando o tour foi lançado
 * vem do backend com as três trilhas concluídas e só vê o tour pelo botão.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../redux/store";
import { API_BASE } from "../services/api";
import { TOURS } from "../i18n/tourContent";
import TourOverlay from "./TourOverlay";
import { findAnchors } from "./anchors";
import { TourContext, type TourApi } from "./tourContext";
import type { ChartView, TourTrack } from "./types";

type Completed = Record<TourTrack, string | null>;

interface Props {
  children: React.ReactNode;
  /** troca a aba de gráfico */
  onChartView: (view: ChartView) => void;
  /** leva a interface para onde a trilha acontece (aba e regime) antes de abrir */
  onPrepare: (track: TourTrack) => void;
}

/** quanto esperar uma âncora aparecer (troca de aba, dado chegando) antes de pular o passo */
const ANCHOR_WAIT_MS = 900;

export function TourProvider({ children, onChartView, onPrepare }: Props) {
  const profileId = useSelector((s: RootState) => s.user.profile?.id ?? null);
  const token = useSelector((s: RootState) => s.user.token);
  const tokenRef = useRef(token);
  tokenRef.current = token;

  const [completed, setCompleted] = useState<Completed | null>(null);
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState<TourTrack | null>(null);
  const [index, setIndex] = useState(0);
  // passo que o balão mostra; fica no anterior enquanto a âncora do novo não aparece
  const [shownIndex, setShownIndex] = useState<number | null>(null);
  const direction = useRef<1 | -1>(1);

  /* ------------------------------------------------------- persistência */
  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    setReady(false);
    fetch(`${API_BASE}/me/onboarding`, { headers: { Authorization: `Bearer ${tokenRef.current}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled) setCompleted(d && typeof d === "object" ? d : null); })
      .catch(() => { if (!cancelled) setCompleted(null); })
      .finally(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; };
  }, [profileId]);

  const markDone = useCallback((track: TourTrack) => {
    setCompleted((c) => (c ? { ...c, [track]: new Date().toISOString() } : c));
    fetch(`${API_BASE}/me/onboarding`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenRef.current}` },
      body: JSON.stringify({ track }),
    }).catch(() => { /* melhor-esforço */ });
  }, []);

  /* ------------------------------------------------------------ abrir */
  const open = useCallback((track: TourTrack) => {
    direction.current = 1;
    const first = TOURS[track].steps[0];
    const view = first.chart ?? TOURS[track].initialChart;
    if (view) onChartView(view);
    setShownIndex(null);
    setIndex(0);
    setActive(track);
  }, [onChartView]);

  const startTour = useCallback((track: TourTrack) => {
    onPrepare(track);
    open(track);
  }, [onPrepare, open]);

  const maybeStart = useCallback((track: TourTrack) => {
    // Sem resposta do backend, nunca abre sozinho: melhor não incomodar quem já usa o app.
    if (!ready || !completed || active || completed[track]) return;
    open(track);
  }, [ready, completed, active, open]);

  /* ---------------------------------------------------------- navegar */
  const steps = useMemo(() => (active ? TOURS[active].steps : []), [active]);

  const finish = useCallback(() => {
    if (!active) return;
    markDone(active);
    setActive(null);
    setIndex(0);
    setShownIndex(null);
  }, [active, markDone]);

  const goTo = useCallback((i: number, dir: 1 | -1) => {
    if (!active) return;
    if (i >= steps.length) { finish(); return; }
    if (i < 0) { goTo(0, 1); return; }
    direction.current = dir;
    const step = steps[i];
    if (step.chart) onChartView(step.chart);
    setIndex(i);
  }, [active, steps, onChartView, finish]);

  const next = useCallback(() => goTo(index + 1, 1), [goTo, index]);
  const prev = useCallback(() => { if (index > 0) goTo(index - 1, -1); }, [goTo, index]);

  /* Âncora ausente não pode travar o tour: espera um pouco (a aba pode estar trocando)
     e, se não aparecer, pula o passo na direção em que a pessoa ia e avisa no console. */
  useEffect(() => {
    if (!active) return;
    const step = steps[index];
    if (!step) return;
    if (step.anchor === null || findAnchors(step.anchor).length) { setShownIndex(index); return; }
    const started = Date.now();
    const timer = window.setInterval(() => {
      if (findAnchors(step.anchor!).length) { window.clearInterval(timer); setShownIndex(index); return; }
      if (Date.now() - started < ANCHOR_WAIT_MS) return;
      window.clearInterval(timer);
      console.warn(`[tour] âncora não encontrada: "${step.anchor}" — passo pulado`);
      const dir = index === 0 ? 1 : direction.current;
      goTo(index + dir, dir);
    }, 100);
    return () => window.clearInterval(timer);
  }, [active, steps, index, goTo]);

  const api = useMemo<TourApi>(
    () => ({ startTour, maybeStart, ready, active }),
    [startTour, maybeStart, ready, active],
  );

  return (
    <TourContext.Provider value={api}>
      {children}
      {active && shownIndex !== null && steps[shownIndex] && (
        <TourOverlay
          key={active}
          step={steps[shownIndex]}
          index={shownIndex}
          total={steps.length}
          onNext={next}
          onPrev={prev}
          onSkip={finish}
        />
      )}
    </TourContext.Provider>
  );
}
