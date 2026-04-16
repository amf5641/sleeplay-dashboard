"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import useSWR from "swr";
import { fetcher } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/notifications", label: "Notifications", icon: "🔔" },
  { href: "/my-tasks", label: "My Tasks", icon: "✅" },
  { href: "/sops", label: "SOPs", icon: "📋" },
  { href: "/content", label: "Company Docs", icon: "📄" },
  { href: "/org-chart", label: "Org Chart", icon: "🏢" },
  { href: "/team", label: "Meet the Team", icon: "👥" },
  { href: "/projects", label: "Projects", icon: "📁" },
  { href: "/reports", label: "Reports", icon: "📊" },
  { href: "/pto", label: "PTO", icon: "🏖️" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

interface Notification {
  id: string;
  read: boolean;
}

interface SidebarProject {
  id: string;
  name: string;
  color: string;
  departmentId: string | null;
}

interface SidebarDepartment {
  id: string;
  name: string;
  color: string;
}

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { data: notifications = [] } = useSWR<Notification[]>("/api/notifications", fetcher, { refreshInterval: 30000 });
  const { data: projects = [] } = useSWR<SidebarProject[]>("/api/projects", fetcher);
  const { data: departments = [] } = useSWR<SidebarDepartment[]>("/api/departments", fetcher);
  const [mobileOpen, setMobileOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const sidebarContent = (
    <>
      <Link href="/" className="block px-5 py-5 border-b border-white/10">
        <Image src="/sleeplay-logo.svg" alt="Sleeplay" width={120} height={28} priority />
      </Link>
      <nav className="flex-1 py-3 overflow-y-auto">
        <button
          onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
          className="flex items-center gap-3 px-5 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors w-full text-left mb-1"
        >
          <span>🔍</span>
          <span className="flex-1">Search</span>
          <kbd className="text-[10px] text-white/30 bg-white/10 px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
        </button>
        {navItems.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const isNotifications = item.href === "/notifications";
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                active ? "bg-midnight-blue text-white font-medium" : "text-white/70 hover:text-white hover:bg-white/5"
              }`}
            >
              <span>{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {isNotifications && unreadCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          );
        })}
        {/* Project list grouped by department */}
        {projects.length > 0 && (
          <div className="mt-2 pt-2 border-t border-white/10">
            <p className="px-5 py-1.5 text-[10px] uppercase tracking-wider text-white/30 font-medium">Projects</p>
            {departments.map((dept) => {
              const deptProjects = projects.filter((p) => p.departmentId === dept.id);
              if (deptProjects.length === 0) return null;
              return (
                <div key={dept.id} className="mb-1">
                  <p className="px-5 py-1 text-[10px] text-white/40 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: dept.color }} />
                    {dept.name}
                  </p>
                  {deptProjects.map((proj) => {
                    const active = pathname === `/projects/${proj.id}`;
                    return (
                      <Link
                        key={proj.id}
                        href={`/projects/${proj.id}`}
                        className={`flex items-center gap-2.5 px-5 pl-8 py-1.5 text-sm transition-colors ${
                          active ? "bg-midnight-blue text-white font-medium" : "text-white/70 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        <span className="w-3 h-3 rounded flex-shrink-0" style={{ backgroundColor: proj.color || "#664FA6" }} />
                        <span className="truncate">{proj.name}</span>
                      </Link>
                    );
                  })}
                </div>
              );
            })}
            {/* Ungrouped projects */}
            {projects.filter((p) => !p.departmentId).map((proj) => {
              const active = pathname === `/projects/${proj.id}`;
              return (
                <Link
                  key={proj.id}
                  href={`/projects/${proj.id}`}
                  className={`flex items-center gap-2.5 px-5 py-1.5 text-sm transition-colors ${
                    active ? "bg-midnight-blue text-white font-medium" : "text-white/70 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <span className="w-3 h-3 rounded flex-shrink-0" style={{ backgroundColor: proj.color || "#664FA6" }} />
                  <span className="truncate">{proj.name}</span>
                </Link>
              );
            })}
          </div>
        )}
      </nav>
      <div className="px-5 py-4 border-t border-white/10">
        {session?.user?.email && (
          <p className="text-xs text-white/40 mb-2 truncate">{session.user.email}</p>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-sm text-white/60 hover:text-white transition-colors"
        >
          Log out
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 p-2 bg-ultra-violet text-white rounded-lg shadow-lg md:hidden"
        aria-label="Open menu"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 bg-ultra-violet text-white flex-col h-screen sticky top-0 shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 w-64 bg-ultra-violet text-white flex flex-col h-full animate-slide-in-left">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 text-white/60 hover:text-white"
              aria-label="Close menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
