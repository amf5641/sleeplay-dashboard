"use client";
import useSWR from "swr";
import Link from "next/link";
import Topbar from "@/components/topbar";
import EmptyState from "@/components/empty-state";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  linkUrl: string;
  read: boolean;
  createdAt: string;
}

const typeIcons: Record<string, string> = {
  project_added: "📁",
  task_assigned: "✅",
};

function timeAgo(dateStr: string) {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function NotificationsPage() {
  const { data: notifications = [], mutate } = useSWR<Notification[]>("/api/notifications", fetcher);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = async () => {
    await fetch("/api/notifications", { method: "PATCH" });
    mutate();
  };

  return (
    <>
      <Topbar
        title="Notifications"
        count={unreadCount > 0 ? unreadCount : undefined}
        actions={
          unreadCount > 0 ? (
            <button
              onClick={markAllRead}
              className="px-4 py-1.5 text-sm rounded bg-platinum hover:bg-lavender transition-colors"
            >
              Mark all as read
            </button>
          ) : undefined
        }
      />
      <div className="p-6">
        {notifications.length === 0 ? (
          <EmptyState title="No notifications" description="You're all caught up! Notifications will appear here when you're added to projects or assigned tasks." />
        ) : (
          <div className="max-w-2xl space-y-2">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`bg-white rounded-lg p-4 border transition-colors ${n.read ? "border-platinum/50" : "border-royal-purple/30 bg-lavender/10"}`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-lg mt-0.5">{typeIcons[n.type] || "🔔"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm ${n.read ? "text-brand-gray" : "text-brand-black font-medium"}`}>
                        {n.title}
                      </p>
                      <span className="text-xs text-brand-gray whitespace-nowrap flex-shrink-0">{timeAgo(n.createdAt)}</span>
                    </div>
                    <p className="text-sm text-brand-gray mt-0.5">{n.message}</p>
                    {n.linkUrl && (
                      <Link
                        href={n.linkUrl}
                        className="inline-block text-xs text-royal-purple hover:text-midnight-blue mt-1.5"
                      >
                        View project &rarr;
                      </Link>
                    )}
                  </div>
                  {!n.read && (
                    <div className="w-2 h-2 rounded-full bg-royal-purple flex-shrink-0 mt-2" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
