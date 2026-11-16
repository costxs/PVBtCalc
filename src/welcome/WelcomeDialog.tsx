/**
 * Diálogo que aparece depois da tela de entrada: cadastro ou acesso.
 * Escolher uma das opções seleciona a aba correspondente no card de login
 * e põe o foco no primeiro campo dela.
 */
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useT } from "../i18n";
import "./WelcomeDialog.css";

interface Props {
  onRegister: () => void;
  onSignIn: () => void;
  onClose: () => void;
}

export default function WelcomeDialog({ onRegister, onSignIn, onClose }: Props) {
  const { t } = useT();
  const box = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    restoreFocus.current = document.activeElement as HTMLElement | null;
    box.current?.querySelector<HTMLElement>("button")?.focus();
    return () => restoreFocus.current?.focus?.();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (e.key === "Tab" && box.current) {
        const f = box.current.querySelectorAll<HTMLElement>("button");
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (!box.current.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
        else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div
      className="pvbt-welcome-scrim"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pvbt-welcome-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="pvbt-welcome-box" ref={box}>
        <h2 id="pvbt-welcome-title">{t("welcome.dialog.title")}</h2>
        <p className="pvbt-welcome-lede">{t("welcome.dialog.lede")}</p>

        <div className="pvbt-welcome-choices">
          <button type="button" className="pvbt-welcome-choice" onClick={onRegister}>
            <span className="ic" aria-hidden="true">
              <svg width="17" height="17" viewBox="0 0 16 16" fill="none"
                   stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <path d="M8 3.4v9.2M3.4 8h9.2" />
              </svg>
            </span>
            <span className="tx">
              <span className="t">{t("welcome.dialog.new_title")}</span>
              <span className="d">{t("welcome.dialog.new_body")}</span>
            </span>
          </button>

          <button type="button" className="pvbt-welcome-choice is-alt" onClick={onSignIn}>
            <span className="ic" aria-hidden="true">
              <svg width="17" height="17" viewBox="0 0 16 16" fill="none"
                   stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9.4 2.6h2.8a1.4 1.4 0 0 1 1.4 1.4v8a1.4 1.4 0 0 1-1.4 1.4H9.4M6.6 11 9.6 8 6.6 5M9.6 8H2.4" />
              </svg>
            </span>
            <span className="tx">
              <span className="t">{t("welcome.dialog.existing_title")}</span>
              <span className="d">{t("welcome.dialog.existing_body")}</span>
            </span>
          </button>
        </div>

        <div className="pvbt-welcome-later">
          <button type="button" onClick={onClose}>{t("welcome.dialog.close")}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
