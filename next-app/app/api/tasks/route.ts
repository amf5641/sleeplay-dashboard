import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  const task = await prisma.task.create({
    data: {
      projectId: body.projectId,
      title: body.title ?? "Untitled",
      description: body.description ?? "",
      dueDate: body.dueDate ?? null,
      priority: body.priority ?? "medium",
      status: body.status ?? "On Track",
      notes: body.notes ?? "",
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
    const people = await prisma.person.findMany({
      where: { id: { in: body.collaborators } },
      select: { email: true },
    });
    for (const person of people) {
      if (!person.email) continue;
      const user = await prisma.user.findUnique({ where: { email: person.email } });
      if (user) {
        await prisma.notification.create({
          data: {
            userId: user.id,
            type: "task_assigned",
            title: "New task assigned",
            message: `You were assigned "${task.title}"${project ? ` in ${project.name}` : ""}`,
            linkUrl: `/projects/${body.projectId}`,
          },
        });
      }
    }
  }

  return Response.json(task, { status: 201 });
}
