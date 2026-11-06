import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface SheetProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Sticky area pinned to the bottom (always reachable by thumb) */
  footer?: React.ReactNode;
}

/** Bottom sheet on phones, centred dialog on larger screens. */
export const Sheet: React.FC<SheetProps> = ({ title, subtitle, onClose, children, footer }) => {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div className="anim-fade fixed inset-0 z-[1000] flex items-end justify-center bg-stone-950/55 sm:items-center sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className="anim-sheet flex max-h-[94dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:rounded-[28px]">
        <div className="flex items-center justify-between gap-3 border-b border-stone-200 px-5 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-extrabold text-stone-900">{title}</h2>
            {subtitle && <p className="truncate text-sm text-stone-500">{subtitle}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-700 active:scale-95">
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
        {footer && <div className="border-t border-stone-200 bg-white px-5 pt-3 pb-[calc(0.75rem+var(--safe-bottom))]">{footer}</div>}
      </div>
    </div>
  );
};
