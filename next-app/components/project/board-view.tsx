"use client";
import type { Task, Project } from "@/components/project/types";
import { STATUS_OPTIONS, statusColors, statusDot } from "@/components/project/types";
import Initials from "@/components/project/initials";

interface BoardViewProps {
  project: Project;
  taskFilter: "all" | "incomplete" | "complete";
  activeTaskId: string | null;
  boardDragId: string | null;
  boardDragOver: string | null;
  onBoardDragIdChange: (id: string | null) => void;
  onBoardDragOverChange: (status: string | null) => void;
  onUpdateField: (taskId: string, field: string, value: unknown) => Promise<void>;
  onSelectTask: (task: Task | null) => void;
}

export default function BoardView({
  project,
  taskFilter,
  activeTaskId,
  boardDragId,
  boardDragOver,
  onBoardDragIdChange: setBoardDragId,
  onBoardDragOverChange: setBoardDragOver,
  onUpdateField: updateTaskField,
  onSelectTask,
}: BoardViewProps) {
  const today = new Date().toISOString().split("T")[0];
  const isOverdue = (d: string | null) => d && d < today;

  return (
    <div className="flex gap-4 p-6 overflow-x-auto h-full items-start">
      {STATUS_OPTIONS.map((status) => {
        const statusTasks = project.tasks.filter((t) => {
          const matchesStatus = t.status === status;
          const matchesFilter = taskFilter === "all" ? true : taskFilter === "incomplete" ? !t.completed : t.completed;
          return matchesStatus && matchesFilter;
        });
        return (
          <div key={status} className="w-72 flex-shrink-0 flex flex-col max-h-full">
            <div className="flex items-center gap-2 px-3 py-2 mb-2">
              <span className={`w-2 h-2 rounded-full ${statusDot[status] || "bg-gray-400"}`} />
              <span className="text-sm font-semibold text-brand-black">{status}</span>
              <span className="text-xs text-brand-gray/50">{statusTasks.length}</span>
            </div>
            <div
              className={`flex-1 overflow-y-auto space-y-2 px-1 py-1 rounded-lg min-h-[80px] transition-colors ${boardDragOver === status ? "bg-lavender/20 ring-2 ring-royal-purple/20" : ""}`}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setBoardDragOver(status); }}
              onDragLeave={() => setBoardDragOver(null)}
              onDrop={(e) => { e.preventDefault(); if (boardDragId) { updateTaskField(boardDragId, "status", status); setBoardDragId(null); } setBoardDragOver(null); }}
            >
              {statusTasks.map((task) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={() => setBoardDragId(task.id)}
                  onDragEnd={() => { setBoardDragId(null); setBoardDragOver(null); }}
                  onClick={() => onSelectTask(activeTaskId === task.id ? null : task)}
                  className={`bg-white rounded-lg border border-platinum p-3 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${boardDragId === task.id ? "opacity-40" : ""} ${activeTaskId === task.id ? "ring-2 ring-royal-purple" : ""}`}
                >
                  <p className={`text-sm font-medium mb-2 ${task.completed ? "line-through text-brand-gray/50" : "text-brand-black"}`}>{task.title}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {task.dueDate && (
                      <span className={`text-[11px] px-1.5 py-0.5 rounded ${isOverdue(task.dueDate) && !task.completed ? "bg-red-100 text-red-600" : "bg-gray-100 text-brand-gray"}`}>
                        {new Date(task.dueDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    )}
                    <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${task.priority === "high" ? "bg-red-100 text-red-700" : task.priority === "low" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                      {task.priority}
                    </span>
                    {task.collaborators.length > 0 && (
                      <div className="flex -space-x-1 ml-auto">
                        {task.collaborators.slice(0, 2).map((c) => (
                          <Initials key={c.person.id} name={c.person.name} size="xs" />
                        ))}
                      </div>
                    )}
                  </div>
                  {task.subtasks?.length > 0 && (
                    <div className="mt-2 text-[11px] text-brand-gray/60">
                      {task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length} subtasks
                    </div>
                  )}
                </div>
              ))}
              {statusTasks.length === 0 && (
                <div className="text-xs text-brand-gray/30 text-center py-6">No tasks</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
