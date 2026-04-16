"use client";
import { useState, useRef, useCallback } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useClickOutside, useEscapeKey } from "@/hooks/use-click-outside";
import Topbar from "@/components/topbar";
import Modal from "@/components/modal";
import EmptyState from "@/components/empty-state";
import { useRole } from "@/hooks/use-role";
import { useToast } from "@/components/toast";
import { fetcher, apiFetch } from "@/lib/utils";

interface Project { id: string; name: string; description: string; color: string; departmentId: string | null; department: { id: string; name: string; color: string } | null; tasks: { completed: boolean }[]; createdAt: string; updatedAt: string }
interface Department { id: string; name: string; color: string; _count: { projects: number } }
interface Template { id: string; name: string; description: string; sections: { name: string; _count: { tasks: number } }[] }

const PROJECT_COLORS = [
  "#E8384F", "#FD612C", "#FDBA31", "#7BC86C", "#4ECBC4",
  "#4573D2", "#664FA6", "#EA4E9D", "#8DA3A6", "#1B0F3D",
];

export default function ProjectsPage() {
  const { canEdit } = useRole();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("list");
  const [modalOpen, setModalOpen] = useState(false);
  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", templateId: "", color: "#664FA6", departmentId: "" });
  const [deptForm, setDeptForm] = useState({ name: "", color: "#664FA6" });
  const [showTemplates, setShowTemplates] = useState(false);
  const [collapsedDepts, setCollapsedDepts] = useState<Set<string>>(new Set());
  const [movingProjectId, setMovingProjectId] = useState<string | null>(null);
  const moveDropdownRef = useRef<HTMLDivElement>(null);

  const closeMoveDropdown = useCallback(() => setMovingProjectId(null), []);
  useClickOutside(moveDropdownRef, closeMoveDropdown, !!movingProjectId);
  useEscapeKey(closeMoveDropdown, !!movingProjectId);

  const { data: projects = [], mutate } = useSWR<Project[]>(`/api/projects?filter=${filter}`, fetcher);
  const { data: departments = [], mutate: mutateDepts } = useSWR<Department[]>("/api/departments", fetcher);
  const { data: templates = [] } = useSWR<Template[]>(modalOpen ? "/api/templates" : null, fetcher);

  const filtered = projects.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  // Group projects by department
  const grouped = departments.map((dept) => ({
    ...dept,
    projects: filtered.filter((p) => p.departmentId === dept.id),
  }));
  const ungrouped = filtered.filter((p) => !p.departmentId);

  const toggleCollapse = (id: string) => {
    setCollapsedDepts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const createProject = async () => {
    if (!form.name.trim()) { toast("Project name is required", "error"); return; }
    setSaving(true);
    const body: Record<string, string> = { name: form.name, description: form.description, color: form.color };
    if (form.templateId) body.templateId = form.templateId;
    if (form.departmentId) body.departmentId = form.departmentId;
    const { error } = await apiFetch("/api/projects", { method: "POST", body: JSON.stringify(body) });
    setSaving(false);
    if (error) { toast(error, "error"); return; }
    setModalOpen(false);
    setForm({ name: "", description: "", templateId: "", color: "#664FA6", departmentId: "" });
    setShowTemplates(false);
    mutate();
    mutateDepts();
    toast("Project created", "success");
  };

  const createDepartment = async () => {
    if (!deptForm.name.trim()) { toast("Department name is required", "error"); return; }
    setSaving(true);
    const { error } = await apiFetch("/api/departments", { method: "POST", body: JSON.stringify(deptForm) });
    setSaving(false);
    if (error) { toast(error, "error"); return; }
    setDeptModalOpen(false);
    setDeptForm({ name: "", color: "#664FA6" });
    mutateDepts();
    toast("Department created", "success");
  };

  const deleteDepartment = async (id: string) => {
    if (!confirm("Delete this department? Projects will be moved to Uncategorized.")) return;
    const { error } = await apiFetch("/api/departments", { method: "DELETE", body: JSON.stringify({ id }) });
    if (error) { toast(error, "error"); return; }
    mutateDepts();
    mutate();
    toast("Department deleted", "success");
  };

  const moveProject = async (projectId: string, departmentId: string | null) => {
    const { error } = await apiFetch(`/api/projects/${projectId}`, { method: "PUT", body: JSON.stringify({ departmentId }) });
    if (error) { toast(error, "error"); return; }
    setMovingProjectId(null);
    mutate();
    mutateDepts();
  };

  const renderProjectCard = (proj: Project) => {
    const total = proj.tasks.length;
    const done = proj.tasks.filter((t) => t.completed).length;
    const isMoving = movingProjectId === proj.id;
    return (
      <div key={proj.id} className="bg-white rounded-lg p-5 shadow-[0_4px_34px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_34px_rgba(0,0,0,0.08)] transition-shadow border border-platinum/50 relative group/card">
        {canEdit && departments.length > 0 && (
          <div className="absolute top-2 right-2">
            <button
              onClick={(e) => { e.preventDefault(); setMovingProjectId(isMoving ? null : proj.id); }}
              className="opacity-0 group-hover/card:opacity-100 p-1 rounded hover:bg-white-smoke text-brand-gray hover:text-brand-black transition-all"
              title="Move to department"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
            </button>
            {isMoving && (
              <div ref={moveDropdownRef} className="absolute right-0 top-8 bg-white border border-platinum rounded-lg shadow-lg py-1 z-50 min-w-[160px]">
                <p className="px-3 py-1 text-[10px] uppercase tracking-wider text-brand-gray font-medium">Move to</p>
                {departments.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => moveProject(proj.id, d.id)}
                    className={`w-full text-left px-3 py-1.5 text-sm hover:bg-white-smoke flex items-center gap-2 transition-colors ${proj.departmentId === d.id ? "text-royal-purple font-medium" : "text-brand-black"}`}
                  >
                    <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: d.color }} />
                    {d.name}
                    {proj.departmentId === d.id && <span className="text-xs text-brand-gray ml-auto">current</span>}
                  </button>
                ))}
                <div className="border-t border-platinum my-1" />
                <button
                  onClick={() => moveProject(proj.id, null)}
                  className={`w-full text-left px-3 py-1.5 text-sm hover:bg-white-smoke flex items-center gap-2 transition-colors ${!proj.departmentId ? "text-royal-purple font-medium" : "text-brand-gray"}`}
                >
                  <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0 bg-brand-gray/30" />
                  No department
                </button>
              </div>
            )}
          </div>
        )}
        <Link href={`/projects/${proj.id}`}>
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
      </div>
    );
  };

  const renderProjectRow = (proj: Project) => {
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
          {canEdit && departments.length > 0 ? (
            <select
              value={proj.departmentId || ""}
              onChange={(e) => moveProject(proj.id, e.target.value || null)}
              className="text-xs text-brand-gray bg-transparent border border-transparent hover:border-platinum rounded px-1 py-0.5 focus:outline-none focus:border-royal-purple cursor-pointer"
            >
              <option value="">None</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          ) : (
            <span className="text-xs text-brand-gray">{proj.department?.name || "—"}</span>
          )}
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
  };

  const renderDeptSection = (dept: { id: string; name: string; color: string; projects: Project[] }, isDeletable: boolean) => {
    const collapsed = collapsedDepts.has(dept.id);
    if (dept.projects.length === 0 && dept.id === "__ungrouped") return null;

    return (
      <div key={dept.id} className="mb-6">
        <div className="flex items-center gap-2 mb-3 group">
          <button onClick={() => toggleCollapse(dept.id)} className="flex items-center gap-2 hover:opacity-80">
            <svg className={`w-4 h-4 text-brand-gray transition-transform ${collapsed ? "" : "rotate-90"}`} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
            </svg>
            <span className="w-3.5 h-3.5 rounded flex-shrink-0" style={{ backgroundColor: dept.color }} />
            <h2 className="font-heading font-semibold text-brand-black text-sm">{dept.name}</h2>
            <span className="text-xs text-brand-gray">({dept.projects.length})</span>
          </button>
          {isDeletable && canEdit && (
            <button
              onClick={() => deleteDepartment(dept.id)}
              className="opacity-0 group-hover:opacity-100 text-xs text-red-400 hover:text-red-600 transition-all ml-1"
              title="Delete department"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          )}
        </div>
        {!collapsed && (
          dept.projects.length === 0 ? (
            <p className="text-xs text-brand-gray ml-10">No projects in this department</p>
          ) : view === "grid" ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4 ml-6">
              {dept.projects.map(renderProjectCard)}
            </div>
          ) : (
            <table className="w-full bg-white rounded-lg border border-platinum/50 shadow-[0_4px_34px_rgba(0,0,0,0.05)] overflow-hidden ml-6">
              <thead>
                <tr className="text-left text-xs text-brand-gray border-b border-platinum bg-white-smoke/50">
                  <th className="px-5 py-3 font-medium">Project</th>
                  <th className="px-5 py-3 font-medium w-36">Department</th>
                  <th className="px-5 py-3 font-medium w-48">Progress</th>
                  <th className="px-5 py-3 font-medium w-24 text-center">Tasks</th>
                  <th className="px-5 py-3 font-medium w-32">Created</th>
                  <th className="px-5 py-3 font-medium w-32">Updated</th>
                </tr>
              </thead>
              <tbody>{dept.projects.map(renderProjectRow)}</tbody>
            </table>
          )
        )}
      </div>
    );
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
            <div className="flex gap-2">
              <button onClick={() => setDeptModalOpen(true)} className="px-4 py-1.5 bg-white text-brand-gray text-sm rounded border border-platinum hover:bg-white-smoke transition-colors">
                + Department
              </button>
              <button onClick={() => setModalOpen(true)} className="px-4 py-1.5 bg-royal-purple text-white text-sm rounded hover:bg-midnight-blue transition-colors">
                + New Project
              </button>
            </div>
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
              onClick={() => setView("list")}
              className={`px-3 py-1.5 text-sm ${view === "list" ? "bg-midnight-blue text-white" : "text-brand-gray hover:bg-white-smoke"}`}
              title="List view"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <button
              onClick={() => setView("grid")}
              className={`px-3 py-1.5 text-sm ${view === "grid" ? "bg-midnight-blue text-white" : "text-brand-gray hover:bg-white-smoke"}`}
              title="Grid view"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
            </button>
          </div>
        </div>

        {filtered.length === 0 && departments.length === 0 ? (
          <EmptyState title="No projects" description="Create a department and project to start tracking tasks." />
        ) : (
          <>
            {grouped.map((dept) => renderDeptSection(dept, true))}
            {ungrouped.length > 0 && renderDeptSection({ id: "__ungrouped", name: "Uncategorized", color: "#8DA3A6", projects: ungrouped }, false)}
          </>
        )}
      </div>

      {/* New Project Modal */}
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setShowTemplates(false); setForm({ name: "", description: "", templateId: "", color: "#664FA6", departmentId: "" }); }} title="New Project">
        <div className="space-y-3">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Project name" className="w-full px-3 py-2 border border-platinum rounded text-sm focus:outline-none focus:border-royal-purple" autoFocus />
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description (optional)" rows={3} className="w-full px-3 py-2 border border-platinum rounded text-sm focus:outline-none focus:border-royal-purple resize-y" />
          {departments.length > 0 && (
            <div>
              <p className="text-xs text-brand-gray mb-1.5">Department</p>
              <select
                value={form.departmentId}
                onChange={(e) => {
                  const deptId = e.target.value;
                  const dept = departments.find((d) => d.id === deptId);
                  setForm({ ...form, departmentId: deptId, color: dept ? dept.color : form.color });
                }}
                className="w-full px-3 py-2 border border-platinum rounded text-sm focus:outline-none focus:border-royal-purple bg-white"
              >
                <option value="">No department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          )}
          {!form.departmentId && (
            <div>
              <p className="text-xs text-brand-gray mb-1.5">Color</p>
              <div className="flex gap-2 flex-wrap">
                {PROJECT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, color: c })}
                    className="w-9 h-9 rounded-md hover:scale-105 transition-transform flex items-center justify-center"
                    style={{ backgroundColor: c }}
                  >
                    {form.color === c && (
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
          {form.departmentId && (
            <p className="text-xs text-brand-gray flex items-center gap-1.5">
              <span className="w-3 h-3 rounded" style={{ backgroundColor: form.color }} />
              Color inherited from department
            </p>
          )}
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
          <button onClick={() => { setModalOpen(false); setShowTemplates(false); setForm({ name: "", description: "", templateId: "", color: "#664FA6", departmentId: "" }); }} className="px-4 py-2 text-sm rounded bg-platinum hover:bg-lavender">Cancel</button>
          <button onClick={createProject} disabled={saving} className="px-4 py-2 text-sm rounded bg-royal-purple text-white hover:bg-midnight-blue disabled:opacity-50 disabled:cursor-not-allowed">{saving ? "Creating..." : "Create"}</button>
        </div>
      </Modal>

      {/* New Department Modal */}
      <Modal open={deptModalOpen} onClose={() => { setDeptModalOpen(false); setDeptForm({ name: "", color: "#664FA6" }); }} title="New Department">
        <div className="space-y-3">
          <input value={deptForm.name} onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })} placeholder="Department name" className="w-full px-3 py-2 border border-platinum rounded text-sm focus:outline-none focus:border-royal-purple" autoFocus />
          <div>
            <p className="text-xs text-brand-gray mb-1.5">Color</p>
            <div className="flex gap-2 flex-wrap">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setDeptForm({ ...deptForm, color: c })}
                  className="w-9 h-9 rounded-md hover:scale-105 transition-transform flex items-center justify-center"
                  style={{ backgroundColor: c }}
                >
                  {deptForm.color === c && (
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={() => { setDeptModalOpen(false); setDeptForm({ name: "", color: "#664FA6" }); }} className="px-4 py-2 text-sm rounded bg-platinum hover:bg-lavender">Cancel</button>
          <button onClick={createDepartment} disabled={saving} className="px-4 py-2 text-sm rounded bg-royal-purple text-white hover:bg-midnight-blue disabled:opacity-50 disabled:cursor-not-allowed">{saving ? "Creating..." : "Create"}</button>
        </div>
      </Modal>
    </>
  );
}
