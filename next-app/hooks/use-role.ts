"use client";
import { useSession } from "next-auth/react";

export function useRole() {
  const { data: session } = useSession();
  const role = ((session?.user as Record<string, unknown>)?.role as string) || "member";
  return {
    role,
    isAdmin: role === "admin",
    isManager: role === "manager",
    canEdit: role === "admin" || role === "manager",
  };
}
