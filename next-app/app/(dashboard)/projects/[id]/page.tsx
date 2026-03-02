"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import Topbar from "@/components/topbar";
import Modal from "@/components/modal";
import ConfirmDialog from "@/components/confirm-dialog";
import PriorityBadge from "@/components/priority-badge";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Person { id: string; name: string }
interface Task {
  id: string; title: string; dueDate: string | null; priority: string; completed: boolean;
  collaborators: { person: Person }[];
}
interface Project { id: string; name: string; description: string; tasks: Task[] }

export default function ProjectDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: project, mutate } = useSWR<Project>(`/api/projects/${id}`, fetcher);
  const { data: people = [] } = useSWR<Person[]>("/api/people", fetcher);

  const [view, setView] = useState<"list" | "calendar">("list");
  const [taskModal, setTaskModal] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [taskForm, setTaskForm] = useState({ title: "", dueDate: "", priority: "medium", collaborators: [] as string[] });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [calMonth, setCalMonth] = useState(new Date());

  const openAddTask = () => {
    setEditTask(null);
    setTaskForm({ title: "", dueDate: "", priority: "medium", collaborators: [] });
    setTaskModal(true);
  };

  const openEditTask = (task: Task) => {
    setEditTask(task);
    setTaskForm({
      title: task.title,
      dueDate: task.dueDate || "",
      priority: task.priority,
      collaborators: task.collaborators.map((c) => c.person.id),
    });
    setTaskModal(true);
  };

  const saveTask = async () => {
    const body = { ...taskForm, projectId: id };
    if (editTask) {
      await fetch(`/api/tasks/${editTask.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } else {
      await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }
    setTaskModal(false);
    mutate();
  };

  const toggleTask = async (taskId: string, completed: boolean) => {
    await fetch(`/api/tasks/${taskId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ completed: !completed }) });
    mutate();
  };

  const deleteTask = async (taskId: string) => {
    await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    mutate();
  };

  const deleteProject = async () => {
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    router.push("/projects");
  };

  if (!project) return <div className="p-8 text-brand-gray">Loading...</div>;

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

      {view === "list" ? (
        <div className="flex-1 overflow-y-auto p-6">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-brand-gray border-b border-platinum">
                <th className="pb-2 w-8"></th>
                <th className="pb-2">Task</th>
                <th className="pb-2 w-32">Due Date</th>
                <th className="pb-2 w-24">Priority</th>
                <th className="pb-2 w-40">Collaborators</th>
                <th className="pb-2 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {project.tasks.map((task) => (
                <tr key={task.id} className="border-b border-platinum/50 hover:bg-white-smoke/50">
                  <td className="py-2">
                    <input type="checkbox" checked={task.completed} onChange={() => toggleTask(task.id, task.completed)} className="rounded" />
                  </td>
                  <td className={`py-2 text-sm cursor-pointer hover:text-royal-purple ${task.completed ? "line-through text-brand-gray" : ""}`} onClick={() => openEditTask(task)}>
                    {task.title}
                  </td>
                  <td className="py-2 text-xs text-brand-gray">{task.dueDate || "—"}</td>
                  <td className="py-2"><PriorityBadge priority={task.priority} /></td>
                  <td className="py-2 text-xs text-brand-gray">
                    {task.collaborators.map((c) => c.person.name).join(", ") || "—"}
                  </td>
                  <td className="py-2">
                    <button onClick={() => deleteTask(task.id)} className="text-xs text-red-400 hover:text-red-600">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-6">
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
                      <div key={t.id} className={`text-xs px-1 py-0.5 rounded mb-0.5 text-white truncate ${priorityColor[t.priority] || "bg-gray-400"}`}>
                        {t.title}
                      </div>
                    ))}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal open={taskModal} onClose={() => setTaskModal(false)} title={editTask ? "Edit Task" : "New Task"}>
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
          <button onClick={saveTask} className="px-4 py-2 text-sm rounded bg-royal-purple text-white hover:bg-midnight-blue">Save</button>
        </div>
      </Modal>
      <ConfirmDialog open={confirmDelete} onClose={() => setConfirmDelete(false)} onConfirm={deleteProject} title="Delete Project" message="Delete this project and all its tasks?" />
    </>
  );
}
