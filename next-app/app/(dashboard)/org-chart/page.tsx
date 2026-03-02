"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import useSWR from "swr";
import Topbar from "@/components/topbar";
import Modal from "@/components/modal";
import ConfirmDialog from "@/components/confirm-dialog";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Person { id: string; name: string; title: string; location: string; managerId: string | null; photo: string | null }

function OrgNode({ person, people, onEdit, onDelete }: { person: Person; people: Person[]; onEdit: (p: Person) => void; onDelete: (id: string) => void }) {
  const reports = people.filter((p) => p.managerId === person.id);
  return (
    <div className="flex flex-col items-center">
      <div
        className="bg-white rounded-lg p-4 shadow-[0_4px_34px_rgba(0,0,0,0.05)] border border-platinum/50 min-w-[180px] text-center cursor-pointer hover:shadow-[0_4px_34px_rgba(0,0,0,0.08)] transition-shadow"
        onClick={() => onEdit(person)}
      >
        {person.photo ? (
          <img src={person.photo} alt="" className="w-12 h-12 rounded-full mx-auto mb-2 object-cover" />
        ) : (
          <div className="w-12 h-12 rounded-full mx-auto mb-2 bg-lavender flex items-center justify-center text-midnight-blue font-bold text-lg">
            {person.name.charAt(0)}
          </div>
        )}
        <div className="font-semibold text-sm font-heading">{person.name}</div>
        <div className="text-xs text-brand-gray">{person.title}</div>
        {person.location && <div className="text-xs text-brand-gray mt-0.5">{person.location}</div>}
      </div>
      {reports.length > 0 && (
        <>
          <div className="w-0.5 h-6 bg-lavender" />
          <div className="flex gap-8 relative">
            {reports.length > 1 && (
              <div className="absolute top-0 h-0.5 bg-lavender" style={{ left: "50%", right: "50%", transform: `translateX(-${(reports.length - 1) * 50}%)`, width: `${(reports.length - 1) * 100}%`, marginLeft: `-${(reports.length - 1) * 50}%` }} />
            )}
            {reports.map((r) => (
              <div key={r.id} className="flex flex-col items-center">
                <div className="w-0.5 h-6 bg-lavender" />
                <OrgNode person={r} people={people} onEdit={onEdit} onDelete={onDelete} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function OrgChartPage() {
  const { data: people = [], mutate } = useSWR<Person[]>("/api/people", fetcher);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editPerson, setEditPerson] = useState<Person | null>(null);
  const [form, setForm] = useState({ name: "", title: "", location: "", managerId: "" });
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const roots = people.filter((p) => !p.managerId);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((z) => Math.min(2, Math.max(0.25, z + delta)));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  const onMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const onMouseUp = () => setDragging(false);

  const openAdd = () => {
    setEditPerson(null);
    setForm({ name: "", title: "", location: "", managerId: "" });
    setModalOpen(true);
  };

  const openEdit = (p: Person) => {
    setEditPerson(p);
    setForm({ name: p.name, title: p.title, location: p.location, managerId: p.managerId || "" });
    setModalOpen(true);
  };

  const savePerson = async () => {
    const body = { ...form, managerId: form.managerId || null };
    if (editPerson) {
      await fetch(`/api/people/${editPerson.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } else {
      await fetch("/api/people", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }
    setModalOpen(false);
    mutate();
  };

  const deletePerson = async (id: string) => {
    await fetch(`/api/people/${id}`, { method: "DELETE" });
    mutate();
  };

  const fitToView = () => { setZoom(0.8); setPan({ x: 0, y: 0 }); };

  return (
    <>
      <Topbar
        title="Org Chart"
        actions={
          <div className="flex gap-2">
            <button onClick={fitToView} className="px-3 py-1.5 text-sm rounded bg-platinum hover:bg-lavender">Fit</button>
            <button onClick={() => setZoom((z) => Math.min(2, z + 0.2))} className="px-3 py-1.5 text-sm rounded bg-platinum hover:bg-lavender">+</button>
            <button onClick={() => setZoom((z) => Math.max(0.25, z - 0.2))} className="px-3 py-1.5 text-sm rounded bg-platinum hover:bg-lavender">-</button>
            <button onClick={openAdd} className="px-4 py-1.5 bg-royal-purple text-white text-sm rounded hover:bg-midnight-blue transition-colors">+ Add Person</button>
          </div>
        }
      />
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden cursor-grab active:cursor-grabbing bg-white-smoke"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <div className="inline-flex p-16" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "0 0" }}>
          <div className="flex gap-16">
            {roots.map((r) => (
              <OrgNode key={r.id} person={r} people={people} onEdit={openEdit} onDelete={(id) => setConfirmDelete(id)} />
            ))}
          </div>
        </div>
      </div>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editPerson ? "Edit Person" : "Add Person"}>
        <div className="space-y-3">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name" className="w-full px-3 py-2 border border-platinum rounded text-sm focus:outline-none focus:border-royal-purple" />
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Job Title" className="w-full px-3 py-2 border border-platinum rounded text-sm focus:outline-none focus:border-royal-purple" />
          <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Location" className="w-full px-3 py-2 border border-platinum rounded text-sm focus:outline-none focus:border-royal-purple" />
          <select value={form.managerId} onChange={(e) => setForm({ ...form, managerId: e.target.value })} className="w-full px-3 py-2 border border-platinum rounded text-sm focus:outline-none focus:border-royal-purple">
            <option value="">No Manager (Root)</option>
            {people.filter((p) => p.id !== editPerson?.id).map((p) => (
              <option key={p.id} value={p.id}>{p.name} — {p.title}</option>
            ))}
          </select>
        </div>
        <div className="flex justify-between mt-4">
          {editPerson && <button onClick={() => { setConfirmDelete(editPerson.id); setModalOpen(false); }} className="px-4 py-2 text-sm rounded bg-red-500 text-white hover:bg-red-600">Delete</button>}
          <div className="flex gap-3 ml-auto">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm rounded bg-platinum hover:bg-lavender">Cancel</button>
            <button onClick={savePerson} className="px-4 py-2 text-sm rounded bg-royal-purple text-white hover:bg-midnight-blue">Save</button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} onConfirm={() => confirmDelete && deletePerson(confirmDelete)} title="Delete Person" message="Remove this person from the org chart?" />
    </>
  );
}
