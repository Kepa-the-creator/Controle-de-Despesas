import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { subscribeToasts, type ToastItem } from '../lib/toast';

const STYLES = {
  error: { icon: AlertCircle, cls: 'border-rose-500/60 text-rose-400' },
  success: { icon: CheckCircle2, cls: 'border-emerald-500/60 text-emerald-400' },
  info: { icon: Info, cls: 'border-blue-500/60 text-blue-400' },
} as const;

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const timers = new Set<number>();
    const unsubscribe = subscribeToasts((item) => {
      setItems((prev) => [...prev.slice(-3), item]);
      const timer = window.setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== item.id));
        timers.delete(timer);
      }, item.kind === 'error' ? 7000 : 4000);
      timers.add(timer);
    });
    return () => {
      unsubscribe();
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div
      className="fixed z-[60] left-4 right-4 sm:left-auto sm:right-6 sm:w-96 top-[max(1rem,env(safe-area-inset-top))] flex flex-col gap-2 pointer-events-none"
      role="status"
      aria-live="polite"
    >
      {items.map((t) => {
        const { icon: Icon, cls } = STYLES[t.kind];
        return (
          <div
            key={t.id}
            className={`toast-in pointer-events-auto flex items-start gap-3 bg-slate-900 border-2 rounded-xl px-4 py-3 shadow-xl ${cls}`}
          >
            <Icon className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="flex-1 text-sm text-slate-100 break-words">{t.message}</p>
            <button
              type="button"
              onClick={() => setItems((prev) => prev.filter((x) => x.id !== t.id))}
              className="text-slate-400 hover:text-slate-100 cursor-pointer"
              aria-label="Fechar aviso"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
