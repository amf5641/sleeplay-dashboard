"use client";
import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import Topbar from "@/components/topbar";
import Modal from "@/components/modal";
import EmptyState from "@/components/empty-state";
import { useRole } from "@/hooks/use-role";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Project { id: string; name: string; description: string; color: string; tasks: { completed: boolean }[]; createdAt: string; updatedAt: string }
interface Template { id: string; name: string; description: string; sections: { name: string; _count: { tasks: number } }[] }

const PROJECT_COLORS = [
  "#E8384F", "#FD612C", "#FDBA31", "#7BC86C", "#4ECBC4",
  "#4573D2", "#664FA6", "#EA4E9D", "#8DA3A6", "#1B0F3D",
];

export default function ProjectsPage() {
  const { canEdit } = useRole();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", templateId: "", color: "#664FA6" });
  const [showTemplates, setShowTemplates] = useState(false);

  const { data: projects = [], mutate } = useSWR<Project[]>(`/api/projects?filter=${filter}`, fetcher);
  const { data: templates = [] } = useSWR<Template[]>(modalOpen ? "/api/templates" : null, fetcher);

  const filtered = projects.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  const createProject = async () => {
    const body: Record<string, string> = { name: form.name, description: form.description, color: form.color };
    if (form.templateId) body.templateId = form.templateId;
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setModalOpen(false);
      setForm({ name: "", description: "", templateId: "", color: "#664FA6" });
      setShowTemplates(false);
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
          canEdit ? (
            <button onClick={() => setModalOpen(true)} className="px-4 py-1.5 bg-royal-purple text-white text-sm rounded hover:bg-midnight-blue transition-colors">
              + New Project
            </button>
          ) : undefined
        }
      />
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2">
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
          <div className="flex gap-1 bg-white border border-platinum rounded overflow-hidden">
            <button
              onClick={() => setView("grid")}
              className={`px-3 py-1.5 text-sm ${view === "grid" ? "bg-midnight-blue text-white" : "text-brand-gray hover:bg-white-smoke"}`}
              title="Grid view"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
            </button>
            <button
              onClick={() => setView("list")}
              className={`px-3 py-1.5 text-sm ${view === "list" ? "bg-midnight-blue text-white" : "text-brand-gray hover:bg-white-smoke"}`}
              title="List view"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
          </div>
        </div>
        {filtered.length === 0 ? (
          <EmptyState title="No projects" description="Create a project to start tracking tasks." />
        ) : view === "grid" ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
              {filtered.map((proj) => {
                const total = proj.tasks.length;
                const done = proj.tasks.filter((t) => t.completed).length;
                return (
                  <Link
                    key={proj.id}
                    href={`/projects/${proj.id}`}
                    className="bg-white rounded-lg p-5 shadow-[0_4px_34px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_34px_rgba(0,0,0,0.08)] transition-shadow border border-platinum/50"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-4 h-4 rounded flex-shrink-0" style={{ backgroundColor: proj.color || "#664FA6" }} />
                      <h3 className="font-semibold font-heading text-brand-black truncate">{proj.name}</h3>
                    </div>
                    {proj.description && <p className="text-xs text-brand-gray mb-2 line-clamp-2">{proj.description}</p>}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-platinum rounded-full overflow-hidden">
                        <div className="h-full bg-royal-purple rounded-full" style={{ width: total ? `${(done / total) * 100}%` : "0%" }} />
                      </div>
                      <span className="text-xs text-brand-gray">{done}/{total}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <table className="w-full bg-white rounded-lg border border-platinum/50 shadow-[0_4px_34px_rgba(0,0,0,0.05)] overflow-hidden">
              <thead>
                <tr className="text-left text-xs text-brand-gray border-b border-platinum bg-white-smoke/50">
                  <th className="px-5 py-3 font-medium">Project</th>
                  <th className="px-5 py-3 font-medium w-48">Progress</th>
                  <th className="px-5 py-3 font-medium w-24 text-center">Tasks</th>
                  <th className="px-5 py-3 font-medium w-32">Created</th>
                  <th className="px-5 py-3 font-medium w-32">Updated</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((proj) => {
                  const total = proj.tasks.length;
                  const done = proj.tasks.filter((t) => t.completed).length;
                  const pct = total ? Math.round((done / total) * 100) : 0;
                  return (
                    <tr key={proj.id} className="border-b border-platinum/50 hover:bg-white-smoke/50 transition-colors">
                      <td className="px-5 py-3">
                        <Link href={`/projects/${proj.id}`} className="hover:text-royal-purple transition-colors flex items-start gap-2">
                          <span className="w-3.5 h-3.5 rounded flex-shrink-0 mt-0.5" style={{ backgroundColor: proj.color || "#664FA6" }} />
                          <div className="min-w-0">
                            <div className="font-semibold font-heading text-sm text-brand-black">{proj.name}</div>
                            {proj.description && <div className="text-xs text-brand-gray mt-0.5 line-clamp-1">{proj.description}</div>}
                          </div>
                        </Link>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-platinum rounded-full overflow-hidden">
                            <div className="h-full bg-royal-purple rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-brand-gray w-8 text-right">{pct}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className="text-sm text-brand-gray">{done}<span className="text-brand-gray/50">/{total}</span></span>
                      </td>
                      <td className="px-5 py-3 text-xs text-brand-gray whitespace-nowrap">
                        {new Date(proj.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="px-5 py-3 text-xs text-brand-gray whitespace-nowrap">
                        {new Date(proj.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
      </div>
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setShowTemplates(false); setForm({ name: "", description: "", templateId: "", color: "#664FA6" }); }} title="New Project">
        <div className="space-y-3">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Project name" className="w-full px-3 py-2 border border-platinum rounded text-sm focus:outline-none focus:border-royal-purple" autoFocus />
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description (optional)" rows={3} className="w-full px-3 py-2 border border-platinum rounded text-sm focus:outline-none focus:border-royal-purple resize-y" />
          <div>
            <p className="text-xs text-brand-gray mb-1.5">Color</p>
            <div className="flex gap-1.5">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, color: c })}
                  className="w-7 h-7 rounded hover:scale-110 transition-transform flex items-center justify-center"
                  style={{ backgroundColor: c }}
                >
                  {form.color === c && (
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  )}
                </button>
              ))}
            </div>
          </div>
          {templates.length > 0 && (
            <div>
              <button onClick={() => setShowTemplates(!showTemplates)} className="text-xs text-royal-purple hover:text-midnight-blue flex items-center gap-1 transition-colors">
                <svg className={`w-3 h-3 transition-transform ${showTemplates ? "rotate-90" : ""}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" /></svg>
                Start from a template
              </button>
              {showTemplates && (
                <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                  <button onClick={() => setForm({ ...form, templateId: "" })} className={`w-full text-left px-3 py-2 rounded border text-sm transition-colors ${!form.templateId ? "border-royal-purple bg-lavender/20" : "border-platinum hover:bg-gray-50"}`}>
                    <span className="font-medium">Blank project</span>
                    <span className="text-xs text-brand-gray block">Start from scratch</span>
                  </button>
                  {templates.map((t) => {
                    const taskCount = t.sections.reduce((sum, s) => sum + s._count.tasks, 0);
                    return (
                      <button key={t.id} onClick={() => setForm({ ...form, templateId: t.id })} className={`w-full text-left px-3 py-2 rounded border text-sm transition-colors ${form.templateId === t.id ? "border-royal-purple bg-lavender/20" : "border-platinum hover:bg-gray-50"}`}>
                        <span className="font-medium">{t.name}</span>
                        <span className="text-xs text-brand-gray block">{t.sections.length} sections, {taskCount} tasks{t.description ? ` -- ${t.description}` : ""}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={() => { setModalOpen(false); setShowTemplates(false); setForm({ name: "", description: "", templateId: "", color: "#664FA6" }); }} className="px-4 py-2 text-sm rounded bg-platinum hover:bg-lavender">Cancel</button>
          <button onClick={createProject} className="px-4 py-2 text-sm rounded bg-royal-purple text-white hover:bg-midnight-blue">Create</button>
        </div>
      </Modal>
    </>
  );
}
