"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import Topbar from "@/components/topbar";
import LoomEmbed from "@/components/loom-embed";
import ConfirmDialog from "@/components/confirm-dialog";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Sop {
  id: string; title: string; purpose: string; steps: string;
  rolesResponsibilities: string; decisionPoints: string; toolsSystems: string;
  loomVideoUrl: string; categoryId: string | null;
}

interface Category { id: string; name: string; parentId: string | null }

const fields = [
  { key: "purpose", label: "Purpose" },
  { key: "steps", label: "Step-by-Step Instructions" },
  { key: "rolesResponsibilities", label: "Roles & Responsibilities" },
  { key: "decisionPoints", label: "Decision Points" },
  { key: "toolsSystems", label: "Tools & Systems" },
] as const;

export default function SopDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: sop, mutate } = useSWR<Sop>(`/api/sops/${id}`, fetcher);
  const { data: categories = [] } = useSWR<Category[]>("/api/categories", fetcher);
  const [form, setForm] = useState<Partial<Sop>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => { if (sop) setForm(sop); }, [sop]);

  const save = useCallback(async (updates: Partial<Sop>) => {
    setSaving(true);
    const payload = { ...updates };
    if (payload.categoryId === "") payload.categoryId = null;
    await fetch(`/api/sops/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setTimeout(() => setSaving(false), 500);
  }, [id]);

  const timerRef = useCallback(() => {
    let timer: ReturnType<typeof setTimeout>;
    return (updates: Partial<Sop>) => {
      clearTimeout(timer);
      timer = setTimeout(() => save(updates), 400);
    };
  }, [save])();

  const update = (key: string, value: string) => {
    const next = { ...form, [key]: value };
    setForm(next);
    timerRef(next);
  };

  const exitEdit = () => {
    setEditing(false);
    mutate();
  };

  const deleteSop = async () => {
    await fetch(`/api/sops/${id}`, { method: "DELETE" });
    router.push("/sops");
  };

  if (!sop) return <div className="p-8 text-brand-gray">Loading...</div>;

  const sopRecord = sop as unknown as Record<string, string>;
  const hasContent = fields.some((f) => sopRecord[f.key]?.trim());

  // ── READ MODE ──
  if (!editing) {
    return (
      <>
        <Topbar
          title=""
          actions={
            <div className="flex items-center gap-3">
              <button
                onClick={() => setEditing(true)}
                className="px-4 py-1.5 text-sm rounded bg-royal-purple text-white hover:bg-midnight-blue flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                Edit
              </button>
              <button onClick={() => router.push("/sops")} className="px-3 py-1.5 text-sm rounded bg-platinum hover:bg-lavender">Back</button>
            </div>
          }
        />
        <div className="flex-1 overflow-y-auto p-8 max-w-3xl">
          <h1 className="text-3xl font-bold font-heading text-brand-black mb-2">{sop.title || "Untitled SOP"}</h1>
          {sop.categoryId && (() => {
            const cat = categories.find((c) => c.id === sop.categoryId);
            if (!cat) return null;
            const parent = cat.parentId ? categories.find((c) => c.id === cat.parentId) : null;
            return (
              <p className="text-sm text-brand-gray mb-8">
                {parent ? `${parent.name} / ${cat.name}` : cat.name}
              </p>
            );
          })()}
          {!sop.categoryId && <div className="mb-8" />}

          {!hasContent && (
            <div className="text-center py-16 text-brand-gray">
              <p className="text-lg mb-3">This SOP has no content yet.</p>
              <button
                onClick={() => setEditing(true)}
                className="px-4 py-2 text-sm rounded bg-royal-purple text-white hover:bg-midnight-blue"
              >
                Start writing
              </button>
            </div>
          )}

          {fields.map((f) => {
            const value = sopRecord[f.key];
            if (!value?.trim()) return null;
            return (
              <div key={f.key} className="mb-8">
                <h2 className="text-lg font-semibold font-heading text-midnight-blue mb-3 pb-1 border-b border-platinum">{f.label}</h2>
                <div className="text-sm text-brand-black leading-relaxed whitespace-pre-wrap">{value}</div>
              </div>
            );
          })}

          {sop.loomVideoUrl && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold font-heading text-midnight-blue mb-3 pb-1 border-b border-platinum">Video</h2>
              <LoomEmbed url={sop.loomVideoUrl} />
            </div>
          )}
        </div>
      </>
    );
  }

  // ── EDIT MODE ──
  return (
    <>
      <Topbar
        title=""
        actions={
          <div className="flex items-center gap-3">
            {saving && <span className="text-xs text-brand-gray">Saving...</span>}
            <button
              onClick={exitEdit}
              className="px-4 py-1.5 text-sm rounded bg-royal-purple text-white hover:bg-midnight-blue"
            >
              Done
            </button>
            <button onClick={() => router.push("/sops")} className="px-3 py-1.5 text-sm rounded bg-platinum hover:bg-lavender">Back</button>
            <button onClick={() => setConfirmDelete(true)} className="px-3 py-1.5 text-sm rounded bg-red-500 text-white hover:bg-red-600">Delete</button>
          </div>
        }
      />
      <div className="flex-1 overflow-y-auto p-8 max-w-3xl">
        <input
          type="text"
          value={form.title || ""}
          onChange={(e) => update("title", e.target.value)}
          className="w-full text-2xl font-bold font-heading bg-transparent border-none outline-none mb-4 text-brand-black"
          placeholder="SOP Title"
        />

        <div className="mb-6">
          <label className="block text-sm font-medium text-brand-gray mb-2">Category</label>
          <select
            value={form.categoryId || ""}
            onChange={(e) => update("categoryId", e.target.value || "")}
            className="w-full px-3 py-2 border border-platinum rounded text-sm focus:outline-none focus:border-royal-purple bg-white"
          >
            <option value="">No category</option>
            {categories.filter((c) => !c.parentId).map((parent) => {
              const children = categories.filter((c) => c.parentId === parent.id);
              return [
                <option key={parent.id} value={parent.id}>{parent.name}</option>,
                ...children.map((child) => (
                  <option key={child.id} value={child.id}>&nbsp;&nbsp;&nbsp;{child.name}</option>
                )),
              ];
            })}
          </select>
        </div>

        {fields.map((f) => (
          <div key={f.key} className="mb-6">
            <label className="block text-sm font-medium text-brand-gray mb-2">{f.label}</label>
            <textarea
              value={(form as Record<string, string>)[f.key] || ""}
              onChange={(e) => update(f.key, e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-platinum rounded text-sm focus:outline-none focus:border-royal-purple resize-y bg-white"
            />
          </div>
        ))}

        <div className="mb-6">
          <label className="block text-sm font-medium text-brand-gray mb-2">Loom Video URL</label>
          <input
            type="url"
            value={form.loomVideoUrl || ""}
            onChange={(e) => update("loomVideoUrl", e.target.value)}
            placeholder="https://www.loom.com/share/..."
            className="w-full px-3 py-2 border border-platinum rounded text-sm focus:outline-none focus:border-royal-purple bg-white mb-3"
          />
          {form.loomVideoUrl && <LoomEmbed url={form.loomVideoUrl} />}
        </div>
      </div>
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={deleteSop}
        title="Delete SOP"
        message="Are you sure you want to delete this SOP? This cannot be undone."
      />
    </>
  );
}
