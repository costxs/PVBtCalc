/**
 * Destaque + balão do tour. Não guarda estado próprio: recebe o passo atual e devolve
 * os eventos. Quem decide qual passo mostrar (e pula âncoras ausentes) é o TourProvider.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useT } from "../i18n";
import type { TourStep } from "./types";
import { findAnchors } from "./anchors";
import "./tour.css";

interface Props {
  step: TourStep;
  index: number;
  total: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

interface Box { top: number; left: number; width: number; height: number }

const PAD = 6;
const GAP = 16;
const MARGIN = 12;

function unionRect(els: HTMLElement[]): DOMRect | null {
  let top = Infinity, left = Infinity, right = -Infinity, bottom = -Infinity;
  for (const el of els) {
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) continue;
    top = Math.min(top, r.top); left = Math.min(left, r.left);
    right = Math.max(right, r.right); bottom = Math.max(bottom, r.bottom);
  }
  return top === Infinity ? null : new DOMRect(left, top, right - left, bottom - top);
}

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function TourOverlay({ step, index, total, onNext, onPrev, onSkip }: Props) {
  const { t } = useT();
  const [box, setBox] = useState<Box | null>(null);
  const [tipPos, setTipPos] = useState<{ top: number; left: number } | null>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);
  const centered = step.anchor === null;

  const measure = useCallback(() => {
    const tw = tipRef.current?.offsetWidth ?? 300;
    const th = tipRef.current?.offsetHeight ?? 190;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (step.anchor === null) {
      setBox(null);
      setTipPos({ top: Math.max(MARGIN, (vh - th) / 2), left: Math.max(MARGIN, (vw - tw) / 2) });
      return;
    }
    const r = unionRect(findAnchors(step.anchor));
    if (!r) return;
    setBox({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 });

    let left: number;
    let top: number;
    if (r.right + GAP + tw <= vw - MARGIN) {            // cabe à direita
      left = r.right + GAP; top = r.top - 4;
    } else if (r.left - GAP - tw >= MARGIN) {           // cabe à esquerda
      left = r.left - tw - GAP; top = r.top - 4;
    } else {                                            // nem um nem outro: abaixo ou acima
      left = Math.min(Math.max(MARGIN, r.left), vw - tw - MARGIN);
      top = r.bottom + GAP + th <= vh - MARGIN ? r.bottom + GAP : r.top - th - GAP;
    }
    top = Math.min(Math.max(MARGIN, top), vh - th - MARGIN);
    left = Math.max(MARGIN, left);
    setTipPos({ top, left });
  }, [step.anchor]);

  /* rola até a âncora, depois mede */
  useLayoutEffect(() => {
    if (step.anchor === null) { measure(); return; }
    const els = findAnchors(step.anchor);
    if (!els.length) return;
    const r = unionRect(els);
    const tall = r ? r.height > window.innerHeight * 0.8 : false;
    els[0].scrollIntoView({ block: tall ? "start" : "center", behavior: reducedMotion() ? "auto" : "smooth" });
    measure();
    const timer = window.setTimeout(measure, reducedMotion() ? 0 : 320);
    return () => window.clearTimeout(timer);
  }, [step.anchor, measure]);

  useEffect(() => {
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [measure]);

  /* foco: entra no balão, volta ao elemento anterior ao fechar */
  useEffect(() => {
    restoreFocus.current = document.activeElement as HTMLElement | null;
    tipRef.current?.querySelector<HTMLElement>("button.go")?.focus();
    return () => restoreFocus.current?.focus?.();
  }, []);

  useEffect(() => {
    tipRef.current?.querySelector<HTMLElement>("button.go")?.focus({ preventScroll: true });
  }, [index]);

  /* teclado: → avança, ← volta, Esc encerra; Tab fica preso no balão */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && !tipRef.current?.contains(target) && /^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName);
      if (e.key === "Escape") { e.preventDefault(); onSkip(); return; }
      if (typing) return;
      if (e.key === "ArrowRight") { e.preventDefault(); onNext(); return; }
      if (e.key === "ArrowLeft") { e.preventDefault(); onPrev(); return; }
      if (e.key === "Tab" && tipRef.current) {
        const f = Array.from(tipRef.current.querySelectorAll<HTMLButtonElement>("button")).filter((b) => !b.disabled);
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (!tipRef.current.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
        else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onNext, onPrev, onSkip]);

  const last = index === total - 1;

  return createPortal(
    <>
      {centered ? (
        <div className="pvbt-tour-backdrop" aria-hidden="true" />
      ) : (
        box && <div className="pvbt-tour-spot" style={box} aria-hidden="true" />
      )}
      <div
        className={centered ? "pvbt-tour-tip centered" : "pvbt-tour-tip"}
        ref={tipRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pvbt-tour-title"
        aria-describedby="pvbt-tour-body"
        style={tipPos ?? { top: -9999, left: -9999 }}
      >
        <div className="pvbt-tour-dots" aria-hidden="true">
          {Array.from({ length: total }, (_, i) => (
            <i key={i} className={i <= index ? "on" : undefined} />
          ))}
        </div>
        <div className="pvbt-tour-count">{t("tour.step_of", { n: index + 1, total })}</div>
        <h4 id="pvbt-tour-title">{step.title}</h4>
        <p id="pvbt-tour-body">{step.body}</p>
        <div className="pvbt-tour-actions">
          <button type="button" onClick={onPrev} disabled={index === 0}>{t("tour.back")}</button>
          <button type="button" className="go" onClick={onNext}>{last ? t("tour.finish") : t("tour.next")}</button>
          <button type="button" className="skip" onClick={onSkip}>{t("tour.skip")}</button>
        </div>
      </div>
    </>,
    document.body,
  );
}
