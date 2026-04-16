"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import Link from "next/link";
import Topbar from "@/components/topbar";
import DashboardWidgets from "@/components/dashboard-widgets";
import ActivityFeed from "@/components/activity-feed";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const quotes = [
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "What you do today can improve all your tomorrows.", author: "Ralph Marston" },
  { text: "Hard work beats talent when talent doesn't work hard.", author: "Tim Notke" },
  { text: "The future depends on what you do today.", author: "Mahatma Gandhi" },
  { text: "Your limitation — it's only your imagination.", author: "Unknown" },
  { text: "Great things never come from comfort zones.", author: "Unknown" },
  { text: "Push yourself, because no one else is going to do it for you.", author: "Unknown" },
  { text: "Dream it. Wish it. Do it.", author: "Unknown" },
  { text: "Stay hungry, stay foolish.", author: "Steve Jobs" },
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "In the middle of every difficulty lies opportunity.", author: "Albert Einstein" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt" },
  { text: "A person who never made a mistake never tried anything new.", author: "Albert Einstein" },
  { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
  { text: "Everything you've ever wanted is on the other side of fear.", author: "George Addair" },
  { text: "Don't be afraid to give up the good to go for the great.", author: "John D. Rockefeller" },
  { text: "I find that the harder I work, the more luck I seem to have.", author: "Thomas Jefferson" },
  { text: "Opportunities don't happen. You create them.", author: "Chris Grosser" },
  { text: "Success usually comes to those who are too busy to be looking for it.", author: "Henry David Thoreau" },
];

interface MyTask {
  id: string; title: string; dueDate: string | null; completed: boolean; priority: string;
  project: { id: string; name: string };
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getDailyQuote() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000);
  return quotes[dayOfYear % quotes.length];
}

function getFirstName(email: string | null | undefined) {
  if (!email) return "";
  const local = email.split("@")[0];
  const first = local.split(".")[0];
  return first.charAt(0).toUpperCase() + first.slice(1);
}

function getToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getEndOfWeek() {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 0 : 7 - day; // days until Sunday
  const end = new Date(d);
  end.setDate(end.getDate() + diff);
  return `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
}

const priorityColors: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-emerald-100 text-emerald-700",
};

function TaskItem({ task }: { task: MyTask }) {
  return (
    <Link
      href={`/projects/${task.project.id}?task=${task.id}`}
      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white-smoke/80 transition-colors"
    >
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${task.priority === "high" ? "bg-red-400" : task.priority === "low" ? "bg-emerald-400" : "bg-amber-400"}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-brand-black truncate">{task.title}</p>
        <p className="text-xs text-brand-gray">{task.project.name}</p>
      </div>
      {task.dueDate && (
        <span className={`text-xs px-2 py-0.5 rounded flex-shrink-0 ${task.dueDate === getToday() ? "bg-red-100 text-red-700 font-medium" : "text-brand-gray"}`}>
          {new Date(task.dueDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
      )}
    </Link>
  );
}

export default function HomePage() {
  const { data: session } = useSession();
  const { data: allTasks = [] } = useSWR<MyTask[]>("/api/my-tasks", fetcher);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const quote = getDailyQuote();
  const greeting = getGreeting();
  const name = getFirstName(session?.user?.email);

  if (!mounted) return (
    <>
      <Topbar title="Home" />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <div className="h-4 w-48 bg-platinum rounded animate-pulse mx-auto mb-2" />
            <div className="h-8 w-72 bg-platinum rounded animate-pulse mx-auto" />
          </div>
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-platinum rounded-xl animate-pulse" />
            ))}
          </div>
          <div className="flex gap-8">
            <div className="w-80 flex-shrink-0 space-y-4">
              <div className="h-48 bg-platinum rounded-xl animate-pulse" />
              <div className="h-48 bg-platinum rounded-xl animate-pulse" />
            </div>
            <div className="flex-1 space-y-4">
              <div className="h-32 bg-platinum rounded-xl animate-pulse" />
              <div className="h-64 bg-platinum rounded-xl animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </>
  );

  const today = getToday();
  const endOfWeek = getEndOfWeek();

  const incompleteTasks = allTasks.filter((t) => !t.completed);
  const dueToday = incompleteTasks.filter((t) => t.dueDate === today);
  const dueThisWeek = incompleteTasks.filter((t) => t.dueDate && t.dueDate > today && t.dueDate <= endOfWeek);
  const overdue = incompleteTasks.filter((t) => t.dueDate && t.dueDate < today);

  const todayObj = new Date();
  const dateStr = todayObj.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  return (
    <>
      <Topbar title="Home" />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <p className="text-sm text-brand-gray mb-1">{dateStr}</p>
            <h1 className="text-3xl font-heading font-bold text-brand-black">
              {greeting}{name ? `, ${name}` : ""}
            </h1>
          </div>

          {/* Dashboard Widgets */}
          <DashboardWidgets />

          <div className="flex gap-8">
            {/* Left: Tasks widget */}
            <div className="w-80 flex-shrink-0 space-y-4">
              {/* Overdue */}
              {overdue.length > 0 && (
                <div className="bg-white rounded-xl shadow-[0_4px_34px_rgba(0,0,0,0.05)] border border-red-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-red-100 bg-red-50/50">
                    <h3 className="text-sm font-semibold text-red-700 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Overdue
                      <span className="ml-auto bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs">{overdue.length}</span>
                    </h3>
                  </div>
                  <div className="p-2">
                    {overdue.map((t) => <TaskItem key={t.id} task={t} />)}
                  </div>
                </div>
              )}

              {/* Due Today */}
              <div className="bg-white rounded-xl shadow-[0_4px_34px_rgba(0,0,0,0.05)] border border-platinum/50 overflow-hidden">
                <div className="px-4 py-3 border-b border-platinum bg-white-smoke/50">
                  <h3 className="text-sm font-semibold text-brand-black flex items-center gap-2">
                    <svg className="w-4 h-4 text-royal-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    Due Today
                    <span className="ml-auto bg-lavender text-midnight-blue px-2 py-0.5 rounded-full text-xs">{dueToday.length}</span>
                  </h3>
                </div>
                <div className="p-2">
                  {dueToday.length > 0 ? (
                    dueToday.map((t) => <TaskItem key={t.id} task={t} />)
                  ) : (
                    <p className="text-xs text-brand-gray text-center py-4">No tasks due today</p>
                  )}
                </div>
              </div>

              {/* Due This Week */}
              <div className="bg-white rounded-xl shadow-[0_4px_34px_rgba(0,0,0,0.05)] border border-platinum/50 overflow-hidden">
                <div className="px-4 py-3 border-b border-platinum bg-white-smoke/50">
                  <h3 className="text-sm font-semibold text-brand-black flex items-center gap-2">
                    <svg className="w-4 h-4 text-brand-gray" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                    Due This Week
                    <span className="ml-auto bg-lavender text-midnight-blue px-2 py-0.5 rounded-full text-xs">{dueThisWeek.length}</span>
                  </h3>
                </div>
                <div className="p-2">
                  {dueThisWeek.length > 0 ? (
                    dueThisWeek.map((t) => <TaskItem key={t.id} task={t} />)
                  ) : (
                    <p className="text-xs text-brand-gray text-center py-4">No other tasks due this week</p>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Quote + Activity */}
            <div className="flex-1 space-y-4">
              {/* Quote */}
              <div className="bg-white rounded-xl p-8 shadow-[0_4px_34px_rgba(0,0,0,0.05)] border border-platinum/50">
                <p className="text-lg text-brand-black leading-relaxed mb-3 italic text-center">
                  &ldquo;{quote.text}&rdquo;
                </p>
                <p className="text-sm text-brand-gray text-center">
                  &mdash; {quote.author}
                </p>
              </div>

              {/* Activity Feed */}
              <div className="bg-white rounded-xl shadow-[0_4px_34px_rgba(0,0,0,0.05)] border border-platinum/50 overflow-hidden">
                <div className="px-4 py-3 border-b border-platinum">
                  <h3 className="text-sm font-semibold text-brand-black flex items-center gap-2">
                    <svg className="w-4 h-4 text-brand-gray" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    Recent Activity
                  </h3>
                </div>
                <div className="px-4 py-2 max-h-80 overflow-y-auto">
                  <ActivityFeed limit={15} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
