import React from 'react';
import { OrderStatus } from '../types/index.ts';
import { STATUS } from '../utils/format.ts';

export const StatusBadge: React.FC<{ status: OrderStatus; className?: string }> = ({ status, className = '' }) => (
  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-extrabold ${STATUS[status].badge} ${className}`}>
    <span className={`h-2 w-2 rounded-full ${STATUS[status].dot}`} />
    {STATUS[status].label}
  </span>
);

export const Empty: React.FC<{ emoji: string; title: string; hint?: string; children?: React.ReactNode }> = ({ emoji, title, hint, children }) => (
  <div className="card flex flex-col items-center gap-1 px-6 py-10 text-center">
    <span className="text-4xl">{emoji}</span>
    <p className="mt-1 text-base font-extrabold text-stone-900">{title}</p>
    {hint && <p className="text-sm text-stone-500">{hint}</p>}
    {children && <div className="mt-3">{children}</div>}
  </div>
);

export const Stepper: React.FC<{ value: number; onChange: (v: number) => void; min?: number; max?: number; label: string }> = ({ value, onChange, min = 0, max = 999, label }) => (
  <div className="flex items-center rounded-2xl border border-stone-300 bg-white" role="group" aria-label={label}>
    <button type="button" aria-label={`Less ${label}`} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))} className="flex h-12 w-12 items-center justify-center text-2xl font-bold text-stone-700 active:bg-stone-100 disabled:opacity-30">−</button>
    <span className="w-9 text-center text-lg font-extrabold tabular-nums">{value}</span>
    <button type="button" aria-label={`More ${label}`} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))} className="flex h-12 w-12 items-center justify-center text-2xl font-bold text-amber-800 active:bg-amber-50 disabled:opacity-30">+</button>
  </div>
);

export const Segmented: React.FC<{ options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }> = ({ options, value, onChange }) => (
  <div className="grid gap-1.5 rounded-2xl bg-stone-100 p-1.5" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0,1fr))` }}>
    {options.map((o) => (
      <button key={o.value} type="button" onClick={() => onChange(o.value)} aria-pressed={value === o.value}
        className={`min-h-11 rounded-xl px-2 text-sm font-bold transition ${value === o.value ? 'bg-white text-amber-900 shadow' : 'text-stone-600'}`}>
        {o.label}
      </button>
    ))}
  </div>
);
