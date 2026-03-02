"use client";

interface TopbarProps {
  title: string;
  count?: number;
  searchValue?: string;
  onSearch?: (q: string) => void;
  searchPlaceholder?: string;
  actions?: React.ReactNode;
}

export default function Topbar({ title, count, searchValue, onSearch, searchPlaceholder, actions }: TopbarProps) {
  return (
    <div className="flex items-center justify-between px-8 py-4 bg-white border-b border-platinum">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold font-heading text-brand-black">{title}</h1>
        {count !== undefined && (
          <span className="text-xs bg-lavender text-midnight-blue px-2 py-0.5 rounded-full font-medium">{count}</span>
        )}
      </div>
      <div className="flex items-center gap-3">
        {onSearch && (
          <input
            type="text"
            value={searchValue || ""}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={searchPlaceholder || "Search..."}
            className="w-64 px-3 py-1.5 text-sm rounded border border-platinum bg-white-smoke focus:outline-none focus:border-royal-purple"
          />
        )}
        {actions}
      </div>
    </div>
  );
}
