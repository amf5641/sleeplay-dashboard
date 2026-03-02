"use client";
import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import Topbar from "@/components/topbar";
import Modal from "@/components/modal";
import EmptyState from "@/components/empty-state";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Project { id: string; name: string; description: string; tasks: { completed: boolean }[]; updatedAt: string }

export default function ProjectsPage() {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });

  const { data: projects = [], mutate } = useSWR<Project[]>(`/api/projects?filter=${filter}`, fetcher);

  const filtered = projects.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  const createProject = async () => {
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setModalOpen(false);
      setForm({ name: "", description: "" });
      mutate();
    }
  };

  return (
    <>
      <Topbar
        title="Projects"
        count={filtered.length}
        searchValue={search}
        onSearch={setSearch}
        searchPlaceholder="Search projects..."
        actions={
          <button onClick={() => setModalOpen(true)} className="px-4 py-1.5 bg-royal-purple text-white text-sm rounded hover:bg-midnight-blue transition-colors">
            + New Project
          </button>
        }
      />
      <div className="p-6">
        <div className="flex gap-2 mb-6">
          {["all", "incomplete", "complete"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 text-sm rounded capitalize ${filter === f ? "bg-midnight-blue text-white" : "bg-white text-brand-gray border border-platinum hover:bg-white-smoke"}`}
            >
              {f}
            </button>
          ))}
        </div>
        {filtered.length === 0 ? (
          <EmptyState title="No projects" description="Create a project to start tracking tasks." />
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
            {filtered.map((proj) => {
              const total = proj.tasks.length;
              const done = proj.tasks.filter((t) => t.completed).length;
              return (
                <Link
                  key={proj.id}
                  href={`/projects/${proj.id}`}
                  className="bg-white rounded-lg p-5 shadow-[0_4px_34px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_34px_rgba(0,0,0,0.08)] transition-shadow border border-platinum/50"
                >
                  <h3 className="font-semibold font-heading text-brand-black mb-1">{proj.name}</h3>
                  {proj.description && <p className="text-xs text-brand-gray mb-2 line-clamp-2">{proj.description}</p>}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-platinum rounded-full overflow-hidden">
                      <div className="h-full bg-royal-purple rounded-full" style={{ width: total ? `${(done / total) * 100}%` : "0%" }} />
                    </div>
                    <span className="text-xs text-brand-gray">{done}/{total}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Project">
        <div className="space-y-3">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Project name" className="w-full px-3 py-2 border border-platinum rounded text-sm focus:outline-none focus:border-royal-purple" autoFocus />
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description (optional)" rows={3} className="w-full px-3 py-2 border border-platinum rounded text-sm focus:outline-none focus:border-royal-purple resize-y" />
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm rounded bg-platinum hover:bg-lavender">Cancel</button>
          <button onClick={createProject} className="px-4 py-2 text-sm rounded bg-royal-purple text-white hover:bg-midnight-blue">Create</button>
        </div>
      </Modal>
    </>
  );
}
