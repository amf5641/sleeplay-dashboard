"use client";
import React, { useState, useRef, useCallback, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import Modal from "@/components/modal";
import ConfirmDialog from "@/components/confirm-dialog";
import { useRole } from "@/hooks/use-role";
import TimelineView from "@/components/timeline-view";
import { fetcher } from "@/lib/utils";
import type { Person, AppUser, Project, Department, Task, TaskComment, TaskCustomFieldValue } from "@/components/project/types";
import { PROJECT_COLORS, STATUS_OPTIONS, statusColors, statusDot, isUrl, toHref, BUILTIN_COLUMNS, priorityColor } from "@/components/project/types";
import Initials from "@/components/project/initials";
import TaskDetailPanel from "@/components/project/task-detail-panel";
import BoardView from "@/components/project/board-view";
import CalendarView from "@/components/project/calendar-view";

function LoadingSkeleton() {
  return (
    <div className="p-8">
      <div className="h-8 w-64 bg-platinum/60 rounded animate-skeleton mb-4" />
      <div className="h-10 w-full bg-platinum/40 rounded animate-skeleton mb-2" />
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-11 w-full bg-platinum/30 rounded animate-skeleton mb-1" />
      ))}
    </div>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { canEdit, isAdmin } = useRole();
  const { data: project, mutate } = useSWR<Project>(`/api/projects/${id}`, fetcher);
  const { data: people = [] } = useSWR<Person[]>("/api/people", fetcher);
  const { data: allUsers = [] } = useSWR<AppUser[]>("/api/users", fetcher);
  const { data: departments = [] } = useSWR<Department[]>("/api/departments", fetcher);

  const [view, setView] = useState<"list" | "board" | "calendar" | "timeline">("list");
  const [taskFilter, setTaskFilter] = useState<"all" | "incomplete" | "complete">("incomplete");
  const [membersModal, setMembersModal] = useState(false);
  const [taskModal, setTaskModal] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: "", dueDate: "", priority: "medium", status: "On Track", notes: "", description: "", collaborators: [] as string[], section: "" });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmTaskDelete, setConfirmTaskDelete] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [sectionsInitialized, setSectionsInitialized] = useState(false);
  const [dragSection, setDragSection] = useState<string | null>(null);
  const [dragOverSection, setDragOverSection] = useState<string | null>(null);
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [confirmSectionDelete, setConfirmSectionDelete] = useState<string | null>(null);
  const [calMonth, setCalMonth] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [addFieldModal, setAddFieldModal] = useState(false);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState<"text" | "single-select" | "multi-select">("text");
  const [newFieldOptions, setNewFieldOptions] = useState<string[]>([]);
  const [newFieldOptionInput, setNewFieldOptionInput] = useState("");
  const [editFieldId, setEditFieldId] = useState<string | null>(null);
  const [editFieldOptions, setEditFieldOptions] = useState<string[]>([]);
  const [editFieldOptionInput, setEditFieldOptionInput] = useState("");
  const [columnsDropdown, setColumnsDropdown] = useState(false);
  const columnsDropdownRef = useRef<HTMLDivElement>(null);
  const [inlineAddSection, setInlineAddSection] = useState<string | null>(null);
  const [inlineAddTitle, setInlineAddTitle] = useState("");
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const headerMenuRef = useRef<HTMLDivElement>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [attachName, setAttachName] = useState("");
  const [attachUrl, setAttachUrl] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const [boardDragId, setBoardDragId] = useState<string | null>(null);
  const [boardDragOver, setBoardDragOver] = useState<string | null>(null);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);

  useEffect(() => {
    if (project && !sectionsInitialized) {
      const allSections = new Set<string>();
      for (const task of project.tasks) {
        const match = task.notes.match(/^\[([^\]]+)\]/);
        if (match) allSections.add(match[1]);
      }
      const taskParam = searchParams.get("task");
      if (taskParam) {
        const targetTask = project.tasks.find((t) => t.id === taskParam);
        if (targetTask) {
          setSelectedTask(targetTask);
          const taskSection = targetTask.notes.match(/^\[([^\]]+)\]/);
          if (taskSection) allSections.delete(taskSection[1]);
        }
      }
      if (allSections.size > 0) setCollapsedSections(allSections);
      setSectionsInitialized(true);
    }
  }, [project, sectionsInitialized, searchParams]);

  useEffect(() => {
    if (!columnsDropdown) return;
    const handler = (e: MouseEvent) => {
      if (columnsDropdownRef.current && !columnsDropdownRef.current.contains(e.target as Node)) setColumnsDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [columnsDropdown]);

  useEffect(() => {
    if (!headerMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target as Node)) setHeaderMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [headerMenuOpen]);

  useEffect(() => {
    if (!selectedTask) { setComments([]); return; }
    fetch(`/api/tasks/${selectedTask.id}/comments`).then((r) => r.json()).then(setComments).catch(() => setComments([]));
  }, [selectedTask?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const postComment = async () => {
    if (!selectedTask || !commentBody.trim()) return;
    const res = await fetch(`/api/tasks/${selectedTask.id}/comments`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: commentBody }),
    });
    if (res.ok) {
      const comment = await res.json();
      setComments((prev) => [...prev, comment]);
      setCommentBody("");
    }
  };

  const deleteComment = async (commentId: string) => {
    await fetch(`/api/comments/${commentId}`, { method: "DELETE" });
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  };

  const addAttachment = async (taskId: string) => {
    if (!attachName.trim() || !attachUrl.trim()) return;
    await fetch(`/api/tasks/${taskId}/attachments`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: attachName.trim(), url: attachUrl.trim() }),
    });
    setAttachName(""); setAttachUrl("");
    mutate();
  };

  const deleteAttachment = async (attachId: string) => {
    await fetch(`/api/attachments/${attachId}`, { method: "DELETE" });
    mutate();
  };

  const insertMention = (person: Person) => {
    const mention = `@[${person.name}](${person.id})`;
    setCommentBody((prev) => prev.replace(/@\w*$/, mention + " "));
    setShowMentions(false);
    setMentionFilter("");
    commentInputRef.current?.focus();
  };

  const renderCommentBody = (body: string) => {
    return body.replace(/@\[([^\]]+)\]\([^)]+\)/g, '<strong class="text-royal-purple">@$1</strong>');
  };

  const addDependency = async (taskId: string, blockedByTaskId: string) => {
    await fetch(`/api/tasks/${taskId}/dependencies`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blockedByTaskId }),
    });
    mutate();
  };

  const removeDependency = async (taskId: string, blockedByTaskId: string) => {
    await fetch(`/api/tasks/${taskId}/dependencies`, {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blockedByTaskId }),
    });
    mutate();
  };

  const openAddTask = () => {
    setTaskForm({ title: "", dueDate: "", priority: "medium", status: "On Track", notes: "", description: "", collaborators: [], section: "" });
    setTaskModal(true);
  };

  const createTask = async () => {
    const notes = taskForm.section ? `[${taskForm.section}] ${taskForm.notes}`.trim() : taskForm.notes;
    const body = { ...taskForm, notes, projectId: id };
    await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setTaskModal(false);
    mutate();
  };

  const createInlineTask = async (section: string | null) => {
    const title = inlineAddTitle.trim();
    if (!title) { setInlineAddSection(null); return; }
    const notes = section ? `[${section}]` : "";
    await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, notes, projectId: id }) });
    setInlineAddTitle("");
    setInlineAddSection(null);
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

  const addMember = async (userId: string) => {
    await fetch(`/api/projects/${id}/members`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId }) });
    mutate();
  };

  const removeMember = async (userId: string) => {
    await fetch(`/api/projects/${id}/members`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId }) });
    mutate();
  };

  const createCustomField = async () => {
    const name = newFieldName.trim();
    if (!name) return;
    await fetch(`/api/projects/${id}/custom-fields`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, type: newFieldType, options: newFieldOptions }) });
    setAddFieldModal(false); setNewFieldName(""); setNewFieldType("text"); setNewFieldOptions([]); setNewFieldOptionInput("");
    mutate();
  };

  const deleteCustomField = async (fieldId: string) => {
    await fetch(`/api/custom-fields/${fieldId}`, { method: "DELETE" });
    mutate();
  };

  const updateCustomFieldOptions = async (fieldId: string, options: string[]) => {
    await fetch(`/api/custom-fields/${fieldId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ options }) });
    mutate();
  };

  const updateTaskCustomFieldValue = async (taskId: string, customFieldId: string, value: string) => {
    await fetch(`/api/tasks/${taskId}/custom-field-values`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customFieldId, value }) });
    mutate();
  };

  const getFieldValue = (task: { customFieldValues: TaskCustomFieldValue[] }, fieldId: string): string => {
    return task.customFieldValues?.find((v) => v.customFieldId === fieldId)?.value || "";
  };

  if (!project) return <LoadingSkeleton />;

  const hiddenColumns: string[] = (() => {
    try { const c = JSON.parse(project.columnConfig || "{}"); return c.hiddenColumns || []; } catch { return []; }
  })();
  const isColumnVisible = (key: string) => !hiddenColumns.includes(key);
  const toggleColumn = async (key: string) => {
    const next = hiddenColumns.includes(key) ? hiddenColumns.filter((k) => k !== key) : [...hiddenColumns, key];
    await fetch(`/api/projects/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ columnConfig: JSON.stringify({ hiddenColumns: next }) }) });
    mutate();
  };

  const activeTask = selectedTask ? project.tasks.find((t) => t.id === selectedTask.id) || null : null;

  const getTaskSection = (task: Task) => {
    const match = task.notes.match(/^\[([^\]]+)\]/);
    return match ? match[1] : null;
  };

  const savedOrder: string[] = (() => {
    try { return JSON.parse(project.sectionOrder || "[]"); } catch { return []; }
  })();

  const groupedTasks: { section: string | null; tasks: Task[] }[] = (() => {
    const groups = new Map<string | null, Task[]>();
    for (const task of project.tasks) {
      const section = getTaskSection(task);
      if (!groups.has(section)) groups.set(section, []);
      groups.get(section)!.push(task);
    }
    const sectionNames = [...groups.keys()].filter((s) => s !== null) as string[];
    const sorted: string[] = [];
    for (const name of savedOrder) { if (sectionNames.includes(name)) sorted.push(name); }
    for (const name of sectionNames) { if (!sorted.includes(name)) sorted.push(name); }
    const result: { section: string | null; tasks: Task[] }[] = [];
    for (const name of sorted) { result.push({ section: name, tasks: groups.get(name)! }); }
    if (groups.has(null)) result.push({ section: null, tasks: groups.get(null)! });
    return result;
  })();

  const hasSections = groupedTasks.some((g) => g.section !== null);

  const toggleSection = (section: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section); else next.add(section);
      return next;
    });
  };

  const handleSectionDrop = (fromSection: string, toSection: string) => {
    if (fromSection === toSection) return;
    const sections = groupedTasks.filter((g) => g.section !== null).map((g) => g.section as string);
    const fromIdx = sections.indexOf(fromSection);
    const toIdx = sections.indexOf(toSection);
    if (fromIdx < 0 || toIdx < 0) return;
    sections.splice(fromIdx, 1);
    sections.splice(toIdx, 0, fromSection);
    fetch(`/api/projects/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sectionOrder: JSON.stringify(sections) }) });
    mutate();
  };

  const renameSection = async (oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) { setEditingSection(null); return; }
    const tasksInSection = project.tasks.filter((t) => { const m = t.notes.match(/^\[([^\]]+)\]/); return m && m[1] === oldName; });
    for (const task of tasksInSection) {
      await fetch(`/api/tasks/${task.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notes: task.notes.replace(`[${oldName}]`, `[${trimmed}]`) }) });
    }
    const sections = groupedTasks.filter((g) => g.section !== null).map((g) => g.section === oldName ? trimmed : g.section as string);
    await fetch(`/api/projects/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sectionOrder: JSON.stringify(sections) }) });
    setEditingSection(null);
    mutate();
  };

  const deleteSection = async (sectionName: string) => {
    const tasksInSection = project.tasks.filter((t) => { const m = t.notes.match(/^\[([^\]]+)\]/); return m && m[1] === sectionName; });
    for (const task of tasksInSection) {
      await fetch(`/api/tasks/${task.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notes: task.notes.replace(/^\[[^\]]+\]\s*/, "") }) });
    }
    const sections = groupedTasks.filter((g) => g.section !== null && g.section !== sectionName).map((g) => g.section as string);
    await fetch(`/api/projects/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sectionOrder: JSON.stringify(sections) }) });
    setConfirmSectionDelete(null);
    mutate();
  };

  const moveTaskToSection = async (taskId: string, targetSection: string | null) => {
    const task = project.tasks.find((t) => t.id === taskId);
    if (!task) return;
    if (getTaskSection(task) === targetSection) return;
    let newNotes = task.notes.replace(/^\[[^\]]+\]\s*/, "");
    if (targetSection) newNotes = `[${targetSection}] ${newNotes}`.trim();
    await fetch(`/api/tasks/${taskId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notes: newNotes }) });
    setDragTaskId(null); setDragOverSection(null);
    mutate();
  };

  const today = new Date().toISOString().split("T")[0];
  const isOverdue = (d: string | null) => d && d < today;

  const totalTasks = project.tasks.length;
  const completedTasks = project.tasks.filter((t) => t.completed).length;

  return (
    <>
      {/* PROJECT HEADER */}
      <div className="bg-white border-b border-platinum sticky top-0 z-20">
        <div className="px-8 pt-5 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={() => router.push("/projects")} className="text-brand-gray hover:text-brand-black transition-colors duration-150 flex-shrink-0" title="Back to projects">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <div className="relative">
                <button
                  onClick={() => canEdit && !project.departmentId && setColorPickerOpen(!colorPickerOpen)}
                  className={`w-6 h-6 rounded flex-shrink-0 transition-all ${project.departmentId ? "cursor-default" : "hover:ring-2 hover:ring-offset-1 hover:ring-brand-gray/30"}`}
                  style={{ backgroundColor: project.color || "#664FA6" }}
                  title={project.departmentId ? "Color inherited from department" : "Change project color"}
                />
                {colorPickerOpen && !project.departmentId && (
                  <div className="absolute top-8 left-0 bg-white border border-platinum rounded-lg shadow-lg p-3 z-50">
                    <p className="text-[10px] uppercase tracking-wider text-brand-gray font-medium mb-2">Color</p>
                    <div className="grid grid-cols-5 gap-2">
                      {PROJECT_COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => {
                            fetch(`/api/projects/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ color: c }) });
                            mutate((prev: Project | undefined) => prev ? { ...prev, color: c } : prev, false);
                            setColorPickerOpen(false);
                          }}
                          className="w-9 h-9 rounded-md hover:scale-105 transition-transform flex items-center justify-center"
                          style={{ backgroundColor: c }}
                        >
                          {(project.color || "#664FA6") === c && (
                            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <h1 className="text-xl font-bold font-heading text-brand-black truncate">{project.name}</h1>
              <span className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[project.status] || "bg-gray-100 text-gray-600"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusDot[project.status] || "bg-gray-400"}`} />
                {project.status}
              </span>
              {departments.length > 0 && (
                <select
                  value={project.departmentId || ""}
                  onChange={(e) => {
                    const deptId = e.target.value || null;
                    const dept = departments.find((d) => d.id === deptId);
                    const newColor = dept ? dept.color : project.color;
                    fetch(`/api/projects/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ departmentId: deptId }) });
                    mutate((prev: Project | undefined) => prev ? { ...prev, departmentId: deptId, color: newColor } : prev, false);
                  }}
                  disabled={!canEdit}
                  className="text-xs text-brand-gray bg-white border border-platinum rounded-full px-2.5 py-0.5 focus:outline-none focus:border-royal-purple cursor-pointer disabled:cursor-default disabled:opacity-60"
                >
                  <option value="">No department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="flex items-center gap-2">
              {(project.members || []).length > 0 && (
                <button onClick={() => canEdit && setMembersModal(true)} className="flex -space-x-1.5 hover:opacity-80 transition-opacity" title="Project members">
                  {(project.members || []).slice(0, 4).map((m) => (
                    <Initials key={m.user.id} name={m.user.email} />
                  ))}
                  {(project.members || []).length > 4 && (
                    <span className="w-6 h-6 rounded-full bg-platinum text-brand-gray flex items-center justify-center text-[10px] font-medium">
                      +{project.members.length - 4}
                    </span>
                  )}
                </button>
              )}
              {totalTasks > 0 && (
                <div className="flex items-center gap-2 px-3">
                  <div className="w-20 h-1.5 bg-platinum rounded-full overflow-hidden">
                    <div className="h-full bg-royal-purple rounded-full transition-all duration-300" style={{ width: `${(completedTasks / totalTasks) * 100}%` }} />
                  </div>
                  <span className="text-xs text-brand-gray whitespace-nowrap">{completedTasks}/{totalTasks}</span>
                </div>
              )}
              {canEdit && (
                <div className="relative" ref={headerMenuRef}>
                  <button
                    onClick={() => setHeaderMenuOpen(!headerMenuOpen)}
                    className="p-1.5 rounded-lg hover:bg-white-smoke text-brand-gray hover:text-brand-black transition-colors duration-150"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><circle cx="10" cy="4" r="1.5" /><circle cx="10" cy="10" r="1.5" /><circle cx="10" cy="16" r="1.5" /></svg>
                  </button>
                  {headerMenuOpen && (
                    <div className="absolute right-0 top-10 bg-white border border-platinum rounded-lg shadow-lg w-48 py-1 z-50">
                      <button onClick={() => { setHeaderMenuOpen(false); setMembersModal(true); }} className="w-full text-left px-4 py-2 text-sm hover:bg-white-smoke transition-colors duration-150 flex items-center gap-2">
                        <svg className="w-4 h-4 text-brand-gray" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        Members
                      </button>
                      <div className="border-t border-platinum my-1" />
                      <button onClick={() => { setHeaderMenuOpen(false); setConfirmDelete(true); }} className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors duration-150 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        Delete project
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Tabs + Filters + CTA */}
        <div className="px-8 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex">
              <button onClick={() => setView("list")} className={`px-1 pb-2.5 text-sm font-medium border-b-2 transition-colors duration-150 ${view === "list" ? "border-royal-purple text-brand-black" : "border-transparent text-brand-gray hover:text-brand-black"}`}>List</button>
              <button onClick={() => setView("board")} className={`px-1 pb-2.5 text-sm font-medium border-b-2 transition-colors duration-150 ml-5 ${view === "board" ? "border-royal-purple text-brand-black" : "border-transparent text-brand-gray hover:text-brand-black"}`}>Board</button>
              <button onClick={() => setView("calendar")} className={`px-1 pb-2.5 text-sm font-medium border-b-2 transition-colors duration-150 ml-5 ${view === "calendar" ? "border-royal-purple text-brand-black" : "border-transparent text-brand-gray hover:text-brand-black"}`}>Calendar</button>
              <button onClick={() => setView("timeline")} className={`px-1 pb-2.5 text-sm font-medium border-b-2 transition-colors duration-150 ml-5 ${view === "timeline" ? "border-royal-purple text-brand-black" : "border-transparent text-brand-gray hover:text-brand-black"}`}>Timeline</button>
            </div>
            {(view === "list" || view === "board" || view === "timeline") && (
              <div className="flex gap-1 ml-4">
                {(["incomplete", "all", "complete"] as const).map((f) => (
                  <button key={f} onClick={() => setTaskFilter(f)} className={`px-3 py-1 text-xs rounded-full capitalize transition-colors duration-150 ${taskFilter === f ? "bg-midnight-blue text-white" : "text-brand-gray hover:bg-white-smoke"}`}>{f}</button>
                ))}
              </div>
            )}
          </div>
          {canEdit && (
            <button onClick={openAddTask} className="px-4 py-1.5 bg-royal-purple text-white text-sm rounded-lg hover:bg-midnight-blue transition-colors duration-150 flex items-center gap-1.5 mb-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Add task
            </button>
          )}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex flex-1 overflow-hidden">
        <div className={`flex-1 overflow-y-auto transition-all duration-200 ${activeTask ? "" : ""}`}>
          {view === "list" ? (
            <div className="min-w-0">
              {editFieldId && (() => {
                const cf = (project.customFields || []).find((f) => f.id === editFieldId);
                if (!cf || cf.type === "text") return null;
                return (
                  <div className="px-4 py-2 bg-lavender/20 border-b border-platinum/50">
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <span className="font-medium text-brand-black">Options for &ldquo;{cf.name}&rdquo;:</span>
                      {editFieldOptions.map((opt, i) => (
                        <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-platinum rounded">
                          {opt}
                          <button onClick={() => { const next = editFieldOptions.filter((_, j) => j !== i); setEditFieldOptions(next); updateCustomFieldOptions(cf.id, next); }} className="text-brand-gray hover:text-red-500">&times;</button>
                        </span>
                      ))}
                      <input
                        value={editFieldOptionInput} onChange={(e) => setEditFieldOptionInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && editFieldOptionInput.trim()) { const next = [...editFieldOptions, editFieldOptionInput.trim()]; setEditFieldOptions(next); setEditFieldOptionInput(""); updateCustomFieldOptions(cf.id, next); } }}
                        placeholder="Add option + Enter" className="px-2 py-0.5 border border-platinum rounded text-xs bg-white focus:outline-none focus:border-royal-purple w-32"
                      />
                      <button onClick={() => setEditFieldId(null)} className="text-brand-gray hover:text-brand-black ml-2">Done</button>
                    </div>
                  </div>
                );
              })()}

              {project.tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 rounded-full bg-lavender/30 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-royal-purple/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                  </div>
                  <h3 className="text-lg font-semibold font-heading text-brand-black mb-1">No tasks yet</h3>
                  <p className="text-sm text-brand-gray mb-4">Get started by adding your first task.</p>
                  {canEdit && (
                    <button onClick={openAddTask} className="px-4 py-2 text-sm rounded-lg bg-royal-purple text-white hover:bg-midnight-blue transition-colors duration-150">Add a task</button>
                  )}
                </div>
              ) : (
                <table className="border-collapse" style={{ width: "auto", minWidth: "100%" }}>
                  <thead className="sticky top-0 z-10 bg-white">
                    <tr className="text-left border-b border-platinum">
                      <th className="w-10 py-2 px-2 border-r border-platinum/40" />
                      <th className="py-2 px-3 w-[320px] min-w-[240px] text-[11px] uppercase tracking-wider text-brand-gray font-medium border-r border-platinum/40">Task name</th>
                      {isColumnVisible("created") && <th className="py-2 px-3 w-28 text-[11px] uppercase tracking-wider text-brand-gray font-medium border-r border-platinum/40">Created</th>}
                      {isColumnVisible("dueDate") && <th className="py-2 px-3 w-32 text-[11px] uppercase tracking-wider text-brand-gray font-medium border-r border-platinum/40">Due date</th>}
                      {isColumnVisible("priority") && <th className="py-2 px-3 w-24 text-[11px] uppercase tracking-wider text-brand-gray font-medium border-r border-platinum/40">Priority</th>}
                      {isColumnVisible("status") && <th className="py-2 px-3 w-32 text-[11px] uppercase tracking-wider text-brand-gray font-medium border-r border-platinum/40">Status</th>}
                      {isColumnVisible("collaborators") && <th className="py-2 px-3 w-36 text-[11px] uppercase tracking-wider text-brand-gray font-medium border-r border-platinum/40">Assignee</th>}
                      {isColumnVisible("notes") && <th className="py-2 px-3 w-28 text-[11px] uppercase tracking-wider text-brand-gray font-medium border-r border-platinum/40">Notes</th>}
                      {(project.customFields || []).map((cf) => (
                        <th key={cf.id} className="py-2 px-3 w-36 text-[11px] uppercase tracking-wider text-brand-gray font-medium border-r border-platinum/40">
                          <div className="group/cfh flex items-center gap-1">
                            <span>{cf.name}</span>
                            <button onClick={() => { if (editFieldId === cf.id) { setEditFieldId(null); return; } setEditFieldId(cf.id); try { setEditFieldOptions(JSON.parse(cf.options)); } catch { setEditFieldOptions([]); } setEditFieldOptionInput(""); }} className="opacity-0 group-hover/cfh:opacity-100 p-0.5 rounded hover:bg-platinum text-brand-gray transition-opacity duration-150" title="Edit field">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                            <button onClick={() => deleteCustomField(cf.id)} className="opacity-0 group-hover/cfh:opacity-100 p-0.5 rounded hover:bg-red-50 text-brand-gray hover:text-red-500 transition-opacity duration-150" title="Remove field">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                        </th>
                      ))}
                      <th className="py-2 px-2 w-10 relative">
                        <button onClick={() => setColumnsDropdown(!columnsDropdown)} className="p-1 rounded hover:bg-gray-50 text-brand-gray hover:text-royal-purple transition-colors duration-150" title="Manage columns">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        </button>
                        {columnsDropdown && (
                          <div ref={columnsDropdownRef} className="absolute right-0 top-8 z-50 bg-white border border-platinum rounded-lg shadow-lg w-56 py-2">
                            <div className="px-3 py-1.5 text-[11px] font-semibold text-brand-gray uppercase tracking-wider">Columns</div>
                            {BUILTIN_COLUMNS.map((col) => (
                              <label key={col.key} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-sm transition-colors duration-150">
                                <input type="checkbox" checked={isColumnVisible(col.key)} onChange={() => toggleColumn(col.key)} className="rounded" />
                                {col.label}
                              </label>
                            ))}
                            {(project.customFields || []).length > 0 && (
                              <>
                                <div className="border-t border-platinum my-1" />
                                <div className="px-3 py-1.5 text-[11px] font-semibold text-brand-gray uppercase tracking-wider">Custom Fields</div>
                                {(project.customFields || []).map((cf) => (
                                  <div key={cf.id} className="flex items-center justify-between px-3 py-1.5 hover:bg-gray-50 text-sm">
                                    <span>{cf.name}</span>
                                    <button onClick={() => deleteCustomField(cf.id)} className="text-xs text-red-400 hover:text-red-600">Remove</button>
                                  </div>
                                ))}
                              </>
                            )}
                            <div className="border-t border-platinum my-1" />
                            <button onClick={() => { setColumnsDropdown(false); setAddFieldModal(true); }} className="w-full text-left px-3 py-1.5 text-sm text-royal-purple hover:bg-lavender/30 flex items-center gap-1.5 transition-colors duration-150">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                              Add custom field
                            </button>
                          </div>
                        )}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(hasSections ? groupedTasks : [{ section: null, tasks: project.tasks }]).map((group, groupIdx) => {
                      const sectionKey = group.section || "__all__";
                      const isCollapsed = group.section ? collapsedSections.has(group.section) : false;
                      const doneTasks = group.tasks.filter((t) => t.completed).length;
                      const filteredTasks = group.tasks.filter((t) => taskFilter === "all" ? true : taskFilter === "incomplete" ? !t.completed : t.completed);
                      return (
                        <React.Fragment key={sectionKey}>
                          {group.section && (
                            <tr
                              className={`group transition-colors duration-150 ${dragOverSection === group.section && (dragTaskId || dragSection !== group.section) ? "bg-royal-purple/5" : ""} ${dragSection === group.section ? "opacity-50" : ""}`}
                              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (group.section !== dragOverSection) setDragOverSection(group.section); }}
                              onDragLeave={() => setDragOverSection(null)}
                              onDrop={(e) => { e.preventDefault(); if (dragTaskId && group.section) moveTaskToSection(dragTaskId, group.section); else if (dragSection && group.section) handleSectionDrop(dragSection, group.section); setDragSection(null); setDragOverSection(null); setDragTaskId(null); }}
                            >
                              <td colSpan={99} className={`${groupIdx > 0 ? "pt-6" : "pt-3"} pb-1 px-3`}>
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-2 cursor-pointer flex-1 min-w-0" onClick={() => { if (editingSection !== group.section) toggleSection(group.section!); }}>
                                    <svg className={`w-3.5 h-3.5 text-brand-gray transition-transform duration-150 flex-shrink-0 ${isCollapsed ? "" : "rotate-90"}`} fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                                    </svg>
                                    {editingSection === group.section ? (
                                      <input autoFocus defaultValue={group.section} onClick={(e) => e.stopPropagation()} onBlur={(e) => renameSection(group.section!, e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") renameSection(group.section!, (e.target as HTMLInputElement).value); if (e.key === "Escape") setEditingSection(null); }} className="text-[15px] font-bold font-heading text-brand-black border border-royal-purple rounded px-1.5 py-0.5 focus:outline-none bg-white" />
                                    ) : (
                                      <span className="text-[15px] font-bold font-heading text-brand-black">{group.section}</span>
                                    )}
                                    <span className="text-xs text-brand-gray/60 ml-1">{doneTasks}/{group.tasks.length}</span>
                                  </div>
                                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                    <button onClick={(e) => { e.stopPropagation(); setEditingSection(group.section); }} className="p-1 rounded hover:bg-platinum text-brand-gray hover:text-brand-black transition-colors duration-150" title="Rename">
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); setConfirmSectionDelete(group.section); }} className="p-1 rounded hover:bg-red-50 text-brand-gray hover:text-red-500 transition-colors duration-150" title="Delete section">
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                    <div draggable onDragStart={(e) => { setDragSection(group.section); e.dataTransfer.effectAllowed = "move"; const row = (e.target as HTMLElement).closest("tr"); if (row) e.dataTransfer.setDragImage(row, row.offsetWidth - 40, 20); }} onDragEnd={() => { setDragSection(null); setDragOverSection(null); }} className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-platinum transition-colors duration-150" title="Drag to reorder">
                                      <svg className="w-4 h-4 text-brand-gray" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="5" r="1.5" /><circle cx="15" cy="5" r="1.5" /><circle cx="9" cy="10" r="1.5" /><circle cx="15" cy="10" r="1.5" /><circle cx="9" cy="15" r="1.5" /><circle cx="15" cy="15" r="1.5" /><circle cx="9" cy="20" r="1.5" /><circle cx="15" cy="20" r="1.5" /></svg>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                          {!isCollapsed && filteredTasks.map((task) => (
                            <tr
                              key={task.id}
                              className={`group/task border-b border-platinum/40 hover:bg-gray-50 transition-colors duration-150 ${activeTask?.id === task.id ? "bg-lavender/10 border-l-[3px] border-l-royal-purple" : "border-l-[3px] border-l-transparent"} ${dragTaskId === task.id ? "opacity-40" : ""}`}
                            >
                              <td className="py-2.5 px-2 w-10 border-r border-platinum/40">
                                <div className="flex items-center gap-1">
                                  {hasSections && (
                                    <div draggable onDragStart={(e) => { setDragTaskId(task.id); e.dataTransfer.effectAllowed = "move"; }} onDragEnd={() => { setDragTaskId(null); setDragOverSection(null); }} className="cursor-grab active:cursor-grabbing opacity-0 group-hover/task:opacity-100 transition-opacity duration-150" title="Drag to section">
                                      <svg className="w-3 h-3 text-brand-gray" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="7" r="1.5" /><circle cx="15" cy="7" r="1.5" /><circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" /><circle cx="9" cy="17" r="1.5" /><circle cx="15" cy="17" r="1.5" /></svg>
                                    </div>
                                  )}
                                  <input type="checkbox" checked={task.completed} onChange={() => toggleTask(task.id, task.completed)} className="rounded-full w-4 h-4 text-royal-purple focus:ring-royal-purple/30 cursor-pointer" />
                                </div>
                              </td>
                              <td className={`py-2.5 px-3 w-[320px] min-w-[240px] text-sm cursor-pointer transition-colors duration-150 border-r border-platinum/40 ${task.completed ? "line-through text-brand-gray/50" : "text-brand-black font-medium hover:text-royal-purple"}`} onClick={() => setSelectedTask(activeTask?.id === task.id ? null : task)}>
                                <div className="flex items-center gap-2">
                                  <span className="truncate">{task.title}</span>
                                  {task.subtasks?.length > 0 && (
                                    <span className="text-[11px] text-brand-gray/40 flex-shrink-0" title={`${task.subtasks.length} subtasks`}>{task.subtasks.length}
                                      <svg className="w-3 h-3 inline-block ml-0.5 align-middle" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>
                                    </span>
                                  )}
                                  {(task._count?.comments || 0) > 0 && (
                                    <span className="text-[11px] text-brand-gray/40 flex-shrink-0" title={`${task._count!.comments} comments`}>{task._count!.comments}
                                      <svg className="w-3 h-3 inline-block ml-0.5 align-middle" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                    </span>
                                  )}
                                  {(task.attachments?.length || 0) > 0 && (
                                    <span className="text-[11px] text-brand-gray/40 flex-shrink-0" title={`${task.attachments.length} attachments`}>{task.attachments.length}
                                      <svg className="w-3 h-3 inline-block ml-0.5 align-middle" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                    </span>
                                  )}
                                  {task.dependsOn?.some((d) => !d.blockedByTask.completed) && (
                                    <span className="text-red-400 flex-shrink-0" title="Blocked">
                                      <svg className="w-3.5 h-3.5 inline-block align-middle" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                    </span>
                                  )}
                                </div>
                              </td>
                              {isColumnVisible("created") && (
                                <td className="py-2.5 px-3 text-xs text-brand-gray/60 whitespace-nowrap w-28 border-r border-platinum/40">
                                  {new Date(task.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                </td>
                              )}
                              {isColumnVisible("dueDate") && (
                                <td className="py-2.5 px-3 w-32 border-r border-platinum/40">
                                  <input type="date" defaultValue={task.dueDate || ""} key={task.id + "-due-" + task.dueDate} onChange={(e) => updateTaskField(task.id, "dueDate", e.target.value || null)} className={`text-xs border border-transparent hover:border-platinum focus:border-royal-purple rounded px-1.5 py-0.5 bg-transparent focus:outline-none cursor-pointer transition-colors duration-150 ${isOverdue(task.dueDate) && !task.completed ? "text-red-500 font-medium" : "text-brand-gray"}`} />
                                </td>
                              )}
                              {isColumnVisible("priority") && (
                                <td className="py-2.5 px-3 w-24 border-r border-platinum/40">
                                  <select value={task.priority} onChange={(e) => updateTaskField(task.id, "priority", e.target.value)} className={`px-2 py-0.5 text-xs font-medium rounded-full border-0 cursor-pointer transition-colors duration-150 ${task.priority === "high" ? "bg-red-100 text-red-700" : task.priority === "low" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                                    <option value="high">High</option>
                                    <option value="medium">Medium</option>
                                    <option value="low">Low</option>
                                  </select>
                                </td>
                              )}
                              {isColumnVisible("status") && (
                                <td className="py-2.5 px-3 w-32 border-r border-platinum/40">
                                  <select value={task.status} onChange={(e) => updateTaskField(task.id, "status", e.target.value)} className={`px-2 py-0.5 text-xs font-medium rounded-full border-0 cursor-pointer transition-colors duration-150 ${statusColors[task.status] || "bg-gray-100 text-gray-600"}`}>
                                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                                  </select>
                                </td>
                              )}
                              {isColumnVisible("collaborators") && (
                                <td className="py-2.5 px-3 w-36 border-r border-platinum/40">
                                  <div className="flex items-center gap-1">
                                    {task.collaborators.length > 0 && <Initials name={task.collaborators[0].person.name} size="xs" />}
                                    <select value={task.collaborators.length > 0 ? task.collaborators[0].person.id : ""} onChange={(e) => { if (e.target.value === "") updateTaskCollaborators(task.id, []); else updateTaskCollaborators(task.id, [e.target.value]); }} className="text-xs text-brand-gray border-0 bg-transparent focus:outline-none cursor-pointer max-w-[100px] truncate">
                                      <option value="">Unassigned</option>
                                      {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                  </div>
                                </td>
                              )}
                              {isColumnVisible("notes") && (
                                <td className="py-2.5 px-3 w-28 border-r border-platinum/40">
                                  <input defaultValue={task.notes} key={task.id + task.notes} onBlur={(e) => { if (e.target.value !== task.notes) updateTaskField(task.id, "notes", e.target.value); }} placeholder="--" className="w-full px-1.5 py-0.5 text-xs border border-transparent hover:border-platinum focus:border-royal-purple rounded focus:outline-none bg-transparent transition-colors duration-150" />
                                </td>
                              )}
                              {(project.customFields || []).map((cf) => {
                                const val = getFieldValue(task, cf.id);
                                const opts: string[] = (() => { try { return JSON.parse(cf.options); } catch { return []; } })();
                                if (cf.type === "text") {
                                  return (
                                    <td key={cf.id} className="py-2.5 px-3 border-r border-platinum/40 group/cfcell">
                                      {val && isUrl(val) ? (
                                        <div className="flex items-center gap-1">
                                          <a href={toHref(val)} target="_blank" rel="noopener noreferrer" className="text-xs text-royal-purple underline truncate max-w-[100px] hover:text-midnight-blue">{val.trim().replace(/^https?:\/\/(www\.)?/, "").replace(/^www\./, "").split("/")[0]}</a>
                                          <input defaultValue={val} key={task.id + "-cf-" + cf.id + "-" + val} onBlur={(e) => { if (e.target.value !== val) updateTaskCustomFieldValue(task.id, cf.id, e.target.value); }} className="w-0 group-focus-within/cfcell:w-full px-1.5 py-0.5 text-xs border border-transparent focus:border-royal-purple rounded focus:outline-none bg-transparent" />
                                        </div>
                                      ) : (
                                        <input defaultValue={val} key={task.id + "-cf-" + cf.id + "-" + val} onBlur={(e) => { if (e.target.value !== val) updateTaskCustomFieldValue(task.id, cf.id, e.target.value); }} placeholder="--" className="w-full px-1.5 py-0.5 text-xs border border-transparent hover:border-platinum focus:border-royal-purple rounded focus:outline-none bg-transparent transition-colors duration-150" />
                                      )}
                                    </td>
                                  );
                                }
                                if (cf.type === "single-select") {
                                  return (
                                    <td key={cf.id} className="py-2.5 px-3 border-r border-platinum/40">
                                      <select value={val} onChange={(e) => updateTaskCustomFieldValue(task.id, cf.id, e.target.value)} className="text-xs text-brand-gray border border-platinum hover:border-royal-purple rounded px-1.5 py-0.5 bg-white focus:outline-none cursor-pointer max-w-[130px] transition-colors duration-150">
                                        <option value="">--</option>
                                        {opts.map((o) => <option key={o} value={o}>{o}</option>)}
                                      </select>
                                    </td>
                                  );
                                }
                                const selected: string[] = (() => { try { return val ? JSON.parse(val) : []; } catch { return []; } })();
                                const remaining = opts.filter((o) => !selected.includes(o));
                                return (
                                  <td key={cf.id} className="py-2.5 px-3 border-r border-platinum/40">
                                    <div className="flex flex-wrap gap-0.5 items-center">
                                      {selected.map((s) => (
                                        <span key={s} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-lavender rounded-full text-[11px]">
                                          {s}
                                          <button onClick={() => updateTaskCustomFieldValue(task.id, cf.id, JSON.stringify(selected.filter((x) => x !== s)))} className="text-brand-gray hover:text-red-500 text-[10px]">&times;</button>
                                        </span>
                                      ))}
                                      {remaining.length > 0 && (
                                        <select value="" onChange={(e) => { if (e.target.value) updateTaskCustomFieldValue(task.id, cf.id, JSON.stringify([...selected, e.target.value])); }} className="text-xs text-brand-gray border border-platinum hover:border-royal-purple rounded px-1.5 py-0.5 bg-white focus:outline-none cursor-pointer transition-colors duration-150">
                                          <option value="">+ Add</option>
                                          {remaining.map((o) => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                      )}
                                    </div>
                                  </td>
                                );
                              })}
                              <td className="py-2.5 px-2 w-10">
                                <button onClick={() => setConfirmTaskDelete(task.id)} className="opacity-0 group-hover/task:opacity-100 p-1 rounded hover:bg-red-50 text-brand-gray hover:text-red-500 transition-all duration-150" title="Delete">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              </td>
                            </tr>
                          ))}
                          {!isCollapsed && canEdit && (
                            <tr>
                              <td colSpan={99} className="py-1 px-3">
                                {inlineAddSection === sectionKey ? (
                                  <div className="flex items-center gap-2 pl-5">
                                    <input autoFocus value={inlineAddTitle} onChange={(e) => setInlineAddTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") createInlineTask(group.section); if (e.key === "Escape") { setInlineAddSection(null); setInlineAddTitle(""); } }} onBlur={() => { if (!inlineAddTitle.trim()) { setInlineAddSection(null); setInlineAddTitle(""); } }} placeholder="Task name..." className="flex-1 text-sm py-1 px-2 border border-royal-purple rounded-lg focus:outline-none bg-white" />
                                    <button onClick={() => createInlineTask(group.section)} className="text-xs text-royal-purple hover:text-midnight-blue font-medium">Add</button>
                                  </div>
                                ) : (
                                  <button onClick={() => { setInlineAddSection(sectionKey); setInlineAddTitle(""); }} className="text-xs text-brand-gray/50 hover:text-royal-purple pl-5 py-1 flex items-center gap-1 transition-colors duration-150">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                    Add task...
                                  </button>
                                )}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          ) : view === "board" ? (
            <BoardView
              project={project}
              taskFilter={taskFilter}
              activeTaskId={activeTask?.id || null}
              boardDragId={boardDragId}
              boardDragOver={boardDragOver}
              onBoardDragIdChange={setBoardDragId}
              onBoardDragOverChange={setBoardDragOver}
              onUpdateField={updateTaskField}
              onSelectTask={(task) => setSelectedTask(task ? (activeTask?.id === task.id ? null : task) : null)}
            />
          ) : view === "calendar" ? (
            <CalendarView
              project={project}
              calMonth={calMonth}
              setCalMonth={setCalMonth}
              onSelectTask={(task) => setSelectedTask(task)}
            />
          ) : (
            <TimelineView
              tasks={project.tasks.filter((t) => {
                if (taskFilter === "all") return true;
                if (taskFilter === "incomplete") return !t.completed;
                return t.completed;
              })}
              onUpdateDueDate={(taskId, newDate) => updateTaskField(taskId, "dueDate", newDate)}
              onSelectTask={(task) => setSelectedTask(activeTask?.id === task.id ? null : task as Task)}
              selectedTaskId={activeTask?.id || null}
              sections={groupedTasks.filter((g) => g.section !== null).map((g) => g.section as string)}
            />
          )}
        </div>

        {activeTask && (
          <TaskDetailPanel
            task={activeTask}
            project={project}
            people={people}
            canEdit={canEdit}
            projectId={id as string}
            onUpdateField={updateTaskField}
            onToggle={toggleTask}
            onDelete={(taskId) => setConfirmTaskDelete(taskId)}
            onClose={() => setSelectedTask(null)}
            comments={comments}
            onPostComment={postComment}
            onDeleteComment={deleteComment}
            commentBody={commentBody}
            onCommentBodyChange={setCommentBody}
            attachName={attachName}
            onAttachNameChange={setAttachName}
            attachUrl={attachUrl}
            onAttachUrlChange={setAttachUrl}
            onAddAttachment={addAttachment}
            onDeleteAttachment={deleteAttachment}
            onUpdateCollaborators={updateTaskCollaborators}
            onUpdateCustomFieldValue={updateTaskCustomFieldValue}
            getFieldValue={getFieldValue}
            onAddDependency={addDependency}
            onRemoveDependency={removeDependency}
            insertMention={insertMention}
            renderCommentBody={renderCommentBody}
            showMentions={showMentions}
            mentionFilter={mentionFilter}
            onMentionFilterChange={setMentionFilter}
            onShowMentionsChange={setShowMentions}
            commentInputRef={commentInputRef}
            onAddSubtask={async () => { await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: id, parentId: activeTask.id, title: "New subtask" }) }); mutate(); }}
            mutate={mutate}
          />
        )}
      </div>

      {/* MODALS */}
      <Modal open={taskModal} onClose={() => setTaskModal(false)} title="New Task">
        <div className="space-y-3">
          <input value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} placeholder="Task title" className="w-full px-3 py-2 border border-platinum rounded-lg text-sm focus:outline-none focus:border-royal-purple" autoFocus />
          {hasSections && (
            <div>
              <label className="block text-xs text-brand-gray mb-1">Section</label>
              <select value={taskForm.section} onChange={(e) => setTaskForm({ ...taskForm, section: e.target.value })} className="w-full px-3 py-2 border border-platinum rounded-lg text-sm focus:outline-none focus:border-royal-purple">
                <option value="">No section</option>
                {groupedTasks.filter((g) => g.section !== null).map((g) => <option key={g.section} value={g.section!}>{g.section}</option>)}
              </select>
            </div>
          )}
          <input type="date" value={taskForm.dueDate} onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })} className="w-full px-3 py-2 border border-platinum rounded-lg text-sm focus:outline-none focus:border-royal-purple" />
          <select value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })} className="w-full px-3 py-2 border border-platinum rounded-lg text-sm focus:outline-none focus:border-royal-purple">
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <div>
            <label className="block text-xs text-brand-gray mb-1">Collaborators</label>
            <div className="max-h-32 overflow-y-auto border border-platinum rounded-lg p-2">
              {people.map((p) => (
                <label key={p.id} className="flex items-center gap-2 py-0.5 text-sm cursor-pointer">
                  <input type="checkbox" checked={taskForm.collaborators.includes(p.id)} onChange={(e) => { const next = e.target.checked ? [...taskForm.collaborators, p.id] : taskForm.collaborators.filter((c) => c !== p.id); setTaskForm({ ...taskForm, collaborators: next }); }} className="rounded" />
                  {p.name}
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={() => setTaskModal(false)} className="px-4 py-2 text-sm rounded-lg bg-platinum hover:bg-lavender transition-colors duration-150">Cancel</button>
          <button onClick={createTask} className="px-4 py-2 text-sm rounded-lg bg-royal-purple text-white hover:bg-midnight-blue transition-colors duration-150">Create</button>
        </div>
      </Modal>
      <ConfirmDialog open={confirmDelete} onClose={() => setConfirmDelete(false)} onConfirm={deleteProject} title="Delete Project" message="Delete this project and all its tasks?" />
      <ConfirmDialog open={!!confirmTaskDelete} onClose={() => setConfirmTaskDelete(null)} onConfirm={() => { if (confirmTaskDelete) { deleteTask(confirmTaskDelete); setConfirmTaskDelete(null); } }} title="Delete Task" message="Are you sure you want to delete this task? This action cannot be undone." />
      <ConfirmDialog open={!!confirmSectionDelete} onClose={() => setConfirmSectionDelete(null)} onConfirm={() => { if (confirmSectionDelete) deleteSection(confirmSectionDelete); }} title="Delete Section" message={`Are you sure you want to delete the section "${confirmSectionDelete}"? Tasks will be kept but removed from this section.`} />
      <Modal open={addFieldModal} onClose={() => setAddFieldModal(false)} title="Add Custom Field">
        <div className="space-y-3">
          <input value={newFieldName} onChange={(e) => setNewFieldName(e.target.value)} placeholder="Field name" className="w-full px-3 py-2 border border-platinum rounded-lg text-sm focus:outline-none focus:border-royal-purple" autoFocus />
          <div>
            <label className="block text-xs text-brand-gray mb-1">Type</label>
            <select value={newFieldType} onChange={(e) => { setNewFieldType(e.target.value as "text" | "single-select" | "multi-select"); setNewFieldOptions([]); }} className="w-full px-3 py-2 border border-platinum rounded-lg text-sm focus:outline-none focus:border-royal-purple">
              <option value="text">Text</option>
              <option value="single-select">Single Select</option>
              <option value="multi-select">Multi Select</option>
            </select>
          </div>
          {(newFieldType === "single-select" || newFieldType === "multi-select") && (
            <div>
              <label className="block text-xs text-brand-gray mb-1">Options</label>
              <div className="flex flex-wrap gap-1 mb-2">
                {newFieldOptions.map((opt, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-lavender rounded-full text-xs">{opt}<button onClick={() => setNewFieldOptions(newFieldOptions.filter((_, j) => j !== i))} className="text-brand-gray hover:text-red-500">&times;</button></span>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={newFieldOptionInput} onChange={(e) => setNewFieldOptionInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && newFieldOptionInput.trim()) { setNewFieldOptions([...newFieldOptions, newFieldOptionInput.trim()]); setNewFieldOptionInput(""); } }} placeholder="Type an option and press Enter" className="flex-1 px-3 py-2 border border-platinum rounded-lg text-sm focus:outline-none focus:border-royal-purple" />
                <button onClick={() => { if (newFieldOptionInput.trim()) { setNewFieldOptions([...newFieldOptions, newFieldOptionInput.trim()]); setNewFieldOptionInput(""); } }} className="px-3 py-2 text-sm rounded-lg bg-platinum hover:bg-lavender transition-colors duration-150">Add</button>
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={() => setAddFieldModal(false)} className="px-4 py-2 text-sm rounded-lg bg-platinum hover:bg-lavender transition-colors duration-150">Cancel</button>
          <button onClick={createCustomField} className="px-4 py-2 text-sm rounded-lg bg-royal-purple text-white hover:bg-midnight-blue transition-colors duration-150">Create</button>
        </div>
      </Modal>
      <Modal open={membersModal} onClose={() => setMembersModal(false)} title="Project Members">
        <div className="space-y-3">
          <div className="text-xs text-brand-gray mb-2">Members who can see this project:</div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {(project.members || []).map((m) => (
              <div key={m.user.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white-smoke/50">
                <div className="flex items-center gap-2">
                  <Initials name={m.user.email} />
                  <span className="text-sm">{m.user.email}</span>
                </div>
                <button onClick={() => removeMember(m.user.id)} className="text-xs text-red-400 hover:text-red-600 transition-colors duration-150">Remove</button>
              </div>
            ))}
            {(!project.members || project.members.length === 0) && <p className="text-xs text-brand-gray italic">No members yet. Admins can always see all projects.</p>}
          </div>
          <div className="border-t border-platinum pt-3">
            <label className="text-xs text-brand-gray block mb-1">Add a member</label>
            <select value="" onChange={(e) => { if (e.target.value) addMember(e.target.value); }} className="w-full px-3 py-2 border border-platinum rounded-lg text-sm focus:outline-none focus:border-royal-purple">
              <option value="">Select a user...</option>
              {allUsers.filter((u) => !(project.members || []).some((m) => m.user.id === u.id)).map((u) => <option key={u.id} value={u.id}>{u.email}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <button onClick={() => setMembersModal(false)} className="px-4 py-2 text-sm rounded-lg bg-platinum hover:bg-lavender transition-colors duration-150">Done</button>
        </div>
      </Modal>
    </>
  );
}
