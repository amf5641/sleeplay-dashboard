export interface Person { id: string; name: string }
export interface AppUser { id: string; email: string }
export interface ProjectMember { id: string; user: AppUser }
export interface CustomField { id: string; name: string; type: string; options: string; position: number }
export interface TaskCustomFieldValue { id: string; taskId: string; customFieldId: string; value: string }
export interface TaskAttachment { id: string; name: string; url: string; createdAt: string }
export interface TaskComment { id: string; body: string; createdAt: string; author: { id: string; email: string } }
export interface TaskDep { id: string; blockedByTask: { id: string; title: string; completed: boolean } }
export interface TaskBlock { id: string; task: { id: string; title: string; completed: boolean } }
export interface Subtask {
  id: string; title: string; description: string; dueDate: string | null; priority: string; status: string; notes: string; completed: boolean; createdAt: string;
  repeatFreq: string | null; repeatDay: number | null;
  collaborators: { person: Person }[];
  customFieldValues: TaskCustomFieldValue[];
  attachments: TaskAttachment[];
  _count?: { comments: number };
  dependsOn?: TaskDep[];
  blocks?: TaskBlock[];
}
export interface Task extends Subtask {
  subtasks: Subtask[];
}
export interface Department { id: string; name: string; color: string }
export interface Project { id: string; name: string; description: string; status: string; notes: string; color: string; departmentId: string | null; sectionOrder: string; columnConfig: string; tasks: Task[]; members: ProjectMember[]; customFields: CustomField[] }

export const PROJECT_COLORS = [
  "#E8384F", "#FD612C", "#FDBA31", "#7BC86C", "#4ECBC4",
  "#4573D2", "#664FA6", "#EA4E9D", "#8DA3A6", "#1B0F3D",
];

export const STATUS_OPTIONS = ["On Track", "Slightly Off", "Off Track", "On Hold", "Done"] as const;

export const statusColors: Record<string, string> = {
  "On Track": "bg-emerald-100 text-emerald-700",
  "Slightly Off": "bg-amber-100 text-amber-700",
  "Off Track": "bg-red-100 text-red-700",
  "On Hold": "bg-gray-100 text-gray-600",
  "Done": "bg-blue-100 text-blue-700",
};

export const statusDot: Record<string, string> = {
  "On Track": "bg-emerald-500",
  "Slightly Off": "bg-amber-500",
  "Off Track": "bg-red-500",
  "On Hold": "bg-gray-400",
  "Done": "bg-blue-500",
};

export const priorityColor: Record<string, string> = { high: "bg-red-400", medium: "bg-amber-400", low: "bg-emerald-400" };

export const isUrl = (s: string) => /^(https?:\/\/|www\.)\S+/i.test(s.trim());
export const toHref = (s: string) => { const t = s.trim(); return t.startsWith("http") ? t : `https://${t}`; };

export const BUILTIN_COLUMNS = [
  { key: "created", label: "Created" },
  { key: "dueDate", label: "Due Date" },
  { key: "priority", label: "Priority" },
  { key: "status", label: "Status" },
  { key: "collaborators", label: "Assignee" },
  { key: "notes", label: "Notes" },
];
