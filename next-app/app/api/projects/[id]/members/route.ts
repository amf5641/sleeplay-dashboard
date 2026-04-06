import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { userId } = body;

  if (!userId) return Response.json({ error: "userId required" }, { status: 400 });

  const existing = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: id, userId } },
  });
  if (existing) return Response.json({ error: "Already a member" }, { status: 409 });

  const member = await prisma.projectMember.create({
    data: { projectId: id, userId },
    include: { user: { select: { id: true, email: true } } },
  });

  // Create notification for the added user
  const project = await prisma.project.findUnique({ where: { id }, select: { name: true } });
  if (project) {
    await prisma.notification.create({
      data: {
        userId,
        type: "project_added",
        title: "Added to project",
        message: `You were added to "${project.name}"`,
        linkUrl: `/projects/${id}`,
      },
    });
  }

  return Response.json(member, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { userId } = body;

  if (!userId) return Response.json({ error: "userId required" }, { status: 400 });

  await prisma.projectMember.deleteMany({
    where: { projectId: id, userId },
  });

  return Response.json({ success: true });
}
