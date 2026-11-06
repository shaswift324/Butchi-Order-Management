import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext.tsx';
import { useToast } from '../../ui/Toast.tsx';
import { Sheet } from '../../ui/Sheet.tsx';
import { Segmented, Stepper } from '../../ui/bits.tsx';
import { OrderItem, PaymentMethod } from '../../types/index.ts';
import { peso } from '../../utils/format.ts';

const AREAS = [
  { name: 'Malolos City', lat: 14.8528, lng: 120.816 },
  { name: 'Guiguinto', lat: 14.832, lng: 120.878 },
  { name: 'Plaridel', lat: 14.887, lng: 120.858 },
  { name: 'Balagtas', lat: 14.818, lng: 120.908 },
  { name: 'Santa Maria', lat: 14.819, lng: 120.961 },
  { name: 'Bocaue', lat: 14.801, lng: 120.932 },
  { name: 'Baliwag', lat: 14.951, lng: 120.902 },
  { name: 'Marilao', lat: 14.757, lng: 120.96 },
];

/** Rendered only while open, so every new order starts with a clean form. */
export const OrderFormModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { state, createOrder } = useStore();
  const toast = useToast();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [area, setArea] = useState<(typeof AREAS)[number] | null>(null);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [fee, setFee] = useState<number>(state.storeProfile.defaultDeliveryFee ?? 50);
  const [payment, setPayment] = useState<PaymentMethod>('Cash on Delivery');
  const [riderId, setRiderId] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const items: OrderItem[] = state.products
    .filter((p) => (qty[p.id] || 0) > 0)
    .map((p) => ({ productId: p.id, name: p.name, price: p.price, quantity: qty[p.id], total: p.price * qty[p.id], unit: p.unit }));
  const subtotal = items.reduce((s, i) => s + i.total, 0);
  const total = subtotal + (items.length ? fee : 0);

  const pickArea = (a: (typeof AREAS)[number]) => {
    setArea(a);
    setFee(state.storeProfile.townDeliveryFees?.[a.name] ?? state.storeProfile.defaultDeliveryFee ?? 50);
    setErrors((e) => ({ ...e, area: '' }));
  };

  const save = async () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Enter the customer’s name';
    if (phone.replace(/\D/g, '').length < 7) e.phone = 'Enter a phone number we can call';
    if (!area) e.area = 'Pick the town so the rider gets the right route';
    if (!address.trim()) e.address = 'Enter the street / barangay';
    if (!items.length) e.items = 'Add at least one item';
    setErrors(e);
    if (Object.keys(e).length || !area) {
      toast('Please fix the highlighted fields', 'warn');
      return;
    }
    setSaving(true);
    const rider = state.riders.find((r) => r.id === riderId);
    try {
      await createOrder({
        customerName: name.trim(),
        customerPhone: phone.trim(),
        deliveryAddress: /bulacan/i.test(address) ? address.trim() : `${address.trim()}, ${area.name}, Bulacan`,
        landmark: landmark.trim(),
        location: { lat: area.lat, lng: area.lng },
        items, subtotal, deliveryFee: fee, totalAmount: total,
        paymentMethod: payment,
        paymentStatus: payment === 'Cash on Delivery' ? 'unpaid' : 'paid',
        status: 'pending',
        assignedRiderId: riderId || undefined,
        assignedRiderName: rider?.name,
      });
      toast(`Order saved for ${name.trim().split(' ')[0]} · ${peso(total)}`);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const err = (k: string) => errors[k] && <p role="alert" className="mt-1.5 text-sm font-semibold text-rose-700">⚠ {errors[k]}</p>;
  const bad = (k: string) => (errors[k] ? 'border-rose-400 ring-4 ring-rose-100' : '');

  return (
    <Sheet
      title="New order"
      subtitle="Takes about a minute"
      onClose={onClose}
      footer={
        <div className="flex items-center gap-3">
          <div className="min-w-[96px]">
            <p className="text-xs font-bold uppercase tracking-wide text-stone-500">Total</p>
            <p className="text-2xl font-extrabold tabular-nums text-stone-900">{peso(total)}</p>
          </div>
          <button className="btn-primary btn-big flex-1" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save order'}</button>
        </div>
      }
    >
      <form className="space-y-6" noValidate onSubmit={(e) => { e.preventDefault(); save(); }}>
        <fieldset className="space-y-4">
          <legend className="mb-2 text-base font-extrabold text-stone-900">1 · Who is it for?</legend>
          <div>
            <label className="label" htmlFor="of-name">Customer name</label>
            <input id="of-name" className={`field ${bad('name')}`} autoComplete="off" autoCapitalize="words" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Maria Santos" />
            {err('name')}
          </div>
          <div>
            <label className="label" htmlFor="of-phone">Mobile number</label>
            <input id="of-phone" className={`field ${bad('phone')}`} type="tel" inputMode="tel" autoComplete="off" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0917-000-0000" />
            {err('phone')}
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="mb-2 text-base font-extrabold text-stone-900">2 · Where to?</legend>
          <div>
            <span className="label">Town</span>
            <div className={`-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 no-scrollbar ${errors.area ? 'rounded-2xl ring-4 ring-rose-100' : ''}`}>
              {AREAS.map((a) => (
                <button key={a.name} type="button" aria-pressed={area?.name === a.name} onClick={() => pickArea(a)} className={`chip ${area?.name === a.name ? 'chip-on' : ''}`}>{a.name}</button>
              ))}
            </div>
            {err('area')}
          </div>
          <div>
            <label className="label" htmlFor="of-addr">Street / barangay</label>
            <input id="of-addr" className={`field ${bad('address')}`} autoComplete="off" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="House #, street, barangay" />
            {err('address')}
          </div>
          <div>
            <label className="label" htmlFor="of-lm">Landmark <span className="font-medium text-stone-400">(optional)</span></label>
            <input id="of-lm" className="field" value={landmark} onChange={(e) => setLandmark(e.target.value)} placeholder="Blue gate, near the chapel…" />
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-base font-extrabold text-stone-900">3 · What did they order?</legend>
          <ul className={`space-y-2 ${errors.items ? 'rounded-2xl ring-4 ring-rose-100' : ''}`}>
            {state.products.map((p) => {
              const q = qty[p.id] || 0;
              const out = !p.isAvailable || p.stockQuantity <= 0;
              return (
                <li key={p.id} className={`flex items-center gap-3 rounded-2xl border p-2.5 ${q ? 'border-amber-500 bg-amber-50' : 'border-stone-200'} ${out ? 'opacity-50' : ''}`}>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-[15px] font-bold leading-snug text-stone-900">{p.name}</p>
                    <p className="text-sm text-stone-500">{out ? 'Sold out' : `${peso(p.price)} · ${p.stockQuantity} left`}</p>
                  </div>
                  {!out && <Stepper label={p.name} value={q} max={p.stockQuantity} onChange={(v) => { setQty({ ...qty, [p.id]: v }); setErrors((e) => ({ ...e, items: '' })); }} />}
                </li>
              );
            })}
          </ul>
          {err('items')}
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="mb-2 text-base font-extrabold text-stone-900">4 · Payment & delivery</legend>
          <div>
            <span className="label">How will they pay?</span>
            <Segmented value={payment} onChange={(v) => setPayment(v as PaymentMethod)} options={[{ value: 'Cash on Delivery', label: 'Cash (COD)' }, { value: 'GCash', label: 'GCash' }, { value: 'Maya', label: 'Maya' }]} />
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-sm font-bold text-stone-700">Delivery fee</span>
              {area && <span className="text-xs text-stone-500">Auto-set for {area.name}</span>}
            </div>
            <div className="flex items-center gap-3">
              <Stepper label="delivery fee" value={fee} onChange={setFee} />
              <div className="flex flex-1 gap-1.5 overflow-x-auto no-scrollbar">
                {[0, 50, 70].map((v) => (
                  <button key={v} type="button" onClick={() => setFee(v)} className={`chip ${fee === v ? 'chip-on' : ''}`}>{v === 0 ? 'Free' : `₱${v}`}</button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="of-rider">Rider</label>
            <select id="of-rider" className="field" value={riderId} onChange={(e) => setRiderId(e.target.value)}>
              <option value="">Assign later</option>
              {state.riders.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
        </fieldset>
      </form>
    </Sheet>
  );
};
