"use client";
import type { ReactNode } from "react";

interface CalendarGridProps {
  year: number;
  month: number;
  onNavigate?: (year: number, month: number) => void;
  renderDay: (date: Date) => ReactNode;
  className?: string;
}

export default function CalendarGrid({ year, month, onNavigate, renderDay, className }: CalendarGridProps) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calDays: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const monthName = new Date(year, month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className={className}>
      {onNavigate && (
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => {
              const d = new Date(year, month - 1, 1);
              onNavigate(d.getFullYear(), d.getMonth());
            }}
            className="px-3 py-1.5 text-sm bg-platinum rounded hover:bg-lavender"
          >
            &larr;
          </button>
          <h2 className="font-semibold font-heading text-lg">{monthName}</h2>
          <button
            onClick={() => {
              const d = new Date(year, month + 1, 1);
              onNavigate(d.getFullYear(), d.getMonth());
            }}
            className="px-3 py-1.5 text-sm bg-platinum rounded hover:bg-lavender"
          >
            &rarr;
          </button>
        </div>
      )}
      <div className="bg-white rounded-lg border border-platinum/50 shadow-[0_4px_34px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="grid grid-cols-7 gap-px bg-platinum">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="bg-white-smoke p-2 text-xs text-brand-gray text-center font-medium">{d}</div>
          ))}
          {calDays.map((day, i) => (
            <div key={i} className={`bg-white ${!day ? "bg-white-smoke/50" : ""}`}>
              {day ? renderDay(new Date(year, month, day)) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
