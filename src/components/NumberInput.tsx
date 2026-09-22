import { useState, type InputHTMLAttributes } from "react";
import { useT } from "../i18n";
import { editNumberInput, formatDecimal } from "../tools/parseDecimal";

interface NumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  value: number | string | null | undefined;
  // Called with the parsed number (null when the box is empty) — only when the
  // text is readable. Unreadable text is flagged in the box and not committed.
  onChange: (value: number | null, text: string) => void;
  // Every edit, readable or not, with the raw text. For fields that keep the text and
  // parse it when a button is pressed (the "+ add" lists), so stale values are never used.
  onText?: (text: string) => void;
}

// Text box that reads "0,15" and "0.15" in either language and displays numbers
// with the language's decimal mark. Replaces <input type="number">, whose accepted
// separator depends on the browser locale and silently yields "" for the other one.
export default function NumberInput({ value, onChange, onText, onBlur, style, title, ...rest }: NumberInputProps) {
  const { t, lang } = useT();
  const [draft, setDraft] = useState<string | null>(null);
  const edit = draft === null ? null : editNumberInput(draft);
  const invalid = edit?.invalid ?? false;

  return (
    <input
      {...rest}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={draft ?? formatDecimal(value, lang)}
      aria-invalid={invalid || undefined}
      title={invalid ? t("input.invalid_number") : title}
      style={invalid ? { ...style, borderColor: "#c0392b" } : style}
      onChange={(e) => {
        const next = editNumberInput(e.target.value);
        setDraft(next.draft);
        onText?.(next.draft);
        if (!next.invalid) onChange(next.value, next.draft);
      }}
      onBlur={(e) => {
        // Unreadable text stays on screen, flagged, instead of snapping back silently.
        if (!invalid) setDraft(null);
        onBlur?.(e);
      }}
    />
  );
}
