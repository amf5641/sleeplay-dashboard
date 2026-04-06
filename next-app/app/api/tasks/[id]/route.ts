import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function computeNextDueDate(currentDue: string | null, freq: string, repeatDay: number | null): string {
  const base = currentDue ? new Date(currentDue + "T00:00:00") : new Date();
  switch (freq) {
    case "daily":
      base.setDate(base.getDate() + 1);
      break;
    case "weekly":
      if (repeatDay !== null) {
        // repeatDay = 0 (Sun) to 6 (Sat)
        const diff = (repeatDay - base.getDay() + 7) % 7 || 7;
        base.setDate(base.getDate() + diff);
      } else {
        base.setDate(base.getDate() + 7);
      }
      break;
    case "monthly":
      if (repeatDay !== null) {
        base.setMonth(base.getMonth() + 1);
        base.setDate(Math.min(repeatDay, new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate()));
      } else {
        base.setMonth(base.getMonth() + 1);
      }
      break;
    case "yearly":
      base.setFullYear(base.getFullYear() + 1);
      break;
    default:
      base.setDate(base.getDate() + 1);
  }
  return base.toISOString().split("T")[0];
}

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

  const fields = ["title", "description", "dueDate", "priority", "completed", "status", "notes", "repeatFreq", "repeatDay"];
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
    include: { collaborators: { include: { person: true } }, subtasks: true },
  });

  // Auto-create next occurrence when a repeating task is completed
  if (body.completed === true && task.repeatFreq) {
    const nextDue = computeNextDueDate(task.dueDate, task.repeatFreq, task.repeatDay);
    const newTask = await prisma.task.create({
      data: {
        projectId: task.projectId,
        parentId: task.parentId,
        title: task.title,
        description: task.description,
        dueDate: nextDue,
        priority: task.priority,
        status: "On Track",
        notes: task.notes,
        repeatFreq: task.repeatFreq,
        repeatDay: task.repeatDay,
      },
    });
    // Copy collaborators to the new task
    if (task.collaborators.length > 0) {
      await prisma.taskCollaborator.createMany({
        data: task.collaborators.map((c) => ({ taskId: newTask.id, personId: c.person.id })),
      });
    }
  }

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
