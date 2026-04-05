"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import Topbar from "@/components/topbar";
import Modal from "@/components/modal";
import ConfirmDialog from "@/components/confirm-dialog";
import PriorityBadge from "@/components/priority-badge";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const STATUS_OPTIONS = ["On Track", "Slightly Off", "Off Track", "On Hold", "Done"] as const;
const statusColors: Record<string, string> = {
  "On Track": "bg-emerald-100 text-emerald-700",
  "Slightly Off": "bg-amber-100 text-amber-700",
  "Off Track": "bg-red-100 text-red-700",
  "On Hold": "bg-gray-100 text-gray-600",
  "Done": "bg-blue-100 text-blue-700",
};

interface Person { id: string; name: string }
interface Task {
  id: string; title: string; description: string; dueDate: string | null; priority: string; status: string; notes: string; completed: boolean; createdAt: string;
  collaborators: { person: Person }[];
}
interface Project { id: string; name: string; description: string; status: string; notes: string; tasks: Task[] }

export default function ProjectDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: project, mutate } = useSWR<Project>(`/api/projects/${id}`, fetcher);
  const { data: people = [] } = useSWR<Person[]>("/api/people", fetcher);

  const [view, setView] = useState<"list" | "calendar">("list");
  const [taskModal, setTaskModal] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: "", dueDate: "", priority: "medium", status: "On Track", notes: "", description: "", collaborators: [] as string[] });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [calMonth, setCalMonth] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const openAddTask = () => {
    setTaskForm({ title: "", dueDate: "", priority: "medium", status: "On Track", notes: "", description: "", collaborators: [] });
    setTaskModal(true);
  };

  const createTask = async () => {
    const body = { ...taskForm, projectId: id };
    await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setTaskModal(false);
    mutate();
  };

  const updateTaskField = async (taskId: string, field: string, value: unknown) => {
    await fetch(`/api/tasks/${taskId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [field]: value }) });
    mutate();
  };

  const updateTaskCollaborators = async (taskId: string, collaborators: string[]) => {
    await fetch(`/api/tasks/${taskId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ collaborators }) });
    mutate();
  };

  const toggleTask = async (taskId: string, completed: boolean) => {
    await fetch(`/api/tasks/${taskId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ completed: !completed }) });
    mutate();
  };

  const deleteTask = async (taskId: string) => {
    await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    if (selectedTask?.id === taskId) setSelectedTask(null);
    mutate();
  };

  const deleteProject = async () => {
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    router.push("/projects");
  };

  if (!project) return <div className="p-8 text-brand-gray">Loading...</div>;

  // Keep selectedTask in sync with project data
  const activeTask = selectedTask ? project.tasks.find((t) => t.id === selectedTask.id) || null : null;

  // Calendar helpers
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

  const priorityColor: Record<string, string> = { high: "bg-red-400", medium: "bg-amber-400", low: "bg-emerald-400" };

  return (
    <>
      <Topbar
        title={project.name}
        actions={
          <div className="flex gap-2">
            <button onClick={() => setView("list")} className={`px-3 py-1.5 text-sm rounded ${view === "list" ? "bg-midnight-blue text-white" : "bg-platinum hover:bg-lavender"}`}>List</button>
            <button onClick={() => setView("calendar")} className={`px-3 py-1.5 text-sm rounded ${view === "calendar" ? "bg-midnight-blue text-white" : "bg-platinum hover:bg-lavender"}`}>Calendar</button>
            <button onClick={openAddTask} className="px-4 py-1.5 bg-royal-purple text-white text-sm rounded hover:bg-midnight-blue">+ Task</button>
            <button onClick={() => router.push("/projects")} className="px-3 py-1.5 text-sm rounded bg-platinum hover:bg-lavender">Back</button>
            <button onClick={() => setConfirmDelete(true)} className="px-3 py-1.5 text-sm rounded bg-red-500 text-white hover:bg-red-600">Delete</button>
          </div>
        }
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Left: task list or calendar */}
        <div className={`flex-1 overflow-y-auto p-6 transition-all ${activeTask ? "border-r border-platinum" : ""}`}>
          {view === "list" ? (
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-brand-gray border-b border-platinum">
                  <th className="pb-2 w-8"></th>
                  <th className="pb-2">Task</th>
                  <th className="pb-2 w-28">Created</th>
                  <th className="pb-2 w-32">Due Date</th>
                  <th className="pb-2 w-24">Priority</th>
                  <th className="pb-2 w-32">Status</th>
                  <th className="pb-2 w-40">Collaborators</th>
                  <th className="pb-2">Notes</th>
                  <th className="pb-2 w-16"></th>
                </tr>
              </thead>
              <tbody>
                {project.tasks.map((task) => (
                  <tr key={task.id} className={`border-b border-platinum/50 hover:bg-white-smoke/50 ${activeTask?.id === task.id ? "bg-lavender/30" : ""}`}>
                    <td className="py-2">
                      <input type="checkbox" checked={task.completed} onChange={() => toggleTask(task.id, task.completed)} className="rounded" />
                    </td>
                    <td
                      className={`py-2 text-sm cursor-pointer hover:text-royal-purple ${task.completed ? "line-through text-brand-gray" : ""}`}
                      onClick={() => setSelectedTask(activeTask?.id === task.id ? null : task)}
                    >
                      {task.title}
                    </td>
                    <td className="py-2 text-xs text-brand-gray whitespace-nowrap">
                      {new Date(task.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="py-2 text-xs text-brand-gray">{task.dueDate || "—"}</td>
                    <td className="py-2"><PriorityBadge priority={task.priority} /></td>
                    <td className="py-2">
                      <select
                        value={task.status}
                        onChange={(e) => updateTaskField(task.id, "status", e.target.value)}
                        className={`px-2 py-0.5 text-xs font-medium rounded border-0 cursor-pointer ${statusColors[task.status] || "bg-gray-100 text-gray-600"}`}
                      >
                        {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="py-2 text-xs text-brand-gray">
                      {task.collaborators.map((c) => c.person.name).join(", ") || "—"}
                    </td>
                    <td className="py-2">
                      <input
                        defaultValue={task.notes}
                        key={task.id + task.notes}
                        onBlur={(e) => { if (e.target.value !== task.notes) updateTaskField(task.id, "notes", e.target.value); }}
                        placeholder="—"
                        className="w-full px-1 py-0.5 text-xs border border-transparent hover:border-platinum focus:border-royal-purple rounded focus:outline-none bg-transparent"
                      />
                    </td>
                    <td className="py-2">
                      <button onClick={() => deleteTask(task.id)} className="text-xs text-red-400 hover:text-red-600">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <button onClick={() => setCalMonth(new Date(year, month - 1, 1))} className="px-3 py-1 text-sm bg-platinum rounded hover:bg-lavender">&larr;</button>
                <h2 className="font-semibold font-heading">{monthName}</h2>
                <button onClick={() => setCalMonth(new Date(year, month + 1, 1))} className="px-3 py-1 text-sm bg-platinum rounded hover:bg-lavender">&rarr;</button>
              </div>
              <div className="grid grid-cols-7 gap-px bg-platinum">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div key={d} className="bg-white p-2 text-xs text-brand-gray text-center font-medium">{d}</div>
                ))}
                {calDays.map((day, i) => (
                  <div key={i} className={`bg-white p-2 min-h-[80px] ${!day ? "bg-white-smoke" : ""}`}>
                    {day && (
                      <>
                        <div className="text-xs text-brand-gray mb-1">{day}</div>
                        {getTasksForDay(day).map((t) => (
                          <div
                            key={t.id}
                            onClick={() => setSelectedTask(t)}
                            className={`text-xs px-1 py-0.5 rounded mb-0.5 text-white truncate cursor-pointer ${priorityColor[t.priority] || "bg-gray-400"}`}
                          >
                            {t.title}
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Right: task detail panel */}
        {activeTask && (
          <div className="w-[420px] flex-shrink-0 overflow-y-auto bg-white border-l border-platinum">
            <div className="p-5">
              {/* Header */}
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <input
                    type="checkbox"
                    checked={activeTask.completed}
                    onChange={() => toggleTask(activeTask.id, activeTask.completed)}
                    className="rounded mt-1"
                  />
                  <input
                    defaultValue={activeTask.title}
                    key={activeTask.id + "-title-" + activeTask.title}
                    onBlur={(e) => { if (e.target.value !== activeTask.title) updateTaskField(activeTask.id, "title", e.target.value); }}
                    className="text-lg font-semibold font-heading w-full border-0 focus:outline-none bg-transparent"
                  />
                </div>
                <button onClick={() => setSelectedTask(null)} className="text-brand-gray hover:text-brand-black ml-2 text-lg">&times;</button>
              </div>

              {/* Fields table */}
              <div className="space-y-0 border border-platinum rounded-lg overflow-hidden mb-6">
                {/* Due Date */}
                <div className="flex items-center border-b border-platinum">
                  <div className="w-32 px-3 py-2.5 text-xs text-brand-gray bg-white-smoke/50 flex-shrink-0">Due date</div>
                  <div className="flex-1 px-3 py-2.5">
                    <input
                      type="date"
                      defaultValue={activeTask.dueDate || ""}
                      key={activeTask.id + "-due-" + activeTask.dueDate}
                      onChange={(e) => updateTaskField(activeTask.id, "dueDate", e.target.value || null)}
                      className="text-sm border-0 focus:outline-none bg-transparent w-full"
                    />
                  </div>
                </div>
                {/* Priority */}
                <div className="flex items-center border-b border-platinum">
                  <div className="w-32 px-3 py-2.5 text-xs text-brand-gray bg-white-smoke/50 flex-shrink-0">Priority</div>
                  <div className="flex-1 px-3 py-2.5">
                    <select
                      value={activeTask.priority}
                      onChange={(e) => updateTaskField(activeTask.id, "priority", e.target.value)}
                      className="text-sm border-0 focus:outline-none bg-transparent cursor-pointer"
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                </div>
                {/* Status */}
                <div className="flex items-center border-b border-platinum">
                  <div className="w-32 px-3 py-2.5 text-xs text-brand-gray bg-white-smoke/50 flex-shrink-0">Status</div>
                  <div className="flex-1 px-3 py-2.5">
                    <select
                      value={activeTask.status}
                      onChange={(e) => updateTaskField(activeTask.id, "status", e.target.value)}
                      className={`px-2 py-0.5 text-xs font-medium rounded border-0 cursor-pointer ${statusColors[activeTask.status] || "bg-gray-100 text-gray-600"}`}
                    >
                      {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                {/* Collaborators */}
                <div className="flex items-start border-b border-platinum">
                  <div className="w-32 px-3 py-2.5 text-xs text-brand-gray bg-white-smoke/50 flex-shrink-0">Collaborators</div>
                  <div className="flex-1 px-3 py-2.5">
                    <div className="flex flex-wrap gap-1 mb-1">
                      {activeTask.collaborators.length > 0
                        ? activeTask.collaborators.map((c) => (
                            <span key={c.person.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-lavender rounded text-xs">
                              {c.person.name}
                              <button
                                onClick={() => updateTaskCollaborators(activeTask.id, activeTask.collaborators.filter((x) => x.person.id !== c.person.id).map((x) => x.person.id))}
                                className="text-brand-gray hover:text-red-500"
                              >&times;</button>
                            </span>
                          ))
                        : <span className="text-xs text-brand-gray">None</span>}
                    </div>
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value && !activeTask.collaborators.some((c) => c.person.id === e.target.value)) {
                          updateTaskCollaborators(activeTask.id, [...activeTask.collaborators.map((c) => c.person.id), e.target.value]);
                        }
                      }}
                      className="text-xs text-brand-gray border border-platinum rounded px-1 py-0.5 bg-white"
                    >
                      <option value="">+ Add person</option>
                      {people.filter((p) => !activeTask.collaborators.some((c) => c.person.id === p.id)).map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {/* Notes */}
                <div className="flex items-center">
                  <div className="w-32 px-3 py-2.5 text-xs text-brand-gray bg-white-smoke/50 flex-shrink-0">Notes</div>
                  <div className="flex-1 px-3 py-2.5">
                    <input
                      defaultValue={activeTask.notes}
                      key={activeTask.id + "-notes-" + activeTask.notes}
                      onBlur={(e) => { if (e.target.value !== activeTask.notes) updateTaskField(activeTask.id, "notes", e.target.value); }}
                      placeholder="—"
                      className="text-sm border-0 focus:outline-none bg-transparent w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-brand-black mb-2">Description</h3>
                <textarea
                  defaultValue={activeTask.description}
                  key={activeTask.id + "-desc-" + activeTask.description}
                  onBlur={(e) => { if (e.target.value !== activeTask.description) updateTaskField(activeTask.id, "description", e.target.value); }}
                  placeholder="Add a description..."
                  rows={8}
                  className="w-full px-3 py-2 border border-platinum rounded text-sm focus:outline-none focus:border-royal-purple resize-y bg-white"
                />
              </div>

              {/* Footer actions */}
              <div className="flex items-center justify-between text-xs text-brand-gray">
                <span>Created {new Date(activeTask.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                <button onClick={() => deleteTask(activeTask.id)} className="text-red-400 hover:text-red-600">Delete task</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New task modal (only for creating) */}
      <Modal open={taskModal} onClose={() => setTaskModal(false)} title="New Task">
        <div className="space-y-3">
          <input value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} placeholder="Task title" className="w-full px-3 py-2 border border-platinum rounded text-sm focus:outline-none focus:border-royal-purple" autoFocus />
          <input type="date" value={taskForm.dueDate} onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })} className="w-full px-3 py-2 border border-platinum rounded text-sm focus:outline-none focus:border-royal-purple" />
          <select value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })} className="w-full px-3 py-2 border border-platinum rounded text-sm focus:outline-none focus:border-royal-purple">
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <div>
            <label className="block text-sm text-brand-gray mb-1">Collaborators</label>
            <div className="max-h-32 overflow-y-auto border border-platinum rounded p-2">
              {people.map((p) => (
                <label key={p.id} className="flex items-center gap-2 py-0.5 text-sm">
                  <input
                    type="checkbox"
                    checked={taskForm.collaborators.includes(p.id)}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...taskForm.collaborators, p.id]
                        : taskForm.collaborators.filter((c) => c !== p.id);
                      setTaskForm({ ...taskForm, collaborators: next });
                    }}
                  />
                  {p.name}
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={() => setTaskModal(false)} className="px-4 py-2 text-sm rounded bg-platinum hover:bg-lavender">Cancel</button>
          <button onClick={createTask} className="px-4 py-2 text-sm rounded bg-royal-purple text-white hover:bg-midnight-blue">Create</button>
        </div>
      </Modal>
      <ConfirmDialog open={confirmDelete} onClose={() => setConfirmDelete(false)} onConfirm={deleteProject} title="Delete Project" message="Delete this project and all its tasks?" />
    </>
  );
}
