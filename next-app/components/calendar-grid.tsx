"use client";
import type { ReactNode } from "react";

interface CalendarGridProps {
  year: number;
  month: number;
  onNavigate?: (year: number, month: number) => void;
  renderDay: (date: Date) => ReactNode;
  className?: string;
  /** Hide Saturday/Sunday columns. Default true (show weekends). */
  showWeekends?: boolean;
  /** "month" (default) shows the full month; "week" shows one week. */
  mode?: "month" | "week";
  /** Anchor date for week mode (any date inside the shown week). */
  anchor?: Date;
  /** Week-mode navigation: called with the new anchor date (±7 days). */
  onNavigateAnchor?: (d: Date) => void;
}

const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarGrid({
  year,
  month,
  onNavigate,
  renderDay,
  className,
  showWeekends = true,
  mode = "month",
  anchor,
  onNavigateAnchor,
}: CalendarGridProps) {
  const visibleDays = showWeekends ? [0, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5];
  const cols = visibleDays.length;

  let cells: (Date | null)[] = [];
  let headerLabel = "";

  if (mode === "week") {
    const ref = anchor ?? new Date(year, month, 1);
    const weekStart = new Date(ref);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    cells = visibleDays.map((d) => {
      const day = new Date(weekStart);
      day.setDate(day.getDate() + d);
      return day;
    });
    const first = cells[0]!;
    const last = cells[cells.length - 1]!;
    const fmt = (d: Date, withYear: boolean) =>
      d.toLocaleDateString("en-US", { month: "short", day: "numeric", ...(withYear ? { year: "numeric" } : {}) });
    headerLabel = `${fmt(first, false)} – ${fmt(last, true)}`;
  } else {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const all: (Date | null)[] = [
      ...Array(firstDay).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
    ];
    // pad trailing so filtering by weekday keeps rows aligned
    while (all.length % 7 !== 0) all.push(null);
    cells = all.filter((_, i) => visibleDays.includes(i % 7));
    headerLabel = new Date(year, month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }

  const navigate = (dir: -1 | 1) => {
    if (mode === "week") {
      const ref = anchor ?? new Date(year, month, 1);
      const next = new Date(ref);
      next.setDate(next.getDate() + dir * 7);
      if (onNavigateAnchor) onNavigateAnchor(next);
      else onNavigate?.(next.getFullYear(), next.getMonth());
    } else {
      const d = new Date(year, month + dir, 1);
      onNavigate?.(d.getFullYear(), d.getMonth());
    }
  };

  const hasNav = onNavigate || onNavigateAnchor;

  return (
    <div className={className}>
      {hasNav && (
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate(-1)} className="px-3 py-1.5 text-sm bg-platinum rounded hover:bg-lavender" aria-label="Previous">
            &larr;
          </button>
          <h2 className="font-semibold font-heading text-lg">{headerLabel}</h2>
          <button onClick={() => navigate(1)} className="px-3 py-1.5 text-sm bg-platinum rounded hover:bg-lavender" aria-label="Next">
            &rarr;
          </button>
        </div>
      )}
      <div className="bg-white rounded-lg border border-platinum/50 shadow-[0_4px_34px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className={`grid gap-px bg-platinum ${cols === 5 ? "grid-cols-5" : "grid-cols-7"}`}>
          {visibleDays.map((d) => (
            <div key={d} className="bg-white-smoke p-2 text-xs text-brand-gray text-center font-medium">{DAY_HEADERS[d]}</div>
          ))}
          {cells.map((date, i) => (
            <div key={i} className={`bg-white ${!date ? "bg-white-smoke/50" : ""}`}>
              {date ? renderDay(date) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
