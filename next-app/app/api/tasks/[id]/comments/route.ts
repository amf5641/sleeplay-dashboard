import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const comments = await prisma.taskComment.findMany({
    where: { taskId: id },
    include: { author: { select: { id: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });
  return Response.json(comments);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as { email?: string };
  const dbUser = await prisma.user.findUnique({ where: { email: user.email! } });
  if (!dbUser) return Response.json({ error: "User not found" }, { status: 404 });

  const body = await request.json();
  const { body: commentBody } = body;
  if (!commentBody?.trim()) return Response.json({ error: "body required" }, { status: 400 });

  const comment = await prisma.taskComment.create({
    data: { taskId: id, authorId: dbUser.id, body: commentBody.trim() },
    include: { author: { select: { id: true, email: true } } },
  });

  // Create notifications for @mentioned users
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  const task = await prisma.task.findUnique({ where: { id }, select: { title: true, projectId: true } });
  while ((match = mentionRegex.exec(commentBody)) !== null) {
    const personId = match[2];
    const person = await prisma.person.findUnique({ where: { id: personId }, select: { email: true } });
    if (person?.email) {
      const mentionedUser = await prisma.user.findUnique({ where: { email: person.email } });
      if (mentionedUser && mentionedUser.id !== dbUser.id) {
        await prisma.notification.create({
          data: {
            userId: mentionedUser.id,
            type: "task_mention",
            title: `Mentioned in ${task?.title || "a task"}`,
            message: `${dbUser.email} mentioned you in a comment`,
            linkUrl: `/projects/${task?.projectId}?task=${id}`,
          },
        });
      }
    }
  }

  return Response.json(comment, { status: 201 });
}
