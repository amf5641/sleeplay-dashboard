import { useEffect, RefObject } from "react";

export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  handler: () => void,
  active: boolean = true
) {
  useEffect(() => {
    if (!active) return;
    const listener = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) handler();
    };
    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, [ref, handler, active]);
}

export function useEscapeKey(
  handler: () => void,
  active: boolean = true,
  stopPropagation: boolean = false
) {
  useEffect(() => {
    if (!active) return;
    const listener = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handler();
        if (stopPropagation) e.stopImmediatePropagation();
      }
    };
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, [handler, active, stopPropagation]);
}
