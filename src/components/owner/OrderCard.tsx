import React, { useState } from 'react';
import { Order, OrderStatus } from '../../types/index.ts';
import { useStore } from '../../context/StoreContext.tsx';
import { useToast } from '../../ui/Toast.tsx';
import { StatusBadge } from '../../ui/bits.tsx';
import { Confirm } from '../../ui/Confirm.tsx';
import { STATUS, isActive, needsCollection, paymentText, peso, shortPlace, timeAgo } from '../../utils/format.ts';
import { ChevronDown, MapPin, Phone, UserRound, Ban } from 'lucide-react';

export const OrderCard: React.FC<{ order: Order }> = ({ order }) => {
  const { state, updateOrderStatus, assignRiderToOrder, cancelOrder, editOrder } = useStore();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(order.customerName);
  const [editPhone, setEditPhone] = useState(order.customerPhone);
  const [editAddress, setEditAddress] = useState(order.deliveryAddress);
  const [editLandmark, setEditLandmark] = useState(order.landmark ?? '');

  const nextOwnerStatus: OrderStatus | undefined =
    order.status === 'pending' || order.status === 'confirmed' ? 'preparing'
    : order.status === 'preparing' || order.status === 'ready_for_delivery' ? 'out_for_delivery'
    : undefined;
  const nextOwnerLabel = nextOwnerStatus === 'preparing' ? 'Start preparing'
    : nextOwnerStatus === 'out_for_delivery' ? 'Mark as out for delivery' : '';

  const meta = STATUS[order.status];
  const active = isActive(order);
  const needsRider = nextOwnerStatus === 'out_for_delivery' && !order.assignedRiderId;
  const itemCount = order.items.reduce((n, i) => n + i.quantity, 0);

  const advance = async () => {
    if (!nextOwnerStatus || busy) return;
    setBusy(true);
    try {
      await updateOrderStatus(order.id, nextOwnerStatus);
      toast(`${order.customerName.split(' ')[0]}: ${STATUS[nextOwnerStatus].label}`);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not update order', 'warn');
    } finally {
      setBusy(false);
    }
  };

  const assign = async (riderId: string) => {
    if (!riderId) return;
    await assignRiderToOrder(order.id, riderId);
    const rider = state.riders.find((r) => r.id === riderId);
    toast(`Assigned to ${rider?.name ?? 'rider'}`);
  };

  return (
    <article className="card overflow-hidden">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="block w-full px-4 pb-3 pt-4 text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-extrabold leading-tight text-stone-900">{order.customerName}</h3>
            <p className="mt-0.5 text-sm text-stone-500">#{order.orderNumber.split('-').pop()} · {timeAgo(order.createdAt)} · {itemCount} item{itemCount === 1 ? '' : 's'}</p>
          </div>
          <StatusBadge status={order.status} />
        </div>
        <p className="mt-2 flex items-start gap-1.5 text-[15px] text-stone-700">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" />
          <span className="line-clamp-2">{shortPlace(order.deliveryAddress)}</span>
        </p>
        <div className="mt-2 flex items-end justify-between gap-2">
          <div>
            <p className="text-2xl font-extrabold tabular-nums text-stone-900">{peso(order.totalAmount)}</p>
            <p className={`text-sm font-semibold ${needsCollection(order) ? 'text-amber-800' : 'text-emerald-700'}`}>{paymentText(order)}</p>
          </div>
          <span className="flex items-center gap-1 text-sm font-bold text-stone-500">
            {open ? 'Less' : 'Details'}
            <ChevronDown className={`h-5 w-5 transition ${open ? 'rotate-180' : ''}`} />
          </span>
        </div>
      </button>

      {open && (
        <div className="space-y-3 border-t border-stone-100 bg-stone-50 px-4 py-3">
          <ul className="space-y-1.5">
            {order.items.map((it) => (
              <li key={it.productId + it.name} className="flex justify-between gap-3 text-[15px]">
                <span><b>{it.quantity}×</b> {it.name}</span>
                <span className="tabular-nums text-stone-600">{peso(it.total)}</span>
              </li>
            ))}
            <li className="flex justify-between border-t border-stone-200 pt-1.5 text-sm text-stone-500">
              <span>Delivery fee</span><span className="tabular-nums">{peso(order.deliveryFee)}</span>
            </li>
          </ul>
          <p className="text-sm text-stone-600"><b>Address:</b> {order.deliveryAddress}</p>
          {order.landmark && <p className="text-sm text-stone-600"><b>Landmark:</b> {order.landmark}</p>}
          <div className="grid grid-cols-2 gap-2">
            <a href={`tel:${order.customerPhone}`} className="btn-soft"><Phone className="h-5 w-5 text-emerald-700" /> Call</a>
            {active ? (
              <button className="btn-soft" onClick={() => {
                setEditName(order.customerName);
                setEditPhone(order.customerPhone);
                setEditAddress(order.deliveryAddress);
                setEditLandmark(order.landmark ?? '');
                setEditing((v) => !v);
              }}>Edit details</button>
            ) : <span />}
            {active && <button className="btn-danger col-span-2" onClick={() => setConfirmCancel(true)}><Ban className="h-5 w-5" /> Cancel order</button>}
          </div>
          {editing && (
            <form className="space-y-2 rounded-2xl border border-stone-200 bg-white p-3" onSubmit={async (event) => {
              event.preventDefault();
              if (!editName.trim() || !editPhone.trim() || !editAddress.trim()) {
                toast('Name, phone, and address are required', 'warn');
                return;
              }
              try {
                await editOrder(order.id, { customerName: editName.trim(), customerPhone: editPhone.trim(), deliveryAddress: editAddress.trim(), landmark: editLandmark.trim() });
                setEditing(false);
                toast('Order details updated');
              } catch {
                toast('Could not save order details', 'warn');
              }
            }}>
              <p className="font-extrabold text-stone-900">Edit customer details</p>
              <input className="field" aria-label="Customer name" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Customer name" />
              <input className="field" aria-label="Phone number" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="Phone number" />
              <input className="field" aria-label="Delivery address" value={editAddress} onChange={(e) => setEditAddress(e.target.value)} placeholder="Delivery address" />
              <input className="field" aria-label="Landmark" value={editLandmark} onChange={(e) => setEditLandmark(e.target.value)} placeholder="Landmark (optional)" />
              <div className="grid grid-cols-2 gap-2">
                <button type="button" className="btn-soft" onClick={() => setEditing(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save changes</button>
              </div>
            </form>
          )}
        </div>
      )}

      {active && (
        <div className="space-y-2.5 border-t border-stone-100 px-4 py-3">
          {order.status !== 'out_for_delivery' && (
          <label className="flex items-center gap-2">
            <UserRound className="h-5 w-5 shrink-0 text-stone-400" aria-hidden />
            <span className="sr-only">Rider</span>
            <select
              value={order.assignedRiderId ?? ''}
              onChange={(e) => assign(e.target.value)}
              className={`field flex-1 py-0 text-[15px] font-semibold ${needsRider ? 'border-rose-400 ring-4 ring-rose-100' : ''}`}
            >
              <option value="">{needsRider ? 'Pick a rider to send this out' : 'No rider yet – tap to assign'}</option>
              {state.riders.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </label>
          )}

          {nextOwnerStatus && (
            <button
              onClick={advance}
              disabled={busy || needsRider}
              className="btn-primary btn-big w-full"
            >
              {needsRider ? 'Assign a rider before dispatch' : nextOwnerLabel}
            </button>
          )}
          {order.status === 'out_for_delivery' && (
            <p className="rounded-xl bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-900">
              Rider is handling delivery. Only the assigned rider can mark this order as delivered.
            </p>
          )}
        </div>
      )}

      {confirmCancel && (
        <Confirm
          title="Cancel this order?"
          message={`${order.customerName} · ${peso(order.totalAmount)}. This can't be undone.`}
          confirmLabel="Yes, cancel order"
          onCancel={() => setConfirmCancel(false)}
          onConfirm={() => { cancelOrder(order.id); setConfirmCancel(false); toast('Order cancelled', 'warn'); }}
        />
      )}
    </article>
  );
};
