"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import Topbar from "@/components/topbar";
import ConfirmDialog from "@/components/confirm-dialog";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface ContentDoc { id: string; title: string; content: string; categoryId: string }

export default function ContentDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: doc } = useSWR<ContentDoc>(`/api/content/${id}`, fetcher);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (doc) { setTitle(doc.title); setContent(doc.content); }
  }, [doc]);

  const save = useCallback(async (t: string, c: string) => {
    setSaving(true);
    await fetch(`/api/content/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: t, content: c }),
    });
    setTimeout(() => setSaving(false), 500);
  }, [id]);

  const timerRef = useCallback(() => {
    let timer: ReturnType<typeof setTimeout>;
    return (t: string, c: string) => {
      clearTimeout(timer);
      timer = setTimeout(() => save(t, c), 400);
    };
  }, [save])();

  const deleteDoc = async () => {
    await fetch(`/api/content/${id}`, { method: "DELETE" });
    router.push("/content");
  };

  if (!doc) return <div className="p-8 text-brand-gray">Loading...</div>;

  return (
    <>
      <Topbar
        title=""
        actions={
          <div className="flex items-center gap-3">
            {saving && <span className="text-xs text-brand-gray">Saving...</span>}
            <button onClick={() => router.push("/content")} className="px-3 py-1.5 text-sm rounded bg-platinum hover:bg-lavender">Back</button>
            <button onClick={() => setConfirmDelete(true)} className="px-3 py-1.5 text-sm rounded bg-red-500 text-white hover:bg-red-600">Delete</button>
          </div>
        }
      />
      <div className="flex-1 overflow-y-auto p-8 max-w-3xl">
        <input
          type="text"
          value={title}
          onChange={(e) => { setTitle(e.target.value); timerRef(e.target.value, content); }}
          className="w-full text-2xl font-bold font-heading bg-transparent border-none outline-none mb-6"
          placeholder="Document Title"
        />
        <textarea
          value={content}
          onChange={(e) => { setContent(e.target.value); timerRef(title, e.target.value); }}
          rows={20}
          className="w-full px-3 py-2 border border-platinum rounded text-sm focus:outline-none focus:border-royal-purple resize-y bg-white"
          placeholder="Write your content here..."
        />
      </div>
      <ConfirmDialog open={confirmDelete} onClose={() => setConfirmDelete(false)} onConfirm={deleteDoc} title="Delete Document" message="Delete this document? This cannot be undone." />
    </>
  );
}
