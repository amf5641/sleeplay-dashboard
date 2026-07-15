import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createGoal, isAdminOrManager, canManageGoal } from "@/lib/goal-service";
import { computeGoalProgress } from "@/lib/goal-progress";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const subGoals = await prisma.goal.findMany({
    where: { parentId: id },
    include: {
      owner: { select: { id: true, email: true } },
      _count: { select: { subGoals: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const withProgress = await Promise.all(
    subGoals.map(async (sg) => ({ ...sg, ...(await computeGoalProgress(sg)) }))
  );

  return Response.json(withProgress);
}

export async function POST(
  request: NextRequest,
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

  const parent = await prisma.goal.findUnique({ where: { id }, select: { ownerId: true, isCompanyLevel: true, departmentId: true } });
  if (!parent) return Response.json({ error: "Parent goal not found" }, { status: 404 });
  if (!canManageGoal(parent, dbUser)) return Response.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  if (!body.name) return Response.json({ error: "name is required" }, { status: 400 });

  const ownerId = body.ownerId || dbUser.id;
  const owner = await prisma.user.findUnique({ where: { id: ownerId }, select: { id: true, role: true } });
  if (!owner) return Response.json({ error: "Owner not found" }, { status: 400 });
  if (!isAdminOrManager(owner)) {
    return Response.json({ error: "Goal owner must be an admin or manager" }, { status: 400 });
  }

  const subGoal = await createGoal({
    name: body.name,
    description: body.description,
    ownerId,
    isCompanyLevel: parent.isCompanyLevel,
    departmentId: parent.departmentId,
    parentId: id,
    status: body.status,
    timePeriod: body.timePeriod,
    startOn: body.startOn,
    dueOn: body.dueOn,
    metricUnit: body.metricUnit,
    initialValue: body.initialValue,
    targetValue: body.targetValue,
    currentValue: body.currentValue,
    progressSource: body.progressSource,
    createdById: dbUser.id,
  });

  return Response.json(subGoal, { status: 201 });
}
