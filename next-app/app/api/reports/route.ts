import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as { email?: string; role?: string };
  const isAdmin = user.role === "admin";
  const url = new URL(request.url);
  const projectFilter = url.searchParams.get("projectId");
  const days = parseInt(url.searchParams.get("days") || "30", 10);

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const today = new Date().toISOString().split("T")[0];

  // Fetch projects with tasks
  const projectWhere = projectFilter
    ? { id: projectFilter }
    : isAdmin
      ? {}
      : { members: { some: { user: { email: user.email } } } };

  const projects = await prisma.project.findMany({
    where: projectWhere,
    select: {
      id: true,
      name: true,
      tasks: {
        where: { parentId: null },
        select: {
          id: true,
          title: true,
          completed: true,
          dueDate: true,
          status: true,
          priority: true,
          createdAt: true,
          collaborators: { select: { person: { select: { id: true, name: true } } } },
        },
      },
    },
  });

  // 1. Completion rates by project
  const completionRates = projects.map((p) => {
    const total = p.tasks.length;
    const completed = p.tasks.filter((t) => t.completed).length;
    return {
      projectId: p.id,
      projectName: p.name,
      total,
      completed,
      rate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }).sort((a, b) => b.total - a.total);

  // 2. Average time-to-close using ActivityEvent
  const completionEvents = await prisma.activityEvent.findMany({
    where: {
      action: "completed_task",
      createdAt: { gte: cutoff },
      ...(projectFilter ? { projectId: projectFilter } : {}),
    },
    select: { taskId: true, createdAt: true, projectId: true },
  });

  const taskIds = completionEvents.filter((e) => e.taskId).map((e) => e.taskId!);
  const completedTasks = taskIds.length > 0
    ? await prisma.task.findMany({
        where: { id: { in: taskIds } },
        select: { id: true, createdAt: true, projectId: true },
      })
    : [];

  const taskCreatedMap = new Map(completedTasks.map((t) => [t.id, t]));
  const projectCloseTimesMap = new Map<string, number[]>();

  for (const event of completionEvents) {
    if (!event.taskId || !event.projectId) continue;
    const task = taskCreatedMap.get(event.taskId);
    if (!task) continue;
    const daysToClose = Math.max(1, Math.round((event.createdAt.getTime() - task.createdAt.getTime()) / 86400000));
    if (!projectCloseTimesMap.has(event.projectId)) projectCloseTimesMap.set(event.projectId, []);
    projectCloseTimesMap.get(event.projectId)!.push(daysToClose);
  }

  const averageTimeToClose = projects
    .map((p) => {
      const times = projectCloseTimesMap.get(p.id) || [];
      const avg = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
      return { projectId: p.id, projectName: p.name, avgDays: avg, completedCount: times.length };
    })
    .filter((p) => p.completedCount > 0)
    .sort((a, b) => b.completedCount - a.completedCount);

  // 3. Tasks by assignee
  const assigneeMap = new Map<string, { name: string; total: number; completed: number; overdue: number }>();
  for (const p of projects) {
    for (const t of p.tasks) {
      for (const c of t.collaborators) {
        const key = c.person.id;
        if (!assigneeMap.has(key)) assigneeMap.set(key, { name: c.person.name, total: 0, completed: 0, overdue: 0 });
        const entry = assigneeMap.get(key)!;
        entry.total++;
        if (t.completed) entry.completed++;
        else if (t.dueDate && t.dueDate < today) entry.overdue++;
      }
    }
  }
  const tasksByAssignee = [...assigneeMap.entries()]
    .map(([personId, data]) => ({ personId, ...data }))
    .sort((a, b) => b.total - a.total);

  // 4. Burndown data (last N days)
  const allTasks = projects.flatMap((p) => p.tasks);
  const totalTaskCount = allTasks.length;

  // Get daily completions from activity events
  const dailyCompletions = await prisma.activityEvent.groupBy({
    by: ["createdAt"],
    where: {
      action: "completed_task",
      createdAt: { gte: cutoff },
      ...(projectFilter ? { projectId: projectFilter } : {}),
    },
    _count: true,
  });

  // Build date-indexed completion counts
  const completionsByDate = new Map<string, number>();
  for (const dc of dailyCompletions) {
    const dateStr = dc.createdAt.toISOString().split("T")[0];
    completionsByDate.set(dateStr, (completionsByDate.get(dateStr) || 0) + dc._count);
  }

  // Generate burndown series
  const burndown: { date: string; remaining: number; ideal: number }[] = [];
  let cumulativeCompleted = 0;
  const d = new Date(cutoff);
  const endDate = new Date();
  const totalDays = Math.round((endDate.getTime() - cutoff.getTime()) / 86400000);
  const idealDecrement = totalTaskCount / Math.max(totalDays, 1);

  while (d <= endDate) {
    const ds = d.toISOString().split("T")[0];
    cumulativeCompleted += completionsByDate.get(ds) || 0;
    const dayIndex = Math.round((d.getTime() - cutoff.getTime()) / 86400000);
    burndown.push({
      date: ds,
      remaining: totalTaskCount - cumulativeCompleted,
      ideal: Math.max(0, Math.round(totalTaskCount - idealDecrement * dayIndex)),
    });
    d.setDate(d.getDate() + 1);
  }

  // 5. Overall stats
  const completedTaskCount = allTasks.filter((t) => t.completed).length;
  const overdueCount = allTasks.filter((t) => !t.completed && t.dueDate && t.dueDate < today).length;

  // 6. Priority breakdown
  const priorityBreakdown = {
    high: allTasks.filter((t) => t.priority === "high").length,
    medium: allTasks.filter((t) => t.priority === "medium").length,
    low: allTasks.filter((t) => t.priority === "low").length,
  };

  return Response.json({
    completionRates,
    averageTimeToClose,
    tasksByAssignee,
    burndown,
    priorityBreakdown,
    overall: {
      totalTasks: totalTaskCount,
      completedTasks: completedTaskCount,
      completionRate: totalTaskCount > 0 ? Math.round((completedTaskCount / totalTaskCount) * 100) : 0,
      overdueCount,
    },
  });
}
