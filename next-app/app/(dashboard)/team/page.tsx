"use client";
import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import Topbar from "@/components/topbar";
import Modal from "@/components/modal";
import { fetcher, apiFetch } from "@/lib/utils";
import { useToast } from "@/components/toast";
import { useRole } from "@/hooks/use-role";

interface Person { id: string; name: string; title: string; location: string; photo: string | null }

export default function TeamPage() {
  const { isAdmin } = useRole();
  const { toast } = useToast();
  const { data: people = [], mutate } = useSWR<Person[]>("/api/people", fetcher);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", title: "", location: "", email: "", managerId: "" });
  const [saving, setSaving] = useState(false);

  const createPerson = async () => {
    if (!form.name) return;
    setSaving(true);
    const { error } = await apiFetch("/api/people", {
      method: "POST",
      body: JSON.stringify({ ...form, managerId: form.managerId || null }),
    });
    setSaving(false);
    if (error) { toast(error, "error"); return; }
    toast("Team member added", "success");
    setModalOpen(false);
    setForm({ name: "", title: "", location: "", email: "", managerId: "" });
    mutate();
  };

  return (
    <>
      <Topbar
        title="Meet the Team"
        count={people.length}
        actions={
          isAdmin ? (
            <button
              onClick={() => setModalOpen(true)}
              className="px-4 py-1.5 bg-royal-purple text-white text-sm rounded hover:bg-midnight-blue transition-colors"
            >
              + Add Member
            </button>
          ) : undefined
        }
      />
      <div className="p-6">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
          {people.map((p) => (
            <Link
              key={p.id}
              href={`/team/${p.id}`}
              className="bg-white rounded-lg p-5 text-center shadow-[0_4px_34px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_34px_rgba(0,0,0,0.08)] transition-shadow border border-platinum/50"
            >
              {p.photo ? (
                <img src={p.photo} alt="" className="w-16 h-16 rounded-full mx-auto mb-3 object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-full mx-auto mb-3 bg-lavender flex items-center justify-center text-midnight-blue font-bold text-xl">
                  {p.name.charAt(0)}
                </div>
              )}
              <h3 className="font-semibold font-heading text-sm">{p.name}</h3>
              <p className="text-xs text-brand-gray">{p.title}</p>
              {p.location && <p className="text-xs text-brand-gray mt-0.5">{p.location}</p>}
            </Link>
          ))}
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Team Member">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-brand-gray mb-1">Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Full name"
              className="w-full px-3 py-2 border border-platinum rounded text-sm focus:outline-none focus:border-royal-purple"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-brand-gray mb-1">Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Job title"
              className="w-full px-3 py-2 border border-platinum rounded text-sm focus:outline-none focus:border-royal-purple"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-brand-gray mb-1">Location</label>
            <input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="City, Country"
              className="w-full px-3 py-2 border border-platinum rounded text-sm focus:outline-none focus:border-royal-purple"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-brand-gray mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="name@sleeplay.com"
              className="w-full px-3 py-2 border border-platinum rounded text-sm focus:outline-none focus:border-royal-purple"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-brand-gray mb-1">Reports to</label>
            <select
              value={form.managerId}
              onChange={(e) => setForm({ ...form, managerId: e.target.value })}
              className="w-full px-3 py-2 border border-platinum rounded text-sm focus:outline-none focus:border-royal-purple bg-white"
            >
              <option value="">None (top-level)</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm rounded bg-platinum hover:bg-lavender">Cancel</button>
          <button
            onClick={createPerson}
            disabled={saving || !form.name}
            className="px-4 py-2 text-sm rounded bg-royal-purple text-white hover:bg-midnight-blue disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Adding..." : "Add"}
          </button>
        </div>
      </Modal>
    </>
  );
}
