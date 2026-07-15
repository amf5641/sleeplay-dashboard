import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageGoal, GOAL_MAX_SUPPORTING_WORK } from "@/lib/goal-service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const relationships = await prisma.goalRelationship.findMany({
    where: { goalId: id },
    include: {
      project: { select: { id: true, name: true } },
      task: { select: { id: true, title: true, completed: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return Response.json(relationships);
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

  const goal = await prisma.goal.findUnique({ where: { id }, select: { ownerId: true } });
  if (!goal) return Response.json({ error: "Not found" }, { status: 404 });
  if (!canManageGoal(goal, dbUser)) return Response.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { projectId, taskId } = body;
  const contributionWeight = typeof body.contributionWeight === "number" ? body.contributionWeight : 1;

  if ((!projectId && !taskId) || (projectId && taskId)) {
    return Response.json({ error: "Provide exactly one of projectId or taskId" }, { status: 400 });
  }

  const existingCount = await prisma.goalRelationship.count({ where: { goalId: id } });
  if (existingCount >= GOAL_MAX_SUPPORTING_WORK) {
    return Response.json({ error: `A goal can have at most ${GOAL_MAX_SUPPORTING_WORK} supporting items` }, { status: 400 });
  }

  if (projectId) {
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
    if (!project) return Response.json({ error: "Project not found" }, { status: 400 });
    const dup = await prisma.goalRelationship.findFirst({ where: { goalId: id, projectId } });
    if (dup) return Response.json({ error: "This project is already attached to this goal" }, { status: 409 });
  } else {
    const task = await prisma.task.findUnique({ where: { id: taskId }, select: { id: true } });
    if (!task) return Response.json({ error: "Task not found" }, { status: 400 });
    const dup = await prisma.goalRelationship.findFirst({ where: { goalId: id, taskId } });
    if (dup) return Response.json({ error: "This task is already attached to this goal" }, { status: 409 });
  }

  const relationship = await prisma.goalRelationship.create({
    data: { goalId: id, projectId: projectId || null, taskId: taskId || null, contributionWeight },
    include: {
      project: { select: { id: true, name: true } },
      task: { select: { id: true, title: true, completed: true } },
    },
  });

  return Response.json(relationship, { status: 201 });
}

export async function DELETE(
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

  const goal = await prisma.goal.findUnique({ where: { id }, select: { ownerId: true } });
  if (!goal) return Response.json({ error: "Not found" }, { status: 404 });
  if (!canManageGoal(goal, dbUser)) return Response.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  if (!body.relationshipId) return Response.json({ error: "relationshipId required" }, { status: 400 });

  await prisma.goalRelationship.deleteMany({ where: { id: body.relationshipId, goalId: id } });
  return Response.json({ success: true });
}
