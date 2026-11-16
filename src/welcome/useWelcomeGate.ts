/**
 * Decide se a entrada aparece e em que ordem.
 *
 * Regra: só para quem chega sem sessão salva e sem e-mail lembrado neste navegador.
 * Quem fez logout mas tem o e-mail guardado vê o card de login na aba Sign in,
 * sem tela de entrada e sem diálogo.
 *
 * Ordem: splash  ->  (clique)  ->  diálogo  ->  (escolha)  ->  card de login.
 */
import { useCallback, useRef, useState } from "react";

export type WelcomeStage = "splash" | "dialog" | "done";
export type AuthTab = "signin" | "register";

interface Options {
  /** há sessão salva (refresh token) neste navegador? */
  hasSession: boolean;
  /** há e-mail lembrado de um acesso anterior neste navegador? */
  hasRememberedEmail: boolean;
  /** seleciona a aba do card de login */
  setAuthTab: (tab: AuthTab) => void;
  /** põe o foco no primeiro campo da aba escolhida */
  focusFirstField?: (tab: AuthTab) => void;
}

const LEAVE_MS = 480;
const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// "?intro" no endereço mostra a abertura mesmo para quem já entrou por este navegador.
const forcedByUrl = () =>
  typeof window !== "undefined" && new URLSearchParams(window.location.search).has("intro");

export function useWelcomeGate({ hasSession, hasRememberedEmail, setAuthTab, focusFirstField }: Options) {
  const firstVisit = forcedByUrl() || (!hasSession && !hasRememberedEmail);

  const [stage, setStage] = useState<WelcomeStage>(firstVisit ? "splash" : "done");
  const [leaving, setLeaving] = useState(false);
  const leavingRef = useRef(false);

  /* o splash não avança sozinho: nenhum timer de entrada aqui, de propósito */
  const dismissSplash = useCallback(() => {
    if (reducedMotion()) { setStage("dialog"); return; }
    if (leavingRef.current) return; // clique duplo durante o fade
    leavingRef.current = true;
    setLeaving(true);
    window.setTimeout(() => { leavingRef.current = false; setLeaving(false); setStage("dialog"); }, LEAVE_MS);
  }, []);

  const choose = useCallback((tab: AuthTab) => {
    setAuthTab(tab);
    setStage("done");
    // o foco vai para o campo depois que o diálogo desmonta (ele devolve o foco ao sair)
    window.setTimeout(() => focusFirstField?.(tab), 0);
  }, [setAuthTab, focusFirstField]);

  const chooseRegister = useCallback(() => choose("register"), [choose]);
  const chooseSignIn = useCallback(() => choose("signin"), [choose]);
  const closeDialog = useCallback(() => setStage("done"), []);
  /** mostra a abertura de novo (link "Ver apresentação" no login) */
  const replay = useCallback(() => setStage("splash"), []);

  return { stage, splashLeaving: leaving, dismissSplash, chooseRegister, chooseSignIn, closeDialog, replay };
}
