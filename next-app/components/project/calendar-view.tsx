"use client";
import { useState, useEffect } from "react";
import type { Task, Project } from "@/components/project/types";
import { priorityColor } from "@/components/project/types";
import CalendarGrid from "@/components/calendar-grid";
import Initials from "@/components/project/initials";

interface CalendarViewProps {
  project: Project;
  calMonth: Date;
  setCalMonth: (d: Date) => void;
  onSelectTask: (task: Task) => void;
  onAddTask?: (dateISO: string) => void;
}

function loadPref<T extends string>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  return (localStorage.getItem(key) as T) || fallback;
}

export default function CalendarView({ project, calMonth, setCalMonth, onSelectTask, onAddTask }: CalendarViewProps) {
  const [mode, setMode] = useState<"month" | "week">("month");
  const [showWeekends, setShowWeekends] = useState(true);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  useEffect(() => {
    setMode(loadPref<"month" | "week">("cal-mode", "month"));
    setShowWeekends(loadPref<"on" | "off">("cal-weekends", "on") !== "off");
    setPrefsLoaded(true);
  }, []);

  useEffect(() => {
    if (!prefsLoaded) return;
    localStorage.setItem("cal-mode", mode);
    localStorage.setItem("cal-weekends", showWeekends ? "on" : "off");
  }, [mode, showWeekends, prefsLoaded]);

  const year = calMonth.getFullYear();
  const month = calMonth.getMonth();

  const getTasksForDate = (date: Date) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return { dateStr, tasks: project.tasks.filter((t) => t.dueDate === dateStr) };
  };

  const today = new Date();
  const isToday = (d: Date) =>
    d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();

  return (
    <div className="p-6">
      {/* Toolbar: month/week toggle + weekend toggle (persisted per agent) */}
      <div className="flex items-center justify-end gap-4 mb-3">
        <label className="flex items-center gap-1.5 text-xs text-brand-gray cursor-pointer select-none">
          <input type="checkbox" checked={showWeekends} onChange={(e) => setShowWeekends(e.target.checked)} className="rounded" />
          Weekends
        </label>
        <div className="flex rounded-lg border border-platinum overflow-hidden">
          {(["month", "week"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1 text-xs capitalize transition-colors ${
                mode === m ? "bg-royal-purple text-white" : "bg-white text-brand-gray hover:bg-white-smoke"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <CalendarGrid
        year={year}
        month={month}
        mode={mode}
        anchor={calMonth}
        showWeekends={showWeekends}
        onNavigate={(y, m) => setCalMonth(new Date(y, m, 1))}
        onNavigateAnchor={(d) => setCalMonth(d)}
        renderDay={(date) => {
          const day = date.getDate();
          const { dateStr, tasks: dayTasks } = getTasksForDate(date);
          return (
            <div
              className={`group/day p-2 flex flex-col ${mode === "week" ? "min-h-[420px]" : "min-h-[150px]"} cursor-pointer`}
              onClick={(e) => {
                // Clicking empty space in the day creates a task on that date
                if (e.target === e.currentTarget && onAddTask) onAddTask(dateStr);
              }}
            >
              <div className="flex items-center justify-between mb-1" onClick={() => onAddTask?.(dateStr)}>
                <span className={`text-xs ${isToday(date) ? "bg-royal-purple text-white w-5 h-5 rounded-full flex items-center justify-center font-bold" : "text-brand-gray"}`}>
                  {day}
                </span>
                {onAddTask && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onAddTask(dateStr); }}
                    aria-label={`Add task on ${dateStr}`}
                    className="opacity-0 group-hover/day:opacity-100 w-5 h-5 rounded-full bg-lavender text-midnight-blue text-xs font-bold leading-none transition-opacity"
                  >
                    +
                  </button>
                )}
              </div>
              <div className="flex-1 space-y-1 overflow-y-auto" onClick={(e) => { if (e.target === e.currentTarget && onAddTask) onAddTask(dateStr); }}>
                {dayTasks.map((t) => {
                  const assignee = t.collaborators?.[0]?.person as { id: string; name: string; photo?: string | null } | undefined;
                  return (
                    <div
                      key={t.id}
                      onClick={(e) => { e.stopPropagation(); onSelectTask(t); }}
                      title={t.title + (assignee ? ` — ${assignee.name}` : "")}
                      className={`flex items-center gap-1.5 text-xs px-1.5 py-1 rounded-md text-white cursor-pointer hover:opacity-90 transition-opacity duration-150 ${
                        t.completed ? "opacity-45" : ""
                      } ${priorityColor[t.priority] || "bg-gray-400"}`}
                    >
                      {t.completed && (
                        <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      <span className={`truncate flex-1 ${t.completed ? "line-through" : ""}`}>{t.title}</span>
                      {assignee &&
                        (assignee.photo ? (
                          <img src={assignee.photo} alt={assignee.name} className="w-4 h-4 rounded-full object-cover flex-shrink-0 ring-1 ring-white/60" />
                        ) : (
                          <span className="flex-shrink-0"><Initials name={assignee.name} size="xs" /></span>
                        ))}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}
