import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as { email?: string; role?: string };
  const isAdmin = user.role === "admin";

  const projects = await prisma.project.findMany({
    where: isAdmin
      ? {}
      : { members: { some: { user: { email: user.email } } } },
    select: {
      id: true,
      name: true,
      status: true,
      _count: { select: { tasks: true } },
      tasks: {
        where: { parentId: null },
        select: { id: true, completed: true, dueDate: true, status: true, collaborators: { select: { person: { select: { id: true, name: true } } } } },
      },
    },
  });

  const today = new Date().toISOString().split("T")[0];

  const projectProgress = projects.map((p) => ({
    id: p.id,
    name: p.name,
    status: p.status,
    totalTasks: p.tasks.length,
    completedTasks: p.tasks.filter((t) => t.completed).length,
    percentage: p.tasks.length > 0 ? Math.round((p.tasks.filter((t) => t.completed).length / p.tasks.length) * 100) : 0,
  }));

  const workloadMap = new Map<string, { name: string; count: number }>();
  for (const p of projects) {
    for (const t of p.tasks) {
      if (t.completed) continue;
      for (const c of t.collaborators) {
        const key = c.person.id;
        const existing = workloadMap.get(key);
        if (existing) existing.count++;
        else workloadMap.set(key, { name: c.person.name, count: 1 });
      }
    }
  }
  const teamWorkload = [...workloadMap.values()].sort((a, b) => b.count - a.count);

  let overdueCount = 0;
  let dueSoonCount = 0;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  for (const p of projects) {
    for (const t of p.tasks) {
      if (t.completed) continue;
      if (t.dueDate && t.dueDate < today) overdueCount++;
      if (t.dueDate && t.dueDate === tomorrowStr) dueSoonCount++;
    }
  }

  return Response.json({ projectProgress, teamWorkload, overdueCount, dueSoonCount });
}
