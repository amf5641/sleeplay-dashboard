"use client";
import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastContextValue {
  toast: (message: string, type?: Toast["type"]) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const toast = useCallback((message: string, type: Toast["type"] = "info") => {
    const id = `toast-${++counterRef.current}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {toasts.length > 0 && (
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 max-w-sm">
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef<NodeJS.Timeout>(undefined);

  useEffect(() => {
    timerRef.current = setTimeout(() => setExiting(true), 3500);
    return () => clearTimeout(timerRef.current);
  }, []);

  const bgColor = toast.type === "success"
    ? "bg-emerald-600"
    : toast.type === "error"
    ? "bg-red-600"
    : "bg-midnight-blue";

  const icon = toast.type === "success"
    ? "\u2713"
    : toast.type === "error"
    ? "\u2717"
    : "\u2139";

  return (
    <div
      className={`${bgColor} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 text-sm transition-all duration-300 ${
        exiting ? "opacity-0 translate-x-4" : "opacity-100 translate-x-0"
      }`}
      style={{ animation: "slideInRight 0.2s ease-out" }}
      onAnimationEnd={() => exiting && onDismiss(toast.id)}
    >
      <span className="text-base font-bold flex-shrink-0">{icon}</span>
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={() => { setExiting(true); setTimeout(() => onDismiss(toast.id), 300); }}
        className="text-white/60 hover:text-white flex-shrink-0"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>
  );
}
