export type ToastKind = 'error' | 'success' | 'info';
export interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

type Listener = (item: ToastItem) => void;

const listeners = new Set<Listener>();
let nextId = 1;

const push = (kind: ToastKind, message: string) => {
  const item = { id: nextId++, kind, message };
  listeners.forEach((l) => l(item));
};

export const toast = {
  error: (message: string) => push('error', message),
  success: (message: string) => push('success', message),
  info: (message: string) => push('info', message),
};

export const subscribeToasts = (listener: Listener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
