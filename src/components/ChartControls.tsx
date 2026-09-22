import { useT } from "../i18n";
import type { ReactNode } from "react";

export interface ChipItem {
  id: string;
  label: string;
  color?: string;
}

interface ChipProps {
  item: ChipItem;
  isActive: boolean;
  disableOff?: boolean;
  onToggle: (id: string) => void;
}

export function Chip({ item, isActive, disableOff, onToggle }: ChipProps) {
  const { t } = useT();
  const blocked = isActive && !!disableOff;
  const dotColor = item.color ?? '#1a73e8';
  return (
    <button
      type="button"
      aria-pressed={isActive}
      disabled={blocked}
      title={blocked ? t('chart.keep_one_visible') : undefined}
      onClick={() => onToggle(item.id)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        padding: '4px 10px', borderRadius: '999px',
        border: `1px solid ${isActive ? dotColor : '#d0d5dd'}`,
        background: isActive ? `${dotColor}1f` : '#f5f6f8',
        color: isActive ? '#1f2937' : '#8a94a3',
        opacity: isActive ? 1 : 0.55,
        cursor: blocked ? 'not-allowed' : 'pointer',
        fontSize: '12px', lineHeight: 1.4, fontFamily: 'inherit',
        transition: 'opacity 0.15s ease, background 0.15s ease',
      }}
    >
      <span
        aria-hidden="true"
        style={{ width: '9px', height: '9px', borderRadius: '50%', background: dotColor, display: 'inline-block', flexShrink: 0 }}
      />
      {item.label}
    </button>
  );
}

interface ChipRowProps {
  legendLabel: string;
  items: ChipItem[];
  active: Set<string>;
  onToggle: (id: string) => void;
  extra?: ReactNode;
}

export function ChipRow({ legendLabel, items, active, onToggle, extra }: ChipRowProps) {
  if (items.length === 0 && !extra) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '12px' }}>
      <span style={{ fontWeight: 600, color: '#5b6572', minWidth: '78px' }}>{legendLabel}</span>
      {items.map((item) => (
        <Chip
          key={item.id}
          item={item}
          isActive={active.has(item.id)}
          disableOff={items.length > 1 && active.size <= 1}
          onToggle={onToggle}
        />
      ))}
      {extra}
    </div>
  );
}

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  preview?: 'solid' | 'dashed';
}

interface SegmentedControlProps<T extends string> {
  legendLabel: string;
  options: SegmentedOption<T>[];
  value: T;
  onChange: (v: T) => void;
}

export function SegmentedControl<T extends string>({ legendLabel, options, value, onChange }: SegmentedControlProps<T>) {
  const focus = (i: number) => {
    const el = document.getElementById(`seg-${legendLabel}-${options[i].value}`);
    el?.focus();
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
      <span style={{ fontWeight: 600, color: '#5b6572', minWidth: '78px' }}>{legendLabel}</span>
      <div role="radiogroup" aria-label={legendLabel} style={{ display: 'inline-flex', border: '1px solid #d0d5dd', borderRadius: '7px', overflow: 'hidden' }}>
        {options.map((opt, i) => {
          const isActive = value === opt.value;
          return (
            <button
              key={opt.value}
              id={`seg-${legendLabel}-${opt.value}`}
              type="button"
              role="radio"
              aria-checked={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange(opt.value)}
              onKeyDown={(e) => {
                if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
                e.preventDefault();
                const dir = e.key === 'ArrowRight' ? 1 : -1;
                const nextIdx = (i + dir + options.length) % options.length;
                onChange(options[nextIdx].value);
                focus(nextIdx);
              }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '4px 12px', border: 'none',
                borderLeft: i > 0 ? '1px solid #d0d5dd' : 'none',
                background: isActive ? '#1a73e8' : '#fff',
                color: isActive ? '#fff' : '#444',
                cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit',
              }}
            >
              {opt.preview && (
                <svg width="16" height="8" aria-hidden="true" style={{ flexShrink: 0 }}>
                  <line
                    x1="0" y1="4" x2="16" y2="4"
                    stroke={isActive ? '#fff' : '#444'} strokeWidth={2}
                    strokeDasharray={opt.preview === 'dashed' ? '4,3' : undefined}
                  />
                </svg>
              )}
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function toggleInSet<T>(set: Set<T>, item: T): Set<T> {
  const next = new Set(set);
  if (next.has(item)) {
    if (next.size <= 1) return set;
    next.delete(item);
  } else {
    next.add(item);
  }
  return next;
}
