import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const sessionUser = session.user as { email?: string };
  const dbUser = sessionUser.email
    ? await prisma.user.findUnique({ where: { email: sessionUser.email }, select: { id: true } })
    : null;
  if (!dbUser) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const goal = await prisma.goal.findUnique({ where: { id }, select: { id: true } });
  if (!goal) return Response.json({ error: "Not found" }, { status: 404 });

  const follower = await prisma.goalFollower.upsert({
    where: { goalId_userId: { goalId: id, userId: dbUser.id } },
    create: { goalId: id, userId: dbUser.id },
    update: {},
  });

  return Response.json(follower, { status: 201 });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const sessionUser = session.user as { email?: string };
  const dbUser = sessionUser.email
    ? await prisma.user.findUnique({ where: { email: sessionUser.email }, select: { id: true } })
    : null;
  if (!dbUser) return Response.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.goalFollower.deleteMany({ where: { goalId: id, userId: dbUser.id } });
  return Response.json({ success: true });
}
