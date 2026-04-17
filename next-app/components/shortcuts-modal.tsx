"use client";
import { useEffect, useState } from "react";
import Modal from "./modal";

const SHORTCUTS: { keys: string; label: string }[] = [
  { keys: "Cmd/Ctrl + K", label: "Global search" },
  { keys: "Cmd/Ctrl + Enter", label: "Submit form" },
  { keys: "Esc", label: "Close modal or dropdown" },
  { keys: "?", label: "Show keyboard shortcuts" },
];

export default function ShortcutsModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <Modal open={open} onClose={() => setOpen(false)} title="Keyboard Shortcuts">
      <div className="space-y-2">
        {SHORTCUTS.map((s) => (
          <div key={s.keys} className="flex items-center justify-between py-2 border-b border-platinum dark:border-[#3a3a55] last:border-b-0">
            <span className="text-sm text-brand-black dark:text-[#F1F0EE]">{s.label}</span>
            <kbd className="text-xs px-2 py-1 rounded bg-platinum dark:bg-[#3a3a55] text-brand-black dark:text-[#F1F0EE] font-mono">{s.keys}</kbd>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-brand-gray dark:text-[#9CA3AF]">Press <kbd className="px-1 py-0.5 rounded bg-platinum dark:bg-[#3a3a55] font-mono">?</kbd> anywhere to open this panel.</p>
    </Modal>
  );
}
