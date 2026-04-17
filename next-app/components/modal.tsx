"use client";
import { useEffect, useRef } from "react";
import { useFocusTrap } from "@/hooks/use-focus-trap";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, open);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div ref={ref} className="relative bg-white dark:bg-[#2a2a45] rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-platinum dark:border-[#3a3a55]">
          <h2 className="text-lg font-semibold font-heading text-brand-black dark:text-[#F1F0EE]">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="text-brand-gray dark:text-[#9CA3AF] hover:text-brand-black dark:hover:text-[#F1F0EE] text-xl leading-none">&times;</button>
        </div>
        <div className="px-6 py-4 text-brand-black dark:text-[#F1F0EE]">{children}</div>
      </div>
    </div>
  );
}
