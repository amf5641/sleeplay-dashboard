"use client";
import { useState } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import Topbar from "@/components/topbar";
import Modal from "@/components/modal";
import ConfirmDialog from "@/components/confirm-dialog";
import { useToast } from "@/components/toast";
import { useDarkMode } from "@/hooks/use-dark-mode";
import { fetcher, apiFetch } from "@/lib/utils";

const ROLES = ["admin", "manager", "member"] as const;
const roleColors: Record<string, string> = {
  admin: "bg-red-100 text-red-700",
  manager: "bg-amber-100 text-amber-700",
  member: "bg-blue-100 text-blue-700",
};

interface User { id: string; email: string; role: string; createdAt: string }

export default function SettingsPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
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
  // 2FA state
  const [totpSetup, setTotpSetup] = useState(false);
  const [totpQr, setTotpQr] = useState("");
  const [totpSecretDisplay, setTotpSecretDisplay] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [totpRecoveryCodes, setTotpRecoveryCodes] = useState<string[]>([]);
  const [totpDisablePassword, setTotpDisablePassword] = useState("");
  const [totpDisableModal, setTotpDisableModal] = useState(false);
  const { data: totpStatus, mutate: mutateTotpStatus } = useSWR<{ enabled: boolean }>("/api/users/totp/status", fetcher);
  const { theme, setTheme } = useDarkMode();

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
    const { error: err } = await apiFetch(`/api/users/${id}`, { method: "DELETE" });
    if (err) { toast(err, "error"); return; }
    mutate();
    toast("User removed", "success");
  };

  const updateRole = async (id: string, role: string) => {
    const { error: err } = await apiFetch(`/api/users/${id}`, { method: "PUT", body: JSON.stringify({ role }) });
    if (err) { toast(err, "error"); return; }
    mutate();
    toast("Role updated", "success");
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
    toast("Copied to clipboard", "success");
  };

  const startTotpSetup = async () => {
    setError("");
    const res = await fetch("/api/users/totp");
    if (res.ok) {
      const data = await res.json();
      setTotpQr(data.qrCode);
      setTotpSecretDisplay(data.secret);
      setTotpSetup(true);
      setTotpCode("");
      setTotpRecoveryCodes([]);
    } else {
      const data = await res.json();
      setError(data.error || "Failed to start 2FA setup");
    }
  };

  const verifyTotpSetup = async () => {
    setError("");
    const res = await fetch("/api/users/totp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: totpCode }),
    });
    if (res.ok) {
      const data = await res.json();
      setTotpRecoveryCodes(data.recoveryCodes);
      mutateTotpStatus();
    } else {
      const data = await res.json();
      setError(data.error || "Invalid code");
    }
  };

  const disableTotp = async () => {
    setError("");
    const res = await fetch("/api/users/totp", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: totpDisablePassword }),
    });
    if (res.ok) {
      setTotpDisableModal(false);
      setTotpDisablePassword("");
      mutateTotpStatus();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to disable 2FA");
    }
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

      {/* Security Section */}
      <div className="px-6 pb-6">
        <h2 className="text-sm font-semibold font-heading text-brand-black mb-3">Security</h2>
        <div className="bg-white rounded-lg border border-platinum/50 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-brand-black">Two-Factor Authentication (2FA)</p>
              <p className="text-xs text-brand-gray mt-0.5">
                {totpStatus?.enabled
                  ? "Enabled — your account is protected with an authenticator app"
                  : "Add an extra layer of security with an authenticator app"}
              </p>
            </div>
            {totpStatus?.enabled ? (
              <button onClick={() => { setTotpDisableModal(true); setTotpDisablePassword(""); setError(""); }} className="px-4 py-1.5 text-sm rounded border border-red-300 text-red-600 hover:bg-red-50 transition-colors">
                Disable 2FA
              </button>
            ) : (
              <button onClick={startTotpSetup} className="px-4 py-1.5 text-sm rounded bg-royal-purple text-white hover:bg-midnight-blue transition-colors">
                Enable 2FA
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Appearance Section */}
      <div className="px-6 pb-6">
        <h2 className="text-sm font-semibold font-heading text-brand-black mb-3">Appearance</h2>
        <div className="bg-white rounded-lg border border-platinum/50 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-brand-black">Theme</p>
              <p className="text-xs text-brand-gray mt-0.5">Choose how the dashboard looks</p>
            </div>
            <div className="flex rounded-lg border border-platinum overflow-hidden">
              {(["light", "dark", "system"] as const).map((option) => (
                <button
                  key={option}
                  onClick={() => setTheme(option)}
                  className={`px-4 py-1.5 text-sm capitalize transition-colors ${
                    theme === option
                      ? "bg-royal-purple text-white"
                      : "bg-white text-brand-gray hover:bg-white-smoke"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 2FA Setup Modal */}
      <Modal open={totpSetup} onClose={() => { setTotpSetup(false); setTotpRecoveryCodes([]); }} title={totpRecoveryCodes.length > 0 ? "Save Recovery Codes" : "Set Up Two-Factor Authentication"}>
        {totpRecoveryCodes.length > 0 ? (
          <div>
            <p className="text-sm text-emerald-600 font-medium mb-2">2FA is now enabled!</p>
            <p className="text-sm text-brand-gray mb-3">Save these recovery codes in a safe place. Each code can only be used once.</p>
            <div className="bg-white-smoke rounded-lg p-4 font-mono text-sm grid grid-cols-2 gap-2 mb-4">
              {totpRecoveryCodes.map((code, i) => (
                <div key={i} className="text-brand-black">{code}</div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => copyToClipboard(totpRecoveryCodes.join("\n"))} className="px-4 py-2 text-sm rounded bg-royal-purple text-white hover:bg-midnight-blue">Copy Codes</button>
              <button onClick={() => { setTotpSetup(false); setTotpRecoveryCodes([]); }} className="px-4 py-2 text-sm rounded bg-platinum hover:bg-lavender">Done</button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-brand-gray">Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)</p>
            {totpQr && (
              <div className="flex justify-center">
                <img src={totpQr} alt="2FA QR Code" className="w-48 h-48" />
              </div>
            )}
            <div>
              <p className="text-[11px] text-brand-gray mb-1">Or enter this key manually:</p>
              <div className="bg-white-smoke rounded px-3 py-2 font-mono text-xs text-brand-black break-all select-all">{totpSecretDisplay}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-brand-black block mb-1">Enter the 6-digit code to verify</label>
              <input
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                maxLength={6}
                inputMode="numeric"
                placeholder="000000"
                className="w-full px-3 py-2 border border-platinum rounded text-center text-lg font-mono tracking-widest focus:outline-none focus:border-royal-purple"
                autoFocus
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex justify-end gap-3">
              <button onClick={() => setTotpSetup(false)} className="px-4 py-2 text-sm rounded bg-platinum hover:bg-lavender">Cancel</button>
              <button onClick={verifyTotpSetup} disabled={totpCode.length !== 6} className="px-4 py-2 text-sm rounded bg-royal-purple text-white hover:bg-midnight-blue disabled:opacity-50">Verify & Enable</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Disable 2FA Modal */}
      <Modal open={totpDisableModal} onClose={() => setTotpDisableModal(false)} title="Disable Two-Factor Authentication">
        <p className="text-sm text-brand-gray mb-3">Enter your password to confirm disabling 2FA.</p>
        <input value={totpDisablePassword} onChange={(e) => setTotpDisablePassword(e.target.value)} type="password" placeholder="Your password" className="w-full px-3 py-2 border border-platinum rounded text-sm focus:outline-none focus:border-royal-purple" autoFocus />
        {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={() => setTotpDisableModal(false)} className="px-4 py-2 text-sm rounded bg-platinum hover:bg-lavender">Cancel</button>
          <button onClick={disableTotp} className="px-4 py-2 text-sm rounded bg-red-500 text-white hover:bg-red-600">Disable 2FA</button>
        </div>
      </Modal>

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
