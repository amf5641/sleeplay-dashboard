import { prisma } from "@/lib/prisma";

export interface GoalProgressResult {
  computedPct: number | null;
  computedCurrentValue: number | null;
  source: string;
}

interface GoalForProgress {
  id: string;
  progressSource: string;
  initialValue: number | null;
  targetValue: number | null;
  currentValue: number | null;
}

// Computed on-the-fly at read time — Goal.currentValue in the DB is authoritative
// only for progressSource === "manual"; the other sources are always derived live
// from sub-goals or linked project/task completion so the API response never drifts.
export async function computeGoalProgress(goal: GoalForProgress): Promise<GoalProgressResult> {
  switch (goal.progressSource) {
    case "subgoals":
      return computeFromSubgoals(goal);
    case "project":
      return computeFromRelationships(goal, "project");
    case "task":
      return computeFromRelationships(goal, "task");
    case "manual":
    default:
      return computeManual(goal);
  }
}

function pctFromValues(current: number, target: number, initial: number | null): number {
  const start = initial ?? 0;
  const pct = target === start ? (current >= target ? 100 : 0) : ((current - start) / (target - start)) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

function computeManual(goal: GoalForProgress): GoalProgressResult {
  if (goal.targetValue == null || goal.currentValue == null) {
    return { computedPct: null, computedCurrentValue: goal.currentValue, source: "manual" };
  }
  return {
    computedPct: pctFromValues(goal.currentValue, goal.targetValue, goal.initialValue),
    computedCurrentValue: goal.currentValue,
    source: "manual",
  };
}

function deriveCurrentValue(goal: GoalForProgress, pct: number): number | null {
  if (goal.targetValue == null) return null;
  const start = goal.initialValue ?? 0;
  return start + (pct / 100) * (goal.targetValue - start);
}

async function computeFromSubgoals(goal: GoalForProgress): Promise<GoalProgressResult> {
  const children = await prisma.goal.findMany({
    where: { parentId: goal.id },
    select: { id: true, progressSource: true, initialValue: true, targetValue: true, currentValue: true },
  });

  // No sub-goals yet — fall back to a manual value if one was set directly.
  if (children.length === 0) return computeManual(goal);

  const childResults = await Promise.all(children.map((c) => computeGoalProgress(c)));
  const pcts = childResults.map((r) => r.computedPct).filter((p): p is number => p != null);
  if (pcts.length === 0) return { computedPct: null, computedCurrentValue: null, source: "subgoals" };

  const avgPct = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
  return { computedPct: avgPct, computedCurrentValue: deriveCurrentValue(goal, avgPct), source: "subgoals" };
}

async function computeFromRelationships(goal: GoalForProgress, kind: "project" | "task"): Promise<GoalProgressResult> {
  const relationships = await prisma.goalRelationship.findMany({
    where:
      kind === "project"
        ? { goalId: goal.id, projectId: { not: null } }
        : { goalId: goal.id, taskId: { not: null } },
    include: {
      project: { include: { tasks: { where: { parentId: null }, select: { completed: true } } } },
      task: { select: { completed: true } },
    },
  });
  if (relationships.length === 0) return { computedPct: null, computedCurrentValue: null, source: kind };

  let weightedSum = 0;
  let weightTotal = 0;
  for (const rel of relationships) {
    let pct: number | null = null;
    if (kind === "project" && rel.project) {
      const tasks = rel.project.tasks;
      pct = tasks.length ? (tasks.filter((t) => t.completed).length / tasks.length) * 100 : null;
    } else if (kind === "task" && rel.task) {
      pct = rel.task.completed ? 100 : 0;
    }
    if (pct == null) continue;
    weightedSum += pct * rel.contributionWeight;
    weightTotal += rel.contributionWeight;
  }
  if (weightTotal === 0) return { computedPct: null, computedCurrentValue: null, source: kind };

  const avgPct = Math.round(weightedSum / weightTotal);
  return { computedPct: avgPct, computedCurrentValue: deriveCurrentValue(goal, avgPct), source: kind };
}
