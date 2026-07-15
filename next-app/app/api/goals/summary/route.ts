import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeGoalProgress } from "@/lib/goal-progress";
import { GOAL_STATUS_OPTIONS } from "@/components/goals/types";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const topLevelGoals = await prisma.goal.findMany({
    where: { parentId: null },
    select: {
      id: true,
      name: true,
      status: true,
      isCompanyLevel: true,
      progressSource: true,
      initialValue: true,
      targetValue: true,
      currentValue: true,
    },
  });

  const statusCounts: Record<string, number> = Object.fromEntries(GOAL_STATUS_OPTIONS.map((s) => [s, 0]));
  let companyCount = 0;
  let teamCount = 0;
  const pcts: number[] = [];
  const atRiskOrOffTrack: { id: string; name: string; status: string }[] = [];

  for (const goal of topLevelGoals) {
    if (goal.status in statusCounts) statusCounts[goal.status]++;
    if (goal.isCompanyLevel) companyCount++;
    else teamCount++;

    const { computedPct } = await computeGoalProgress(goal);
    if (computedPct != null) pcts.push(computedPct);

    if (goal.status === "At Risk" || goal.status === "Off Track") {
      atRiskOrOffTrack.push({ id: goal.id, name: goal.name, status: goal.status });
    }
  }

  const averagePct = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null;

  return Response.json({
    total: topLevelGoals.length,
    companyCount,
    teamCount,
    statusCounts,
    averagePct,
    atRiskOrOffTrack: atRiskOrOffTrack.slice(0, 5),
  });
}
