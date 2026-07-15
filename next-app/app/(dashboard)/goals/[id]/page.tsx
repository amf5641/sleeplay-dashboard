"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Topbar from "@/components/topbar";
import Initials from "@/components/project/initials";
import GoalProgressBar from "@/components/goals/goal-progress-bar";
import SubgoalList from "@/components/goals/subgoal-list";
import SupportingWorkPanel from "@/components/goals/supporting-work-panel";
import GoalUpdateFeed from "@/components/goals/goal-update-feed";
import { useRole } from "@/hooks/use-role";
import { useToast } from "@/components/toast";
import { fetcher, apiFetch } from "@/lib/utils";
import {
  GOAL_STATUS_OPTIONS,
  GOAL_PROGRESS_SOURCES,
  GoalListItem,
  goalStatusColors,
  progressSourceLabels,
} from "@/components/goals/types";

interface GoalDetail extends GoalListItem {
  parent: { id: string; name: string } | null;
  createdBy: { id: string; email: string } | null;
  subGoals: (GoalListItem & { _count: { subGoals: number } })[];
  relationships: {
    id: string;
    contributionWeight: number;
    project: { id: string; name: string } | null;
    task: { id: string; title: string; completed: boolean } | null;
  }[];
  updates: { id: string; status: string; body: string; createdAt: string; author: { id: string; email: string } }[];
  followers: { id: string; user: { id: string; email: string } }[];
}

export default function GoalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { canEdit } = useRole();
  const { data: session } = useSession();
  const currentUserId = (session?.user as { id?: string } | undefined)?.id;
  const { toast } = useToast();

  const { data: goal, mutate } = useSWR<GoalDetail>(`/api/goals/${id}`, fetcher);
  const [editingValue, setEditingValue] = useState(false);
  const [valueInput, setValueInput] = useState("");
  const [saving, setSaving] = useState(false);

  if (!goal) {
    return (
      <>
        <Topbar title="Goal" />
        <div className="p-6 text-sm text-brand-gray">Loading…</div>
      </>
    );
  }

  const isOwner = goal.ownerId === currentUserId;
  const canManage = canEdit || isOwner;
  const pct = goal.computedPct;
  const isFollowing = goal.followers.some((f) => f.user.id === currentUserId);
  const canPostUpdate = canManage || isFollowing;

  const startEditValue = () => {
    setValueInput(goal.currentValue != null ? String(goal.currentValue) : "");
    setEditingValue(true);
  };

  const saveValue = async () => {
    const currentValue = parseFloat(valueInput);
    if (isNaN(currentValue)) { toast("Enter a valid number", "error"); return; }
    setSaving(true);
    const { error } = await apiFetch(`/api/goals/${id}`, { method: "PUT", body: JSON.stringify({ currentValue }) });
    setSaving(false);
    if (error) { toast(error, "error"); return; }
    setEditingValue(false);
    mutate();
  };

  const updateField = async (field: string, value: unknown) => {
    const { error } = await apiFetch(`/api/goals/${id}`, { method: "PUT", body: JSON.stringify({ [field]: value }) });
    if (error) { toast(error, "error"); return; }
    mutate();
  };

  const deleteGoal = async () => {
    if (!confirm(`Delete "${goal.name}"? This cannot be undone.`)) return;
    const { error } = await apiFetch(`/api/goals/${id}`, { method: "DELETE" });
    if (error) { toast(error, "error"); return; }
    toast("Goal deleted", "success");
    router.push("/goals");
  };

  return (
    <>
      <Topbar title="Goals" />
      <div className="p-6 max-w-3xl mx-auto">
        <Link href="/goals" className="text-xs text-brand-gray hover:text-royal-purple transition-colors">← All Goals</Link>

        <div className="bg-white rounded-lg p-6 shadow-[0_4px_34px_rgba(0,0,0,0.05)] border border-platinum/50 mt-3">
          <div className="flex items-start justify-between gap-3 mb-1">
            <h1 className="text-xl font-heading font-bold text-brand-black">{goal.name}</h1>
            {canManage ? (
              <select
                value={goal.status}
                onChange={(e) => updateField("status", e.target.value)}
                className={`text-xs px-2 py-1 rounded-full border-none focus:outline-none focus:ring-1 focus:ring-royal-purple ${goalStatusColors[goal.status] || "bg-gray-100 text-gray-600"}`}
              >
                {GOAL_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : (
              <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${goalStatusColors[goal.status] || "bg-gray-100 text-gray-600"}`}>
                {goal.status}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-brand-gray mb-4">
            <span className="px-1.5 py-0.5 rounded bg-white-smoke">{goal.isCompanyLevel ? "Company Goal" : goal.department?.name ? `Team Goal — ${goal.department.name}` : "Team Goal"}</span>
            {goal.parent && (
              <Link href={`/goals/${goal.parent.id}`} className="hover:text-royal-purple transition-colors">
                Sub-goal of {goal.parent.name}
              </Link>
            )}
            {goal.timePeriod && <span>{goal.timePeriod}</span>}
            {goal.dueOn && <span>Due {new Date(goal.dueOn).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>}
          </div>

          {goal.description && <p className="text-sm text-brand-black/80 mb-4">{goal.description}</p>}

          <div className="flex items-center gap-2 mb-5">
            <Initials name={goal.owner.email} />
            <span className="text-sm text-brand-gray">Owned by {goal.owner.email}</span>
          </div>

          <div className="border-t border-platinum pt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold font-heading text-brand-black">Progress</h3>
              {canManage && goal.metricUnit !== "none" && goal.progressSource === "manual" && !editingValue && (
                <button onClick={startEditValue} className="text-xs text-royal-purple hover:underline">Update value</button>
              )}
            </div>

            {canManage && goal.metricUnit !== "none" && (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-brand-gray">Tracked via</span>
                <select
                  value={goal.progressSource}
                  onChange={(e) => updateField("progressSource", e.target.value)}
                  className="text-xs border border-platinum rounded px-2 py-1 focus:outline-none focus:border-royal-purple bg-white"
                >
                  {GOAL_PROGRESS_SOURCES.map((s) => <option key={s} value={s}>{progressSourceLabels[s]}</option>)}
                </select>
              </div>
            )}

            {goal.metricUnit === "none" ? (
              <p className="text-sm text-brand-gray">This goal is tracked by status only (no numeric metric).</p>
            ) : editingValue ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={valueInput}
                  onChange={(e) => setValueInput(e.target.value)}
                  className="w-32 text-sm border border-platinum rounded px-2 py-1 focus:outline-none focus:border-royal-purple"
                  autoFocus
                />
                <button onClick={saveValue} disabled={saving} className="text-xs bg-midnight-blue text-white px-3 py-1 rounded-full disabled:opacity-50">
                  {saving ? "Saving…" : "Save"}
                </button>
                <button onClick={() => setEditingValue(false)} className="text-xs text-brand-gray hover:text-brand-black">Cancel</button>
              </div>
            ) : (
              <GoalProgressBar pct={pct} currentValue={goal.computedCurrentValue} targetValue={goal.targetValue} metricUnit={goal.metricUnit} />
            )}
          </div>

          <SubgoalList
            parentId={goal.id}
            subGoals={goal.subGoals}
            canManage={canManage}
            currentUserId={currentUserId}
            onChanged={mutate}
          />

          <SupportingWorkPanel
            goalId={goal.id}
            relationships={goal.relationships}
            canManage={canManage}
            onChanged={mutate}
          />

          <GoalUpdateFeed
            goalId={goal.id}
            updates={goal.updates}
            currentGoalStatus={goal.status}
            canPost={canPostUpdate}
            isFollowing={isFollowing}
            onChanged={mutate}
          />

          {canManage && (
            <div className="flex justify-end mt-6 pt-4 border-t border-platinum">
              <button onClick={deleteGoal} className="text-xs text-red-400 hover:text-red-600 transition-colors">
                Delete goal
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
