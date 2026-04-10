import { prisma } from "@/lib/prisma";

export async function notifyCollaborators(
  taskId: string,
  excludeEmail: string | null,
  type: string,
  title: string,
  message: string,
  linkUrl: string
) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { collaborators: { include: { person: true } } },
  });
  if (!task) return;

  for (const collab of task.collaborators) {
    if (!collab.person.email || collab.person.email === excludeEmail) continue;
    const user = await prisma.user.findUnique({ where: { email: collab.person.email } });
    if (!user) continue;
    await prisma.notification.create({
      data: { userId: user.id, type, title, message, linkUrl },
    });
  }
}
