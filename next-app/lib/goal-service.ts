import { prisma } from "@/lib/prisma";
import { GOAL_MAX_SUPPORTING_WORK } from "@/components/goals/types";

export { GOAL_MAX_SUPPORTING_WORK };

interface SessionUser {
  id?: string;
  email?: string;
  role?: string;
}

export function isAdminOrManager(user: SessionUser) {
  return user.role === "admin" || user.role === "manager";
}

export function canManageGoal(goal: { ownerId: string }, user: SessionUser) {
  return isAdminOrManager(user) || goal.ownerId === user.id;
}

interface CreateGoalInput {
  name: string;
  description?: string;
  ownerId: string;
  isCompanyLevel?: boolean;
  departmentId?: string | null;
  parentId?: string | null;
  status?: string;
  timePeriod?: string;
  startOn?: string | null;
  dueOn?: string | null;
  metricUnit?: string;
  initialValue?: number | null;
  targetValue?: number | null;
  currentValue?: number | null;
  progressSource?: string;
  createdById?: string | null;
}

// Shared by POST /api/goals and POST /api/goals/[id]/subgoals so validation and
// the owner-auto-follow side effect only live in one place.
export async function createGoal(input: CreateGoalInput) {
  const goal = await prisma.goal.create({
    data: {
      name: input.name,
      description: input.description ?? "",
      ownerId: input.ownerId,
      isCompanyLevel: input.isCompanyLevel ?? false,
      departmentId: input.departmentId || null,
      parentId: input.parentId || null,
      status: input.status ?? "On Track",
      timePeriod: input.timePeriod ?? "",
      startOn: input.startOn || null,
      dueOn: input.dueOn || null,
      metricUnit: input.metricUnit ?? "none",
      initialValue: input.initialValue ?? null,
      targetValue: input.targetValue ?? null,
      currentValue: input.currentValue ?? null,
      progressSource: input.progressSource ?? "manual",
      createdById: input.createdById ?? null,
    },
  });

  // createMany's skipDuplicates isn't supported on SQLite, so upsert each follower individually.
  const followerIds = new Set([input.ownerId]);
  if (input.createdById) followerIds.add(input.createdById);
  for (const userId of followerIds) {
    await prisma.goalFollower.upsert({
      where: { goalId_userId: { goalId: goal.id, userId } },
      create: { goalId: goal.id, userId },
      update: {},
    });
  }

  return goal;
}
