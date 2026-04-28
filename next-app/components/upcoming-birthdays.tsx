"use client";
import useSWR from "swr";
import Link from "next/link";
import { fetcher } from "@/lib/utils";

interface Birthday {
  id: string;
  name: string;
  photo: string | null;
  title: string;
  month: number;
  day: number;
  nextDate: string;
  daysUntil: number;
  isToday: boolean;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function relativeLabel(b: Birthday): string {
  if (b.isToday) return "Today 🎉";
  if (b.daysUntil === 1) return "Tomorrow";
  if (b.daysUntil <= 7) return `In ${b.daysUntil} days`;
  return `${MONTH_NAMES[b.month]} ${b.day}`;
}

export default function UpcomingBirthdays() {
  const { data: birthdays = [], isLoading } = useSWR<Birthday[]>("/api/people/birthdays", fetcher);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-[0_4px_34px_rgba(0,0,0,0.05)] border border-platinum/50 overflow-hidden">
        <div className="px-4 py-3 border-b border-platinum">
          <h3 className="text-sm font-semibold text-brand-black flex items-center gap-2">
            🎂 Upcoming Birthdays
          </h3>
        </div>
        <div className="px-4 py-3">
          <div className="h-12 bg-platinum/50 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (birthdays.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-[0_4px_34px_rgba(0,0,0,0.05)] border border-platinum/50 overflow-hidden">
      <div className="px-4 py-3 border-b border-platinum">
        <h3 className="text-sm font-semibold text-brand-black flex items-center gap-2">
          🎂 Upcoming Birthdays
        </h3>
      </div>
      <div className="divide-y divide-platinum/50">
        {birthdays.slice(0, 5).map((b) => (
          <Link
            key={b.id}
            href={`/team/${b.id}`}
            className={`flex items-center gap-3 px-4 py-2.5 hover:bg-white-smoke transition-colors ${b.isToday ? "bg-lavender/30" : ""}`}
          >
            {b.photo ? (
              <img src={b.photo} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-lavender flex items-center justify-center text-midnight-blue text-xs font-bold flex-shrink-0">
                {b.name.charAt(0)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-brand-black truncate">{b.name}</p>
              {b.title && <p className="text-[11px] text-brand-gray truncate">{b.title}</p>}
            </div>
            <span className={`text-xs font-medium flex-shrink-0 ${b.isToday ? "text-royal-purple" : "text-brand-gray"}`}>
              {relativeLabel(b)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
