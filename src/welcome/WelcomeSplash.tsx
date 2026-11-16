/**
 * Tela de entrada do PVBtCalc.
 *
 * Fundo branco, a curva de PVBt se desenhando no centro, título e uma frase.
 * Não avança sozinha: espera clique, Enter, espaço ou Esc. Quem decide se ela
 * aparece é o useWelcomeGate.
 */
import { useEffect, useRef } from "react";
import { useT } from "../i18n";
import "./WelcomeSplash.css";

interface Props {
  /** chamado quando o usuário dispensa a tela */
  onDismiss: () => void;
  /** classe de saída (fade) enquanto o gate troca para o diálogo */
  leaving?: boolean;
}

export default function WelcomeSplash({ onDismiss, leaving }: Props) {
  const { t } = useT();
  const ref = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    restoreFocus.current = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    return () => restoreFocus.current?.focus?.();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // o botão de idioma fica por cima da tela: Enter/espaço nele só troca o idioma
      if ((e.target as HTMLElement | null)?.closest?.("[data-lang-toggle]")) return;
      if (e.key === "Enter" || e.key === " " || e.key === "Escape") {
        e.preventDefault();
        onDismiss();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onDismiss]);

  return (
    <div
      className={leaving ? "pvbt-splash is-leaving" : "pvbt-splash"}
      ref={ref}
      role="button"
      tabIndex={0}
      aria-label={t("welcome.splash.dismiss")}
      onClick={onDismiss}
    >
      <figure className="pvbt-splash-fig">
        <svg viewBox="0 0 320 180" role="img" aria-label={t("welcome.splash.chart_alt")}>
          <line className="sp-axis" x1="42" y1="152" x2="300" y2="152" />
          <line className="sp-axis" x1="42" y1="18" x2="42" y2="152" />
          <text className="sp-tick" x="150" y="172">{t("welcome.splash.axis_x")}</text>
          <text className="sp-tick" x="20" y="96" transform="rotate(-90 20 96)">{t("welcome.splash.axis_y")}</text>

          {/* as duas curvas do logo: traço escuro e traço verde */}
          <path className="sp-curve sp-c1" d="M54 24 C84 116, 120 140, 162 136 C208 131, 254 108, 296 72" />
          <path className="sp-curve sp-c2" d="M60 44 C92 130, 128 150, 170 146 C214 142, 256 126, 296 100" />

          {/* ponto ótimo, com o rótulo acima para a linha-guia não cruzar nenhum traço */}
          <g className="sp-dot">
            <circle cx="162" cy="136" r="6.5" fill="#2F5FE0" opacity=".16" />
            <circle cx="162" cy="136" r="4" fill="#2F5FE0" stroke="#fff" strokeWidth="1.6" />
          </g>
          <g className="sp-lab">
            <line x1="162" y1="128" x2="162" y2="82" stroke="#C8D0DC" strokeWidth="1" />
            <text x="162" y="74" textAnchor="middle">{t("welcome.splash.optimum")}</text>
          </g>
        </svg>
      </figure>

      <div className="pvbt-splash-copy">
        <h1>
          {t("welcome.splash.title_lead")} <span>{t("welcome.product")}</span>
        </h1>
        <p>{t("welcome.splash.body")}</p>
      </div>

      <div className="pvbt-splash-go">{t("welcome.splash.dismiss")}</div>
    </div>
  );
}
