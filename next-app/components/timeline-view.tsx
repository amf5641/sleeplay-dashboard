"use client";
import React, { useState, useRef, useCallback, useMemo } from "react";

const COLORS: Record<string, string> = {
  "On Track": "#10B981",
  "Slightly Off": "#F59E0B",
  "Off Track": "#EF4444",
  "On Hold": "#9CA3AF",
  "Done": "#3B82F6",
};

const ROW_HEIGHT = 36;
const HEADER_HEIGHT = 40;
const LABEL_WIDTH = 220;
const MIN_BAR_WIDTH = 8;

function formatDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseDate(s: string) {
  return new Date(s + "T12:00:00");
}

function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

interface Person { id: string; name: string }
interface TaskDep { id: string; blockedByTask: { id: string; title: string; completed: boolean } }
interface TaskBlock { id: string; task: { id: string; title: string; completed: boolean } }

interface Task {
  id: string;
  title: string;
  dueDate: string | null;
  status: string;
  completed: boolean;
  priority: string;
  notes: string;
  createdAt: string;
  collaborators: { person: Person }[];
  dependsOn?: TaskDep[];
  blocks?: TaskBlock[];
  subtasks: unknown[];
}

interface TimelineViewProps {
  tasks: Task[];
  onUpdateDueDate: (taskId: string, newDate: string) => void;
  onSelectTask: (task: Task) => void;
  selectedTaskId: string | null;
  sections: string[];
}

type Zoom = "day" | "week" | "month";

export default function TimelineView({ tasks, onUpdateDueDate, onSelectTask, selectedTaskId, sections }: TimelineViewProps) {
  const [zoom, setZoom] = useState<Zoom>("week");
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<{ taskId: string; startX: number; originalDate: string } | null>(null);
  const [dragOffset, setDragOffset] = useState(0);

  const pxPerDay = zoom === "day" ? 40 : zoom === "week" ? 16 : 5;

  const getSection = (t: Task) => {
    const m = t.notes.match(/^\[([^\]]+)\]/);
    return m ? m[1] : "Uncategorized";
  };

  // Group tasks by section
  const grouped = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const s of sections) map.set(s, []);
    for (const t of tasks) {
      const sec = getSection(t);
      if (!map.has(sec)) map.set(sec, []);
      map.get(sec)!.push(t);
    }
    return [...map.entries()].filter(([, ts]) => ts.length > 0);
  }, [tasks, sections]);

  // Compute date range
  const { rangeStart, rangeEnd, totalDays } = useMemo(() => {
    const today = new Date();
    let min = today;
    let max = today;
    for (const t of tasks) {
      if (t.dueDate) {
        const d = parseDate(t.dueDate);
        if (d < min) min = d;
        if (d > max) max = d;
      }
      const created = new Date(t.createdAt);
      if (created < min) min = created;
    }
    const start = new Date(min);
    start.setDate(start.getDate() - 7);
    const end = new Date(max);
    end.setDate(end.getDate() + 14);
    return { rangeStart: start, rangeEnd: end, totalDays: daysBetween(start, end) };
  }, [tasks]);

  const dateToX = useCallback((date: Date) => {
    return daysBetween(rangeStart, date) * pxPerDay;
  }, [rangeStart, pxPerDay]);

  const xToDate = useCallback((x: number) => {
    const days = Math.round(x / pxPerDay);
    const d = new Date(rangeStart);
    d.setDate(d.getDate() + days);
    return d;
  }, [rangeStart, pxPerDay]);

  const todayX = dateToX(new Date());
  const chartWidth = totalDays * pxPerDay;

  // Compute row positions
  const rows: { type: "section"; label: string; y: number }[] | { type: "task"; task: Task; y: number }[] = [];
  let currentY = 0;
  const allRows: ({ type: "section"; label: string; y: number } | { type: "task"; task: Task; y: number })[] = [];
  for (const [section, sectionTasks] of grouped) {
    allRows.push({ type: "section", label: section, y: currentY });
    currentY += ROW_HEIGHT;
    for (const task of sectionTasks) {
      allRows.push({ type: "task", task, y: currentY });
      currentY += ROW_HEIGHT;
    }
    currentY += 4; // gap between sections
  }
  const totalHeight = currentY;

  // Generate date markers
  const markers = useMemo(() => {
    const result: { x: number; label: string; major: boolean }[] = [];
    const d = new Date(rangeStart);
    while (d <= rangeEnd) {
      const x = dateToX(d);
      if (zoom === "day") {
        result.push({ x, label: `${d.getMonth() + 1}/${d.getDate()}`, major: d.getDay() === 1 });
      } else if (zoom === "week") {
        if (d.getDay() === 1 || d.getDate() === 1) {
          result.push({ x, label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), major: d.getDate() === 1 });
        }
      } else {
        if (d.getDate() === 1) {
          result.push({ x, label: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }), major: true });
        }
      }
      d.setDate(d.getDate() + 1);
    }
    return result;
  }, [rangeStart, rangeEnd, dateToX, zoom]);

  const handleMouseDown = (e: React.MouseEvent, taskId: string, dueDate: string) => {
    e.stopPropagation();
    setDragging({ taskId, startX: e.clientX, originalDate: dueDate });
    setDragOffset(0);
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    setDragOffset(e.clientX - dragging.startX);
  }, [dragging]);

  const handleMouseUp = useCallback(() => {
    if (!dragging) return;
    const daysDelta = Math.round(dragOffset / pxPerDay);
    if (daysDelta !== 0) {
      const original = parseDate(dragging.originalDate);
      original.setDate(original.getDate() + daysDelta);
      onUpdateDueDate(dragging.taskId, formatDate(original));
    }
    setDragging(null);
    setDragOffset(0);
  }, [dragging, dragOffset, pxPerDay, onUpdateDueDate]);

  const unscheduled = tasks.filter((t) => !t.dueDate);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-6 py-3 border-b border-platinum/40">
        <span className="text-xs text-brand-gray mr-1">Zoom:</span>
        {(["day", "week", "month"] as Zoom[]).map((z) => (
          <button
            key={z}
            onClick={() => setZoom(z)}
            className={`px-3 py-1 text-xs rounded-full capitalize transition-colors duration-150 ${zoom === z ? "bg-midnight-blue text-white" : "text-brand-gray hover:bg-white-smoke"}`}
          >
            {z}
          </button>
        ))}
        <div className="flex-1" />
        <div className="flex items-center gap-2 text-xs text-brand-gray">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> On Track
          <span className="w-2 h-2 rounded-full bg-amber-500 inline-block ml-2" /> Slightly Off
          <span className="w-2 h-2 rounded-full bg-red-500 inline-block ml-2" /> Off Track
          <span className="w-2 h-2 rounded-full bg-gray-400 inline-block ml-2" /> On Hold
          <span className="w-2 h-2 rounded-full bg-blue-500 inline-block ml-2" /> Done
        </div>
      </div>

      <div
        className="flex-1 overflow-auto"
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div className="flex" style={{ minWidth: LABEL_WIDTH + chartWidth }}>
          {/* Left labels column */}
          <div className="flex-shrink-0 bg-white border-r border-platinum/40 z-10 sticky left-0" style={{ width: LABEL_WIDTH }}>
            {/* Header spacer */}
            <div className="h-10 border-b border-platinum/40 px-3 flex items-center">
              <span className="text-[11px] uppercase tracking-wider text-brand-gray font-medium">Task</span>
            </div>
            {/* Row labels */}
            <div style={{ height: totalHeight }}>
              {allRows.map((row, i) =>
                row.type === "section" ? (
                  <div key={`s-${i}`} className="flex items-center px-3 font-semibold text-xs text-brand-black bg-white-smoke/50" style={{ height: ROW_HEIGHT, position: "absolute", top: HEADER_HEIGHT + row.y, width: LABEL_WIDTH - 1 }}>
                    {row.label}
                  </div>
                ) : (
                  <div
                    key={row.task.id}
                    onClick={() => onSelectTask(row.task)}
                    className={`flex items-center px-3 text-sm truncate cursor-pointer hover:bg-white-smoke/50 transition-colors duration-100 ${selectedTaskId === row.task.id ? "bg-lavender/20" : ""} ${row.task.completed ? "line-through text-brand-gray/50" : "text-brand-black"}`}
                    style={{ height: ROW_HEIGHT, position: "absolute", top: HEADER_HEIGHT + row.y, width: LABEL_WIDTH - 1 }}
                  >
                    {row.task.title}
                  </div>
                )
              )}
            </div>
          </div>

          {/* Chart area */}
          <div className="flex-1 relative" style={{ width: chartWidth }}>
            {/* Date header */}
            <div className="sticky top-0 z-10 bg-white border-b border-platinum/40" style={{ height: HEADER_HEIGHT }}>
              <svg width={chartWidth} height={HEADER_HEIGHT}>
                {markers.map((m, i) => (
                  <g key={i}>
                    <text x={m.x + 4} y={28} fontSize={10} fill="#6B7280" fontWeight={m.major ? 600 : 400}>
                      {m.label}
                    </text>
                  </g>
                ))}
              </svg>
            </div>

            {/* Chart body */}
            <svg width={chartWidth} height={totalHeight + 8} className="select-none">
              {/* Grid lines */}
              {markers.map((m, i) => (
                <line key={i} x1={m.x} y1={0} x2={m.x} y2={totalHeight + 8} stroke={m.major ? "#E4E0DB" : "#F1F0EE"} strokeWidth={1} />
              ))}

              {/* Today line */}
              <line x1={todayX} y1={0} x2={todayX} y2={totalHeight + 8} stroke="#664FA6" strokeWidth={2} strokeDasharray="4 3" />
              <rect x={todayX - 16} y={0} width={32} height={16} rx={3} fill="#664FA6" />
              <text x={todayX} y={11} fontSize={9} fill="white" textAnchor="middle" fontWeight={600}>
                Today
              </text>

              {/* Row backgrounds */}
              {allRows.map((row, i) =>
                row.type === "section" ? (
                  <rect key={`bg-${i}`} x={0} y={row.y} width={chartWidth} height={ROW_HEIGHT} fill="#F9F9F8" />
                ) : (
                  <rect key={`bg-${i}`} x={0} y={row.y} width={chartWidth} height={ROW_HEIGHT} fill={selectedTaskId === row.task.id ? "rgba(220,212,243,0.15)" : "transparent"} />
                )
              )}

              {/* Horizontal row dividers */}
              {allRows.map((row, i) => (
                <line key={`div-${i}`} x1={0} y1={row.y + ROW_HEIGHT} x2={chartWidth} y2={row.y + ROW_HEIGHT} stroke="#F1F0EE" strokeWidth={1} />
              ))}

              {/* Task bars */}
              {allRows.map((row) => {
                if (row.type !== "task") return null;
                const task = row.task;
                if (!task.dueDate) return null;

                const dueDate = parseDate(task.dueDate);
                const created = new Date(task.createdAt);
                const barStart = dateToX(created);
                const barEnd = dateToX(dueDate);
                let width = barEnd - barStart;
                if (width < MIN_BAR_WIDTH) width = MIN_BAR_WIDTH;

                const isDragging = dragging?.taskId === task.id;
                const offset = isDragging ? dragOffset : 0;
                const color = COLORS[task.status] || "#9CA3AF";
                const y = row.y + 6;
                const barHeight = ROW_HEIGHT - 12;

                return (
                  <g key={task.id}>
                    <rect
                      x={barStart + offset}
                      y={y}
                      width={width}
                      height={barHeight}
                      rx={4}
                      fill={task.completed ? "#D1D5DB" : color}
                      opacity={task.completed ? 0.5 : 0.85}
                      className="cursor-grab active:cursor-grabbing"
                      onMouseDown={(e) => handleMouseDown(e, task.id, task.dueDate!)}
                      onClick={(e) => { e.stopPropagation(); onSelectTask(task); }}
                    >
                      <title>{task.title}{"\n"}Due: {task.dueDate}{"\n"}Status: {task.status}</title>
                    </rect>
                    {/* Due date marker */}
                    <circle
                      cx={barEnd + offset}
                      cy={y + barHeight / 2}
                      r={3}
                      fill="white"
                      stroke={task.completed ? "#D1D5DB" : color}
                      strokeWidth={2}
                      className="cursor-ew-resize"
                      onMouseDown={(e) => handleMouseDown(e, task.id, task.dueDate!)}
                    />
                  </g>
                );
              })}

              {/* Dependency arrows */}
              {allRows.map((row) => {
                if (row.type !== "task") return null;
                const task = row.task;
                if (!task.dependsOn || !task.dueDate) return null;

                return task.dependsOn.map((dep) => {
                  const blockerRow = allRows.find((r) => r.type === "task" && r.task.id === dep.blockedByTask.id);
                  if (!blockerRow || blockerRow.type !== "task" || !blockerRow.task.dueDate) return null;

                  const fromX = dateToX(parseDate(blockerRow.task.dueDate));
                  const fromY = blockerRow.y + ROW_HEIGHT / 2;
                  const toCreated = new Date(task.createdAt);
                  const toX = dateToX(toCreated);
                  const toY = row.y + ROW_HEIGHT / 2;

                  return (
                    <g key={dep.id}>
                      <path
                        d={`M${fromX},${fromY} C${fromX + 20},${fromY} ${toX - 20},${toY} ${toX},${toY}`}
                        fill="none"
                        stroke="#664FA6"
                        strokeWidth={1.5}
                        strokeDasharray="4 2"
                        opacity={0.5}
                      />
                      <polygon
                        points={`${toX},${toY} ${toX - 5},${toY - 3} ${toX - 5},${toY + 3}`}
                        fill="#664FA6"
                        opacity={0.5}
                      />
                    </g>
                  );
                });
              })}
            </svg>
          </div>
        </div>
      </div>

      {/* Unscheduled tasks */}
      {unscheduled.length > 0 && (
        <div className="border-t border-platinum/40 px-6 py-3 bg-white-smoke/30">
          <p className="text-xs font-medium text-brand-gray mb-2">Unscheduled ({unscheduled.length})</p>
          <div className="flex flex-wrap gap-2">
            {unscheduled.map((t) => (
              <button
                key={t.id}
                onClick={() => onSelectTask(t)}
                className="px-2 py-1 text-xs bg-white border border-platinum rounded hover:border-royal-purple transition-colors duration-150"
              >
                {t.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
