import React, { useMemo, useState } from 'react';
import { useStore } from '../../context/StoreContext.tsx';
import { Order } from '../../types/index.ts';
import { OrderCard } from './OrderCard.tsx';
import { Empty } from '../../ui/bits.tsx';
import { Search, X, Plus, CheckSquare, Download, Truck, ClipboardList } from 'lucide-react';
import { useToast } from '../../ui/Toast.tsx';

export type OrderFilter = 'active' | 'new' | 'kitchen' | 'road' | 'done';

const FILTERS: { id: OrderFilter; label: string; test: (o: Order) => boolean }[] = [
  { id: 'active', label: 'Active', test: (o) => o.status !== 'delivered' && o.status !== 'cancelled' },
  { id: 'new', label: 'New', test: (o) => o.status === 'pending' },
  { id: 'kitchen', label: 'Kitchen', test: (o) => o.status === 'pending' || o.status === 'confirmed' || o.status === 'preparing' },
  { id: 'road', label: 'On the road', test: (o) => o.status === 'ready_for_delivery' || o.status === 'out_for_delivery' },
  { id: 'done', label: 'Done', test: (o) => o.status === 'delivered' || o.status === 'cancelled' },
];

export const OrdersTab: React.FC<{
  filter: OrderFilter; setFilter: (f: OrderFilter) => void;
  search: string; setSearch: (s: string) => void; onNewOrder: () => void;
}> = ({ filter, setFilter, search, setSearch, onNewOrder }) => {
  const { state, updateOrderStatus } = useStore();
  const toast = useToast();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dispatching, setDispatching] = useState(false);

  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f.id, state.orders.filter(f.test).length])) as Record<OrderFilter, number>,
    [state.orders]
  );

  const shown = useMemo(() => {
    const text = search.trim().toLowerCase();
    const test = FILTERS.find((f) => f.id === filter)!.test;
    return state.orders
      .filter(test)
      .filter((o) => !text || [o.customerName, o.orderNumber, o.deliveryAddress, o.customerPhone].some((v) => v.toLowerCase().includes(text)))
      .sort((a, b) => (filter === 'done' ? b.createdAt.localeCompare(a.createdAt) : a.createdAt.localeCompare(b.createdAt)));
  }, [state.orders, filter, search]);

  // Only prepared orders with an assigned rider can be bulk-dispatched.
  const eligibleToDispatch = shown.filter((o) => o.status === 'preparing' && Boolean(o.assignedRiderId));
  const selectedEligible = selectedIds.filter((id) => eligibleToDispatch.some((o) => o.id === id));
  const allEligibleSelected = eligibleToDispatch.length > 0 && eligibleToDispatch.every((o) => selectedIds.includes(o.id));
  const summary = useMemo(() => ({
    total: state.orders.filter((o) => o.status !== 'cancelled').length,
    preparing: state.orders.filter((o) => o.status === 'preparing').length,
    onTheWay: state.orders.filter((o) => o.status === 'out_for_delivery').length,
    delivered: state.orders.filter((o) => o.status === 'delivered').length,
    sales: state.orders.filter((o) => o.status === 'delivered').reduce((sum, o) => sum + o.totalAmount, 0),
  }), [state.orders]);

  const toggleSelected = (id: string) => setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const toggleAllEligible = () => setSelectedIds((prev) => allEligibleSelected
    ? prev.filter((id) => !eligibleToDispatch.some((o) => o.id === id))
    : [...new Set([...prev, ...eligibleToDispatch.map((o) => o.id)])]);

  const bulkDispatch = async () => {
    const targets = eligibleToDispatch.filter((o) => selectedEligible.includes(o.id));
    if (!targets.length || dispatching) return;
    setDispatching(true);
    let completed = 0;
    try {
      for (const order of targets) {
        await updateOrderStatus(order.id, 'out_for_delivery');
        completed += 1;
      }
      setSelectedIds((prev) => prev.filter((id) => !targets.some((o) => o.id === id)));
      toast(`${completed} order${completed === 1 ? '' : 's'} marked Out for Delivery`);
    } catch (error) {
      toast(error instanceof Error ? error.message : `Updated ${completed} order(s); some could not be dispatched.`, 'warn');
    } finally {
      setDispatching(false);
    }
  };

  const exportCsv = () => {
    const rows = [
      ['Order Number', 'Customer', 'Phone', 'Items', 'Rider', 'Status', 'Payment Method', 'Total Amount'],
      ...shown.map((o) => [o.orderNumber, o.customerName, o.customerPhone, o.items.map((i) => `${i.quantity}x ${i.name}`).join('; '), o.assignedRiderName ?? '', o.status.replace(/_/g, ' '), o.paymentMethod, o.totalAmount.toFixed(2)]),
    ];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `butchu-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
        <input
          type="search"
          inputMode="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, phone or town"
          aria-label="Search orders"
          className="field pl-11 pr-12"
        />
        {search && (
          <button onClick={() => setSearch('')} aria-label="Clear search" className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-stone-500">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <section className="space-y-3" aria-label="Order summary">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-base font-extrabold text-stone-900"><ClipboardList className="h-5 w-5 text-amber-700" /> Order summary</h2>
          <button type="button" onClick={exportCsv} className="btn-soft min-h-10 px-3 text-sm"><Download className="h-4 w-4" /> Export CSV</button>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {[
            ['Total orders', summary.total, 'bg-stone-50'],
            ['Preparing', summary.preparing, 'bg-amber-50'],
            ['Out for delivery', summary.onTheWay, 'bg-sky-50'],
            ['Delivered', summary.delivered, 'bg-emerald-50'],
            ['Sales', `₱${summary.sales.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'bg-white'],
          ].map(([label, value, tint]) => (
            <div key={String(label)} className={`card min-w-0 px-3 py-3 ${tint}`}>
              <p className="text-xs font-bold text-stone-500">{label}</p>
              <p className="mt-1 truncate text-xl font-extrabold tabular-nums text-stone-900">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card overflow-hidden" aria-label="Bulk delivery selection">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-4 py-3">
          <div className="min-w-0">
            <h3 className="font-extrabold text-stone-900">Select orders to deliver</h3>
            <p className="text-xs text-stone-500">Only Preparing orders with an assigned rider can be selected.</p>
          </div>
          <button type="button" onClick={toggleAllEligible} disabled={!eligibleToDispatch.length} className="btn-soft min-h-10 px-3 text-sm disabled:opacity-40">
            <CheckSquare className="h-4 w-4" /> {allEligibleSelected ? 'Clear all' : 'Select all to deliver'}
          </button>
        </div>
        {eligibleToDispatch.length === 0 ? (
          <p className="px-4 py-4 text-sm text-stone-500">No orders are ready for bulk dispatch in this view. Assign a rider to a Preparing order first.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                <tr><th className="w-12 px-4 py-3"><span className="sr-only">Select</span></th><th className="px-3 py-3">Order</th><th className="px-3 py-3">Customer</th><th className="px-3 py-3">Rider</th><th className="px-3 py-3 text-right">Amount</th></tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {eligibleToDispatch.map((o) => (
                  <tr key={o.id} className={selectedIds.includes(o.id) ? 'bg-amber-50/70' : 'hover:bg-stone-50'}>
                    <td className="px-4 py-3"><input type="checkbox" aria-label={`Select order ${o.orderNumber}`} checked={selectedIds.includes(o.id)} onChange={() => toggleSelected(o.id)} className="h-4 w-4 accent-amber-700" /></td>
                    <td className="px-3 py-3 font-bold text-stone-800">{o.orderNumber}</td>
                    <td className="px-3 py-3"><div className="font-semibold text-stone-800">{o.customerName}</div><div className="text-xs text-stone-500">{o.items.reduce((sum, item) => sum + item.quantity, 0)} item(s)</div></td>
                    <td className="px-3 py-3 text-stone-600">{o.assignedRiderName ?? 'Assigned rider'}</td>
                    <td className="px-3 py-3 text-right font-bold tabular-nums text-stone-800">₱{o.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 bg-stone-50 px-4 py-3">
          <p className="text-sm font-semibold text-stone-600">{selectedEligible.length} selected · {eligibleToDispatch.length} eligible</p>
          <button type="button" onClick={bulkDispatch} disabled={!selectedEligible.length || dispatching} className="btn-primary min-h-11 px-4 disabled:opacity-40">
            <Truck className="h-4 w-4" /> {dispatching ? 'Dispatching…' : `Mark ${selectedEligible.length || ''} Out for Delivery`}
          </button>
        </div>
      </section>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar" role="tablist" aria-label="Order filter">
        {FILTERS.map((f) => (
          <button key={f.id} role="tab" aria-selected={filter === f.id} onClick={() => setFilter(f.id)} className={`chip ${filter === f.id ? 'chip-on' : ''}`}>
            {f.label}
            <span className={`rounded-full px-1.5 text-xs font-extrabold ${filter === f.id ? 'bg-white/25' : 'bg-stone-200'}`}>{counts[f.id]}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        search ? (
          <Empty emoji="🔍" title="No orders match" hint={`Nothing for “${search}”.`}>
            <button className="btn-soft" onClick={() => setSearch('')}>Clear search</button>
          </Empty>
        ) : filter === 'active' ? (
          <Empty emoji="🎉" title="All caught up" hint="No active orders right now.">
            <button className="btn-primary" onClick={onNewOrder}><Plus className="h-5 w-5" /> Record an order</button>
          </Empty>
        ) : (
          <Empty emoji="📭" title="Nothing here" hint="No orders in this group." />
        )
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {shown.map((o) => <OrderCard key={o.id} order={o} />)}
        </div>
      )}

    </div>
  );
};
