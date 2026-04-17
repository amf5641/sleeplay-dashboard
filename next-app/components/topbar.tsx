"use client";
import { useState, useRef, useEffect } from "react";

interface TopbarProps {
  title: string;
  count?: number;
  searchValue?: string;
  onSearch?: (q: string) => void;
  searchPlaceholder?: string;
  actions?: React.ReactNode;
}

export default function Topbar({ title, count, searchValue, onSearch, searchPlaceholder, actions }: TopbarProps) {
  const [localValue, setLocalValue] = useState(searchValue || "");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalValue(searchValue || "");
  }, [searchValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalValue(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onSearch?.(val);
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className="flex items-center justify-between px-8 py-4 bg-white dark:bg-[#1a1a2e] border-b border-platinum dark:border-[#3a3a55]">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold font-heading text-brand-black dark:text-[#F1F0EE]">{title}</h1>
        {count !== undefined && (
          <span className="text-xs bg-lavender text-midnight-blue px-2 py-0.5 rounded-full font-medium">{count}</span>
        )}
      </div>
      <div className="flex items-center gap-3">
        {onSearch && (
          <input
            type="text"
            value={localValue}
            onChange={handleChange}
            placeholder={searchPlaceholder || "Search..."}
            className="w-64 px-3 py-1.5 text-sm rounded border border-platinum dark:border-[#3a3a55] bg-white-smoke dark:bg-[#252540] text-brand-black dark:text-[#F1F0EE] focus:outline-none focus:border-royal-purple"
          />
        )}
        {actions}
      </div>
    </div>
  );
}
