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

/** sem alvo reserva: quanto esperar a âncora aparecer (troca de aba) antes de pular o passo */
const ANCHOR_WAIT_MS = 900;
/** com alvo reserva: quando passar a mostrá-lo, e até quando continuar esperando o alvo real
 *  (o Design Plot, por exemplo, é buscado no servidor quando a aba abre) */
const FALLBACK_AFTER_MS = 350;
const PRIMARY_WAIT_MS = 10000;

/** o que o balão mostra: qual passo e em qual alvo (o real ou o reserva) */
interface Shown { index: number; anchor: string | null; usingFallback: boolean }

export function TourProvider({ children, onChartView, onPrepare }: Props) {
  const profileId = useSelector((s: RootState) => s.user.profile?.id ?? null);
  const token = useSelector((s: RootState) => s.user.token);
  const tokenRef = useRef(token);
  tokenRef.current = token;

  const [completed, setCompleted] = useState<Completed | null>(null);
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState<TourTrack | null>(null);
  const [index, setIndex] = useState(0);
  // o balão fica no passo anterior enquanto a âncora do novo não aparece
  const [shown, setShown] = useState<Shown | null>(null);
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
    setShown(null);
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
    setShown(null);
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

  /* Âncora ausente não pode travar o tour.
     - Se o passo tem alvo reserva (elemento que só existe depois do cálculo), mostra o
       passo nele, com uma nota, e continua esperando o alvo real; quando ele aparece
       (cálculo feito, dado carregado), o destaque passa para ele.
     - Sem alvo reserva, espera um pouco e pula o passo na direção em que a pessoa ia. */
  useEffect(() => {
    if (!active) return;
    const step = steps[index];
    if (!step) return;
    const primary = step.anchor;
    if (primary === null || findAnchors(primary).length) {
      setShown({ index, anchor: primary, usingFallback: false });
      return;
    }
    const started = Date.now();
    let onFallback = false;
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - started;
      if (findAnchors(primary).length) {
        window.clearInterval(timer);
        setShown({ index, anchor: primary, usingFallback: false });
        return;
      }
      const fallbackReady = !!step.fallback && findAnchors(step.fallback).length > 0;
      if (!onFallback && fallbackReady && elapsed >= FALLBACK_AFTER_MS) {
        onFallback = true;
        setShown({ index, anchor: step.fallback!, usingFallback: true });
      }
      if (onFallback) {
        if (elapsed >= PRIMARY_WAIT_MS) window.clearInterval(timer);
        return;
      }
      if (elapsed < ANCHOR_WAIT_MS) return;
      window.clearInterval(timer);
      console.warn(`[tour] âncora não encontrada: "${primary}" — passo pulado`);
      const dir = index === 0 ? 1 : direction.current;
      goTo(index + dir, dir);
    }, 100);
    return () => window.clearInterval(timer);
  }, [active, steps, index, goTo]);

  const shownStep = useMemo(() => {
    if (!shown) return null;
    const step = steps[shown.index];
    if (!step) return null;
    return shown.usingFallback
      ? { ...step, anchor: shown.anchor, body: `${step.body} ${step.fallbackNote ?? ""}`.trim() }
      : step;
  }, [shown, steps]);

  const api = useMemo<TourApi>(
    () => ({ startTour, maybeStart, ready, active }),
    [startTour, maybeStart, ready, active],
  );

  return (
    <TourContext.Provider value={api}>
      {children}
      {active && shown && shownStep && (
        <TourOverlay
          key={active}
          step={shownStep}
          index={shown.index}
          total={steps.length}
          onNext={next}
          onPrev={prev}
          onSkip={finish}
        />
      )}
    </TourContext.Provider>
  );
}
