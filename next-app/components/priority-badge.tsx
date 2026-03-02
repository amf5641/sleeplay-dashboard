const colors: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-emerald-100 text-emerald-700",
};

export default function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium capitalize ${colors[priority] || "bg-gray-100 text-gray-600"}`}>
      {priority}
    </span>
  );
}
