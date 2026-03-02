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
  const { data: sop } = useSWR<Sop>(`/api/sops/${id}`, fetcher);
  const [form, setForm] = useState<Partial<Sop>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (sop) setForm(sop); }, [sop]);

  const save = useCallback(async (updates: Partial<Sop>) => {
    setSaving(true);
    await fetch(`/api/sops/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
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

  const deleteSop = async () => {
    await fetch(`/api/sops/${id}`, { method: "DELETE" });
    router.push("/sops");
  };

  if (!sop) return <div className="p-8 text-brand-gray">Loading...</div>;

  return (
    <>
      <Topbar
        title=""
        actions={
          <div className="flex items-center gap-3">
            {saving && <span className="text-xs text-brand-gray">Saving...</span>}
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
          className="w-full text-2xl font-bold font-heading bg-transparent border-none outline-none mb-6 text-brand-black"
          placeholder="SOP Title"
        />

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
