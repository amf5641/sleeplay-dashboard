"use client";
import { useState } from "react";
import useSWR from "swr";
import Topbar from "@/components/topbar";
import Modal from "@/components/modal";
import ConfirmDialog from "@/components/confirm-dialog";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface User { id: string; email: string; createdAt: string }

export default function SettingsPage() {
  const { data: users = [], mutate } = useSWR<User[]>("/api/users", fetcher);
  const [addModal, setAddModal] = useState(false);
  const [inviteModal, setInviteModal] = useState(false);
  const [addForm, setAddForm] = useState({ email: "", password: "" });
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteResult, setInviteResult] = useState<{ email: string; tempPassword: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <>
      <Topbar
        title="Settings"
        actions={
          <div className="flex gap-2">
            <button onClick={() => { setAddModal(true); setError(""); }} className="px-4 py-1.5 bg-royal-purple text-white text-sm rounded hover:bg-midnight-blue">+ Add User</button>
            <button onClick={() => { setInviteModal(true); setError(""); setInviteResult(null); }} className="px-4 py-1.5 bg-white text-royal-purple text-sm rounded border border-royal-purple hover:bg-lavender">Invite User</button>
          </div>
        }
      />
      <div className="p-6">
        <div className="bg-white rounded-lg border border-platinum/50 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-brand-gray border-b border-platinum bg-white-smoke">
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-platinum/50 last:border-b-0">
                  <td className="px-4 py-3 text-sm">{user.email}</td>
                  <td className="px-4 py-3 text-sm text-brand-gray">{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => setConfirmDelete(user.id)} className="text-xs text-red-400 hover:text-red-600">Remove</button>
                  </td>
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
    </>
  );
}
