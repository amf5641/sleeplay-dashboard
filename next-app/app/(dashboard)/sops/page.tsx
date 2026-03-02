"use client";
import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import Topbar from "@/components/topbar";
import Modal from "@/components/modal";
import EmptyState from "@/components/empty-state";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Category { id: string; name: string; parentId: string | null; children?: Category[] }
interface Sop { id: string; title: string; categoryId: string | null; category?: Category; updatedAt: string }

export default function SopsPage() {
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const catParam = selectedCat ? `&categoryId=${selectedCat}` : "";
  const { data: sops = [], mutate } = useSWR<Sop[]>(`/api/sops?search=${encodeURIComponent(search)}${catParam}`, fetcher);
  const { data: categories = [] } = useSWR<Category[]>("/api/categories", fetcher);

  const createSop = async () => {
    const res = await fetch("/api/sops", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle || "Untitled SOP", categoryId: selectedCat }),
    });
    if (res.ok) {
      setModalOpen(false);
      setNewTitle("");
      mutate();
    }
  };

  const topLevelCats = categories.filter((c) => !c.parentId);

  function renderCatTree(cats: Category[], depth = 0) {
    return cats.map((cat) => {
      const children = categories.filter((c) => c.parentId === cat.id);
      return (
        <div key={cat.id}>
          <button
            onClick={() => setSelectedCat(selectedCat === cat.id ? null : cat.id)}
            className={`w-full text-left px-3 py-1.5 text-sm rounded transition-colors ${
              selectedCat === cat.id ? "bg-lavender text-midnight-blue font-medium" : "text-brand-gray hover:bg-white-smoke"
            }`}
            style={{ paddingLeft: `${12 + depth * 16}px` }}
          >
            {cat.name}
          </button>
          {children.length > 0 && renderCatTree(children, depth + 1)}
        </div>
      );
    });
  }

  return (
    <>
      <Topbar
        title="SOPs"
        count={sops.length}
        searchValue={search}
        onSearch={setSearch}
        searchPlaceholder="Search SOPs..."
        actions={
          <button onClick={() => setModalOpen(true)} className="px-4 py-1.5 bg-royal-purple text-white text-sm rounded hover:bg-midnight-blue transition-colors">
            + New SOP
          </button>
        }
      />
      <div className="flex flex-1">
        <div className="w-52 bg-white border-r border-platinum p-3 overflow-y-auto">
          <button
            onClick={() => setSelectedCat(null)}
            className={`w-full text-left px-3 py-1.5 text-sm rounded mb-1 ${!selectedCat ? "bg-lavender text-midnight-blue font-medium" : "text-brand-gray hover:bg-white-smoke"}`}
          >
            All SOPs
          </button>
          {renderCatTree(topLevelCats)}
        </div>
        <div className="flex-1 p-6">
          {sops.length === 0 ? (
            <EmptyState title="No SOPs yet" description="Create your first SOP to get started." />
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
              {sops.map((sop) => (
                <Link
                  key={sop.id}
                  href={`/sops/${sop.id}`}
                  className="bg-white rounded-lg p-5 shadow-[0_4px_34px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_34px_rgba(0,0,0,0.08)] transition-shadow border border-platinum/50"
                >
                  <h3 className="font-semibold font-heading text-brand-black mb-1 truncate">{sop.title}</h3>
                  {sop.category && (
                    <span className="inline-block text-xs bg-lavender text-midnight-blue px-2 py-0.5 rounded-full mb-2">{sop.category.name}</span>
                  )}
                  <p className="text-xs text-brand-gray">Updated {new Date(sop.updatedAt).toLocaleDateString()}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New SOP">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="SOP title..."
          className="w-full px-3 py-2 border border-platinum rounded text-sm mb-4 focus:outline-none focus:border-royal-purple"
          autoFocus
        />
        <div className="flex justify-end gap-3">
          <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm rounded bg-platinum hover:bg-lavender">Cancel</button>
          <button onClick={createSop} className="px-4 py-2 text-sm rounded bg-royal-purple text-white hover:bg-midnight-blue">Create</button>
        </div>
      </Modal>
    </>
  );
}
