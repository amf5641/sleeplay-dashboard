"use client";
import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import Topbar from "@/components/topbar";
import Modal from "@/components/modal";
import ConfirmDialog from "@/components/confirm-dialog";
import EmptyState from "@/components/empty-state";
import { useRole } from "@/hooks/use-role";
import { fetcher, apiFetch } from "@/lib/utils";
import { useToast } from "@/components/toast";

interface Category { id: string; name: string; parentId: string | null; children?: Category[] }
interface Sop { id: string; title: string; categoryId: string | null; category?: Category; updatedAt: string }

export default function SopsPage() {
  const { canEdit } = useRole();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [saving, setSaving] = useState(false);

  // Category management state
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [catModalParentId, setCatModalParentId] = useState<string | null>(null);
  const [catName, setCatName] = useState("");
  const [renamingCat, setRenamingCat] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDeleteCat, setConfirmDeleteCat] = useState<Category | null>(null);
  const [confirmDeleteSop, setConfirmDeleteSop] = useState<Sop | null>(null);
  const [dragSopId, setDragSopId] = useState<string | null>(null);
  const [dragOverCat, setDragOverCat] = useState<string | null>(null);

  const catParam = selectedCat ? `&categoryId=${selectedCat}` : "";
  const { data: sops = [], mutate } = useSWR<Sop[]>(`/api/sops?search=${encodeURIComponent(search)}${catParam}`, fetcher);
  const { data: categories = [], mutate: mutateCats } = useSWR<Category[]>("/api/categories", fetcher);

  const createSop = async () => {
    setSaving(true);
    const { error } = await apiFetch("/api/sops", {
      method: "POST",
      body: JSON.stringify({ title: newTitle || "Untitled SOP", categoryId: selectedCat }),
    });
    setSaving(false);
    if (error) { toast(error, "error"); return; }
    toast("SOP created", "success");
    setModalOpen(false);
    setNewTitle("");
    mutate();
  };

  const deleteSop = async (id: string) => {
    const { error } = await apiFetch(`/api/sops/${id}`, { method: "DELETE" });
    if (error) { toast(error, "error"); return; }
    toast("SOP deleted", "success");
    mutate();
  };

  const createCategory = async () => {
    const name = catName.trim();
    if (!name) return;
    const { error } = await apiFetch("/api/categories", {
      method: "POST",
      body: JSON.stringify({ name, parentId: catModalParentId }),
    });
    if (error) { toast(error, "error"); return; }
    toast("Category created", "success");
    setCatModalOpen(false);
    setCatName("");
    setCatModalParentId(null);
    mutateCats();
  };

  const renameCategory = async (id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) { setRenamingCat(null); return; }
    const { error } = await apiFetch(`/api/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name: trimmed }),
    });
    if (error) { toast(error, "error"); return; }
    setRenamingCat(null);
    mutateCats();
  };

  const deleteCategory = async (id: string) => {
    const { error } = await apiFetch(`/api/categories/${id}`, { method: "DELETE" });
    if (error) { toast(error, "error"); return; }
    if (selectedCat === id) setSelectedCat(null);
    setConfirmDeleteCat(null);
    mutateCats();
    mutate();
  };

  const moveSopToCategory = async (sopId: string, categoryId: string | null) => {
    const { error } = await apiFetch(`/api/sops/${sopId}`, {
      method: "PUT",
      body: JSON.stringify({ categoryId }),
    });
    if (error) { toast(error, "error"); return; }
    setDragSopId(null);
    setDragOverCat(null);
    mutate();
  };

  const topLevelCats = categories.filter((c) => !c.parentId);

  function renderCatTree(cats: Category[], depth = 0) {
    return cats.map((cat) => {
      const children = categories.filter((c) => c.parentId === cat.id);
      const isSelected = selectedCat === cat.id;
      return (
        <div key={cat.id}>
          <div className="group flex items-center">
            {renamingCat === cat.id ? (
              <input
                autoFocus
                defaultValue={cat.name}
                onBlur={(e) => renameCategory(cat.id, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") renameCategory(cat.id, (e.target as HTMLInputElement).value);
                  if (e.key === "Escape") setRenamingCat(null);
                }}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 text-sm px-2 py-1 border border-royal-purple rounded focus:outline-none bg-white"
                style={{ marginLeft: `${12 + depth * 16}px` }}
              />
            ) : (
              <button
                onClick={() => setSelectedCat(isSelected ? null : cat.id)}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverCat(cat.id); }}
                onDragLeave={() => { if (dragOverCat === cat.id) setDragOverCat(null); }}
                onDrop={(e) => { e.preventDefault(); if (dragSopId) moveSopToCategory(dragSopId, cat.id); }}
                className={`flex-1 text-left px-3 py-1.5 text-sm rounded transition-colors ${
                  dragOverCat === cat.id ? "bg-royal-purple/20 ring-2 ring-royal-purple" : isSelected ? "bg-lavender text-midnight-blue font-medium" : "text-brand-gray hover:bg-white-smoke"
                }`}
                style={{ paddingLeft: `${12 + depth * 16}px` }}
              >
                {cat.name}
              </button>
            )}
            {canEdit && renamingCat !== cat.id && (
              <div className="flex-shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity pr-1">
                <button
                  onClick={(e) => { e.stopPropagation(); setCatModalParentId(cat.id); setCatName(""); setCatModalOpen(true); }}
                  className="p-0.5 rounded hover:bg-platinum text-brand-gray hover:text-royal-purple"
                  title="Add subcategory"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setRenamingCat(cat.id); setRenameValue(cat.name); }}
                  className="p-0.5 rounded hover:bg-platinum text-brand-gray hover:text-brand-black"
                  title="Rename"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmDeleteCat(cat); }}
                  className="p-0.5 rounded hover:bg-red-50 text-brand-gray hover:text-red-500"
                  title="Delete category"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            )}
          </div>
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
          canEdit ? (
            <button onClick={() => setModalOpen(true)} className="px-4 py-1.5 bg-royal-purple text-white text-sm rounded hover:bg-midnight-blue transition-colors">
              + New SOP
            </button>
          ) : undefined
        }
      />
      <div className="flex flex-1">
        <div className="w-64 bg-white border-r border-platinum p-3 overflow-y-auto flex flex-col">
          <button
            onClick={() => setSelectedCat(null)}
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverCat("__none__"); }}
            onDragLeave={() => { if (dragOverCat === "__none__") setDragOverCat(null); }}
            onDrop={(e) => { e.preventDefault(); if (dragSopId) moveSopToCategory(dragSopId, null); }}
            className={`w-full text-left px-3 py-1.5 text-sm rounded mb-1 ${
              dragOverCat === "__none__" ? "bg-royal-purple/20 ring-2 ring-royal-purple" : !selectedCat ? "bg-lavender text-midnight-blue font-medium" : "text-brand-gray hover:bg-white-smoke"
            }`}
          >
            All SOPs
          </button>
          {renderCatTree(topLevelCats)}
          {canEdit && (
            <button
              onClick={() => { setCatModalParentId(null); setCatName(""); setCatModalOpen(true); }}
              className="mt-3 w-full text-left px-3 py-1.5 text-sm text-royal-purple hover:bg-lavender/30 rounded flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Add Category
            </button>
          )}
        </div>
        <div className="flex-1 p-6">
          {sops.length === 0 ? (
            <EmptyState title="No SOPs yet" description="Create your first SOP to get started." />
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
              {sops.map((sop) => (
                <div
                  key={sop.id}
                  draggable
                  onDragStart={(e) => { setDragSopId(sop.id); e.dataTransfer.effectAllowed = "move"; }}
                  onDragEnd={() => { setDragSopId(null); setDragOverCat(null); }}
                  className={`group relative bg-white rounded-lg p-5 shadow-[0_4px_34px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_34px_rgba(0,0,0,0.08)] transition-shadow border border-platinum/50 cursor-grab active:cursor-grabbing ${dragSopId === sop.id ? "opacity-50" : ""}`}
                >
                  <Link href={`/sops/${sop.id}`} className="block">
                    <h3 className="font-semibold font-heading text-brand-black mb-1 truncate pr-6">{sop.title}</h3>
                    {sop.category && (
                      <span className="inline-block text-xs bg-lavender text-midnight-blue px-2 py-0.5 rounded-full mb-2">{sop.category.name}</span>
                    )}
                    <p className="text-xs text-brand-gray">Updated {new Date(sop.updatedAt).toLocaleDateString()}</p>
                  </Link>
                  {canEdit && (
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmDeleteSop(sop); }}
                      className="absolute top-4 right-4 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 text-brand-gray hover:text-red-500"
                      title="Delete SOP"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* New SOP Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New SOP">
        <div className="space-y-3">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="SOP title..."
            className="w-full px-3 py-2 border border-platinum rounded text-sm focus:outline-none focus:border-royal-purple"
            autoFocus
          />
          <div>
            <label className="block text-xs text-brand-gray mb-1">Category (optional)</label>
            <select
              value={selectedCat || ""}
              onChange={(e) => setSelectedCat(e.target.value || null)}
              className="w-full px-3 py-2 border border-platinum rounded text-sm focus:outline-none focus:border-royal-purple"
            >
              <option value="">No category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.parentId ? `  ${c.name}` : c.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm rounded bg-platinum hover:bg-lavender">Cancel</button>
          <button onClick={createSop} disabled={saving} className="px-4 py-2 text-sm rounded bg-royal-purple text-white hover:bg-midnight-blue disabled:opacity-50 disabled:cursor-not-allowed">{saving ? "Creating..." : "Create"}</button>
        </div>
      </Modal>

      {/* New Category Modal */}
      <Modal open={catModalOpen} onClose={() => setCatModalOpen(false)} title={catModalParentId ? "New Subcategory" : "New Category"}>
        <div className="space-y-3">
          {catModalParentId && (
            <p className="text-xs text-brand-gray">
              Adding subcategory under <span className="font-medium text-brand-black">{categories.find((c) => c.id === catModalParentId)?.name}</span>
            </p>
          )}
          <input
            type="text"
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
            placeholder="Category name..."
            className="w-full px-3 py-2 border border-platinum rounded text-sm focus:outline-none focus:border-royal-purple"
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") createCategory(); }}
          />
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={() => setCatModalOpen(false)} className="px-4 py-2 text-sm rounded bg-platinum hover:bg-lavender">Cancel</button>
          <button onClick={createCategory} className="px-4 py-2 text-sm rounded bg-royal-purple text-white hover:bg-midnight-blue">Create</button>
        </div>
      </Modal>

      {/* Confirm delete category */}
      <ConfirmDialog
        open={!!confirmDeleteCat}
        onClose={() => setConfirmDeleteCat(null)}
        onConfirm={() => { if (confirmDeleteCat) deleteCategory(confirmDeleteCat.id); }}
        title="Delete Category"
        message={`Delete "${confirmDeleteCat?.name}"? SOPs in this category will become uncategorized. Subcategories will also be deleted.`}
      />

      {/* Confirm delete SOP */}
      <ConfirmDialog
        open={!!confirmDeleteSop}
        onClose={() => setConfirmDeleteSop(null)}
        onConfirm={() => { if (confirmDeleteSop) { deleteSop(confirmDeleteSop.id); setConfirmDeleteSop(null); } }}
        title="Delete SOP"
        message={`Delete "${confirmDeleteSop?.title}"? This cannot be undone.`}
      />
    </>
  );
}
