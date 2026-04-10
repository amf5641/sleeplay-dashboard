import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Due soon: tasks due tomorrow
  const dueSoonTasks = await prisma.task.findMany({
    where: { dueDate: tomorrowStr, completed: false, parentId: null },
    include: { collaborators: { include: { person: true } }, project: { select: { id: true } } },
  });

  for (const task of dueSoonTasks) {
    for (const collab of task.collaborators) {
      if (!collab.person.email) continue;
      const user = await prisma.user.findUnique({ where: { email: collab.person.email } });
      if (!user) continue;

      const existing = await prisma.notification.findFirst({
        where: { userId: user.id, type: "task_due_soon", linkUrl: { contains: task.id }, createdAt: { gte: oneDayAgo } },
      });
      if (existing) continue;

      await prisma.notification.create({
        data: {
          userId: user.id,
          type: "task_due_soon",
          title: "Task due tomorrow",
          message: `"${task.title}" is due tomorrow`,
          linkUrl: `/projects/${task.project.id}?task=${task.id}`,
        },
      });
    }
  }

  // Overdue: tasks past due date
  const overdueTasks = await prisma.task.findMany({
    where: { dueDate: { lt: today }, completed: false, parentId: null },
    include: { collaborators: { include: { person: true } }, project: { select: { id: true } } },
  });

  for (const task of overdueTasks) {
    for (const collab of task.collaborators) {
      if (!collab.person.email) continue;
      const user = await prisma.user.findUnique({ where: { email: collab.person.email } });
      if (!user) continue;

      const existing = await prisma.notification.findFirst({
        where: { userId: user.id, type: "task_overdue", linkUrl: { contains: task.id }, createdAt: { gte: oneDayAgo } },
      });
      if (existing) continue;

      await prisma.notification.create({
        data: {
          userId: user.id,
          type: "task_overdue",
          title: "Task overdue",
          message: `"${task.title}" is past its due date`,
          linkUrl: `/projects/${task.project.id}?task=${task.id}`,
        },
      });
    }
  }

  return Response.json({ dueSoon: dueSoonTasks.length, overdue: overdueTasks.length });
}
