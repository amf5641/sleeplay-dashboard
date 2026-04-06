"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import Topbar from "@/components/topbar";
import ConfirmDialog from "@/components/confirm-dialog";
import { useRole } from "@/hooks/use-role";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface ContentDoc { id: string; title: string; content: string; categoryId: string | null }
interface Category { id: string; name: string; parentId: string | null }

export default function ContentDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { canEdit } = useRole();
  const { data: doc, mutate } = useSWR<ContentDoc>(`/api/content/${id}`, fetcher);
  const { data: categories = [] } = useSWR<Category[]>("/api/content-categories", fetcher);
  const [form, setForm] = useState<Partial<ContentDoc>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => { if (doc) setForm(doc); }, [doc]);

  const save = useCallback(async (updates: Partial<ContentDoc>) => {
    setSaving(true);
    const payload = { ...updates };
    if (payload.categoryId === "") payload.categoryId = null;
    await fetch(`/api/content/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setTimeout(() => setSaving(false), 500);
  }, [id]);

  const timerRef = useCallback(() => {
    let timer: ReturnType<typeof setTimeout>;
    return (updates: Partial<ContentDoc>) => {
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

  const deleteDoc = async () => {
    await fetch(`/api/content/${id}`, { method: "DELETE" });
    router.push("/content");
  };

  if (!doc) return <div className="p-8 text-brand-gray">Loading...</div>;

  // ── READ MODE ──
  if (!editing) {
    return (
      <>
        <Topbar
          title=""
          actions={
            <div className="flex items-center gap-3">
              {canEdit && (
                <button
                  onClick={() => setEditing(true)}
                  className="px-4 py-1.5 text-sm rounded bg-royal-purple text-white hover:bg-midnight-blue flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  Edit
                </button>
              )}
              <button onClick={() => router.push("/content")} className="px-3 py-1.5 text-sm rounded bg-platinum hover:bg-lavender">Back</button>
            </div>
          }
        />
        <div className="flex-1 overflow-y-auto p-8 max-w-3xl">
          <h1 className="text-3xl font-bold font-heading text-brand-black mb-2">{doc.title || "Untitled"}</h1>
          {doc.categoryId && (() => {
            const cat = categories.find((c) => c.id === doc.categoryId);
            if (!cat) return null;
            const parent = cat.parentId ? categories.find((c) => c.id === cat.parentId) : null;
            return (
              <p className="text-sm text-brand-gray mb-8">
                {parent ? `${parent.name} / ${cat.name}` : cat.name}
              </p>
            );
          })()}
          {!doc.categoryId && <div className="mb-8" />}

          {!doc.content?.trim() ? (
            <div className="text-center py-16 text-brand-gray">
              <p className="text-lg mb-3">This document has no content yet.</p>
              {canEdit && (
                <button
                  onClick={() => setEditing(true)}
                  className="px-4 py-2 text-sm rounded bg-royal-purple text-white hover:bg-midnight-blue"
                >
                  Start writing
                </button>
              )}
            </div>
          ) : (
            <div className="text-sm text-brand-black leading-relaxed whitespace-pre-wrap">{doc.content}</div>
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
            <button onClick={() => router.push("/content")} className="px-3 py-1.5 text-sm rounded bg-platinum hover:bg-lavender">Back</button>
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
          placeholder="Document Title"
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

        <div className="mb-6">
          <label className="block text-sm font-medium text-brand-gray mb-2">Content</label>
          <textarea
            value={form.content || ""}
            onChange={(e) => update("content", e.target.value)}
            rows={20}
            className="w-full px-3 py-2 border border-platinum rounded text-sm focus:outline-none focus:border-royal-purple resize-y bg-white"
            placeholder="Write your content here..."
          />
        </div>
      </div>
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={deleteDoc}
        title="Delete Document"
        message="Are you sure you want to delete this document? This cannot be undone."
      />
    </>
  );
}
