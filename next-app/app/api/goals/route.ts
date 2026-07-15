import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createGoal, isAdminOrManager } from "@/lib/goal-service";
import { computeGoalProgress } from "@/lib/goal-progress";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const scope = params.get("scope"); // "company" | "team" | "all"
  const departmentId = params.get("departmentId");
  const timePeriod = params.get("timePeriod");
  const status = params.get("status");
  const topLevel = params.get("topLevel") === "true";

  const where: Record<string, unknown> = {};
  if (scope === "company") where.isCompanyLevel = true;
  else if (scope === "team") where.isCompanyLevel = false;
  if (departmentId) where.departmentId = departmentId;
  if (timePeriod) where.timePeriod = timePeriod;
  if (status) where.status = status;
  if (topLevel) where.parentId = null;

  const goals = await prisma.goal.findMany({
    where,
    include: {
      owner: { select: { id: true, email: true } },
      department: true,
      _count: { select: { subGoals: true, relationships: true, followers: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const withProgress = await Promise.all(
    goals.map(async (goal) => ({ ...goal, ...(await computeGoalProgress(goal)) }))
  );

  return Response.json(withProgress);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const sessionUser = session.user as { email?: string; role?: string };
  if (!isAdminOrManager(sessionUser)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  if (!body.name) return Response.json({ error: "name is required" }, { status: 400 });

  const creatorUser = sessionUser.email
    ? await prisma.user.findUnique({ where: { email: sessionUser.email }, select: { id: true } })
    : null;
  if (!creatorUser) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const ownerId = body.ownerId || creatorUser.id;
  const owner = await prisma.user.findUnique({ where: { id: ownerId }, select: { id: true, role: true } });
  if (!owner) return Response.json({ error: "Owner not found" }, { status: 400 });
  if (!isAdminOrManager(owner)) {
    return Response.json({ error: "Goal owner must be an admin or manager" }, { status: 400 });
  }

  if (body.parentId) {
    const parent = await prisma.goal.findUnique({ where: { id: body.parentId }, select: { id: true } });
    if (!parent) return Response.json({ error: "Parent goal not found" }, { status: 400 });
  }

  const goal = await createGoal({
    name: body.name,
    description: body.description,
    ownerId,
    isCompanyLevel: body.isCompanyLevel,
    departmentId: body.departmentId,
    parentId: body.parentId,
    status: body.status,
    timePeriod: body.timePeriod,
    startOn: body.startOn,
    dueOn: body.dueOn,
    metricUnit: body.metricUnit,
    initialValue: body.initialValue,
    targetValue: body.targetValue,
    currentValue: body.currentValue,
    progressSource: body.progressSource,
    createdById: creatorUser.id,
  });

  return Response.json(goal, { status: 201 });
}
