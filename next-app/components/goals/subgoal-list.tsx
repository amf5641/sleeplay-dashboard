"use client";
import { useState } from "react";
import Link from "next/link";
import Initials from "@/components/project/initials";
import GoalProgressBar from "@/components/goals/goal-progress-bar";
import GoalFormModal from "@/components/goals/goal-form-modal";
import { GoalListItem, goalStatusColors } from "@/components/goals/types";

interface SubgoalListProps {
  parentId: string;
  subGoals: GoalListItem[];
  canManage: boolean;
  currentUserId?: string;
  onChanged: () => void;
}

export default function SubgoalList({ parentId, subGoals, canManage, currentUserId, onChanged }: SubgoalListProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="border-t border-platinum pt-4 mt-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold font-heading text-brand-black">
          Sub-goals {subGoals.length > 0 && <span className="text-xs text-brand-gray font-normal">({subGoals.length})</span>}
        </h3>
        {canManage && (
          <button onClick={() => setModalOpen(true)} className="text-xs text-royal-purple hover:underline">
            + Add sub-goal
          </button>
        )}
      </div>

      {subGoals.length === 0 ? (
        <p className="text-sm text-brand-gray">No sub-goals yet.</p>
      ) : (
        <div className="space-y-2">
          {subGoals.map((sg) => (
            <Link
              key={sg.id}
              href={`/goals/${sg.id}`}
              className="block border border-platinum/70 rounded-lg p-3 hover:border-royal-purple/50 transition-colors"
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-sm font-medium text-brand-black truncate">{sg.name}</span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap ${goalStatusColors[sg.status] || "bg-gray-100 text-gray-600"}`}>
                  {sg.status}
                </span>
              </div>
              <GoalProgressBar pct={sg.computedPct} currentValue={sg.computedCurrentValue} targetValue={sg.targetValue} metricUnit={sg.metricUnit} compact />
              <div className="flex items-center gap-1.5 mt-1.5">
                <Initials name={sg.owner.email} size="xs" />
                <span className="text-xs text-brand-gray">{sg.owner.email}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <GoalFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => { setModalOpen(false); onChanged(); }}
        currentUserId={currentUserId}
        parentId={parentId}
      />
    </div>
  );
}
