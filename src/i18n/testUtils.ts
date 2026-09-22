import { createElement, type ReactElement } from "react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import type { Language } from "../redux/ui/slice";

// For server-render tests of components that call useT(): a minimal store whose only
// state is the interface language (the real slice touches localStorage at import).
export function withLang(element: ReactElement, lang: Language): ReactElement {
  const store = configureStore({ reducer: { ui: () => ({ language: lang, visibleChart: "A" }) } });
  return createElement(Provider, { store, children: element });
}
