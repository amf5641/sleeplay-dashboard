"use client";
import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { useToast } from "@/components/toast";
import { fetcher, apiFetch } from "@/lib/utils";
import { GOAL_MAX_SUPPORTING_WORK } from "@/components/goals/types";

interface Relationship {
  id: string;
  contributionWeight: number;
  project: { id: string; name: string } | null;
  task: { id: string; title: string; completed: boolean } | null;
}

interface Project {
  id: string;
  name: string;
  tasks: { completed: boolean }[];
}

interface SupportingWorkPanelProps {
  goalId: string;
  relationships: Relationship[];
  canManage: boolean;
  onChanged: () => void;
}

export default function SupportingWorkPanel({ goalId, relationships, canManage, onChanged }: SupportingWorkPanelProps) {
  const { toast } = useToast();
  const [picking, setPicking] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: projects = [] } = useSWR<Project[]>(picking ? "/api/projects" : null, fetcher);
  const attachedProjectIds = new Set(relationships.map((r) => r.project?.id).filter(Boolean));
  const availableProjects = projects.filter((p) => !attachedProjectIds.has(p.id));
  const atLimit = relationships.length >= GOAL_MAX_SUPPORTING_WORK;

  const attach = async () => {
    if (!selectedProjectId) return;
    setSaving(true);
    const { error } = await apiFetch(`/api/goals/${goalId}/relationships`, {
      method: "POST",
      body: JSON.stringify({ projectId: selectedProjectId }),
    });
    setSaving(false);
    if (error) { toast(error, "error"); return; }
    setPicking(false);
    setSelectedProjectId("");
    onChanged();
    toast("Project attached", "success");
  };

  const detach = async (relationshipId: string) => {
    const { error } = await apiFetch(`/api/goals/${goalId}/relationships`, {
      method: "DELETE",
      body: JSON.stringify({ relationshipId }),
    });
    if (error) { toast(error, "error"); return; }
    onChanged();
  };

  return (
    <div className="border-t border-platinum pt-4 mt-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold font-heading text-brand-black">
          Supporting Work {relationships.length > 0 && <span className="text-xs text-brand-gray font-normal">({relationships.length}/{GOAL_MAX_SUPPORTING_WORK})</span>}
        </h3>
        {canManage && !atLimit && !picking && (
          <button onClick={() => setPicking(true)} className="text-xs text-royal-purple hover:underline">
            + Attach project
          </button>
        )}
      </div>

      {picking && (
        <div className="flex items-center gap-2 mb-3">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="flex-1 px-3 py-2 border border-platinum rounded text-sm focus:outline-none focus:border-royal-purple bg-white"
          >
            <option value="">Select a project…</option>
            {availableProjects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button onClick={attach} disabled={saving || !selectedProjectId} className="text-xs bg-midnight-blue text-white px-3 py-2 rounded disabled:opacity-50">
            {saving ? "Attaching…" : "Attach"}
          </button>
          <button onClick={() => { setPicking(false); setSelectedProjectId(""); }} className="text-xs text-brand-gray hover:text-brand-black">
            Cancel
          </button>
        </div>
      )}

      {relationships.length === 0 ? (
        <p className="text-sm text-brand-gray">No projects or tasks attached yet.</p>
      ) : (
        <div className="space-y-1.5">
          {relationships.map((rel) => (
            <div key={rel.id} className="flex items-center justify-between border border-platinum/70 rounded-lg px-3 py-2">
              {rel.project ? (
                <Link href={`/projects/${rel.project.id}`} className="text-sm text-brand-black hover:text-royal-purple transition-colors truncate">
                  {rel.project.name} <span className="text-xs text-brand-gray">(project)</span>
                </Link>
              ) : rel.task ? (
                <span className="text-sm text-brand-black truncate">
                  {rel.task.title} <span className="text-xs text-brand-gray">(task — {rel.task.completed ? "done" : "open"})</span>
                </span>
              ) : (
                <span className="text-sm text-brand-gray">Unknown</span>
              )}
              {canManage && (
                <button onClick={() => detach(rel.id)} className="text-xs text-red-400 hover:text-red-600 transition-colors ml-2">
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
