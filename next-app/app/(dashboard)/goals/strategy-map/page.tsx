"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import Topbar from "@/components/topbar";
import EmptyState from "@/components/empty-state";
import { fetcher } from "@/lib/utils";
import { GoalListItem } from "@/components/goals/types";

// SVG attributes don't resolve Tailwind classes, so the status-dot palette used
// elsewhere as bg-*-500 classes needs a hex equivalent here (kept local/self-contained).
const STATUS_DOT_HEX: Record<string, string> = {
  "On Track": "#10B981",
  "At Risk": "#F59E0B",
  "Off Track": "#EF4444",
  Achieved: "#664FA6",
  Partial: "#664FA6",
  Missed: "#6B7280",
  Dropped: "#6B7280",
};

interface TreeNode {
  goal: GoalListItem;
  children: TreeNode[];
  depth: number;
  x: number;
}

const NODE_W = 180;
const NODE_H = 64;
const H_GAP = 24;
const V_GAP = 56;
const LANE_PADDING_TOP = 40;

function buildForest(goals: GoalListItem[], roots: GoalListItem[]): TreeNode[] {
  const byParent = new Map<string, GoalListItem[]>();
  for (const g of goals) {
    if (!g.parentId) continue;
    if (!byParent.has(g.parentId)) byParent.set(g.parentId, []);
    byParent.get(g.parentId)!.push(g);
  }

  function build(goal: GoalListItem, depth: number): TreeNode {
    const children = (byParent.get(goal.id) || []).map((c) => build(c, depth + 1));
    return { goal, children, depth, x: 0 };
  }

  const forest = roots.map((r) => build(r, 0));

  let nextX = 0;
  function assignX(node: TreeNode) {
    if (node.children.length === 0) {
      node.x = nextX;
      nextX += 1;
    } else {
      node.children.forEach(assignX);
      const xs = node.children.map((c) => c.x);
      node.x = (Math.min(...xs) + Math.max(...xs)) / 2;
    }
  }
  forest.forEach(assignX);

  return forest;
}

function maxDepth(nodes: TreeNode[]): number {
  let max = 0;
  for (const n of nodes) {
    max = Math.max(max, n.depth, maxDepth(n.children));
  }
  return max;
}

function flatten(nodes: TreeNode[]): TreeNode[] {
  return nodes.flatMap((n) => [n, ...flatten(n.children)]);
}

function Lane({ title, color, forest, onNavigate }: { title: string; color: string; forest: TreeNode[]; onNavigate: (id: string) => void }) {
  if (forest.length === 0) return null;
  const nodes = flatten(forest);
  const depth = maxDepth(forest);
  const width = (Math.max(...nodes.map((n) => n.x)) + 1) * (NODE_W + H_GAP);
  const height = LANE_PADDING_TOP + (depth + 1) * (NODE_H + V_GAP);

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-3 h-3 rounded flex-shrink-0" style={{ backgroundColor: color }} />
        <h2 className="font-heading font-semibold text-brand-black text-sm">{title}</h2>
      </div>
      <div className="overflow-x-auto border border-platinum/50 rounded-lg bg-white-smoke/30">
        <svg width={Math.max(width, 300)} height={height} className="block">
          {nodes.map((node) =>
            node.children.map((child) => {
              const x1 = node.x * (NODE_W + H_GAP) + NODE_W / 2;
              const y1 = LANE_PADDING_TOP + node.depth * (NODE_H + V_GAP) + NODE_H;
              const x2 = child.x * (NODE_W + H_GAP) + NODE_W / 2;
              const y2 = LANE_PADDING_TOP + child.depth * (NODE_H + V_GAP);
              const midY = (y1 + y2) / 2;
              return (
                <path
                  key={`${node.goal.id}-${child.goal.id}`}
                  d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                  fill="none"
                  stroke="#D9D6E8"
                  strokeWidth={1.5}
                />
              );
            })
          )}
          {nodes.map((node) => {
            const x = node.x * (NODE_W + H_GAP);
            const y = LANE_PADDING_TOP + node.depth * (NODE_H + V_GAP);
            const pct = node.goal.computedPct;
            return (
              <g key={node.goal.id} className="cursor-pointer" onClick={() => onNavigate(node.goal.id)}>
                <rect x={x} y={y} width={NODE_W} height={NODE_H} rx={8} fill="white" stroke="#E5E1F5" strokeWidth={1} />
                <circle cx={x + 14} cy={y + 16} r={4} fill={STATUS_DOT_HEX[node.goal.status] || "#6B7280"} />
                <text x={x + 26} y={y + 20} fontSize={12} fontWeight={600} fill="#181818">
                  {node.goal.name.length > 20 ? node.goal.name.slice(0, 19) + "…" : node.goal.name}
                </text>
                <text x={x + 14} y={y + 38} fontSize={10} fill="#8DA3A6">{node.goal.status}</text>
                {pct != null && (
                  <>
                    <rect x={x + 14} y={y + 46} width={NODE_W - 28} height={4} rx={2} fill="#E5E1F5" />
                    <rect
                      x={x + 14}
                      y={y + 46}
                      width={((NODE_W - 28) * Math.min(100, pct)) / 100}
                      height={4}
                      rx={2}
                      fill={pct >= 100 ? "#10B981" : pct >= 70 ? "#F59E0B" : "#EF4444"}
                    />
                    <text x={x + NODE_W - 14} y={y + 38} fontSize={10} fill="#8DA3A6" textAnchor="end">{pct}%</text>
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export default function StrategyMapPage() {
  const router = useRouter();
  const [timePeriod, setTimePeriod] = useState("");

  const { data: goals = [] } = useSWR<GoalListItem[]>(
    `/api/goals${timePeriod ? `?timePeriod=${encodeURIComponent(timePeriod)}` : ""}`,
    fetcher
  );

  const { companyForest, teamLanes } = useMemo(() => {
    const companyRoots = goals.filter((g) => g.isCompanyLevel && !g.parentId);
    const companyForest = buildForest(goals, companyRoots);

    const deptMap = new Map<string, { name: string; color: string; roots: GoalListItem[] }>();
    for (const g of goals) {
      if (g.isCompanyLevel || g.parentId) continue;
      const key = g.departmentId || "__none";
      if (!deptMap.has(key)) {
        deptMap.set(key, { name: g.department?.name || "Other Team Goals", color: g.department?.color || "#8DA3A6", roots: [] });
      }
      deptMap.get(key)!.roots.push(g);
    }
    const teamLanes = Array.from(deptMap.values()).map((d) => ({ ...d, forest: buildForest(goals, d.roots) }));

    return { companyForest, teamLanes };
  }, [goals]);

  const isEmpty = companyForest.length === 0 && teamLanes.every((l) => l.forest.length === 0);

  return (
    <>
      <Topbar title="Strategy Map" />
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-brand-gray">Visualize how Company and Team goals break down into sub-goals.</p>
          <input
            value={timePeriod}
            onChange={(e) => setTimePeriod(e.target.value)}
            placeholder='Filter by time period (e.g. "Q3-2026")'
            className="px-3 py-1.5 text-sm border border-platinum rounded focus:outline-none focus:border-royal-purple w-64"
          />
        </div>

        {isEmpty ? (
          <EmptyState icon="🗺️" title="No goals to map" description="Create some goals to see how they connect." />
        ) : (
          <>
            <Lane title="Company Goals" color="#664FA6" forest={companyForest} onNavigate={(id) => router.push(`/goals/${id}`)} />
            {teamLanes.map((lane) => (
              <Lane key={lane.name} title={lane.name} color={lane.color} forest={lane.forest} onNavigate={(id) => router.push(`/goals/${id}`)} />
            ))}
          </>
        )}
      </div>
    </>
  );
}
