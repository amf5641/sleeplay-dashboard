"use client";
import { useState } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import Topbar from "@/components/topbar";
import Modal from "@/components/modal";
import ConfirmDialog from "@/components/confirm-dialog";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const ROLES = ["admin", "manager", "member"] as const;
const roleColors: Record<string, string> = {
  admin: "bg-red-100 text-red-700",
  manager: "bg-amber-100 text-amber-700",
  member: "bg-blue-100 text-blue-700",
};

interface User { id: string; email: string; role: string; createdAt: string }

export default function SettingsPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as Record<string, unknown>)?.role as string | undefined;
  const isAdmin = userRole === "admin";
  const { data: users = [], mutate } = useSWR<User[]>("/api/users", fetcher);
  const [addModal, setAddModal] = useState(false);
  const [inviteModal, setInviteModal] = useState(false);
  const [addForm, setAddForm] = useState({ email: "", password: "" });
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteResult, setInviteResult] = useState<{ email: string; tempPassword: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [resetModal, setResetModal] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);
  const [error, setError] = useState("");

  const addUser = async () => {
    setError("");
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addForm),
    });
    if (res.ok) {
      setAddModal(false);
      setAddForm({ email: "", password: "" });
      mutate();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to add user");
    }
  };

  const inviteUser = async () => {
    setError("");
    const res = await fetch("/api/users/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail }),
    });
    if (res.ok) {
      const data = await res.json();
      setInviteResult(data);
      setInviteEmail("");
      mutate();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to invite user");
    }
  };

  const removeUser = async (id: string) => {
    await fetch(`/api/users/${id}`, { method: "DELETE" });
    mutate();
  };

  const updateRole = async (id: string, role: string) => {
    await fetch(`/api/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    mutate();
  };

  const doResetPassword = async () => {
    if (!resetModal || !resetPassword) return;
    setError("");
    const res = await fetch("/api/users/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: resetModal, password: resetPassword }),
    });
    if (res.ok) {
      setResetSuccess(true);
    } else {
      const data = await res.json();
      setError(data.error || "Failed to reset password");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <>
      <Topbar
        title="Settings"
        actions={
          isAdmin ? (
            <div className="flex gap-2">
              <button onClick={() => { setAddModal(true); setError(""); }} className="px-4 py-1.5 bg-royal-purple text-white text-sm rounded hover:bg-midnight-blue">+ Add User</button>
              <button onClick={() => { setInviteModal(true); setError(""); setInviteResult(null); }} className="px-4 py-1.5 bg-white text-royal-purple text-sm rounded border border-royal-purple hover:bg-lavender">Invite User</button>
            </div>
          ) : undefined
        }
      />
      <div className="p-6">
        <div className="bg-white rounded-lg border border-platinum/50 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-brand-gray border-b border-platinum bg-white-smoke">
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3 w-36">Role</th>
                <th className="px-4 py-3">Joined</th>
                {isAdmin && <th className="px-4 py-3 w-36"></th>}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-platinum/50 last:border-b-0">
                  <td className="px-4 py-3 text-sm">{u.email}</td>
                  <td className="px-4 py-3">
                    {isAdmin ? (
                      <select
                        value={u.role || "member"}
                        onChange={(e) => updateRole(u.id, e.target.value)}
                        className={`px-2 py-1 text-xs font-medium rounded border-0 cursor-pointer capitalize ${roleColors[u.role] || roleColors.member}`}
                      >
                        {ROLES.map((r) => <option key={r} value={r} className="capitalize">{r}</option>)}
                      </select>
                    ) : (
                      <span className={`px-2 py-1 text-xs font-medium rounded capitalize ${roleColors[u.role] || roleColors.member}`}>
                        {u.role || "member"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-brand-gray">{new Date(u.createdAt).toLocaleDateString()}</td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <button onClick={() => { setResetModal(u.email); setResetPassword(""); setResetSuccess(false); setError(""); }} className="text-xs text-royal-purple hover:text-midnight-blue">Reset pw</button>
                        <button onClick={() => setConfirmDelete(u.id)} className="text-xs text-red-400 hover:text-red-600">Remove</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={addModal} onClose={() => setAddModal(false)} title="Add User">
        <div className="space-y-3">
          <input value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} placeholder="Email" type="email" className="w-full px-3 py-2 border border-platinum rounded text-sm focus:outline-none focus:border-royal-purple" />
          <input value={addForm.password} onChange={(e) => setAddForm({ ...addForm, password: e.target.value })} placeholder="Password" type="password" className="w-full px-3 py-2 border border-platinum rounded text-sm focus:outline-none focus:border-royal-purple" />
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={() => setAddModal(false)} className="px-4 py-2 text-sm rounded bg-platinum hover:bg-lavender">Cancel</button>
          <button onClick={addUser} className="px-4 py-2 text-sm rounded bg-royal-purple text-white hover:bg-midnight-blue">Add</button>
        </div>
      </Modal>

      <Modal open={inviteModal} onClose={() => setInviteModal(false)} title="Invite User">
        {inviteResult ? (
          <div>
            <p className="text-sm mb-2">User invited! Share these credentials:</p>
            <div className="bg-white-smoke rounded p-3 text-sm font-mono mb-3">
              <div>Email: {inviteResult.email}</div>
              <div>Password: {inviteResult.tempPassword}</div>
            </div>
            <button onClick={() => copyToClipboard(`Email: ${inviteResult.email}\nPassword: ${inviteResult.tempPassword}`)} className="px-4 py-2 text-sm rounded bg-royal-purple text-white hover:bg-midnight-blue">
              Copy to Clipboard
            </button>
          </div>
        ) : (
          <>
            <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="Email to invite" type="email" className="w-full px-3 py-2 border border-platinum rounded text-sm focus:outline-none focus:border-royal-purple" />
            {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setInviteModal(false)} className="px-4 py-2 text-sm rounded bg-platinum hover:bg-lavender">Cancel</button>
              <button onClick={inviteUser} className="px-4 py-2 text-sm rounded bg-royal-purple text-white hover:bg-midnight-blue">Send Invite</button>
            </div>
          </>
        )}
      </Modal>

      <ConfirmDialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} onConfirm={() => confirmDelete && removeUser(confirmDelete)} title="Remove User" message="Remove this user from the system?" />

      <Modal open={!!resetModal} onClose={() => setResetModal(null)} title="Reset Password">
        {resetSuccess ? (
          <div>
            <p className="text-sm text-emerald-600 mb-3">Password reset successfully for {resetModal}.</p>
            <div className="bg-white-smoke rounded p-3 text-sm font-mono mb-3">
              <div>Email: {resetModal}</div>
              <div>New password: {resetPassword}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => copyToClipboard(`Email: ${resetModal}\nPassword: ${resetPassword}`)} className="px-4 py-2 text-sm rounded bg-royal-purple text-white hover:bg-midnight-blue">Copy to Clipboard</button>
              <button onClick={() => setResetModal(null)} className="px-4 py-2 text-sm rounded bg-platinum hover:bg-lavender">Done</button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-brand-gray mb-3">Set a new password for <span className="font-medium text-brand-black">{resetModal}</span></p>
            <input value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} placeholder="New password" type="text" className="w-full px-3 py-2 border border-platinum rounded text-sm focus:outline-none focus:border-royal-purple" autoFocus />
            <p className="text-[11px] text-brand-gray mt-1.5">Min 8 chars, must include uppercase, lowercase, and a number</p>
            {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setResetModal(null)} className="px-4 py-2 text-sm rounded bg-platinum hover:bg-lavender">Cancel</button>
              <button onClick={doResetPassword} disabled={!resetPassword} className="px-4 py-2 text-sm rounded bg-royal-purple text-white hover:bg-midnight-blue disabled:opacity-50">Reset Password</button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
