"use client";

export default function Initials({ name, size = "sm" }: { name: string; size?: "sm" | "xs" }) {
  const letter = name.charAt(0).toUpperCase();
  const cls = size === "sm" ? "w-6 h-6 text-[11px]" : "w-5 h-5 text-[10px]";
  return (
    <span className={`${cls} rounded-full bg-royal-purple text-white flex items-center justify-center font-medium flex-shrink-0`} title={name}>
      {letter}
    </span>
  );
}
