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

  const user = session.user as { email?: string; id?: string; role?: string };

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      tasks: {
        where: { parentId: null },
        include: {
          collaborators: { include: { person: true } },
          subtasks: {
            include: {
              collaborators: { include: { person: true } },
              customFieldValues: true,
            },
            orderBy: [{ completed: "asc" }, { createdAt: "asc" }],
          },
          customFieldValues: true,
          attachments: { orderBy: { createdAt: "desc" } },
          _count: { select: { comments: true } },
          dependsOn: { include: { blockedByTask: { select: { id: true, title: true, completed: true } } } },
          blocks: { include: { task: { select: { id: true, title: true, completed: true } } } },
        },
        orderBy: [{ completed: "asc" }, { title: "asc" }],
      },
      members: { include: { user: { select: { id: true, email: true } } } },
      customFields: { orderBy: { position: "asc" } },
    },
  });

  if (!project) return Response.json({ error: "Not found" }, { status: 404 });

  // Check access: admins can see all, members only their projects
  if (user.role !== "admin" && !project.members.some((m) => m.user.email === user.email)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  return Response.json(project);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const data: Record<string, unknown> = {};

  const fields = ["name", "description", "status", "notes", "sectionOrder", "columnConfig"];
  for (const field of fields) {
    if (body[field] !== undefined) data[field] = body[field];
  }

  const project = await prisma.project.update({
    where: { id },
    data,
  });

  return Response.json(project);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.project.delete({ where: { id } });
  return Response.json({ success: true });
}
