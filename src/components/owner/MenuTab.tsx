import React from 'react';
import { useStore } from '../../context/StoreContext.tsx';
import { Product } from '../../types/index.ts';
import { Stepper, Empty } from '../../ui/bits.tsx';
import { peso } from '../../utils/format.ts';
import { Plus, Pencil } from 'lucide-react';

export const MenuTab: React.FC<{ onAdd: () => void; onEdit: (p: Product) => void }> = ({ onAdd, onEdit }) => {
  const { state, patchProduct } = useStore();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-stone-600">{state.products.length} items on your menu</p>
        <button className="btn-primary" onClick={onAdd}><Plus className="h-5 w-5" /> Add item</button>
      </div>

      {state.products.length === 0 && <Empty emoji="🥟" title="Your menu is empty" hint="Add your first item to start taking orders." />}

      {state.products.map((p) => (
        <article key={p.id} className={`card p-3 ${p.isAvailable ? '' : 'bg-stone-50'}`}>
          <button onClick={() => onEdit(p)} className="flex w-full items-center gap-3 text-left" aria-label={`Edit ${p.name}`}>
            <img src={p.imageUrl} alt="" loading="lazy" className={`h-16 w-16 shrink-0 rounded-2xl bg-stone-200 object-cover ${p.isAvailable ? '' : 'grayscale'}`} />
            <div className="min-w-0 flex-1">
              <h3 className="line-clamp-2 text-[15px] font-extrabold leading-snug text-stone-900">{p.name}</h3>
              <p className="text-sm text-stone-500">{peso(p.price)} · {p.unit}</p>
            </div>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-600"><Pencil className="h-5 w-5" /></span>
          </button>

          <div className="mt-3 flex items-end justify-between gap-3 border-t border-stone-100 pt-3">
            <div>
              <p className={`mb-1 text-sm font-bold ${p.stockQuantity <= 5 ? 'text-rose-700' : 'text-stone-500'}`}>{p.stockQuantity <= 5 ? 'Low stock' : 'In stock'}</p>
              <Stepper value={p.stockQuantity} onChange={(v) => patchProduct(p.id, { stockQuantity: v })} label={`${p.name} stock`} />
            </div>
            <button
              role="switch"
              aria-checked={p.isAvailable}
              onClick={() => patchProduct(p.id, { isAvailable: !p.isAvailable })}
              className={`flex min-h-12 items-center gap-2 whitespace-nowrap rounded-full px-3 text-sm font-extrabold ${p.isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'}`}
            >
              <span className={`relative h-6 w-10 shrink-0 rounded-full transition ${p.isAvailable ? 'bg-emerald-600' : 'bg-stone-400'}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${p.isAvailable ? 'left-[18px]' : 'left-0.5'}`} />
              </span>
              {p.isAvailable ? 'Available' : 'Sold out'}
            </button>
          </div>
        </article>
      ))}
    </div>
  );
};
