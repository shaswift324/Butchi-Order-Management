import { Order, OrderStatus } from '../types/index.ts';

export const peso = (n: number) => `₱${Math.round(n).toLocaleString('en-PH')}`;

export const clock = (d: Date | string) =>
  new Intl.DateTimeFormat('en-PH', { hour: 'numeric', minute: '2-digit' }).format(new Date(d));

export function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h} hr ago`;
  return `${Math.floor(h / 24)} d ago`;
}

/** Short place label from a long address: "Brgy. Lugam, Malolos City" */
export function shortPlace(address: string): string {
  const parts = address.split(',').map((p) => p.trim()).filter((p) => p && !/^bulacan$/i.test(p));
  return parts.slice(-2).join(', ') || address;
}

export interface StatusMeta {
  label: string;
  /** badge colours – always paired with a text label, never colour alone */
  badge: string;
  dot: string;
  /** what the single big button says for the next step */
  nextLabel?: string;
  next?: OrderStatus;
}

export const STATUS: Record<OrderStatus, StatusMeta> = {
  pending: { label: 'New', badge: 'bg-rose-100 text-rose-800', dot: 'bg-rose-500', nextLabel: 'Confirm order', next: 'confirmed' },
  confirmed: { label: 'Confirmed', badge: 'bg-sky-100 text-sky-800', dot: 'bg-sky-500', nextLabel: 'Start preparing', next: 'preparing' },
  preparing: { label: 'Preparing', badge: 'bg-amber-100 text-amber-900', dot: 'bg-amber-500', nextLabel: 'Mark ready for pickup', next: 'ready_for_delivery' },
  ready_for_delivery: { label: 'Ready', badge: 'bg-indigo-100 text-indigo-800', dot: 'bg-indigo-500', nextLabel: 'Send out for delivery', next: 'out_for_delivery' },
  out_for_delivery: { label: 'On the way', badge: 'bg-orange-100 text-orange-900', dot: 'bg-orange-500', nextLabel: 'Mark delivered', next: 'delivered' },
  delivered: { label: 'Delivered', badge: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-500' },
  cancelled: { label: 'Cancelled', badge: 'bg-stone-200 text-stone-700', dot: 'bg-stone-400' },
};

export const isActive = (o: Order) => o.status !== 'delivered' && o.status !== 'cancelled';

export const needsCollection = (o: Order) =>
  o.paymentMethod === 'Cash on Delivery' && o.paymentStatus !== 'collected_on_delivery';

export function paymentText(o: Order): string {
  if (o.paymentMethod === 'Cash on Delivery') {
    return o.paymentStatus === 'collected_on_delivery' ? 'COD · collected' : 'COD · collect on arrival';
  }
  return o.paymentStatus === 'paid' ? `${o.paymentMethod} · paid` : `${o.paymentMethod} · awaiting payment`;
}
