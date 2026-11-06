import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext.tsx';
import { useToast } from '../../ui/Toast.tsx';
import { Sheet } from '../../ui/Sheet.tsx';
import { Stepper } from '../../ui/bits.tsx';

const TOWNS = ['Malolos City', 'Guiguinto', 'Plaridel', 'Balagtas', 'Bocaue', 'Santa Maria', 'Marilao', 'Baliwag'];

export const DeliveryFeeModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { state, updateStoreProfile } = useStore();
  const toast = useToast();
  const [baseFee, setBaseFee] = useState<number>(state.storeProfile.defaultDeliveryFee ?? 50);
  const [fees, setFees] = useState<Record<string, number>>(() => {
    const saved = state.storeProfile.townDeliveryFees ?? {};
    return Object.fromEntries(TOWNS.map((t) => [t, saved[t] ?? state.storeProfile.defaultDeliveryFee ?? 50]));
  });

  const save = async () => {
    await updateStoreProfile({ defaultDeliveryFee: baseFee, townDeliveryFees: fees });
    toast('Delivery fees saved');
    onClose();
  };

  return (
    <Sheet title="Delivery fees" subtitle="Applied automatically when you pick a town" onClose={onClose}
      footer={<div className="grid grid-cols-2 gap-3"><button className="btn-soft btn-big" onClick={onClose}>Cancel</button><button className="btn-primary btn-big" onClick={save}>Save fees</button></div>}>
      <div className="space-y-5">
        <div className="rounded-3xl bg-orange-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-extrabold text-stone-900">Standard fee</p>
              <p className="text-sm text-stone-500">Used when no town is picked</p>
            </div>
            <Stepper label="standard fee" value={baseFee} onChange={setBaseFee} />
          </div>
          <button type="button" className="mt-3 min-h-11 w-full rounded-2xl border border-orange-300 bg-white text-sm font-extrabold text-orange-900 active:scale-[0.98]"
            onClick={() => setFees(Object.fromEntries(TOWNS.map((t) => [t, baseFee])))}>
            Use ₱{baseFee} for every town
          </button>
        </div>

        <ul className="space-y-2">
          {TOWNS.map((t) => (
            <li key={t} className="flex items-center justify-between gap-3 rounded-2xl border border-stone-200 px-3 py-2">
              <span className="font-bold text-stone-800">{t}</span>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-stone-400">₱</span>
                <input type="number" inputMode="numeric" min={0} step={5} aria-label={`${t} fee`} value={fees[t]} onChange={(e) => setFees({ ...fees, [t]: Math.max(0, Number(e.target.value)) })}
                  className="field !w-24 text-right text-lg font-extrabold" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Sheet>
  );
};
