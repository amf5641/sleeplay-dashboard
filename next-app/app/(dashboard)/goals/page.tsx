"use client";
import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useSession } from "next-auth/react";
import Topbar from "@/components/topbar";
import EmptyState from "@/components/empty-state";
import GoalCard from "@/components/goals/goal-card";
import GoalFormModal from "@/components/goals/goal-form-modal";
import { useRole } from "@/hooks/use-role";
import { fetcher } from "@/lib/utils";
import { GOAL_STATUS_OPTIONS, GoalListItem } from "@/components/goals/types";

interface Department {
  id: string;
  name: string;
  color: string;
}

export default function GoalsPage() {
  const { canEdit } = useRole();
  const { data: session } = useSession();
  const currentUserId = (session?.user as { id?: string } | undefined)?.id;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);

  const { data: goals = [], mutate } = useSWR<GoalListItem[]>(
    `/api/goals?topLevel=true${statusFilter !== "all" ? `&status=${encodeURIComponent(statusFilter)}` : ""}`,
    fetcher
  );
  const { data: departments = [] } = useSWR<Department[]>("/api/departments", fetcher);

  const filtered = goals.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()));
  const companyGoals = filtered.filter((g) => g.isCompanyLevel);
  const teamGoals = filtered.filter((g) => !g.isCompanyLevel);
  const groupedTeamGoals = departments.map((dept) => ({
    ...dept,
    goals: teamGoals.filter((g) => g.departmentId === dept.id),
  }));
  const ungroupedTeamGoals = teamGoals.filter((g) => !g.departmentId);

  return (
    <>
      <Topbar
        title="Goals"
        count={filtered.length}
        searchValue={search}
        onSearch={setSearch}
        searchPlaceholder="Search goals..."
        actions={
          <div className="flex gap-2">
            <Link href="/goals/strategy-map" className="px-4 py-1.5 bg-white text-brand-gray text-sm rounded border border-platinum hover:bg-white-smoke transition-colors">
              Strategy Map
            </Link>
            {canEdit && (
              <button onClick={() => setModalOpen(true)} className="px-4 py-1.5 bg-royal-purple text-white text-sm rounded hover:bg-midnight-blue transition-colors">
                + New Goal
              </button>
            )}
          </div>
        }
      />
      <div className="p-6">
        <div className="flex gap-2 mb-6">
          {["all", ...GOAL_STATUS_OPTIONS].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-1.5 text-sm rounded whitespace-nowrap ${statusFilter === s ? "bg-midnight-blue text-white" : "bg-white text-brand-gray border border-platinum hover:bg-white-smoke"}`}
            >
              {s}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon="🎯"
            title="No goals yet"
            description={canEdit ? "Create a Company or Team goal to start tracking progress." : "No goals have been created yet."}
          />
        ) : (
          <div className="space-y-8">
            {companyGoals.length > 0 && (
              <div>
                <h2 className="font-heading font-semibold text-brand-black text-sm mb-3">
                  Company Goals <span className="text-xs text-brand-gray font-normal">({companyGoals.length})</span>
                </h2>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
                  {companyGoals.map((g) => <GoalCard key={g.id} goal={g} />)}
                </div>
              </div>
            )}

            {groupedTeamGoals.map((dept) => dept.goals.length > 0 && (
              <div key={dept.id}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-3.5 h-3.5 rounded flex-shrink-0" style={{ backgroundColor: dept.color }} />
                  <h2 className="font-heading font-semibold text-brand-black text-sm">{dept.name}</h2>
                  <span className="text-xs text-brand-gray">({dept.goals.length})</span>
                </div>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
                  {dept.goals.map((g) => <GoalCard key={g.id} goal={g} />)}
                </div>
              </div>
            ))}

            {ungroupedTeamGoals.length > 0 && (
              <div>
                <h2 className="font-heading font-semibold text-brand-black text-sm mb-3">
                  Other Team Goals <span className="text-xs text-brand-gray font-normal">({ungroupedTeamGoals.length})</span>
                </h2>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
                  {ungroupedTeamGoals.map((g) => <GoalCard key={g.id} goal={g} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <GoalFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => { setModalOpen(false); mutate(); }}
        currentUserId={currentUserId}
      />
    </>
  );
}
