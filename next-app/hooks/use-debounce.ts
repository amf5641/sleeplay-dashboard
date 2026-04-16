import { useCallback, useEffect, useRef } from "react";

export function useDebounce<T extends (...args: unknown[]) => unknown>(fn: T, ms: number) {
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, []);
  return useCallback((...args: Parameters<T>) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => fn(...args), ms);
  }, [fn, ms]);
}
