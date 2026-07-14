import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

interface Toast {
  id: number;
  message: string;
}

const ToastContext = createContext<(message: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const show = useCallback((message: string) => {
    const id = ++counter.current;
    setToasts((t) => [...t, { id, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="fixed left-0 right-0 bottom-24 z-50 flex flex-col items-center gap-2 px-6 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="bg-ink text-white text-sm px-4 py-2.5 rounded-full shadow-none max-w-full"
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): (message: string) => void {
  return useContext(ToastContext);
}
