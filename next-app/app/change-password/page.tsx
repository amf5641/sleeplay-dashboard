"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function ChangePasswordPage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const mustChange = !!(session?.user as Record<string, unknown>)?.mustChangePassword;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/users/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    setLoading(false);

    if (res.ok) {
      // Update session to clear mustChangePassword flag
      await update();
      router.push("/");
    } else {
      const data = await res.json();
      setError(data.error || "Failed to change password.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ultra-violet">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 flex justify-center">
          <Image src="/sleeplay-logo.svg" alt="Sleeplay" width={160} height={48} priority />
        </div>

        <h1 className="mb-2 text-center font-heading text-2xl font-bold text-ultra-violet">
          Change Your Password
        </h1>

        {mustChange && (
          <p className="mb-4 text-center text-sm text-brand-gray">
            You must set a new password before continuing.
          </p>
        )}

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="current" className="mb-1 block text-sm font-medium text-brand-black">
              Current Password
            </label>
            <input
              id="current"
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-lg border border-platinum px-4 py-2.5 text-sm text-brand-black outline-none transition focus:border-royal-purple focus:ring-2 focus:ring-royal-purple/20"
            />
          </div>

          <div>
            <label htmlFor="new" className="mb-1 block text-sm font-medium text-brand-black">
              New Password
            </label>
            <input
              id="new"
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-lg border border-platinum px-4 py-2.5 text-sm text-brand-black outline-none transition focus:border-royal-purple focus:ring-2 focus:ring-royal-purple/20"
            />
            <p className="mt-1 text-[11px] text-brand-gray">Min 8 chars, uppercase, lowercase, and a number</p>
          </div>

          <div>
            <label htmlFor="confirm" className="mb-1 block text-sm font-medium text-brand-black">
              Confirm New Password
            </label>
            <input
              id="confirm"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-platinum px-4 py-2.5 text-sm text-brand-black outline-none transition focus:border-royal-purple focus:ring-2 focus:ring-royal-purple/20"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-midnight-blue px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-royal-purple disabled:opacity-50"
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
