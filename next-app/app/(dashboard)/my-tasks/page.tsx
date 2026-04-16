"use client";
import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import Topbar from "@/components/topbar";
import EmptyState from "@/components/empty-state";
import CalendarGrid from "@/components/calendar-grid";
import { fetcher, apiFetch } from "@/lib/utils";
import { useToast } from "@/components/toast";
import { STATUS_OPTIONS, statusColors } from "@/components/project/types";

interface Person { id: string; name: string }
interface MyTask {
  id: string;
  title: string;
  dueDate: string | null;
  priority: string;
  status: string;
  notes: string;
  completed: boolean;
  createdAt: string;
  project: { id: string; name: string };
  collaborators: { person: Person }[];
}

export default function MyTasksPage() {
  const { toast } = useToast();
  const [view, setView] = useState<"list" | "calendar">("list");
  const [filter, setFilter] = useState<"all" | "incomplete" | "complete">("incomplete");
  const [calMonth, setCalMonth] = useState(new Date());
  const { data: allTasks = [], mutate } = useSWR<MyTask[]>("/api/my-tasks", fetcher);
  const { data: people = [] } = useSWR<Person[]>("/api/people", fetcher);

  const tasks = filter === "all" ? allTasks : filter === "incomplete" ? allTasks.filter((t) => !t.completed) : allTasks.filter((t) => t.completed);

  const updateField = async (taskId: string, field: string, value: unknown) => {
    const { error } = await apiFetch(`/api/tasks/${taskId}`, { method: "PUT", body: JSON.stringify({ [field]: value }) });
    if (error) { toast(error, "error"); return; }
    mutate();
  };

  const updateCollaborators = async (taskId: string, collaborators: string[]) => {
    const { error } = await apiFetch(`/api/tasks/${taskId}`, { method: "PUT", body: JSON.stringify({ collaborators }) });
    if (error) { toast(error, "error"); return; }
    mutate();
  };

  const toggleTask = async (taskId: string, completed: boolean) => {
    const { error } = await apiFetch(`/api/tasks/${taskId}`, { method: "PUT", body: JSON.stringify({ completed: !completed }) });
    if (error) { toast(error, "error"); return; }
    mutate();
  };

  // Group tasks by project for list view
  const grouped = tasks.reduce<Record<string, { project: { id: string; name: string }; tasks: MyTask[] }>>((acc, task) => {
    if (!acc[task.project.id]) acc[task.project.id] = { project: task.project, tasks: [] };
    acc[task.project.id].tasks.push(task);
    return acc;
  }, {});

  const year = calMonth.getFullYear();
  const month = calMonth.getMonth();
  const today = new Date();
  const isToday = (day: number) => day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const getTasksForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return tasks.filter((t) => t.dueDate === dateStr);
  };

  const priorityCalColor: Record<string, string> = {
    high: "bg-pink-300 text-pink-900",
    medium: "bg-blue-200 text-blue-900",
    low: "bg-emerald-200 text-emerald-900",
  };

  return (
    <>
      <Topbar
        title="My Tasks"
        count={tasks.length}
        actions={
          <div className="flex gap-2">
            <button onClick={() => setView("list")} className={`px-3 py-1.5 text-sm rounded ${view === "list" ? "bg-midnight-blue text-white" : "bg-platinum hover:bg-lavender"}`}>List</button>
            <button onClick={() => setView("calendar")} className={`px-3 py-1.5 text-sm rounded ${view === "calendar" ? "bg-midnight-blue text-white" : "bg-platinum hover:bg-lavender"}`}>Calendar</button>
          </div>
        }
      />
      <div className="p-6">
        <div className="flex gap-2 mb-6">
          {(["incomplete", "all", "complete"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 text-sm rounded capitalize ${filter === f ? "bg-midnight-blue text-white" : "bg-white text-brand-gray border border-platinum hover:bg-white-smoke"}`}
            >
              {f}
            </button>
          ))}
        </div>

        {view === "list" ? (
          tasks.length === 0 ? (
            <EmptyState title="No tasks" description="Tasks assigned to you will appear here." />
          ) : (
            <div className="space-y-6">
              {Object.values(grouped).map(({ project, tasks: projectTasks }) => (
                <div key={project.id}>
                  <div className="flex items-center gap-2 mb-2">
                    <Link href={`/projects/${project.id}`} className="text-sm font-semibold font-heading text-royal-purple hover:text-midnight-blue">
                      {project.name}
                    </Link>
                    <span className="text-xs text-brand-gray">{projectTasks.length} task{projectTasks.length !== 1 ? "s" : ""}</span>
                  </div>
                  <table className="w-full bg-white rounded-lg border border-platinum/50 shadow-[0_4px_34px_rgba(0,0,0,0.05)] overflow-hidden mb-2">
                    <thead>
                      <tr className="text-left text-xs text-brand-gray border-b border-platinum bg-white-smoke/50">
                        <th className="px-3 py-2 w-8"></th>
                        <th className="px-3 py-2">Task</th>
                        <th className="px-3 py-2 w-28">Due Date</th>
                        <th className="px-3 py-2 w-24">Priority</th>
                        <th className="px-3 py-2 w-28">Status</th>
                        <th className="px-3 py-2 w-36">Collaborators</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projectTasks.map((task) => (
                        <tr key={task.id} className="border-b border-platinum/50 last:border-0 hover:bg-white-smoke/50">
                          <td className="px-3 py-2">
                            <input type="checkbox" checked={task.completed} onChange={() => toggleTask(task.id, task.completed)} className="rounded" />
                          </td>
                          <td className="px-3 py-2">
                            <Link href={`/projects/${task.project.id}?task=${task.id}`} className={`text-sm hover:text-royal-purple ${task.completed ? "line-through text-brand-gray" : ""}`}>
                              {task.title}
                            </Link>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="date"
                              defaultValue={task.dueDate || ""}
                              key={task.id + "-due-" + task.dueDate}
                              onChange={(e) => updateField(task.id, "dueDate", e.target.value || null)}
                              className="text-xs text-brand-gray border border-transparent hover:border-platinum focus:border-royal-purple rounded px-1 py-0.5 bg-transparent focus:outline-none cursor-pointer"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={task.priority}
                              onChange={(e) => updateField(task.id, "priority", e.target.value)}
                              className={`px-2 py-0.5 text-xs font-medium rounded border-0 cursor-pointer ${task.priority === "high" ? "bg-red-100 text-red-700" : task.priority === "low" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
                            >
                              <option value="high">High</option>
                              <option value="medium">Medium</option>
                              <option value="low">Low</option>
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={task.status}
                              onChange={(e) => updateField(task.id, "status", e.target.value)}
                              className={`px-2 py-0.5 text-xs font-medium rounded border-0 cursor-pointer ${statusColors[task.status] || "bg-gray-100 text-gray-600"}`}
                            >
                              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={task.collaborators.length > 0 ? task.collaborators[0].person.id : ""}
                              onChange={(e) => {
                                if (e.target.value === "") updateCollaborators(task.id, []);
                                else updateCollaborators(task.id, [e.target.value]);
                              }}
                              className="text-xs text-brand-gray border border-transparent hover:border-platinum focus:border-royal-purple rounded px-1 py-0.5 bg-transparent focus:outline-none cursor-pointer max-w-[130px]"
                            >
                              <option value="">--</option>
                              {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )
        ) : (
          <>
            <CalendarGrid
              year={year}
              month={month}
              onNavigate={(y, m) => setCalMonth(new Date(y, m, 1))}
              renderDay={(date) => {
                const day = date.getDate();
                const dayTasks = getTasksForDay(day);
                const dayOfWeek = date.getDay();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                return (
                  <div className={`p-1.5 min-h-[100px] ${isWeekend ? "bg-gray-50" : ""}`}>
                    <div className={`text-xs mb-1 ${isToday(day) ? "bg-royal-purple text-white w-5 h-5 rounded-full flex items-center justify-center font-bold" : "text-brand-gray"}`}>
                      {day}
                    </div>
                    <div className="space-y-0.5">
                      {dayTasks.slice(0, 4).map((t) => (
                        <Link
                          key={t.id}
                          href={`/projects/${t.project.id}?task=${t.id}`}
                          className={`block text-[10px] px-1.5 py-0.5 rounded truncate ${t.completed ? "bg-gray-100 text-gray-400 line-through" : priorityCalColor[t.priority] || "bg-gray-200 text-gray-700"}`}
                          title={`${t.title} (${t.project.name})`}
                        >
                          {t.title}
                        </Link>
                      ))}
                      {dayTasks.length > 4 && (
                        <div className="text-[10px] text-brand-gray px-1">+{dayTasks.length - 4} more</div>
                      )}
                    </div>
                  </div>
                );
              }}
            />
            <div className="flex items-center gap-4 mt-3 text-xs text-brand-gray">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-pink-300" /> High priority</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-blue-200" /> Medium priority</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-emerald-200" /> Low priority</div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
