import React from 'react';
import { Sheet } from './Sheet.tsx';

export const Confirm: React.FC<{
  title: string; message: string; confirmLabel: string; onConfirm: () => void; onCancel: () => void; danger?: boolean;
}> = ({ title, message, confirmLabel, onConfirm, onCancel, danger = true }) => (
  <Sheet
    title={title}
    onClose={onCancel}
    footer={
      <div className="grid grid-cols-2 gap-3">
        <button className="btn-soft btn-big" onClick={onCancel}>Keep it</button>
        <button className={`${danger ? 'btn bg-rose-600 text-white hover:bg-rose-700' : 'btn-primary'} btn-big`} onClick={onConfirm}>{confirmLabel}</button>
      </div>
    }
  >
    <p className="text-base text-stone-700">{message}</p>
  </Sheet>
);
