"use client";
import { useState } from "react";
import Initials from "@/components/project/initials";
import { useToast } from "@/components/toast";
import { apiFetch } from "@/lib/utils";
import { GOAL_STATUS_OPTIONS, goalStatusColors } from "@/components/goals/types";

interface GoalUpdateItem {
  id: string;
  status: string;
  body: string;
  createdAt: string;
  author: { id: string; email: string };
}

interface GoalUpdateFeedProps {
  goalId: string;
  updates: GoalUpdateItem[];
  currentGoalStatus: string;
  canPost: boolean;
  isFollowing: boolean;
  onChanged: () => void;
}

export default function GoalUpdateFeed({ goalId, updates, currentGoalStatus, canPost, isFollowing, onChanged }: GoalUpdateFeedProps) {
  const { toast } = useToast();
  const [composing, setComposing] = useState(false);
  const [status, setStatus] = useState(currentGoalStatus);
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [followSaving, setFollowSaving] = useState(false);

  const post = async () => {
    setSaving(true);
    const { error } = await apiFetch(`/api/goals/${goalId}/updates`, {
      method: "POST",
      body: JSON.stringify({ status, body }),
    });
    setSaving(false);
    if (error) { toast(error, "error"); return; }
    setBody("");
    setComposing(false);
    onChanged();
    toast("Update posted", "success");
  };

  const toggleFollow = async () => {
    setFollowSaving(true);
    const { error } = await apiFetch(`/api/goals/${goalId}/followers`, { method: isFollowing ? "DELETE" : "POST" });
    setFollowSaving(false);
    if (error) { toast(error, "error"); return; }
    onChanged();
  };

  return (
    <div className="border-t border-platinum pt-4 mt-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold font-heading text-brand-black">
          Updates {updates.length > 0 && <span className="text-xs text-brand-gray font-normal">({updates.length})</span>}
        </h3>
        <div className="flex items-center gap-3">
          <button onClick={toggleFollow} disabled={followSaving} className="text-xs text-royal-purple hover:underline disabled:opacity-50">
            {isFollowing ? "Unfollow" : "Follow"}
          </button>
          {canPost && !composing && (
            <button onClick={() => setComposing(true)} className="text-xs text-royal-purple hover:underline">
              + Post update
            </button>
          )}
        </div>
      </div>

      {!canPost && !isFollowing && (
        <p className="text-xs text-brand-gray mb-2">Follow this goal to post a status update.</p>
      )}

      {composing && (
        <div className="border border-platinum rounded-lg p-3 mb-3 space-y-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="text-xs border border-platinum rounded px-2 py-1 focus:outline-none focus:border-royal-purple bg-white"
          >
            {GOAL_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What's the latest?"
            rows={2}
            className="w-full px-3 py-2 border border-platinum rounded text-sm focus:outline-none focus:border-royal-purple resize-y"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setComposing(false)} className="text-xs text-brand-gray hover:text-brand-black">Cancel</button>
            <button onClick={post} disabled={saving} className="text-xs bg-midnight-blue text-white px-3 py-1.5 rounded disabled:opacity-50">
              {saving ? "Posting…" : "Post"}
            </button>
          </div>
        </div>
      )}

      {updates.length === 0 ? (
        <p className="text-sm text-brand-gray">No updates yet.</p>
      ) : (
        <div className="space-y-3">
          {[...updates].reverse().map((u) => (
            <div key={u.id} className="flex gap-2.5">
              <Initials name={u.author.email} size="xs" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-brand-black">{u.author.email}</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap ${goalStatusColors[u.status] || "bg-gray-100 text-gray-600"}`}>
                    {u.status}
                  </span>
                  <span className="text-xs text-brand-gray">
                    {new Date(u.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </span>
                </div>
                {u.body && <p className="text-sm text-brand-black/80 mt-0.5">{u.body}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
