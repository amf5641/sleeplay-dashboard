"use client";
import Link from "next/link";
import Initials from "@/components/project/initials";
import GoalProgressBar from "@/components/goals/goal-progress-bar";
import { GoalListItem, goalStatusColors } from "@/components/goals/types";

export default function GoalCard({ goal }: { goal: GoalListItem }) {
  const pct = goal.computedPct;

  return (
    <Link
      href={`/goals/${goal.id}`}
      className="block bg-white rounded-lg p-5 shadow-[0_4px_34px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_34px_rgba(0,0,0,0.08)] transition-shadow border border-platinum/50"
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="font-semibold font-heading text-brand-black truncate">{goal.name}</h3>
        <span className={`text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap ${goalStatusColors[goal.status] || "bg-gray-100 text-gray-600"}`}>
          {goal.status}
        </span>
      </div>
      {goal.description && <p className="text-xs text-brand-gray mb-3 line-clamp-2">{goal.description}</p>}
      <GoalProgressBar pct={pct} currentValue={goal.computedCurrentValue} targetValue={goal.targetValue} metricUnit={goal.metricUnit} compact />
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-1.5">
          <Initials name={goal.owner.email} size="xs" />
          <span className="text-xs text-brand-gray">{goal.owner.email}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-brand-gray">
          {goal._count.subGoals > 0 && <span title="Sub-goals">{goal._count.subGoals} sub-goals</span>}
          {goal.dueOn && (
            <span>Due {new Date(goal.dueOn).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
