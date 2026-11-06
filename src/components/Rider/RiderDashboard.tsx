import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../../context/StoreContext.tsx';
import { Order } from '../../types/index.ts';
import { DeliveryMap } from '../map/DeliveryMap.tsx';
import { TabBar } from '../../ui/TabBar.tsx';
import { Sheet } from '../../ui/Sheet.tsx';
import { Empty, StatusBadge } from '../../ui/bits.tsx';
import { useToast } from '../../ui/Toast.tsx';
import { estimateRoadDistance, estimateTravelTimeMinutes, getGoogleMapsNavigationUrl, formatDistance } from '../../utils/geo.ts';
import { clock, needsCollection, paymentText, peso, shortPlace } from '../../utils/format.ts';
import { Navigation, Phone, MessageSquare, Check, Package, ListOrdered, Map as MapIcon, UserRound, LocateFixed, Play, RotateCcw, ChevronRight, Banknote, Landmark, ChevronDown } from 'lucide-react';

type Tab = 'now' | 'stops' | 'map' | 'me';

interface Stop { order: Order; distanceKm: number; mins: number; ready: boolean }

export const RiderDashboard: React.FC = () => {
  const { state, activeRiderId, currentRider, updateOrderStatus, collectCodPayment, updateRiderLocation } = useStore();
  const toast = useToast();

  const [tab, setTab] = useState<Tab>('now');
  const [override, setOverride] = useState<string | null>(null);
  const [gps, setGps] = useState(false);
  const [cashFor, setCashFor] = useState<Order | null>(null);
  const [showItems, setShowItems] = useState(false);
  const [busy, setBusy] = useState(false);

  const mine = useMemo(
    () => state.orders.filter((o) => o.assignedRiderId === activeRiderId && (o.status === 'out_for_delivery' || o.status === 'delivered')),
    [state.orders, activeRiderId]
  );
  const pending = useMemo(() => mine.filter((o) => o.status === 'out_for_delivery'), [mine]);
  const done = useMemo(() => mine.filter((o) => o.status === 'delivered'), [mine]);

  const here = currentRider?.currentLocation
    ? { lat: currentRider.currentLocation.lat, lng: currentRider.currentLocation.lng }
    : state.storeProfile.location;

  const stops: Stop[] = useMemo(
    () =>
      pending
        .map((order) => {
          const distanceKm = estimateRoadDistance(here, order.location);
          return { order, distanceKm, mins: estimateTravelTimeMinutes(distanceKm), ready: order.status === 'out_for_delivery' };
        })
        // ready orders first, then nearest
        .sort((a, b) => Number(b.ready) - Number(a.ready) || a.distanceKm - b.distanceKm),
    [pending, here.lat, here.lng]
  );

  const next = stops.find((s) => s.order.id === override) ?? stops[0] ?? null;
  const suggested = stops[0] ?? null;
  const rest = next ? stops.filter((s) => s.order.id !== next.order.id) : [];

  // Live GPS – callback kept in a ref so the watcher isn't torn down on every state change
  const updateRef = useRef(updateRiderLocation);
  updateRef.current = updateRiderLocation;
  useEffect(() => {
    if (!gps) return;
    if (!('geolocation' in navigator)) { toast('This phone has no GPS available', 'warn'); setGps(false); return; }
    const id = navigator.geolocation.watchPosition(
      (p) => updateRef.current(activeRiderId, p.coords.latitude, p.coords.longitude, true),
      () => { toast('Couldn’t get your location. Check phone permissions.', 'warn'); setGps(false); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [gps, activeRiderId]);

  const finish = async (o: Order, amount?: number) => {
    setBusy(true);
    setCashFor(null);
    setOverride(null);
    setTab('now');
    try {
      await updateOrderStatus(o.id, 'delivered');
      if (amount !== undefined) await collectCodPayment(o.id, amount);
      toast(`Delivered to ${o.customerName.split(' ')[0]} ✓`);
    } finally { setBusy(false); }
  };

  const goTo = (id: string) => { setOverride(id); setTab('now'); window.scrollTo({ top: 0 }); };

  const simulate = () => {
    if (!next) return;
    updateRiderLocation(activeRiderId, here.lat + (next.order.location.lat - here.lat) * 0.7, here.lng + (next.order.location.lng - here.lng) * 0.7, true);
    toast('Moved closer to the next stop');
  };

  const cash = currentRider?.totalCodCollectedToday ?? 0;

  return (
    <>
      {/* Always-visible progress strip */}
      <div className="mb-3 grid grid-cols-3 gap-2 text-center">
        {[
          ['Left', String(pending.length)],
          ['Done', String(done.length)],
          ['Cash', peso(cash)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-orange-200 bg-white py-2">
            <p className="text-xs font-bold uppercase tracking-wide text-orange-800">{k}</p>
            <p className="text-lg font-extrabold tabular-nums text-stone-900">{v}</p>
          </div>
        ))}
      </div>

      {tab === 'now' && (
        next ? (
          <NextStop
            stop={next}
            here={here}
            isOverride={!!override && override !== suggested?.order.id}
            onResetOverride={() => setOverride(null)}
            showItems={showItems}
            setShowItems={setShowItems}
          />
        ) : (
          <div className="card space-y-2 bg-emerald-50 px-6 py-10 text-center">
            <p className="text-5xl">🎉</p>
            <h2 className="text-xl font-extrabold text-emerald-950">All done!</h2>
            <p className="text-[15px] text-emerald-900">{done.length} deliveries · {peso(cash)} cash collected today.</p>
            <p className="text-sm text-emerald-800">New orders will appear here when the owner assigns them to you.</p>
          </div>
        )
      )}

      {tab === 'stops' && (
        <div className="space-y-3">
          {stops.length === 0 ? <Empty emoji="📭" title="No stops right now" hint="You're all caught up." /> : (
            <ul className="space-y-2.5">
              {stops.map((s, i) => {
                const isNext = s.order.id === next?.order.id;
                return (
                  <li key={s.order.id}>
                    <button onClick={() => goTo(s.order.id)} className={`card flex w-full items-center gap-3 p-3.5 text-left active:scale-[0.99] ${isNext ? 'border-2 border-orange-500' : ''}`}>
                      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-extrabold ${isNext ? 'bg-orange-600 text-white' : 'bg-stone-100 text-stone-700'}`}>{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-extrabold text-stone-900">{s.order.customerName}</p>
                        <p className="truncate text-sm text-stone-500">{shortPlace(s.order.deliveryAddress)}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                          <StatusBadge status={s.order.status} />
                          <span className="text-sm font-bold text-stone-600">{formatDistance(s.distanceKm)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-extrabold tabular-nums text-stone-900">{peso(s.order.totalAmount)}</p>
                        <p className={`text-xs font-bold ${needsCollection(s.order) ? 'text-amber-800' : 'text-emerald-700'}`}>{needsCollection(s.order) ? 'COD' : 'Paid'}</p>
                      </div>
                      <ChevronRight className="h-5 w-5 shrink-0 text-stone-400" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {done.length > 0 && (
            <section className="pt-2">
              <h2 className="mb-2 text-base font-extrabold text-stone-900">Delivered today ({done.length})</h2>
              <ul className="card divide-y divide-stone-100 overflow-hidden">
                {done.map((o) => (
                  <li key={o.id} className="flex items-center gap-3 px-4 py-3">
                    <Check className="h-5 w-5 shrink-0 text-emerald-600" />
                    <span className="min-w-0 flex-1 truncate font-bold text-stone-800">{o.customerName}</span>
                    <span className="text-sm text-stone-500">{o.deliveredAt ? clock(o.deliveredAt) : ''}</span>
                    <span className="w-16 text-right font-bold tabular-nums">{peso(o.totalAmount)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {tab === 'map' && (
        <DeliveryMap orders={pending} rider={currentRider} storeProfile={state.storeProfile} recommendedOrder={next?.order} heightClass="h-[calc(100dvh-24rem)] min-h-[320px]" />
      )}

      {tab === 'me' && (
        <div className="space-y-4">
          <div className="card flex items-center gap-3 px-4 py-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500 text-3xl">🛵</span>
            <div className="min-w-0">
              <p className="truncate text-lg font-extrabold">{currentRider?.name}</p>
              <p className="truncate text-sm text-stone-500">{currentRider?.vehicle}</p>
            </div>
          </div>

          <button role="switch" aria-checked={gps} onClick={() => setGps(!gps)}
            className={`card flex min-h-[72px] w-full items-center gap-3 px-4 py-3 text-left ${gps ? 'border-emerald-500 bg-emerald-50' : ''}`}>
            <LocateFixed className={`h-7 w-7 ${gps ? 'text-emerald-700' : 'text-stone-400'}`} />
            <span className="flex-1">
              <span className="block font-extrabold text-stone-900">Share my live location</span>
              <span className="block text-sm text-stone-500">{gps ? 'On – the owner and map can see where you are' : 'Off – tap to turn on phone GPS'}</span>
            </span>
            <span className={`relative h-7 w-12 rounded-full ${gps ? 'bg-emerald-600' : 'bg-stone-300'}`}>
              <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-all ${gps ? 'left-[22px]' : 'left-0.5'}`} />
            </span>
          </button>

          <a href={`tel:${state.storeProfile.phone.match(/\(?(0\d{3}[-\d]+)\)?$/)?.[1] ?? state.storeProfile.phone}`} className="btn-soft btn-big w-full"><Phone className="h-5 w-5 text-emerald-700" /> Call the kitchen</a>

          <details className="card px-4 py-3">
            <summary className="flex min-h-11 cursor-pointer items-center justify-between font-bold text-stone-600">Testing tools <ChevronDown className="h-5 w-5" /></summary>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button className="btn-soft" disabled={!next} onClick={simulate}><Play className="h-4 w-4" /> Simulate drive</button>
              <button className="btn-soft" onClick={() => { updateRiderLocation(activeRiderId, state.storeProfile.location.lat, state.storeProfile.location.lng, false); toast('Position reset to the kitchen'); }}><RotateCcw className="h-4 w-4" /> Back to kitchen</button>
            </div>
          </details>
        </div>
      )}

      {/* One big button for the one thing to do next */}
      {tab === 'now' && next && (
        <div className="fixed inset-x-0 bottom-[calc(4.75rem+var(--safe-bottom))] z-30 px-4 md:bottom-28">
          <div className="mx-auto max-w-3xl rounded-3xl bg-white/95 p-2 shadow-2xl ring-1 ring-stone-200 backdrop-blur">
            {needsCollection(next.order) ? (
              <button className="btn-go btn-big w-full" disabled={busy} onClick={() => setCashFor(next.order)}>
                <Banknote className="h-6 w-6" /> Arrived – collect {peso(next.order.totalAmount)}
              </button>
            ) : (
              <button className="btn-go btn-big w-full" disabled={busy} onClick={() => finish(next.order)}>
                <Check className="h-6 w-6" /> Mark as delivered
              </button>
            )}
          </div>
        </div>
      )}

      <TabBar<Tab>
        tone="orange"
        active={tab}
        onChange={(t) => { setTab(t); window.scrollTo({ top: 0 }); }}
        tabs={[
          { id: 'now', label: 'Now', icon: <Navigation /> },
          { id: 'stops', label: 'Stops', icon: <ListOrdered />, badge: Math.max(0, stops.length - 1) },
          { id: 'map', label: 'Map', icon: <MapIcon /> },
          { id: 'me', label: 'Me', icon: <UserRound /> },
        ]}
      />

      {cashFor && <CashSheet order={cashFor} busy={busy} onClose={() => setCashFor(null)} onConfirm={(amt) => finish(cashFor, amt)} />}
    </>
  );
};

const NextStop: React.FC<{
  stop: Stop; here: { lat: number; lng: number }; isOverride: boolean; onResetOverride: () => void; showItems: boolean; setShowItems: (b: boolean) => void;
}> = ({ stop, here, isOverride, onResetOverride, showItems, setShowItems }) => {
  const { state, currentRider } = useStore();
  const { order } = stop;
  const first = order.customerName.split(' ')[0];
  const sms = `Hello po ${first}! Si ${currentRider?.name ?? 'rider'} mula sa ${state.storeProfile.name}. Malapit na po ako sa inyong delivery address.`;
  const count = order.items.reduce((n, i) => n + i.quantity, 0);

  const mapOrders = state.orders.filter(
    (candidate) => candidate.assignedRiderId === currentRider?.id && candidate.status === 'out_for_delivery'
  );

  return (
    <div className="space-y-3">
      <DeliveryMap
        orders={mapOrders}
        rider={currentRider}
        storeProfile={state.storeProfile}
        recommendedOrder={order}
        heightClass="h-64 min-h-[240px] sm:h-72"
      />
      {isOverride && (
        <button onClick={onResetOverride} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-stone-100 px-3 text-sm font-bold text-stone-700 active:scale-[0.98]">
          <RotateCcw className="h-4 w-4" /> You picked this stop · back to suggested route
        </button>
      )}

      <section className="card space-y-4 border-2 border-orange-500 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-full bg-orange-600 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-white">{isOverride ? 'Current stop' : 'Next stop'}</span>
          <span className="rounded-full bg-orange-100 px-3 py-1 text-sm font-extrabold text-orange-950">{formatDistance(stop.distanceKm)} · ~{stop.mins} min</span>
        </div>

        <div>
          <h2 className="text-2xl font-extrabold leading-tight text-stone-900">{order.customerName}</h2>
          <p className="mt-1 text-[17px] leading-snug text-stone-800">{order.deliveryAddress}</p>
        </div>

        {order.landmark && (
          <p className="flex items-start gap-2 rounded-2xl bg-amber-50 p-3 text-[15px] font-semibold text-amber-950">
            <Landmark className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" /> {order.landmark}
          </p>
        )}

        <a href={getGoogleMapsNavigationUrl(order.location, here)} target="_blank" rel="noopener noreferrer" className="btn-primary btn-big w-full bg-amber-600 hover:bg-amber-700">
          <Navigation className="h-6 w-6" /> Navigate in Google Maps
        </a>

        <div className="grid grid-cols-2 gap-3">
          <a href={`tel:${order.customerPhone}`} className="btn-soft btn-big"><Phone className="h-5 w-5 text-emerald-700" /> Call</a>
          <a href={`sms:${order.customerPhone}?body=${encodeURIComponent(sms)}`} className="btn-soft btn-big"><MessageSquare className="h-5 w-5 text-sky-600" /> Text</a>
        </div>

        <div className={`flex items-center justify-between gap-3 rounded-2xl p-3.5 ${needsCollection(order) ? 'bg-amber-100' : 'bg-emerald-100'}`}>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-stone-600">{needsCollection(order) ? 'Collect from customer' : 'Payment'}</p>
            <p className="text-2xl font-extrabold tabular-nums text-stone-900">{needsCollection(order) ? peso(order.totalAmount) : 'Already paid ✓'}</p>
          </div>
          <p className="text-right text-sm font-bold text-stone-700">{paymentText(order)}</p>
        </div>

        <div>
          <button onClick={() => setShowItems(!showItems)} aria-expanded={showItems} className="flex min-h-12 w-full items-center justify-between rounded-2xl bg-stone-100 px-4 font-bold text-stone-800 active:scale-[0.99]">
            <span>📦 {count} item{count === 1 ? '' : 's'} to hand over</span>
            <ChevronDown className={`h-5 w-5 transition ${showItems ? 'rotate-180' : ''}`} />
          </button>
          {showItems && (
            <ul className="mt-2 space-y-1.5 px-1">
              {order.items.map((it) => (
                <li key={it.productId + it.name} className="flex justify-between gap-3 text-[15px]">
                  <span><b>{it.quantity}×</b> {it.name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
      <div className="h-24" aria-hidden />
    </div>
  );
};

const CashSheet: React.FC<{ order: Order; busy: boolean; onClose: () => void; onConfirm: (amt: number) => void }> = ({ order, busy, onClose, onConfirm }) => {
  const total = order.totalAmount;
  const [given, setGiven] = useState<string>(String(order.cashAmountExpected ?? total));
  const amount = Number(given) || 0;
  const short = total - amount;

  // Offer only the bills that make sense: exact, then the next few common notes above the total
  const bills = [100, 200, 500, 1000, 2000].filter((b) => b >= total).slice(0, 3);

  return (
    <Sheet
      title="Collect cash"
      subtitle={`${order.customerName} · #${order.orderNumber.split('-').pop()}`}
      onClose={onClose}
      footer={
        <button className="btn-go btn-big w-full" disabled={busy || short > 0} onClick={() => onConfirm(amount)}>
          {short > 0 ? `Still need ${peso(short)}` : busy ? 'Saving…' : <><Check className="h-6 w-6" /> Got it – mark delivered</>}
        </button>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-2xl bg-amber-100 p-4">
          <span className="font-bold text-stone-700">Amount due</span>
          <span className="text-3xl font-extrabold tabular-nums">{peso(total)}</span>
        </div>

        <div>
          <label htmlFor="given" className="label">Customer hands you (₱)</label>
          <input id="given" type="number" inputMode="numeric" min={0} value={given} onChange={(e) => setGiven(e.target.value)} className="field !min-h-14 text-2xl font-extrabold" />
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className={`chip ${amount === total ? 'chip-on' : ''}`} onClick={() => setGiven(String(total))}>Exact</button>
            {bills.map((b) => (
              <button key={b} type="button" className={`chip ${amount === b ? 'chip-on' : ''}`} onClick={() => setGiven(String(b))}>{peso(b)}</button>
            ))}
          </div>
        </div>

        {short <= 0 && (
          <div className="flex items-center justify-between rounded-2xl bg-emerald-100 p-4" aria-live="polite">
            <span className="font-bold text-emerald-900">Change to give back</span>
            <span className="text-3xl font-extrabold tabular-nums text-emerald-900">{peso(-short)}</span>
          </div>
        )}
      </div>
    </Sheet>
  );
};
