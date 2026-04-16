"use client";
import React, { useState, useRef, useCallback, useEffect } from "react";
import type { Task, Project, Person, TaskComment, TaskCustomFieldValue } from "@/components/project/types";
import { useClickOutside, useEscapeKey } from "@/hooks/use-click-outside";
import { STATUS_OPTIONS, statusColors, isUrl, toHref } from "@/components/project/types";
import Initials from "@/components/project/initials";
import RichTextEditor from "@/components/project/rich-text-editor";
import { sanitizeHtml } from "@/lib/sanitize";

interface TaskDetailPanelProps {
  task: Task;
  project: Project;
  people: Person[];
  canEdit: boolean;
  projectId: string;
  onUpdateField: (taskId: string, field: string, value: unknown) => Promise<void>;
  onToggle: (taskId: string, completed: boolean) => Promise<void>;
  onDelete: (taskId: string) => void;
  onClose: () => void;
  comments: TaskComment[];
  onPostComment: () => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  commentBody: string;
  onCommentBodyChange: (value: string) => void;
  attachName: string;
  onAttachNameChange: (value: string) => void;
  attachUrl: string;
  onAttachUrlChange: (value: string) => void;
  onAddAttachment: (taskId: string) => Promise<void>;
  onDeleteAttachment: (attachId: string) => Promise<void>;
  onUpdateCollaborators: (taskId: string, collaborators: string[]) => Promise<void>;
  onUpdateCustomFieldValue: (taskId: string, customFieldId: string, value: string) => Promise<void>;
  getFieldValue: (task: { customFieldValues: TaskCustomFieldValue[] }, fieldId: string) => string;
  onAddDependency: (taskId: string, blockedByTaskId: string) => Promise<void>;
  onRemoveDependency: (taskId: string, blockedByTaskId: string) => Promise<void>;
  insertMention: (person: Person) => void;
  renderCommentBody: (body: string) => string;
  showMentions: boolean;
  mentionFilter: string;
  onMentionFilterChange: (value: string) => void;
  onShowMentionsChange: (value: boolean) => void;
  commentInputRef: React.RefObject<HTMLTextAreaElement | null>;
  onAddSubtask: () => Promise<void>;
  mutate: () => void;
}

export default function TaskDetailPanel({
  task: activeTask,
  project,
  people,
  projectId,
  onUpdateField: updateTaskField,
  onToggle: toggleTask,
  onDelete,
  onClose,
  comments,
  onPostComment: postComment,
  onDeleteComment: deleteComment,
  commentBody,
  onCommentBodyChange: setCommentBody,
  attachName,
  onAttachNameChange: setAttachName,
  attachUrl,
  onAttachUrlChange: setAttachUrl,
  onAddAttachment: addAttachment,
  onDeleteAttachment: deleteAttachment,
  onUpdateCollaborators: updateTaskCollaborators,
  onUpdateCustomFieldValue: updateTaskCustomFieldValue,
  getFieldValue,
  onAddDependency: addDependency,
  onRemoveDependency: removeDependency,
  insertMention,
  renderCommentBody,
  showMentions,
  mentionFilter,
  onMentionFilterChange: setMentionFilter,
  onShowMentionsChange: setShowMentions,
  commentInputRef,
  onAddSubtask,
}: TaskDetailPanelProps) {
  const mentionsRef = useRef<HTMLDivElement>(null);
  const closeMentions = useCallback(() => setShowMentions(false), [setShowMentions]);
  useClickOutside(mentionsRef, closeMentions, showMentions);
  useEscapeKey(closeMentions, showMentions, true);

  const [panelWidth, setPanelWidth] = useState(440);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(440);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return;
    const delta = startX.current - e.clientX;
    const newWidth = Math.min(800, Math.max(320, startWidth.current + delta));
    setPanelWidth(newWidth);
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    startX.current = e.clientX;
    startWidth.current = panelWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [panelWidth]);

  const today = new Date().toISOString().split("T")[0];
  const isOverdue = (d: string | null) => d && d < today;

  const getTaskSection = (task: Task) => {
    const match = task.notes.match(/^\[([^\]]+)\]/);
    return match ? match[1] : null;
  };

  return (
    <div className="flex-shrink-0 overflow-y-auto bg-white border-l border-platinum animate-slide-in-right relative" style={{ width: panelWidth }}>
      {/* Resize drag handle */}
      <div
        onMouseDown={handleDragStart}
        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize z-10 group hover:bg-royal-purple/20 transition-colors"
      >
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full bg-platinum group-hover:bg-royal-purple/40 transition-colors" />
      </div>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <input
              type="checkbox" checked={activeTask.completed} onChange={() => toggleTask(activeTask.id, activeTask.completed)}
              className="rounded-full w-5 h-5 mt-0.5 text-royal-purple focus:ring-royal-purple/30 cursor-pointer flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <input
                defaultValue={activeTask.title} key={activeTask.id + "-title-" + activeTask.title}
                onBlur={(e) => { if (e.target.value !== activeTask.title) updateTaskField(activeTask.id, "title", e.target.value); }}
                className="text-lg font-semibold font-heading w-full border-0 focus:outline-none bg-transparent text-brand-black"
              />
              {getTaskSection(activeTask) && (
                <p className="text-xs text-brand-gray/60 mt-0.5">{getTaskSection(activeTask)}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white-smoke text-brand-gray hover:text-brand-black transition-colors duration-150">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Fields */}
        <div className="space-y-0 mb-6">
          {/* Due Date */}
          <div className="flex items-center py-3 border-b border-platinum/30">
            <div className="w-28 text-xs text-brand-gray flex-shrink-0">Due date</div>
            <div className="flex-1">
              <input type="date" defaultValue={activeTask.dueDate || ""} key={activeTask.id + "-due-" + activeTask.dueDate} onChange={(e) => updateTaskField(activeTask.id, "dueDate", e.target.value || null)} className={`text-sm border-0 focus:outline-none bg-transparent w-full ${isOverdue(activeTask.dueDate) && !activeTask.completed ? "text-red-500 font-medium" : ""}`} />
            </div>
          </div>
          {/* Priority */}
          <div className="flex items-center py-3 border-b border-platinum/30">
            <div className="w-28 text-xs text-brand-gray flex-shrink-0">Priority</div>
            <div className="flex-1">
              <select value={activeTask.priority} onChange={(e) => updateTaskField(activeTask.id, "priority", e.target.value)} className={`px-2 py-0.5 text-xs font-medium rounded-full border-0 cursor-pointer ${activeTask.priority === "high" ? "bg-red-100 text-red-700" : activeTask.priority === "low" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          {/* Status */}
          <div className="flex items-center py-3 border-b border-platinum/30">
            <div className="w-28 text-xs text-brand-gray flex-shrink-0">Status</div>
            <div className="flex-1">
              <select value={activeTask.status} onChange={(e) => updateTaskField(activeTask.id, "status", e.target.value)} className={`px-2 py-0.5 text-xs font-medium rounded-full border-0 cursor-pointer ${statusColors[activeTask.status] || "bg-gray-100 text-gray-600"}`}>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          {/* Collaborators */}
          <div className="flex items-start py-3 border-b border-platinum/30">
            <div className="w-28 text-xs text-brand-gray flex-shrink-0 pt-1">Assignee</div>
            <div className="flex-1">
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {activeTask.collaborators.length > 0
                  ? activeTask.collaborators.map((c) => (
                      <span key={c.person.id} className="inline-flex items-center gap-1.5 px-2 py-1 bg-white-smoke rounded-full text-xs">
                        <Initials name={c.person.name} size="xs" />
                        {c.person.name}
                        <button onClick={() => updateTaskCollaborators(activeTask.id, activeTask.collaborators.filter((x) => x.person.id !== c.person.id).map((x) => x.person.id))} className="text-brand-gray hover:text-red-500 ml-0.5">&times;</button>
                      </span>
                    ))
                  : <span className="text-xs text-brand-gray/50">No one assigned</span>}
              </div>
              <select value="" onChange={(e) => { if (e.target.value && !activeTask.collaborators.some((c) => c.person.id === e.target.value)) updateTaskCollaborators(activeTask.id, [...activeTask.collaborators.map((c) => c.person.id), e.target.value]); }} className="text-xs text-brand-gray border border-platinum rounded-lg px-2 py-1 bg-white transition-colors duration-150 hover:border-royal-purple">
                <option value="">+ Add person</option>
                {people.filter((p) => !activeTask.collaborators.some((c) => c.person.id === p.id)).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          {/* Repeat */}
          <div className="flex items-center py-3 border-b border-platinum/30">
            <div className="w-28 text-xs text-brand-gray flex-shrink-0">Repeat</div>
            <div className="flex-1 flex items-center gap-2">
              <select value={activeTask.repeatFreq || ""} onChange={(e) => { const freq = e.target.value || null; updateTaskField(activeTask.id, "repeatFreq", freq); if (!freq) updateTaskField(activeTask.id, "repeatDay", null); }} className="text-sm border-0 focus:outline-none bg-transparent cursor-pointer">
                <option value="">None</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
              {activeTask.repeatFreq === "weekly" && (
                <select value={activeTask.repeatDay ?? ""} onChange={(e) => updateTaskField(activeTask.id, "repeatDay", e.target.value ? parseInt(e.target.value) : null)} className="text-xs border border-platinum rounded-lg px-1.5 py-0.5 bg-white">
                  <option value="">Same day</option>
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
              )}
              {activeTask.repeatFreq === "monthly" && (
                <select value={activeTask.repeatDay ?? ""} onChange={(e) => updateTaskField(activeTask.id, "repeatDay", e.target.value ? parseInt(e.target.value) : null)} className="text-xs border border-platinum rounded-lg px-1.5 py-0.5 bg-white">
                  <option value="">Same day</option>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              )}
            </div>
          </div>
          {/* Notes */}
          <div className="flex items-center py-3 border-b border-platinum/30">
            <div className="w-28 text-xs text-brand-gray flex-shrink-0">Notes</div>
            <div className="flex-1">
              <input defaultValue={activeTask.notes} key={activeTask.id + "-notes-" + activeTask.notes} onBlur={(e) => { if (e.target.value !== activeTask.notes) updateTaskField(activeTask.id, "notes", e.target.value); }} placeholder="--" className="text-sm border-0 focus:outline-none bg-transparent w-full" />
            </div>
          </div>
          {/* Custom fields */}
          {(project.customFields || []).map((cf) => {
            const val = getFieldValue(activeTask, cf.id);
            const opts: string[] = (() => { try { return JSON.parse(cf.options); } catch { return []; } })();
            return (
              <div key={cf.id} className="flex items-center py-3 border-b border-platinum/30">
                <div className="w-28 text-xs text-brand-gray flex-shrink-0">{cf.name}</div>
                <div className="flex-1">
                  {cf.type === "text" ? (
                    <div>
                      {val && isUrl(val) && (
                        <a href={toHref(val)} target="_blank" rel="noopener noreferrer" className="text-sm text-royal-purple underline hover:text-midnight-blue block mb-1">{val.trim().replace(/^https?:\/\/(www\.)?/, "").replace(/^www\./, "").split("/")[0]}</a>
                      )}
                      <input defaultValue={val} key={activeTask.id + "-cf-" + cf.id + "-" + val} onBlur={(e) => { if (e.target.value !== val) updateTaskCustomFieldValue(activeTask.id, cf.id, e.target.value); }} placeholder="--" className="text-sm border-0 focus:outline-none bg-transparent w-full" />
                    </div>
                  ) : cf.type === "single-select" ? (
                    <select value={val} onChange={(e) => updateTaskCustomFieldValue(activeTask.id, cf.id, e.target.value)} className="text-sm border-0 focus:outline-none bg-transparent cursor-pointer">
                      <option value="">--</option>
                      {opts.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (() => {
                    const selected: string[] = (() => { try { return val ? JSON.parse(val) : []; } catch { return []; } })();
                    return (
                      <div className="flex flex-wrap gap-1 items-center">
                        {selected.map((s) => (
                          <span key={s} className="inline-flex items-center gap-1 px-2 py-0.5 bg-lavender rounded-full text-xs">
                            {s}
                            <button onClick={() => updateTaskCustomFieldValue(activeTask.id, cf.id, JSON.stringify(selected.filter((x) => x !== s)))} className="text-brand-gray hover:text-red-500">&times;</button>
                          </span>
                        ))}
                        <select value="" onChange={(e) => { if (e.target.value) updateTaskCustomFieldValue(activeTask.id, cf.id, JSON.stringify([...selected, e.target.value])); }} className="text-xs text-brand-gray border border-platinum rounded-lg px-1 py-0.5 bg-white">
                          <option value="">+ Add</option>
                          {opts.filter((o) => !selected.includes(o)).map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Dependencies */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-gray mb-3">Dependencies</h3>
          {(activeTask.dependsOn?.length || 0) > 0 && (
            <div className="space-y-1.5 mb-2">
              <p className="text-[11px] text-brand-gray/60">Blocked by:</p>
              {activeTask.dependsOn!.map((dep) => (
                <div key={dep.id} className="flex items-center gap-2 pl-2">
                  {dep.blockedByTask.completed ? (
                    <svg className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  ) : (
                    <svg className="w-3.5 h-3.5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  )}
                  <span className={`text-sm flex-1 ${dep.blockedByTask.completed ? "line-through text-brand-gray/50" : "text-brand-black"}`}>{dep.blockedByTask.title}</span>
                  <button onClick={() => removeDependency(activeTask.id, dep.blockedByTask.id)} className="p-0.5 rounded hover:bg-red-50 text-brand-gray hover:text-red-500 transition-colors">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
            </div>
          )}
          {(activeTask.blocks?.length || 0) > 0 && (
            <div className="space-y-1.5 mb-2">
              <p className="text-[11px] text-brand-gray/60">Blocks:</p>
              {activeTask.blocks!.map((b) => (
                <div key={b.id} className="flex items-center gap-2 pl-2">
                  <svg className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                  <span className="text-sm text-brand-gray">{b.task.title}</span>
                </div>
              ))}
            </div>
          )}
          <select
            value=""
            onChange={(e) => { if (e.target.value) addDependency(activeTask.id, e.target.value); }}
            className="text-xs text-brand-gray border border-platinum rounded-lg px-2 py-1 bg-white transition-colors hover:border-royal-purple"
          >
            <option value="">+ Add blocker</option>
            {project.tasks
              .filter((t) => t.id !== activeTask.id && !activeTask.dependsOn?.some((d) => d.blockedByTask.id === t.id))
              .map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        </div>

        {/* Description */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-gray mb-3">Description</h3>
          <RichTextEditor key={activeTask.id + "-desc"} value={activeTask.description} onChange={(html) => updateTaskField(activeTask.id, "description", html)} placeholder="Add a description..." />
        </div>

        {/* Subtasks */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-gray">
              Subtasks {activeTask.subtasks?.length > 0 && (
                <span className="text-brand-gray/60 ml-1">{activeTask.subtasks.filter((s) => s.completed).length}/{activeTask.subtasks.length}</span>
              )}
            </h3>
          </div>
          {activeTask.subtasks?.length > 0 && (
            <div className="space-y-0.5 mb-3">
              {activeTask.subtasks.map((sub) => (
                <div key={sub.id} className="group/sub flex items-start gap-2 py-2 px-2 rounded-lg hover:bg-white-smoke/50 transition-colors duration-150">
                  <input type="checkbox" checked={sub.completed} onChange={() => toggleTask(sub.id, sub.completed)} className="rounded-full w-4 h-4 mt-0.5 text-royal-purple focus:ring-royal-purple/30 cursor-pointer flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <input defaultValue={sub.title} key={sub.id + "-title-" + sub.title} onBlur={(e) => { if (e.target.value !== sub.title) updateTaskField(sub.id, "title", e.target.value); }} className={`text-sm w-full border-0 focus:outline-none bg-transparent ${sub.completed ? "line-through text-brand-gray/50" : ""}`} />
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <input type="date" defaultValue={sub.dueDate || ""} key={sub.id + "-due-" + sub.dueDate} onChange={(e) => updateTaskField(sub.id, "dueDate", e.target.value || null)} className={`text-[11px] border border-platinum rounded px-1.5 py-0.5 bg-white focus:outline-none focus:border-royal-purple cursor-pointer ${isOverdue(sub.dueDate) && !sub.completed ? "text-red-500" : "text-brand-gray"}`} />
                      <select value={sub.priority} onChange={(e) => updateTaskField(sub.id, "priority", e.target.value)} className={`text-[11px] font-medium rounded-full px-1.5 py-0.5 border-0 cursor-pointer ${sub.priority === "high" ? "bg-red-100 text-red-700" : sub.priority === "low" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                      <select value={sub.status} onChange={(e) => updateTaskField(sub.id, "status", e.target.value)} className={`text-[11px] font-medium rounded-full px-1.5 py-0.5 border-0 cursor-pointer ${statusColors[sub.status] || "bg-gray-100 text-gray-600"}`}>
                        {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <button onClick={() => onDelete(sub.id)} className="opacity-0 group-hover/sub:opacity-100 p-1 rounded hover:bg-red-50 text-brand-gray hover:text-red-500 transition-all duration-150 flex-shrink-0">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={onAddSubtask}
            className="text-xs text-royal-purple hover:text-midnight-blue flex items-center gap-1 transition-colors duration-150 py-1"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add subtask
          </button>
        </div>

        {/* Attachments */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-gray mb-3">
            Attachments {(activeTask.attachments?.length || 0) > 0 && <span className="text-brand-gray/60 ml-1">{activeTask.attachments.length}</span>}
          </h3>
          {activeTask.attachments?.length > 0 && (
            <div className="space-y-1.5 mb-3">
              {activeTask.attachments.map((att) => (
                <div key={att.id} className="group/att flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-50 transition-colors">
                  <svg className="w-4 h-4 text-brand-gray/50 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                  <a href={att.url.startsWith("http") ? att.url : `https://${att.url}`} target="_blank" rel="noopener noreferrer" className="text-sm text-royal-purple hover:text-midnight-blue truncate flex-1">{att.name}</a>
                  <button onClick={() => deleteAttachment(att.id)} className="opacity-0 group-hover/att:opacity-100 p-0.5 rounded hover:bg-red-50 text-brand-gray hover:text-red-500 transition-all flex-shrink-0">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input value={attachName} onChange={(e) => setAttachName(e.target.value)} placeholder="Name" className="flex-1 text-xs px-2 py-1.5 border border-platinum rounded-lg focus:outline-none focus:border-royal-purple bg-white" />
            <input value={attachUrl} onChange={(e) => setAttachUrl(e.target.value)} placeholder="URL" className="flex-1 text-xs px-2 py-1.5 border border-platinum rounded-lg focus:outline-none focus:border-royal-purple bg-white" onKeyDown={(e) => { if (e.key === "Enter") addAttachment(activeTask.id); }} />
            <button onClick={() => addAttachment(activeTask.id)} className="text-xs text-royal-purple hover:text-midnight-blue font-medium px-2 transition-colors">Add</button>
          </div>
        </div>

        {/* Comments */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-gray mb-3">
            Comments {comments.length > 0 && <span className="text-brand-gray/60 ml-1">{comments.length}</span>}
          </h3>
          {comments.length > 0 && (
            <div className="space-y-3 mb-4">
              {comments.map((c) => (
                <div key={c.id} className="group/comment">
                  <div className="flex items-center gap-2 mb-1">
                    <Initials name={c.author.email} size="xs" />
                    <span className="text-xs font-medium text-brand-black">{c.author.email.split("@")[0]}</span>
                    <span className="text-[11px] text-brand-gray/50">{new Date(c.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                    <button onClick={() => deleteComment(c.id)} className="opacity-0 group-hover/comment:opacity-100 p-0.5 rounded hover:bg-red-50 text-brand-gray hover:text-red-500 ml-auto transition-all">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                  <div className="text-sm text-brand-black/80 pl-7" dangerouslySetInnerHTML={{ __html: sanitizeHtml(renderCommentBody(c.body)) }} />
                </div>
              ))}
            </div>
          )}
          <div className="relative">
            <textarea
              ref={commentInputRef}
              value={commentBody}
              onChange={(e) => {
                setCommentBody(e.target.value);
                const atMatch = e.target.value.match(/@(\w*)$/);
                if (atMatch) { setShowMentions(true); setMentionFilter(atMatch[1]); } else { setShowMentions(false); }
              }}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); postComment(); } }}
              placeholder="Write a comment... (@mention people)"
              rows={2}
              className="w-full text-sm px-3 py-2 border border-platinum rounded-lg focus:outline-none focus:border-royal-purple resize-none bg-white"
            />
            {showMentions && (
              <div ref={mentionsRef} className="absolute bottom-full mb-1 left-0 bg-white border border-platinum rounded-lg shadow-lg w-56 py-1 max-h-40 overflow-y-auto z-10">
                {people.filter((p) => !mentionFilter || p.name.toLowerCase().includes(mentionFilter.toLowerCase())).map((p) => (
                  <button key={p.id} onClick={() => insertMention(p)} className="w-full text-left px-3 py-1.5 text-sm hover:bg-lavender/30 flex items-center gap-2 transition-colors">
                    <Initials name={p.name} size="xs" />
                    {p.name}
                  </button>
                ))}
              </div>
            )}
            {commentBody.trim() && (
              <div className="flex justify-end mt-1.5">
                <button onClick={postComment} className="px-3 py-1 text-xs bg-royal-purple text-white rounded-lg hover:bg-midnight-blue transition-colors">Post</button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-brand-gray/60 pt-4 border-t border-platinum/30">
          <span>
            Created {new Date(activeTask.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            {activeTask.createdBy && <> by {activeTask.createdBy.email.split("@")[0]}</>}
          </span>
          <button onClick={() => onDelete(activeTask.id)} className="text-red-400 hover:text-red-600 transition-colors duration-150">Delete task</button>
        </div>
      </div>
    </div>
  );
}
