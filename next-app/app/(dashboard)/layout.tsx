"use client";
import { SessionProvider } from "next-auth/react";
import { SWRConfig } from "swr";
import Sidebar from "@/components/sidebar";
import GlobalSearch from "@/components/global-search";
import ShortcutsModal from "@/components/shortcuts-modal";
import { ToastProvider } from "@/components/toast";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SWRConfig value={{ errorRetryCount: 3, onError: (error: Error) => console.error("SWR Error:", error) }}>
        <ToastProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 flex flex-col min-h-screen">{children}</main>
          </div>
          <GlobalSearch />
          <ShortcutsModal />
        </ToastProvider>
      </SWRConfig>
    </SessionProvider>
  );
}
