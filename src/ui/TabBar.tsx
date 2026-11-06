import React from 'react';

export interface TabDef<T extends string> { id: T; label: string; icon: React.ReactNode; badge?: number }

/** Thumb-reach navigation pinned to the bottom of the screen. */
export function TabBar<T extends string>({ tabs, active, onChange, tone = 'amber' }: {
  tabs: TabDef<T>[]; active: T; onChange: (id: T) => void; tone?: 'amber' | 'orange';
}) {
  const on = tone === 'amber' ? 'text-amber-800 bg-amber-100' : 'text-orange-800 bg-orange-100';
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 backdrop-blur pb-[var(--safe-bottom)] md:inset-x-auto md:bottom-4 md:left-1/2 md:-translate-x-1/2 md:rounded-3xl md:border md:shadow-xl">
      <ul className="mx-auto flex max-w-lg items-stretch justify-around gap-1 px-2 py-1.5 md:gap-2">
        {tabs.map((t) => {
          const sel = t.id === active;
          return (
            <li key={t.id} className="flex-1 md:min-w-[96px]">
              <button
                onClick={() => onChange(t.id)}
                aria-current={sel ? 'page' : undefined}
                className={`relative flex min-h-[56px] w-full flex-col items-center justify-center gap-0.5 rounded-2xl text-[12px] font-bold transition active:scale-95 ${sel ? on : 'text-stone-500 hover:bg-stone-100'}`}
              >
                <span className="relative [&>svg]:h-6 [&>svg]:w-6">
                  {t.icon}
                  {!!t.badge && t.badge > 0 && (
                    <span className="absolute -right-2.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-600 px-1 text-xs font-extrabold leading-none text-white">{t.badge}</span>
                  )}
                </span>
                {t.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
