import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  // Resolve the creating user's ID
  const sessionUser = session.user as { email?: string };
  const creatorUser = sessionUser.email
    ? await prisma.user.findUnique({ where: { email: sessionUser.email }, select: { id: true } })
    : null;

  const task = await prisma.task.create({
    data: {
      projectId: body.projectId,
      parentId: body.parentId ?? null,
      title: body.title ?? "Untitled",
      description: body.description ?? "",
      dueDate: body.dueDate ?? null,
      priority: body.priority ?? "medium",
      status: body.status ?? "On Track",
      notes: body.notes ?? "",
      createdById: creatorUser?.id ?? null,
      collaborators: body.collaborators?.length
        ? {
            create: body.collaborators.map((personId: string) => ({
              personId,
            })),
          }
        : undefined,
    },
    include: { collaborators: true },
  });

  // Notify assigned collaborators
  if (body.collaborators?.length) {
    const project = await prisma.project.findUnique({ where: { id: body.projectId }, select: { name: true } });
    const parentTask = body.parentId ? await prisma.task.findUnique({ where: { id: body.parentId }, select: { id: true, title: true } }) : null;
    const people = await prisma.person.findMany({
      where: { id: { in: body.collaborators } },
      select: { email: true },
    });
    for (const person of people) {
      if (!person.email) continue;
      const user = await prisma.user.findUnique({ where: { email: person.email } });
      if (user) {
        // Build message: subtask → "task" in "parent task" in "project", or task → "task" in "project"
        let message = `You were assigned "${task.title}"`;
        if (parentTask) message += ` in "${parentTask.title}"`;
        if (project) message += ` in "${project.name}"`;
        // Link to the parent task so the detail panel opens showing subtasks
        const linkTaskId = parentTask ? parentTask.id : task.id;
        await prisma.notification.create({
          data: {
            userId: user.id,
            type: "task_assigned",
            title: parentTask ? "New subtask assigned" : "New task assigned",
            message,
            linkUrl: `/projects/${body.projectId}?task=${linkTaskId}`,
          },
        });
      }
    }
  }

  return Response.json(task, { status: 201 });
}
