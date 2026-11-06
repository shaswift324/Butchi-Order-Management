import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext.tsx';
import { useToast } from '../../ui/Toast.tsx';
import { Sheet } from '../../ui/Sheet.tsx';
import { Segmented } from '../../ui/bits.tsx';
import { Rider } from '../../types/index.ts';

export const RiderFormModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { state, addRider } = useStore();
  const toast = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicle, setVehicle] = useState('Motorcycle');
  const [status, setStatus] = useState<Rider['status']>('available');
  const [error, setError] = useState('');

  const save = async () => {
    if (!name.trim()) { setError('Please enter the rider’s name.'); return; }
    await addRider({ name: name.trim(), phone: phone.trim(), vehicle: vehicle.trim() || 'Motorcycle', status, currentLocation: state.storeProfile.location });
    toast(`${name.trim()} added`);
    onClose();
  };

  return (
    <Sheet title="Add rider" onClose={onClose} footer={<button className="btn-primary btn-big w-full" onClick={save}>Save rider</button>}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
        {error && <p role="alert" className="rounded-2xl bg-rose-50 p-3 text-sm font-semibold text-rose-800">⚠️ {error}</p>}
        <div>
          <label className="label" htmlFor="rn">Name</label>
          <input id="rn" className="field" autoComplete="off" value={name} onChange={(e) => { setName(e.target.value); setError(''); }} placeholder="e.g. Kuya Ben Cruz" />
        </div>
        <div>
          <label className="label" htmlFor="rp">Mobile number</label>
          <input id="rp" className="field" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0917-000-0000" />
        </div>
        <div>
          <label className="label" htmlFor="rv">Vehicle</label>
          <input id="rv" className="field" value={vehicle} onChange={(e) => setVehicle(e.target.value)} />
        </div>
        <div>
          <span className="label">Status</span>
          <Segmented value={status} onChange={(v) => setStatus(v as Rider['status'])} options={[{ value: 'available', label: 'Available' }, { value: 'on_delivery', label: 'Delivering' }, { value: 'offline', label: 'Offline' }]} />
        </div>
      </form>
    </Sheet>
  );
};
