"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import useSWR from "swr";
import { fetcher } from "@/lib/utils";
import { ReactNode } from "react";

const ic = "w-5 h-5 flex-shrink-0";

const navItems: { href: string; label: string; icon: ReactNode }[] = [
  {
    href: "/",
    label: "Home",
    icon: <svg className={ic} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955a1.126 1.126 0 0 1 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>,
  },
  {
    href: "/notifications",
    label: "Notifications",
    icon: <svg className={ic} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" /></svg>,
  },
  {
    href: "/my-tasks",
    label: "My Tasks",
    icon: <svg className={ic} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>,
  },
  {
    href: "/sops",
    label: "SOPs",
    icon: <svg className={ic} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" /></svg>,
  },
  {
    href: "/content",
    label: "Company Docs",
    icon: <svg className={ic} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>,
  },
  {
    href: "/org-chart",
    label: "Org Chart",
    icon: <svg className={ic} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" /></svg>,
  },
  {
    href: "/team",
    label: "Meet the Team",
    icon: <svg className={ic} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg>,
  },
  {
    href: "/projects",
    label: "Projects",
    icon: <svg className={ic} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" /></svg>,
  },
  {
    href: "/reports",
    label: "Reports",
    icon: <svg className={ic} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" /></svg>,
  },
  {
    href: "/pto",
    label: "PTO",
    icon: <svg className={ic} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>,
  },
  {
    href: "/settings",
    label: "Settings",
    icon: <svg className={ic} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>,
  },
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
          <svg className={ic} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
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
              {item.icon}
              <span className="flex-1">{item.label}</span>
              {isNotifications && unreadCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          );
        })}
        {/* Project list grouped by department — capped at 5 total */}
        {projects.length > 0 && (() => {
          const MAX_SIDEBAR_PROJECTS = 5;
          let rendered = 0;
          return (
          <div className="mt-2 pt-2 border-t border-white/10">
            <p className="px-5 py-1.5 text-[10px] uppercase tracking-wider text-white/30 font-medium">Projects</p>
            {departments.map((dept) => {
              if (rendered >= MAX_SIDEBAR_PROJECTS) return null;
              const deptProjects = projects.filter((p) => p.departmentId === dept.id);
              if (deptProjects.length === 0) return null;
              const visible = deptProjects.slice(0, MAX_SIDEBAR_PROJECTS - rendered);
              rendered += visible.length;
              return (
                <div key={dept.id} className="mb-1">
                  <p className="px-5 py-1 text-[10px] text-white/40 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: dept.color }} />
                    {dept.name}
                  </p>
                  {visible.map((proj) => {
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
            {rendered < MAX_SIDEBAR_PROJECTS && projects.filter((p) => !p.departmentId).slice(0, MAX_SIDEBAR_PROJECTS - rendered).map((proj) => {
              rendered++;
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
            {projects.length > MAX_SIDEBAR_PROJECTS && (
              <Link
                href="/projects"
                className="flex items-center px-5 py-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
              >
                View all ({projects.length})
              </Link>
            )}
          </div>
          );
        })()}
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
