"use client";
import { useSession } from "next-auth/react";

export function useRole() {
  const { data: session } = useSession();
  const role = ((session?.user as Record<string, unknown>)?.role as string) || "member";
  const email = session?.user?.email;
  const isAdmin = role === "admin" || email === "admin@sleeplay.com";
  return {
    role,
    isAdmin,
    isManager: role === "manager",
    canEdit: isAdmin || role === "manager",
  };
}
