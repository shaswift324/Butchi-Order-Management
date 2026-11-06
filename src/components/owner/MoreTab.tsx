import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext.tsx';
import { useToast } from '../../ui/Toast.tsx';
import { Confirm } from '../../ui/Confirm.tsx';
import { peso } from '../../utils/format.ts';
import { Truck, UserPlus, RotateCcw, Phone, ChevronRight, Clock, Smartphone } from 'lucide-react';

export const MoreTab: React.FC<{ onFees: () => void; onAddRider: () => void }> = ({ onFees, onAddRider }) => {
  const { state, resetData } = useStore();
  const toast = useToast();
  const [confirmReset, setConfirmReset] = useState(false);
  const p = state.storeProfile;

  const status = { available: 'Available', on_delivery: 'Delivering', offline: 'Offline' } as const;

  return (
    <div className="space-y-5">
      <section className="card px-4 py-4">
        <h2 className="text-lg font-extrabold text-stone-900">{p.name}</h2>
        <p className="text-sm text-stone-500">{p.address}</p>
        <div className="mt-3 space-y-1.5 text-[15px] text-stone-700">
          <p className="flex items-center gap-2"><Clock className="h-4 w-4 text-stone-400" /> {p.operatingHours}</p>
          <p className="flex items-center gap-2"><Smartphone className="h-4 w-4 text-stone-400" /> GCash {p.gcashNumber}</p>
        </div>
      </section>

      <button onClick={onFees} className="card flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left active:scale-[0.99]">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-100 text-orange-800"><Truck className="h-6 w-6" /></span>
        <span className="flex-1">
          <span className="block font-extrabold text-stone-900">Delivery fees</span>
          <span className="block text-sm text-stone-500">Standard {peso(p.defaultDeliveryFee)} · set price per town</span>
        </span>
        <ChevronRight className="h-5 w-5 text-stone-400" />
      </button>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base font-extrabold text-stone-900">Riders ({state.riders.length})</h2>
          <button className="btn-soft min-h-11" onClick={onAddRider}><UserPlus className="h-5 w-5" /> Add rider</button>
        </div>
        <ul className="space-y-2">
          {state.riders.map((r) => (
            <li key={r.id} className="card flex items-center gap-3 px-4 py-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-2xl">🛵</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-extrabold text-stone-900">{r.name}</p>
                <p className="text-sm text-stone-500">{status[r.status]} · {r.completedDeliveriesToday} done today</p>
                <p className="text-sm text-stone-500">{peso(r.totalCodCollectedToday)} cash collected</p>
              </div>
              {r.phone && (
                <a href={`tel:${r.phone}`} aria-label={`Call ${r.name}`} className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 active:scale-95"><Phone className="h-5 w-5" /></a>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="card px-4 py-4">
        <h2 className="font-extrabold text-stone-900">Sample data</h2>
        <p className="mb-3 text-sm text-stone-500">Everything is saved on this phone. Reset brings back the demo orders and menu.</p>
        <button className="btn-danger w-full" onClick={() => setConfirmReset(true)}><RotateCcw className="h-5 w-5" /> Reset to sample data</button>
      </section>

      {confirmReset && (
        <Confirm
          title="Reset everything?"
          message="All orders, menu changes and fees on this device go back to the sample data."
          confirmLabel="Yes, reset"
          onCancel={() => setConfirmReset(false)}
          onConfirm={() => { resetData(); setConfirmReset(false); toast('Sample data restored'); }}
        />
      )}
    </div>
  );
};
