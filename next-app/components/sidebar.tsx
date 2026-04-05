"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import Image from "next/image";

const navItems = [
  { href: "/sops", label: "SOPs", icon: "📋" },
  { href: "/content", label: "Content", icon: "📄" },
  { href: "/org-chart", label: "Org Chart", icon: "🏢" },
  { href: "/team", label: "Meet the Team", icon: "👥" },
  { href: "/projects", label: "Projects", icon: "📁" },
  { href: "/pto", label: "PTO", icon: "🏖️" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 bg-ultra-violet text-white flex flex-col h-screen sticky top-0 shrink-0">
      <div className="px-5 py-5 border-b border-white/10">
        <Image src="/sleeplay-logo.svg" alt="Sleeplay" width={120} height={28} priority />
      </div>
      <nav className="flex-1 py-3 overflow-y-auto">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                active ? "bg-midnight-blue text-white font-medium" : "text-white/70 hover:text-white hover:bg-white/5"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="px-5 py-4 border-t border-white/10">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-sm text-white/60 hover:text-white transition-colors"
        >
          Log out
        </button>
      </div>
    </aside>
  );
}
