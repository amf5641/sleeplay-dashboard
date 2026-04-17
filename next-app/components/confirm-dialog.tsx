"use client";
import Modal from "./modal";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
}

export default function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = "Delete" }: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-brand-gray dark:text-[#9CA3AF] mb-6">{message}</p>
      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="px-4 py-2 rounded bg-platinum dark:bg-[#3a3a55] text-brand-black dark:text-[#F1F0EE] hover:bg-lavender dark:hover:bg-[#4a4a65]">Cancel</button>
        <button onClick={() => { onConfirm(); onClose(); }} className="px-4 py-2 rounded bg-red-500 text-white hover:bg-red-600">{confirmLabel}</button>
      </div>
    </Modal>
  );
}
