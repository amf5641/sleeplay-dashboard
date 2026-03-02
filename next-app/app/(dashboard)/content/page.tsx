"use client";
import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import Topbar from "@/components/topbar";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const CATEGORIES = [
  { id: "company", label: "Company", icon: "🏢" },
  { id: "policies", label: "Policies", icon: "📜" },
  { id: "processes", label: "Processes", icon: "⚙️" },
];

interface ContentDoc { id: string; title: string; categoryId: string; updatedAt: string }

export default function ContentPage() {
  const { data: docs = [], mutate } = useSWR<ContentDoc[]>("/api/content", fetcher);
  const [activeCat, setActiveCat] = useState("company");

  const filtered = docs.filter((d) => d.categoryId === activeCat);

  const addDoc = async () => {
    const res = await fetch("/api/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId: activeCat, title: "Untitled" }),
    });
    if (res.ok) mutate();
  };

  return (
    <>
      <Topbar
        title="Content"
        count={docs.length}
        actions={
          <button onClick={addDoc} className="px-4 py-1.5 bg-royal-purple text-white text-sm rounded hover:bg-midnight-blue transition-colors">
            + New Document
          </button>
        }
      />
      <div className="p-6">
        <div className="flex gap-2 mb-6">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCat(cat.id)}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                activeCat === cat.id ? "bg-midnight-blue text-white" : "bg-white text-brand-gray border border-platinum hover:bg-white-smoke"
              }`}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
          {filtered.map((doc) => (
            <Link
              key={doc.id}
              href={`/content/${doc.id}`}
              className="bg-white rounded-lg p-5 shadow-[0_4px_34px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_34px_rgba(0,0,0,0.08)] transition-shadow border border-platinum/50"
            >
              <h3 className="font-semibold font-heading text-brand-black mb-1">{doc.title}</h3>
              <p className="text-xs text-brand-gray">Updated {new Date(doc.updatedAt).toLocaleDateString()}</p>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
