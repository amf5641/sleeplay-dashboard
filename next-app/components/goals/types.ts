export const GOAL_MAX_SUPPORTING_WORK = 10;

export const GOAL_STATUS_OPTIONS = [
  "On Track",
  "At Risk",
  "Off Track",
  "Achieved",
  "Partial",
  "Missed",
  "Dropped",
] as const;

export const GOAL_OPEN_STATUSES = ["On Track", "At Risk", "Off Track"] as const;
export const GOAL_CLOSED_STATUSES = ["Achieved", "Partial", "Missed", "Dropped"] as const;

export const goalStatusColors: Record<string, string> = {
  "On Track": "bg-emerald-100 text-emerald-700",
  "At Risk": "bg-amber-100 text-amber-700",
  "Off Track": "bg-red-100 text-red-700",
  Achieved: "bg-blue-100 text-blue-700",
  Partial: "bg-purple-100 text-purple-700",
  Missed: "bg-gray-100 text-gray-600",
  Dropped: "bg-gray-100 text-gray-400",
};

export const goalStatusDot: Record<string, string> = {
  "On Track": "bg-emerald-500",
  "At Risk": "bg-amber-500",
  "Off Track": "bg-red-500",
  Achieved: "bg-blue-500",
  Partial: "bg-purple-500",
  Missed: "bg-gray-400",
  Dropped: "bg-gray-300",
};

export const GOAL_METRIC_UNITS = ["none", "percentage", "currency", "number"] as const;
export const GOAL_PROGRESS_SOURCES = ["manual", "subgoals", "project", "task"] as const;

export const progressSourceLabels: Record<string, string> = {
  manual: "Manual",
  subgoals: "Sub-goals average",
  project: "Linked project completion",
  task: "Linked task completion",
};

export interface GoalOwner {
  id: string;
  email: string;
}

export interface GoalDepartment {
  id: string;
  name: string;
  color: string;
}

export interface GoalListItem {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  owner: GoalOwner;
  isCompanyLevel: boolean;
  departmentId: string | null;
  department: GoalDepartment | null;
  parentId: string | null;
  status: string;
  timePeriod: string;
  startOn: string | null;
  dueOn: string | null;
  metricUnit: string;
  initialValue: number | null;
  targetValue: number | null;
  currentValue: number | null;
  progressSource: string;
  createdAt: string;
  updatedAt: string;
  _count: { subGoals: number; relationships: number; followers: number };
  // Always attached server-side by lib/goal-progress.ts's computeGoalProgress —
  // authoritative regardless of progressSource, so the UI never recomputes it.
  computedPct: number | null;
  computedCurrentValue: number | null;
}

export function formatMetricValue(value: number | null | undefined, unit: string): string {
  if (value == null) return "—";
  if (unit === "currency") return `$${value.toLocaleString()}`;
  if (unit === "percentage") return `${value}%`;
  return value.toLocaleString();
}
