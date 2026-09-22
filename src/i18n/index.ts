import { useCallback } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../redux/store";
import type { Language } from "../redux/ui/slice";
import { en } from "./en";
import { pt } from "./pt";

export type TKey = keyof typeof en;
export type TParams = Record<string, string | number>;
export type TFn = (key: TKey, params?: TParams) => string;

const TABLES: Record<Language, Record<TKey, string>> = { en, pt };

// "{name}" placeholders; an unknown placeholder is left visible instead of throwing.
export function translate(lang: Language, key: TKey, params?: TParams): string {
  const raw = TABLES[lang][key];
  if (!params) return raw;
  return raw.replace(/\{(\w+)\}/g, (m, name) => (name in params ? String(params[name]) : m));
}

export function makeT(lang: Language): TFn {
  return (key, params) => translate(lang, key, params);
}

export function useT(): { t: TFn; lang: Language } {
  const lang = useSelector((state: RootState) => state.ui.language);
  const t = useCallback<TFn>((key, params) => translate(lang, key, params), [lang]);
  return { t, lang };
}

// Some state (e.g. an analysis error) holds either a dictionary key, set by our own code,
// or free text from the server. Keys are translated; anything else is shown as received.
export function translateIfKey(t: TFn, text: string): string {
  // "key" or "key?{json params}"
  const q = text.indexOf("?");
  const key = q < 0 ? text : text.slice(0, q);
  if (!Object.prototype.hasOwnProperty.call(en, key)) return text;
  let params: TParams | undefined;
  if (q >= 0) {
    try { params = JSON.parse(text.slice(q + 1)); } catch { return text; }
  }
  return t(key as TKey, params);
}
