"use client";
import type { Task, Project } from "@/components/project/types";
import { priorityColor } from "@/components/project/types";

interface CalendarViewProps {
  project: Project;
  calMonth: Date;
  setCalMonth: (d: Date) => void;
  onSelectTask: (task: Task) => void;
}

export default function CalendarView({ project, calMonth, setCalMonth, onSelectTask }: CalendarViewProps) {
  const year = calMonth.getFullYear();
  const month = calMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calDays: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const monthName = calMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const getTasksForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return project.tasks.filter((t) => t.dueDate === dateStr);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCalMonth(new Date(year, month - 1, 1))} className="p-1.5 rounded-lg hover:bg-gray-50 text-brand-gray transition-colors duration-150">&larr;</button>
        <h2 className="font-semibold font-heading">{monthName}</h2>
        <button onClick={() => setCalMonth(new Date(year, month + 1, 1))} className="p-1.5 rounded-lg hover:bg-gray-50 text-brand-gray transition-colors duration-150">&rarr;</button>
      </div>
      <div className="grid grid-cols-7 gap-px bg-platinum rounded-lg overflow-hidden">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="bg-white p-2 text-[11px] uppercase tracking-wider text-brand-gray text-center font-medium">{d}</div>
        ))}
        {calDays.map((day, i) => (
          <div key={i} className={`bg-white p-2 min-h-[80px] ${!day ? "bg-gray-50/50" : ""}`}>
            {day && (
              <>
                <div className="text-xs text-brand-gray mb-1">{day}</div>
                {getTasksForDay(day).map((t) => (
                  <div key={t.id} onClick={() => onSelectTask(t)} className={`text-xs px-1.5 py-0.5 rounded-md mb-0.5 text-white truncate cursor-pointer hover:opacity-90 transition-opacity duration-150 ${priorityColor[t.priority] || "bg-gray-400"}`}>
                    {t.title}
                  </div>
                ))}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
