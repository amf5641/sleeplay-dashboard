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

  const task = await prisma.task.findUnique({
    where: { id },
    include: { collaborators: { include: { person: true } } },
  });

  if (!task) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(task);
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

  const fields = ["title", "dueDate", "priority", "completed"];
  for (const field of fields) {
    if (body[field] !== undefined) data[field] = body[field];
  }

  // Handle collaborators array specially
  if (body.collaborators !== undefined) {
    await prisma.taskCollaborator.deleteMany({
      where: { taskId: id },
    });

    if (body.collaborators.length > 0) {
      await prisma.taskCollaborator.createMany({
        data: body.collaborators.map((personId: string) => ({
          taskId: id,
          personId,
        })),
      });
    }
  }

  const task = await prisma.task.update({
    where: { id },
    data,
    include: { collaborators: { include: { person: true } } },
  });

  return Response.json(task);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.task.delete({ where: { id } });
  return Response.json({ success: true });
}
