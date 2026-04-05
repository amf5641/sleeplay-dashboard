"use client";
import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import Topbar from "@/components/topbar";
import Modal from "@/components/modal";
import EmptyState from "@/components/empty-state";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const STATUS_OPTIONS = ["On Track", "Slightly Off", "Off Track", "On Hold", "Done"] as const;
const statusColors: Record<string, string> = {
  "On Track": "bg-emerald-100 text-emerald-700",
  "Slightly Off": "bg-amber-100 text-amber-700",
  "Off Track": "bg-red-100 text-red-700",
  "On Hold": "bg-gray-100 text-gray-600",
  "Done": "bg-blue-100 text-blue-700",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${statusColors[status] || "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}

interface Project { id: string; name: string; description: string; status: string; notes: string; tasks: { completed: boolean }[]; createdAt: string; updatedAt: string }

export default function ProjectsPage() {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", status: "On Track", notes: "" });

  const { data: projects = [], mutate } = useSWR<Project[]>(`/api/projects?filter=${filter}`, fetcher);

  const filtered = projects.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  const createProject = async () => {
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setModalOpen(false);
      setForm({ name: "", description: "", status: "On Track", notes: "" });
      mutate();
    }
  };

  return (
    <>
      <Topbar
        title="Projects"
        count={filtered.length}
        searchValue={search}
        onSearch={setSearch}
        searchPlaceholder="Search projects..."
        actions={
          <button onClick={() => setModalOpen(true)} className="px-4 py-1.5 bg-royal-purple text-white text-sm rounded hover:bg-midnight-blue transition-colors">
            + New Project
          </button>
        }
      />
      <div className="p-6">
        <div className="flex gap-2 mb-6">
          {["all", "incomplete", "complete"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 text-sm rounded capitalize ${filter === f ? "bg-midnight-blue text-white" : "bg-white text-brand-gray border border-platinum hover:bg-white-smoke"}`}
            >
              {f}
            </button>
          ))}
        </div>
        {filtered.length === 0 ? (
          <EmptyState title="No projects" description="Create a project to start tracking tasks." />
        ) : (
          <div className="bg-white rounded-lg shadow-[0_4px_34px_rgba(0,0,0,0.05)] border border-platinum/50 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-brand-gray border-b border-platinum">
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3 w-28">Created</th>
                  <th className="px-4 py-3 w-36">Status</th>
                  <th className="px-4 py-3 w-24">Progress</th>
                  <th className="px-4 py-3">Notes</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((proj) => {
                  const total = proj.tasks.length;
                  const done = proj.tasks.filter((t) => t.completed).length;
                  return (
                    <tr key={proj.id} className="border-b border-platinum/50 hover:bg-white-smoke/50">
                      <td className="px-4 py-3">
                        <Link href={`/projects/${proj.id}`} className="font-semibold font-heading text-sm text-brand-black hover:text-royal-purple">
                          {proj.name}
                        </Link>
                        {proj.description && <p className="text-xs text-brand-gray mt-0.5 line-clamp-1">{proj.description}</p>}
                      </td>
                      <td className="px-4 py-3 text-xs text-brand-gray whitespace-nowrap">
                        {new Date(proj.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={proj.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-platinum rounded-full overflow-hidden">
                            <div className="h-full bg-royal-purple rounded-full" style={{ width: total ? `${(done / total) * 100}%` : "0%" }} />
                          </div>
                          <span className="text-xs text-brand-gray whitespace-nowrap">{done}/{total}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-brand-gray max-w-[200px] truncate">
                        {proj.notes || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Project">
        <div className="space-y-3">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Project name" className="w-full px-3 py-2 border border-platinum rounded text-sm focus:outline-none focus:border-royal-purple" autoFocus />
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description (optional)" rows={2} className="w-full px-3 py-2 border border-platinum rounded text-sm focus:outline-none focus:border-royal-purple resize-y" />
          <div>
            <label className="block text-xs font-medium text-brand-gray mb-1">Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 border border-platinum rounded text-sm focus:outline-none focus:border-royal-purple bg-white">
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes (optional)" rows={2} className="w-full px-3 py-2 border border-platinum rounded text-sm focus:outline-none focus:border-royal-purple resize-y" />
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm rounded bg-platinum hover:bg-lavender">Cancel</button>
          <button onClick={createProject} className="px-4 py-2 text-sm rounded bg-royal-purple text-white hover:bg-midnight-blue">Create</button>
        </div>
      </Modal>
    </>
  );
}
