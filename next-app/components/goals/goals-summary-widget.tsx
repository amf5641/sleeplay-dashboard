"use client";
import useSWR from "swr";
import Link from "next/link";
import { fetcher } from "@/lib/utils";
import { goalStatusDot } from "@/components/goals/types";

interface GoalsSummary {
  total: number;
  companyCount: number;
  teamCount: number;
  statusCounts: Record<string, number>;
  averagePct: number | null;
  atRiskOrOffTrack: { id: string; name: string; status: string }[];
}

// Self-contained mini donut (no shared charting dependency) — same construction
// as a standard SVG stroke-dasharray donut, kept local to the Goals widget.
const DONUT_PALETTE = ["#664FA6", "#10B981", "#F59E0B", "#3A2180", "#DCD4F3", "#6B7280"];

function StatusDonut({ data }: { data: { label: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  const size = 140;
  const cx = size / 2;
  const cy = size / 2;
  const r = 52;
  const strokeWidth = 18;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  const segments = data.map((d, i) => ({ ...d, color: DONUT_PALETTE[i % DONUT_PALETTE.length] }));

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size}>
        {segments.map((seg, i) => {
          const dashLength = (seg.value / total) * circumference;
          const dashOffset = -offset;
          offset += dashLength;
          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dashLength} ${circumference - dashLength}`}
              strokeDashoffset={dashOffset}
              transform={`rotate(-90, ${cx}, ${cy})`}
            />
          );
        })}
        <text x={cx} y={cy - 4} fontSize={18} fill="#181818" textAnchor="middle" fontWeight={700}>{total}</text>
        <text x={cx} y={cy + 12} fontSize={9} fill="#6B7280" textAnchor="middle">goals</text>
      </svg>
      <div className="space-y-1.5">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-2 text-sm">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="text-brand-gray">{seg.label}</span>
            <span className="font-medium text-brand-black">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function GoalsSummaryWidget() {
  const { data } = useSWR<GoalsSummary>("/api/goals/summary", fetcher);

  if (!data) return <div className="bg-white border border-platinum rounded-xl p-5 h-48 animate-pulse mb-6" />;

  if (data.total === 0) {
    return (
      <div className="bg-white border border-platinum rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-gray">Goals</h3>
          <Link href="/goals" className="text-xs text-royal-purple hover:underline">View all</Link>
        </div>
        <p className="text-sm text-brand-gray/70 italic">No goals set yet</p>
      </div>
    );
  }

  const donutData = Object.entries(data.statusCounts)
    .filter(([, count]) => count > 0)
    .map(([label, value]) => ({ label, value }));

  return (
    <div className="bg-white border border-platinum rounded-xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-gray">Goals</h3>
        <Link href="/goals" className="text-xs text-royal-purple hover:underline">View all ({data.total})</Link>
      </div>
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-shrink-0">
          <StatusDonut data={donutData} />
        </div>
        <div className="flex-1 min-w-0 space-y-4">
          <div className="flex items-center gap-6 text-sm">
            <span className="text-brand-gray">
              <span className="font-semibold text-brand-black">{data.companyCount}</span> Company
            </span>
            <span className="text-brand-gray">
              <span className="font-semibold text-brand-black">{data.teamCount}</span> Team
            </span>
            {data.averagePct != null && (
              <span className="text-brand-gray">
                <span className="font-semibold text-brand-black">{data.averagePct}%</span> avg. progress
              </span>
            )}
          </div>
          {data.atRiskOrOffTrack.length > 0 && (
            <div>
              <p className="text-xs font-medium text-brand-gray mb-1.5">Needs attention</p>
              <div className="space-y-1.5">
                {data.atRiskOrOffTrack.map((g) => (
                  <Link key={g.id} href={`/goals/${g.id}`} className="flex items-center gap-2 group">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${goalStatusDot[g.status] || "bg-gray-400"}`} />
                    <span className="text-sm text-brand-black truncate group-hover:text-royal-purple transition-colors">{g.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
