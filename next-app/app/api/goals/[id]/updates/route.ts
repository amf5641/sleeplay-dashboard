import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdminOrManager } from "@/lib/goal-service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const updates = await prisma.goalUpdate.findMany({
    where: { goalId: id },
    include: { author: { select: { id: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });

  return Response.json(updates);
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

  const goal = await prisma.goal.findUnique({ where: { id }, select: { id: true, name: true, ownerId: true } });
  if (!goal) return Response.json({ error: "Not found" }, { status: 404 });

  const isFollower = await prisma.goalFollower.findUnique({
    where: { goalId_userId: { goalId: id, userId: dbUser.id } },
  });
  if (!isFollower && !isAdminOrManager(dbUser)) {
    return Response.json({ error: "Follow this goal to post an update" }, { status: 403 });
  }

  const body = await request.json();
  if (!body.status) return Response.json({ error: "status is required" }, { status: 400 });

  const update = await prisma.goalUpdate.create({
    data: { goalId: id, authorId: dbUser.id, status: body.status, body: body.body ?? "" },
    include: { author: { select: { id: true, email: true } } },
  });

  await prisma.goal.update({ where: { id }, data: { status: body.status } });

  const followers = await prisma.goalFollower.findMany({ where: { goalId: id }, select: { userId: true } });
  const notifyIds = new Set([goal.ownerId, ...followers.map((f) => f.userId)]);
  notifyIds.delete(dbUser.id);
  for (const userId of notifyIds) {
    await prisma.notification.create({
      data: {
        userId,
        type: "goal_update",
        title: "Goal status update",
        message: `${sessionUser.email} posted an update on "${goal.name}": ${body.status}`,
        linkUrl: `/goals/${id}`,
      },
    });
  }

  return Response.json(update, { status: 201 });
}
