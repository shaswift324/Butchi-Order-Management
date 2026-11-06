import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

type Tone = 'ok' | 'warn';
interface ToastItem { id: number; text: string; tone: Tone }
const ToastCtx = createContext<(text: string, tone?: Tone) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

/** Quick confirmation after every action so nobody wonders "did that work?" */
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);
  const push = useCallback((text: string, tone: Tone = 'ok') => {
    const id = ++seq.current;
    setItems([{ id, text, tone }]);
    setTimeout(() => setItems((p) => p.filter((t) => t.id !== id)), 2600);
  }, []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-[72px] z-[2000] flex flex-col items-center gap-2 px-4">
        {items.map((t) => (
          <div key={t.id} className="anim-sheet pointer-events-auto flex max-w-md items-center gap-2.5 rounded-2xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white shadow-xl">
            {t.tone === 'ok' ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" /> : <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" />}
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
};
