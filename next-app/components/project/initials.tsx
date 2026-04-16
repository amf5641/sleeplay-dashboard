"use client";

export default function Initials({ name, size = "sm" }: { name: string; size?: "sm" | "xs" }) {
  const getInitials = (s: string): string => {
    if (!s) return "?";
    const atIdx = s.indexOf("@");
    if (atIdx > 0) return (s.charAt(0) + s.charAt(atIdx + 1)).toUpperCase();
    const spaceIdx = s.indexOf(" ");
    if (spaceIdx > 0) return (s.charAt(0) + s.charAt(spaceIdx + 1)).toUpperCase();
    return s.length >= 2 ? s.slice(0, 2).toUpperCase() : s.charAt(0).toUpperCase();
  };
  const initials = getInitials(name);
  const cls = size === "sm" ? "w-6 h-6 text-[11px]" : "w-5 h-5 text-[10px]";
  return (
    <span className={`${cls} rounded-full bg-royal-purple text-white flex items-center justify-center font-medium flex-shrink-0`} title={name}>
      {initials}
    </span>
  );
}
