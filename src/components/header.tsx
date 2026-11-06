import React from 'react';
import { useStore } from '../context/StoreContext.tsx';
import { Store, Bike } from 'lucide-react';
import { isActive } from '../utils/format.ts';

/** Slim top bar: who am I (Owner / Rider) – everything else lives in the bottom tabs. */
export const Header: React.FC = () => {
  const { state, activeRole, activeRiderId, setActiveRole, setActiveRiderId } = useStore();

  const activeCount = state.orders.filter(isActive).length;
  const riderCount = state.orders.filter((o) => o.assignedRiderId === activeRiderId && isActive(o)).length;

  const roleBtn = (role: 'owner' | 'rider', label: string, icon: React.ReactNode, count: number, on: string) => (
    <button
      onClick={() => setActiveRole(role)}
      aria-pressed={activeRole === role}
      className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-sm font-extrabold transition active:scale-95 ${
        activeRole === role ? `${on} text-white shadow` : 'text-stone-600'
      }`}
    >
      {icon}
      {label}
      {count > 0 && (
        <span className={`rounded-full px-2 py-0.5 text-xs font-extrabold ${activeRole === role ? 'bg-white/25 text-white' : 'bg-stone-300 text-stone-800'}`}>{count}</span>
      )}
    </button>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-2xl" aria-hidden>🥟</span>
          <span className="hidden font-['Playfair_Display',serif] text-xl font-bold text-stone-900 min-[400px]:block">Butchi</span>
        </div>

        <div className="flex flex-1 gap-1 rounded-2xl bg-stone-100 p-1" role="group" aria-label="Switch view">
          {roleBtn('owner', 'Owner', <Store className="h-4 w-4" />, activeCount, 'bg-amber-700')}
          {roleBtn('rider', 'Rider', <Bike className="h-4 w-4" />, riderCount, 'bg-orange-600')}
        </div>
      </div>

      {activeRole === 'rider' && (
        <div className="mx-auto flex max-w-6xl items-center gap-2 border-t border-orange-100 bg-orange-50 px-4 py-2">
          <label htmlFor="rider-pick" className="text-sm font-bold text-orange-900">Riding as</label>
          <select
            id="rider-pick"
            value={activeRiderId}
            onChange={(e) => setActiveRiderId(e.target.value)}
            className="min-h-11 flex-1 rounded-xl border border-orange-200 bg-white px-3 text-sm font-bold text-stone-900"
          >
            {state.riders.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
      )}
    </header>
  );
};
