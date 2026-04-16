"use client";
import useSWR from "swr";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface DashboardStats {
  projectProgress: { id: string; name: string; status: string; totalTasks: number; completedTasks: number; percentage: number }[];
  teamWorkload: { name: string; count: number }[];
  overdueCount: number;
  dueSoonCount: number;
}

const statusDot: Record<string, string> = {
  "On Track": "bg-emerald-500",
  "Slightly Off": "bg-amber-500",
  "Off Track": "bg-red-500",
  "On Hold": "bg-gray-400",
  "Done": "bg-blue-500",
};

export default function DashboardWidgets() {
  const { data } = useSWR<DashboardStats>("/api/dashboard-stats", fetcher, { refreshInterval: 60000 });

  if (!data) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white border border-platinum rounded-xl p-5 h-48 animate-pulse" />
        ))}
      </div>
    );
  }

  const maxWorkload = Math.max(...data.teamWorkload.map((t) => t.count), 1);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
      {/* Project Progress */}
      <div className="bg-white border border-platinum rounded-xl p-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-gray mb-4">Project Progress</h3>
        <div className="space-y-3 max-h-36 overflow-y-auto">
          {data.projectProgress.map((p) => (
            <Link key={p.id} href={`/projects/${p.id}`} className="block group">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusDot[p.status] || "bg-gray-400"}`} />
                  <span className="text-sm text-brand-black truncate group-hover:text-royal-purple transition-colors">{p.name}</span>
                </div>
                <span className="text-xs text-brand-gray ml-2 flex-shrink-0">{p.percentage}%</span>
              </div>
              <div className="w-full h-1.5 bg-platinum/60 rounded-full overflow-hidden">
                <div className="h-full bg-royal-purple rounded-full transition-all duration-300" style={{ width: `${p.percentage}%` }} />
              </div>
            </Link>
          ))}
          {data.projectProgress.length === 0 && <p className="text-xs text-brand-gray/50 italic">No projects yet</p>}
        </div>
      </div>

      {/* Team Workload */}
      <div className="bg-white border border-platinum rounded-xl p-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-gray mb-4">Team Workload</h3>
        <div className="space-y-2.5 max-h-36 overflow-y-auto">
          {data.teamWorkload.slice(0, 8).map((t) => (
            <div key={t.name}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-brand-black">{t.name}</span>
                <span className="text-xs text-brand-gray">{t.count} tasks</span>
              </div>
              <div className="w-full h-1.5 bg-platinum/60 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full" style={{ width: `${(t.count / maxWorkload) * 100}%` }} />
              </div>
            </div>
          ))}
          {data.teamWorkload.length === 0 && <p className="text-xs text-brand-gray/50 italic">No assigned tasks</p>}
        </div>
      </div>

      {/* Overdue & Due Soon */}
      <div className="bg-white border border-platinum rounded-xl p-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-gray mb-4">Task Alerts</h3>
        <div className="space-y-4">
          <Link href="/my-tasks" className="block group">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold ${data.overdueCount > 0 ? "bg-red-100 text-red-600" : "bg-gray-100 text-brand-gray"}`}>
                {data.overdueCount}
              </div>
              <div>
                <p className="text-sm font-medium text-brand-black group-hover:text-royal-purple transition-colors">Overdue</p>
                <p className="text-xs text-brand-gray">tasks past due date</p>
              </div>
            </div>
          </Link>
          <Link href="/my-tasks" className="block group">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold ${data.dueSoonCount > 0 ? "bg-amber-100 text-amber-600" : "bg-gray-100 text-brand-gray"}`}>
                {data.dueSoonCount}
              </div>
              <div>
                <p className="text-sm font-medium text-brand-black group-hover:text-royal-purple transition-colors">Due Tomorrow</p>
                <p className="text-xs text-brand-gray">tasks due soon</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
