"use client";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface ActivityEvent {
  id: string;
  action: string;
  detail: string;
  createdAt: string;
  user: { id: string; email: string };
}

const actionIcons: Record<string, string> = {
  completed_task: "✅",
  changed_status: "🔄",
  created_task: "➕",
  assigned_task: "👤",
  commented: "💬",
};

function timeAgo(date: string) {
  const now = Date.now();
  const d = new Date(date).getTime();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ActivityFeed({ projectId, limit = 20 }: { projectId?: string; limit?: number }) {
  const url = projectId ? `/api/activity?projectId=${projectId}&limit=${limit}` : `/api/activity?limit=${limit}`;
  const { data: events = [] } = useSWR<ActivityEvent[]>(url, fetcher, { refreshInterval: 30000 });

  if (events.length === 0) {
    return <p className="text-xs text-brand-gray/50 italic py-4">No recent activity</p>;
  }

  return (
    <div className="space-y-0">
      {events.map((event) => (
        <div key={event.id} className="flex items-start gap-2.5 py-2.5 border-b border-platinum/30 last:border-0">
          <span className="text-sm flex-shrink-0 mt-0.5">{actionIcons[event.action] || "📌"}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-brand-black leading-snug">
              <span className="font-medium">{event.user.email.split("@")[0]}</span>{" "}
              <span className="text-brand-gray">{event.detail}</span>
            </p>
            <p className="text-[11px] text-brand-gray/50 mt-0.5">{timeAgo(event.createdAt)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
