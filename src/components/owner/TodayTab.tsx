import React, { useMemo } from 'react';
import { useStore } from '../../context/StoreContext.tsx';
import { isActive, needsCollection, peso, shortPlace } from '../../utils/format.ts';
import { StatusBadge } from '../../ui/bits.tsx';
import { ChevronRight, AlertTriangle, PackageX } from 'lucide-react';
import { OrderFilter } from './OrdersTab.tsx';

export const TodayTab: React.FC<{ openOrders: (f: OrderFilter, search?: string) => void; openMenu: () => void }> = ({ openOrders, openMenu }) => {
  const { state } = useStore();

  const data = useMemo(() => {
    const active = state.orders.filter(isActive);
    const delivered = state.orders.filter((o) => o.status === 'delivered');
    const attention = active.filter((o) =>
      o.status === 'pending' || ((o.status === 'preparing' || o.status === 'ready_for_delivery') && !o.assignedRiderId)
    );
    const areas = new Map<string, { count: number; total: number }>();
    active.forEach((o) => {
      const k = shortPlace(o.deliveryAddress);
      const cur = areas.get(k) ?? { count: 0, total: 0 };
      areas.set(k, { count: cur.count + 1, total: cur.total + o.totalAmount });
    });
    return {
      active, attention,
      sales: delivered.reduce((s, o) => s + o.totalAmount, 0),
      deliveredCount: delivered.length,
      cashToCollect: active.filter(needsCollection).reduce((s, o) => s + o.totalAmount, 0),
      areas: [...areas.entries()].sort((a, b) => b[1].count - a[1].count),
    };
  }, [state.orders]);

  const lowStock = state.products.filter((p) => !p.isAvailable || p.stockQuantity <= 5);

  const tile = (label: string, value: string, tint: string, onClick?: () => void) => (
    <button onClick={onClick} className={`card flex min-h-[92px] flex-col items-start justify-center px-4 py-3 text-left active:scale-[0.98] ${tint}`}>
      <span className="text-sm font-bold text-stone-600">{label}</span>
      <span className="mt-1 text-2xl font-extrabold tabular-nums text-stone-900">{value}</span>
    </button>
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tile('To deliver', String(data.active.length), 'bg-amber-50', () => openOrders('active'))}
        {tile('Delivered', String(data.deliveredCount), 'bg-emerald-50', () => openOrders('done'))}
        {tile('Sales so far', peso(data.sales), 'bg-white')}
        {tile('Cash to collect', peso(data.cashToCollect), 'bg-sky-50')}
      </div>

      <section>
        <h2 className="mb-2 flex items-center gap-2 text-base font-extrabold text-stone-900">
          <AlertTriangle className="h-5 w-5 text-rose-600" /> Needs you now
        </h2>
        {data.attention.length === 0 ? (
          <div className="card px-4 py-4 text-[15px] text-stone-600">✅ Nothing waiting on you.</div>
        ) : (
          <ul className="space-y-2">
            {data.attention.map((o) => (
              <li key={o.id}>
                <button onClick={() => openOrders(o.status === 'pending' ? 'new' : 'road')} className="card flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left active:scale-[0.99]">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-extrabold text-stone-900">{o.customerName}</p>
                    <p className="truncate text-sm text-stone-500">{o.status === 'pending' ? 'New order – start preparing' : 'Ready to dispatch – assign a rider'} · {shortPlace(o.deliveryAddress)}</p>
                  </div>
                  <StatusBadge status={o.status} />
                  <ChevronRight className="h-5 w-5 shrink-0 text-stone-400" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-base font-extrabold text-stone-900">Deliveries by area</h2>
        {data.areas.length === 0 ? (
          <div className="card px-4 py-4 text-[15px] text-stone-600">No active deliveries.</div>
        ) : (
          <ul className="card divide-y divide-stone-100 overflow-hidden">
            {data.areas.map(([area, v]) => (
              <li key={area}>
                <button onClick={() => openOrders('active', area.split(',')[0])} className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left active:bg-stone-50">
                  <span className="min-w-0 flex-1 break-words font-bold leading-snug text-stone-800">{area}</span>
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-sm font-extrabold text-amber-900">{v.count}</span>
                  <span className="text-right text-sm font-bold tabular-nums text-stone-600">{peso(v.total)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {lowStock.length > 0 && (
        <section>
          <h2 className="mb-2 flex items-center gap-2 text-base font-extrabold text-stone-900">
            <PackageX className="h-5 w-5 text-amber-700" /> Low or sold out
          </h2>
          <button onClick={openMenu} className="card flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left active:scale-[0.99]">
            <span className="flex-1 text-[15px] text-stone-700">
              {lowStock.slice(0, 3).map((p) => p.name.replace(/\s*\(.*\)/, '')).join(', ')}
              {lowStock.length > 3 ? ` +${lowStock.length - 3} more` : ''}
            </span>
            <ChevronRight className="h-5 w-5 text-stone-400" />
          </button>
        </section>
      )}
    </div>
  );
};
