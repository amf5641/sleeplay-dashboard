import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageGoal, isAdminOrManager } from "@/lib/goal-service";
import { computeGoalProgress } from "@/lib/goal-progress";

const EDITABLE_FIELDS = [
  "name",
  "description",
  "ownerId",
  "isCompanyLevel",
  "departmentId",
  "status",
  "timePeriod",
  "startOn",
  "dueOn",
  "metricUnit",
  "initialValue",
  "targetValue",
  "currentValue",
  "progressSource",
];

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const goal = await prisma.goal.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, email: true } },
      createdBy: { select: { id: true, email: true } },
      department: true,
      parent: { select: { id: true, name: true } },
      subGoals: {
        include: {
          owner: { select: { id: true, email: true } },
          _count: { select: { subGoals: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      relationships: {
        include: {
          project: { select: { id: true, name: true } },
          task: { select: { id: true, title: true, completed: true } },
        },
      },
      updates: {
        include: { author: { select: { id: true, email: true } } },
        orderBy: { createdAt: "asc" },
      },
      followers: { include: { user: { select: { id: true, email: true } } } },
    },
  });

  if (!goal) return Response.json({ error: "Not found" }, { status: 404 });

  const progress = await computeGoalProgress(goal);
  const subGoalsWithProgress = await Promise.all(
    goal.subGoals.map(async (sg) => ({ ...sg, ...(await computeGoalProgress(sg)) }))
  );

  return Response.json({ ...goal, ...progress, subGoals: subGoalsWithProgress });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const sessionUser = session.user as { email?: string; id?: string; role?: string };
  const dbUser = sessionUser.email
    ? await prisma.user.findUnique({ where: { email: sessionUser.email }, select: { id: true, role: true } })
    : null;
  if (!dbUser) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const goal = await prisma.goal.findUnique({ where: { id }, select: { ownerId: true } });
  if (!goal) return Response.json({ error: "Not found" }, { status: 404 });
  if (!canManageGoal(goal, dbUser)) return Response.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();

  if (body.ownerId !== undefined && body.ownerId !== goal.ownerId) {
    const newOwner = await prisma.user.findUnique({ where: { id: body.ownerId }, select: { id: true, role: true } });
    if (!newOwner) return Response.json({ error: "Owner not found" }, { status: 400 });
    if (!isAdminOrManager(newOwner)) {
      return Response.json({ error: "Goal owner must be an admin or manager" }, { status: 400 });
    }
  }

  const data: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (body[field] !== undefined) data[field] = body[field];
  }

  const updated = await prisma.goal.update({ where: { id }, data });
  return Response.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const sessionUser = session.user as { email?: string; role?: string };
  const dbUser = sessionUser.email
    ? await prisma.user.findUnique({ where: { email: sessionUser.email }, select: { id: true, role: true } })
    : null;
  if (!dbUser) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const goal = await prisma.goal.findUnique({ where: { id }, select: { ownerId: true } });
  if (!goal) return Response.json({ error: "Not found" }, { status: 404 });
  if (!canManageGoal(goal, dbUser)) return Response.json({ error: "Forbidden" }, { status: 403 });

  await prisma.goal.delete({ where: { id } });
  return Response.json({ success: true });
}
