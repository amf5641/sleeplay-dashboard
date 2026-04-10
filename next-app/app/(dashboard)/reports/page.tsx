"use client";
import { useState } from "react";
import useSWR from "swr";
import Topbar from "@/components/topbar";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface CompletionRate { projectId: string; projectName: string; total: number; completed: number; rate: number }
interface TimeToClose { projectId: string; projectName: string; avgDays: number; completedCount: number }
interface AssigneeData { personId: string; name: string; total: number; completed: number; overdue: number }
interface BurndownPoint { date: string; remaining: number; ideal: number }
interface ReportsData {
  completionRates: CompletionRate[];
  averageTimeToClose: TimeToClose[];
  tasksByAssignee: AssigneeData[];
  burndown: BurndownPoint[];
  priorityBreakdown: { high: number; medium: number; low: number };
  overall: { totalTasks: number; completedTasks: number; completionRate: number; overdueCount: number };
}

// Theme hex values for SVG
const PURPLE = "#664FA6";
const DARK_PURPLE = "#3A2180";
const PLATINUM = "#E4E0DB";
const GRAY = "#6B7280";
const EMERALD = "#10B981";
const AMBER = "#F59E0B";
const RED = "#EF4444";
const LAVENDER = "#DCD4F3";

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-[0_4px_34px_rgba(0,0,0,0.05)] border border-platinum/50">
      <p className="text-xs text-brand-gray mb-1">{label}</p>
      <p className={`text-2xl font-heading font-bold ${color || "text-brand-black"}`}>{value}</p>
      {sub && <p className="text-xs text-brand-gray mt-1">{sub}</p>}
    </div>
  );
}

function CompletionChart({ data }: { data: CompletionRate[] }) {
  if (data.length === 0) return <p className="text-sm text-brand-gray text-center py-8">No project data</p>;
  const barHeight = 28;
  const gap = 8;
  const labelWidth = 140;
  const chartWidth = 400;
  const height = data.length * (barHeight + gap);

  return (
    <svg width="100%" viewBox={`0 0 ${labelWidth + chartWidth + 60} ${height}`} className="overflow-visible">
      {data.map((p, i) => {
        const y = i * (barHeight + gap);
        const barW = Math.max(2, (p.rate / 100) * chartWidth);
        return (
          <g key={p.projectId}>
            <text x={labelWidth - 8} y={y + barHeight / 2 + 4} fontSize={12} fill={GRAY} textAnchor="end" className="select-none">
              {p.projectName.length > 18 ? p.projectName.slice(0, 18) + "..." : p.projectName}
            </text>
            <rect x={labelWidth} y={y} width={chartWidth} height={barHeight} rx={4} fill={PLATINUM} opacity={0.5} />
            <rect x={labelWidth} y={y} width={barW} height={barHeight} rx={4} fill={PURPLE} />
            <text x={labelWidth + barW + 8} y={y + barHeight / 2 + 4} fontSize={11} fill={GRAY} fontWeight={600}>
              {p.rate}%
            </text>
            <text x={labelWidth + chartWidth + 40} y={y + barHeight / 2 + 4} fontSize={10} fill={GRAY} textAnchor="end">
              {p.completed}/{p.total}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function AssigneeChart({ data }: { data: AssigneeData[] }) {
  if (data.length === 0) return <p className="text-sm text-brand-gray text-center py-8">No assignee data</p>;
  const barHeight = 28;
  const gap = 8;
  const labelWidth = 120;
  const chartWidth = 400;
  const height = data.length * (barHeight + gap);
  const maxTotal = Math.max(...data.map((d) => d.total), 1);

  return (
    <svg width="100%" viewBox={`0 0 ${labelWidth + chartWidth + 40} ${height}`} className="overflow-visible">
      {data.map((person, i) => {
        const y = i * (barHeight + gap);
        const scale = chartWidth / maxTotal;
        const completedW = person.completed * scale;
        const inProgressW = (person.total - person.completed - person.overdue) * scale;
        const overdueW = person.overdue * scale;
        return (
          <g key={person.personId}>
            <text x={labelWidth - 8} y={y + barHeight / 2 + 4} fontSize={12} fill={GRAY} textAnchor="end" className="select-none">
              {person.name.length > 14 ? person.name.slice(0, 14) + "..." : person.name}
            </text>
            <rect x={labelWidth} y={y} width={chartWidth} height={barHeight} rx={4} fill={PLATINUM} opacity={0.3} />
            <rect x={labelWidth} y={y} width={completedW} height={barHeight} rx={completedW > 4 ? 4 : 0} fill={EMERALD} />
            <rect x={labelWidth + completedW} y={y} width={inProgressW} height={barHeight} fill={AMBER} />
            <rect x={labelWidth + completedW + inProgressW} y={y} width={overdueW} height={barHeight} rx={overdueW > 4 ? 4 : 0} fill={RED} />
            <text x={labelWidth + chartWidth + 8} y={y + barHeight / 2 + 4} fontSize={11} fill={GRAY} fontWeight={600}>
              {person.total}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function BurndownChart({ data }: { data: BurndownPoint[] }) {
  if (data.length < 2) return <p className="text-sm text-brand-gray text-center py-8">Not enough data</p>;

  const width = 560;
  const height = 240;
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const cw = width - padding.left - padding.right;
  const ch = height - padding.top - padding.bottom;

  const maxY = Math.max(...data.map((d) => d.remaining), ...data.map((d) => d.ideal), 1);
  const xStep = cw / (data.length - 1);

  const toPoint = (i: number, val: number) => ({
    x: padding.left + i * xStep,
    y: padding.top + ch - (val / maxY) * ch,
  });

  const actualPath = data.map((d, i) => {
    const pt = toPoint(i, d.remaining);
    return `${i === 0 ? "M" : "L"}${pt.x},${pt.y}`;
  }).join(" ");

  const idealPath = data.map((d, i) => {
    const pt = toPoint(i, d.ideal);
    return `${i === 0 ? "M" : "L"}${pt.x},${pt.y}`;
  }).join(" ");

  // Area fill under actual line
  const lastActual = toPoint(data.length - 1, data[data.length - 1].remaining);
  const firstActual = toPoint(0, data[0].remaining);
  const areaPath = `${actualPath} L${lastActual.x},${padding.top + ch} L${firstActual.x},${padding.top + ch} Z`;

  // Y-axis ticks
  const yTicks = 5;
  const yStep = maxY / yTicks;

  // X-axis labels (show ~6 dates)
  const labelInterval = Math.max(1, Math.floor(data.length / 6));

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`}>
      {/* Grid lines */}
      {Array.from({ length: yTicks + 1 }, (_, i) => {
        const y = padding.top + (i / yTicks) * ch;
        return (
          <g key={i}>
            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke={PLATINUM} strokeWidth={1} />
            <text x={padding.left - 8} y={y + 4} fontSize={10} fill={GRAY} textAnchor="end">
              {Math.round(maxY - i * yStep)}
            </text>
          </g>
        );
      })}

      {/* Area fill */}
      <path d={areaPath} fill={LAVENDER} opacity={0.3} />

      {/* Ideal line */}
      <path d={idealPath} fill="none" stroke={PLATINUM} strokeWidth={2} strokeDasharray="6 3" />

      {/* Actual line */}
      <path d={actualPath} fill="none" stroke={PURPLE} strokeWidth={2.5} />

      {/* Data points */}
      {data.map((d, i) => {
        const pt = toPoint(i, d.remaining);
        if (i % labelInterval !== 0 && i !== data.length - 1) return null;
        return (
          <g key={i}>
            <circle cx={pt.x} cy={pt.y} r={3} fill="white" stroke={PURPLE} strokeWidth={2} />
            <text x={pt.x} y={height - 10} fontSize={9} fill={GRAY} textAnchor="middle">
              {new Date(d.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </text>
          </g>
        );
      })}

      {/* Legend */}
      <line x1={width - 150} y1={12} x2={width - 130} y2={12} stroke={PURPLE} strokeWidth={2.5} />
      <text x={width - 126} y={16} fontSize={10} fill={GRAY}>Actual</text>
      <line x1={width - 80} y1={12} x2={width - 60} y2={12} stroke={PLATINUM} strokeWidth={2} strokeDasharray="6 3" />
      <text x={width - 56} y={16} fontSize={10} fill={GRAY}>Ideal</text>
    </svg>
  );
}

function TimeToCloseChart({ data }: { data: TimeToClose[] }) {
  if (data.length === 0) return <p className="text-sm text-brand-gray text-center py-8">No completion data yet</p>;

  const width = 560;
  const height = 220;
  const padding = { top: 20, right: 20, bottom: 60, left: 50 };
  const cw = width - padding.left - padding.right;
  const ch = height - padding.top - padding.bottom;

  const maxVal = Math.max(...data.map((d) => d.avgDays), 1);
  const barWidth = Math.min(48, (cw / data.length) * 0.7);
  const gap = (cw - barWidth * data.length) / (data.length + 1);

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`}>
      {/* Y grid */}
      {[0, 0.25, 0.5, 0.75, 1].map((f, i) => {
        const y = padding.top + ch * (1 - f);
        return (
          <g key={i}>
            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke={PLATINUM} strokeWidth={1} />
            <text x={padding.left - 8} y={y + 4} fontSize={10} fill={GRAY} textAnchor="end">{Math.round(maxVal * f)}d</text>
          </g>
        );
      })}

      {data.map((d, i) => {
        const x = padding.left + gap + i * (barWidth + gap);
        const barH = (d.avgDays / maxVal) * ch;
        const y = padding.top + ch - barH;
        return (
          <g key={d.projectId}>
            <rect x={x} y={y} width={barWidth} height={barH} rx={3} fill={DARK_PURPLE} opacity={0.8} />
            <text x={x + barWidth / 2} y={y - 6} fontSize={11} fill={GRAY} textAnchor="middle" fontWeight={600}>
              {d.avgDays}d
            </text>
            <text
              x={x + barWidth / 2}
              y={padding.top + ch + 14}
              fontSize={10}
              fill={GRAY}
              textAnchor="middle"
              transform={`rotate(-30, ${x + barWidth / 2}, ${padding.top + ch + 14})`}
            >
              {d.projectName.length > 12 ? d.projectName.slice(0, 12) + "..." : d.projectName}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function PriorityDonut({ data }: { data: { high: number; medium: number; low: number } }) {
  const total = data.high + data.medium + data.low;
  if (total === 0) return <p className="text-sm text-brand-gray text-center py-8">No tasks</p>;

  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const r = 60;
  const strokeWidth = 20;

  const segments = [
    { value: data.high, color: RED, label: "High" },
    { value: data.medium, color: AMBER, label: "Medium" },
    { value: data.low, color: EMERALD, label: "Low" },
  ].filter((s) => s.value > 0);

  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex items-center gap-6">
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
        <text x={cx} y={cy - 4} fontSize={20} fill="#181818" textAnchor="middle" fontWeight={700}>{total}</text>
        <text x={cx} y={cy + 12} fontSize={10} fill={GRAY} textAnchor="middle">tasks</text>
      </svg>
      <div className="space-y-2">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-2 text-sm">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="text-brand-gray">{seg.label}</span>
            <span className="font-medium text-brand-black">{seg.value}</span>
            <span className="text-xs text-brand-gray">({Math.round((seg.value / total) * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const [days, setDays] = useState(30);
  const [projectId, setProjectId] = useState("");
  const { data, error } = useSWR<ReportsData>(
    `/api/reports?days=${days}${projectId ? `&projectId=${projectId}` : ""}`,
    fetcher
  );

  const loading = !data && !error;

  return (
    <>
      <Topbar title="Reports" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto">
          {/* Controls */}
          <div className="flex items-center gap-3 mb-6">
            <span className="text-xs text-brand-gray">Time range:</span>
            {[7, 14, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1 text-xs rounded-full transition-colors duration-150 ${days === d ? "bg-midnight-blue text-white" : "text-brand-gray hover:bg-white-smoke"}`}
              >
                {d}d
              </button>
            ))}
            {data && (
              <div className="ml-auto">
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="text-sm border border-platinum rounded px-2 py-1 focus:outline-none focus:border-royal-purple"
                >
                  <option value="">All Projects</option>
                  {data.completionRates.map((p) => (
                    <option key={p.projectId} value={p.projectId}>{p.projectName}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {loading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-24 bg-platinum/40 rounded-xl animate-skeleton" />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-64 bg-platinum/30 rounded-xl animate-skeleton" />
                ))}
              </div>
            </div>
          ) : data ? (
            <>
              {/* Stat cards */}
              <div className="grid grid-cols-4 gap-4 mb-8">
                <StatCard label="Total Tasks" value={data.overall.totalTasks} />
                <StatCard label="Completion Rate" value={`${data.overall.completionRate}%`} color={data.overall.completionRate >= 70 ? "text-emerald-600" : data.overall.completionRate >= 40 ? "text-amber-600" : "text-red-600"} />
                <StatCard
                  label="Avg. Time to Close"
                  value={data.averageTimeToClose.length > 0 ? `${Math.round(data.averageTimeToClose.reduce((a, b) => a + b.avgDays, 0) / data.averageTimeToClose.length)}d` : "N/A"}
                />
                <StatCard label="Overdue" value={data.overall.overdueCount} color={data.overall.overdueCount > 0 ? "text-red-600" : "text-emerald-600"} />
              </div>

              {/* Charts */}
              <div className="grid grid-cols-2 gap-6">
                {/* Completion by Project */}
                <div className="bg-white rounded-xl shadow-[0_4px_34px_rgba(0,0,0,0.05)] border border-platinum/50 p-5">
                  <h3 className="text-sm font-semibold font-heading text-brand-black mb-4">Completion Rate by Project</h3>
                  <CompletionChart data={data.completionRates} />
                </div>

                {/* Tasks by Assignee */}
                <div className="bg-white rounded-xl shadow-[0_4px_34px_rgba(0,0,0,0.05)] border border-platinum/50 p-5">
                  <h3 className="text-sm font-semibold font-heading text-brand-black mb-4">Tasks by Assignee</h3>
                  <div className="flex items-center gap-4 mb-3 text-xs text-brand-gray">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: EMERALD }} /> Completed</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: AMBER }} /> In Progress</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: RED }} /> Overdue</span>
                  </div>
                  <AssigneeChart data={data.tasksByAssignee} />
                </div>

                {/* Burndown */}
                <div className="bg-white rounded-xl shadow-[0_4px_34px_rgba(0,0,0,0.05)] border border-platinum/50 p-5">
                  <h3 className="text-sm font-semibold font-heading text-brand-black mb-4">Burndown Chart</h3>
                  <BurndownChart data={data.burndown} />
                </div>

                {/* Time to Close */}
                <div className="bg-white rounded-xl shadow-[0_4px_34px_rgba(0,0,0,0.05)] border border-platinum/50 p-5">
                  <h3 className="text-sm font-semibold font-heading text-brand-black mb-4">Avg. Time to Close by Project</h3>
                  <TimeToCloseChart data={data.averageTimeToClose} />
                </div>

                {/* Priority Breakdown */}
                <div className="bg-white rounded-xl shadow-[0_4px_34px_rgba(0,0,0,0.05)] border border-platinum/50 p-5">
                  <h3 className="text-sm font-semibold font-heading text-brand-black mb-4">Priority Breakdown</h3>
                  <div className="flex justify-center py-4">
                    <PriorityDonut data={data.priorityBreakdown} />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-brand-gray text-center py-12">Failed to load report data</p>
          )}
        </div>
      </div>
    </>
  );
}
