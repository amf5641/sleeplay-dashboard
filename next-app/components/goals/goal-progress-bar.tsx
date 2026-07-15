"use client";
import { formatMetricValue } from "@/components/goals/types";

interface GoalProgressBarProps {
  pct: number | null;
  currentValue: number | null;
  targetValue: number | null;
  metricUnit: string;
  compact?: boolean;
}

export default function GoalProgressBar({ pct, currentValue, targetValue, metricUnit, compact }: GoalProgressBarProps) {
  const barColor = pct == null ? "bg-platinum" : pct >= 100 ? "bg-emerald-500" : pct >= 70 ? "bg-amber-500" : "bg-red-500";

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-platinum rounded-full overflow-hidden">
          <div className={`h-full ${barColor} rounded-full`} style={{ width: `${Math.min(100, pct ?? 0)}%` }} />
        </div>
        <span className="text-xs text-brand-gray w-9 text-right">{pct == null ? "—" : `${pct}%`}</span>
      </div>
    );
  }

  return (
    <div>
      {targetValue != null && (
        <div className="flex items-baseline gap-2 mb-1.5">
          <span className="text-lg font-heading font-bold text-brand-black">
            {formatMetricValue(currentValue, metricUnit)}
          </span>
          <span className="text-xs text-brand-gray">of {formatMetricValue(targetValue, metricUnit)} target</span>
        </div>
      )}
      <div className="w-full h-2 bg-platinum/40 rounded-full overflow-hidden">
        <div className={`h-full ${barColor} rounded-full`} style={{ width: `${Math.min(100, pct ?? 0)}%` }} />
      </div>
    </div>
  );
}
