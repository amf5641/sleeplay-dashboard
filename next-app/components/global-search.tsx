"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface SearchResults {
  projects: { id: string; name: string; status: string }[];
  tasks: { id: string; title: string; projectId: string; status: string }[];
  sops: { id: string; title: string }[];
  content: { id: string; title: string }[];
}

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const debounceRef = useRef<NodeJS.Timeout>(undefined);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setResults(null);
      setSelectedIdx(0);
    }
  }, [open]);

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) { setResults(null); return; }
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
        setSelectedIdx(0);
      }
    }, 250);
  }, []);

  const allItems = results
    ? [
        ...results.projects.map((p) => ({ type: "project" as const, id: p.id, label: p.name, href: `/projects/${p.id}` })),
        ...results.tasks.map((t) => ({ type: "task" as const, id: t.id, label: t.title, href: `/projects/${t.projectId}?task=${t.id}` })),
        ...results.sops.map((s) => ({ type: "sop" as const, id: s.id, label: s.title, href: `/sops/${s.id}` })),
        ...results.content.map((c) => ({ type: "content" as const, id: c.id, label: c.title, href: `/content/${c.id}` })),
      ]
    : [];

  const navigate = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx((i) => Math.min(i + 1, allItems.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx((i) => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && allItems[selectedIdx]) { navigate(allItems[selectedIdx].href); }
  };

  const typeIcon: Record<string, string> = { project: "📁", task: "✅", sop: "📋", content: "📄" };
  const typeLabel: Record<string, string> = { project: "Project", task: "Task", sop: "SOP", content: "Content" };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]" onClick={() => setOpen(false)}>
      <div className="fixed inset-0 bg-black/30" />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg border border-platinum overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-platinum">
          <svg className="w-5 h-5 text-brand-gray flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); search(e.target.value); }}
            onKeyDown={onKeyDown}
            placeholder="Search projects, tasks, SOPs, content..."
            className="flex-1 text-sm bg-transparent border-0 focus:outline-none placeholder:text-brand-gray/50"
          />
          <kbd className="text-[10px] text-brand-gray/60 bg-gray-100 px-1.5 py-0.5 rounded font-mono">ESC</kbd>
        </div>

        {query.length >= 2 && (
          <div className="max-h-80 overflow-y-auto">
            {allItems.length === 0 && results && (
              <div className="px-4 py-8 text-center text-sm text-brand-gray">No results found</div>
            )}
            {allItems.length > 0 && (
              <div className="py-2">
                {allItems.map((item, i) => (
                  <button
                    key={`${item.type}-${item.id}`}
                    onClick={() => navigate(item.href)}
                    onMouseEnter={() => setSelectedIdx(i)}
                    className={`w-full text-left px-4 py-2.5 flex items-center gap-3 text-sm transition-colors ${
                      i === selectedIdx ? "bg-lavender/30" : "hover:bg-gray-50"
                    }`}
                  >
                    <span className="text-base">{typeIcon[item.type]}</span>
                    <span className="flex-1 truncate">{item.label}</span>
                    <span className="text-[11px] text-brand-gray/50">{typeLabel[item.type]}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {query.length < 2 && (
          <div className="px-4 py-6 text-center text-xs text-brand-gray/50">
            Type at least 2 characters to search
          </div>
        )}
      </div>
    </div>
  );
}
