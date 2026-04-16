"use client";
import type { Task, Project } from "@/components/project/types";
import { priorityColor } from "@/components/project/types";
import CalendarGrid from "@/components/calendar-grid";

interface CalendarViewProps {
  project: Project;
  calMonth: Date;
  setCalMonth: (d: Date) => void;
  onSelectTask: (task: Task) => void;
}

export default function CalendarView({ project, calMonth, setCalMonth, onSelectTask }: CalendarViewProps) {
  const year = calMonth.getFullYear();
  const month = calMonth.getMonth();

  const getTasksForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return project.tasks.filter((t) => t.dueDate === dateStr);
  };

  return (
    <div className="p-6">
      <CalendarGrid
        year={year}
        month={month}
        onNavigate={(y, m) => setCalMonth(new Date(y, m, 1))}
        renderDay={(date) => {
          const day = date.getDate();
          const dayTasks = getTasksForDay(day);
          return (
            <div className="p-2 min-h-[80px]">
              <div className="text-xs text-brand-gray mb-1">{day}</div>
              {dayTasks.map((t) => (
                <div key={t.id} onClick={() => onSelectTask(t)} className={`text-xs px-1.5 py-0.5 rounded-md mb-0.5 text-white truncate cursor-pointer hover:opacity-90 transition-opacity duration-150 ${priorityColor[t.priority] || "bg-gray-400"}`}>
                  {t.title}
                </div>
              ))}
            </div>
          );
        }}
      />
    </div>
  );
}
