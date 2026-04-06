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

  const fields = ["title", "description", "dueDate", "priority", "completed", "status", "notes"];
  for (const field of fields) {
    if (body[field] !== undefined) data[field] = body[field];
  }

  // Handle collaborators array specially
  if (body.collaborators !== undefined) {
    // Get existing collaborators to find newly added ones
    const existingCollabs = await prisma.taskCollaborator.findMany({
      where: { taskId: id },
      select: { personId: true },
    });
    const existingPersonIds = new Set(existingCollabs.map((c) => c.personId));
    const newPersonIds = (body.collaborators as string[]).filter((pid) => !existingPersonIds.has(pid));

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

    // Notify newly added collaborators
    if (newPersonIds.length > 0) {
      const taskData = await prisma.task.findUnique({ where: { id }, select: { title: true, projectId: true, parentId: true } });
      const project = taskData ? await prisma.project.findUnique({ where: { id: taskData.projectId }, select: { name: true } }) : null;
      const parentTask = taskData?.parentId ? await prisma.task.findUnique({ where: { id: taskData.parentId }, select: { id: true, title: true } }) : null;
      const people = await prisma.person.findMany({
        where: { id: { in: newPersonIds } },
        select: { email: true },
      });
      for (const person of people) {
        if (!person.email) continue;
        const user = await prisma.user.findUnique({ where: { email: person.email } });
        if (user) {
          let message = `You were assigned "${taskData?.title}"`;
          if (parentTask) message += ` in "${parentTask.title}"`;
          if (project) message += ` in "${project.name}"`;
          const linkTaskId = parentTask ? parentTask.id : id;
          await prisma.notification.create({
            data: {
              userId: user.id,
              type: "task_assigned",
              title: parentTask ? "New subtask assigned" : "New task assigned",
              message,
              linkUrl: `/projects/${taskData?.projectId}?task=${linkTaskId}`,
            },
          });
        }
      }
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
