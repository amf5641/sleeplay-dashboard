"use client";
import { useState, useEffect } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import Topbar from "@/components/topbar";
import Modal from "@/components/modal";
import EmptyState from "@/components/empty-state";

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const ADMIN_EMAIL = "admin@sleeplay.com";

interface Person {
  id: string;
  name: string;
  title: string;
  photo: string | null;
  email: string | null;
}

interface PtoRequest {
  id: string;
  personId: string;
  person: Person;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  note: string;
  status: string;
  reviewer: { id: string; name: string } | null;
  createdAt: string;
}

interface PtoBalance {
  vacationAllowance: number;
  sickAllowance: number;
  vacationUsed: number;
  sickUsed: number;
  vacationRemaining: number;
  sickRemaining: number;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

const typeColors: Record<string, string> = {
  vacation: "bg-blue-100 text-blue-800",
  sick: "bg-orange-100 text-orange-800",
};

function calcDays(start: string, end: string): number {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  let count = 0;
  const cur = new Date(s);
  while (cur <= e) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function PtoPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.email === ADMIN_EMAIL;
  const userEmail = session?.user?.email;

  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ personId: "", type: "vacation", startDate: "", endDate: "", note: "" });

  const { data: requests = [], mutate } = useSWR<PtoRequest[]>(`/api/pto?status=${filter}`, fetcher);
  const { data: people = [] } = useSWR<Person[]>("/api/people", fetcher);

  const myPerson = people.find((p) => p.email === userEmail);

  const { data: balance, mutate: mutateBalance } = useSWR<PtoBalance>(
    myPerson ? `/api/pto/balance?personId=${myPerson.id}` : null,
    fetcher
  );

  useEffect(() => {
    if (!isAdmin && myPerson && !form.personId) {
      setForm((f) => ({ ...f, personId: myPerson.id }));
    }
  }, [isAdmin, myPerson, form.personId]);

  const filtered = requests.filter(
    (r) => r.person.name.toLowerCase().includes(search.toLowerCase())
  );

  const days = calcDays(form.startDate, form.endDate);

  const createRequest = async () => {
    if (!form.personId || !form.startDate || !form.endDate || days <= 0) return;
    const res = await fetch("/api/pto", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, days }),
    });
    if (res.ok) {
      setModalOpen(false);
      setForm({ personId: isAdmin ? "" : (myPerson?.id ?? ""), type: "vacation", startDate: "", endDate: "", note: "" });
      mutate();
      mutateBalance();
    }
  };

  const updateStatus = async (id: string, status: string, reviewerId?: string) => {
    const res = await fetch(`/api/pto/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, reviewerId }),
    });
    if (res.ok) {
      mutate();
      mutateBalance();
    }
  };

  const deleteRequest = async (id: string) => {
    const res = await fetch(`/api/pto/${id}`, { method: "DELETE" });
    if (res.ok) {
      mutate();
      mutateBalance();
    }
  };

  return (
    <>
      <Topbar
        title="PTO Requests"
        count={filtered.length}
        searchValue={search}
        onSearch={setSearch}
        searchPlaceholder="Search by name..."
        actions={
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-1.5 bg-royal-purple text-white text-sm rounded hover:bg-midnight-blue transition-colors"
          >
            + New Request
          </button>
        }
      />
      <div className="p-6">
        {!isAdmin && balance && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 shadow-[0_4px_34px_rgba(0,0,0,0.05)] border border-platinum/50">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold font-heading text-brand-black">Vacation Days</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColors.vacation}`}>
                  {balance.vacationRemaining} remaining
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-platinum rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${Math.max(0, (balance.vacationRemaining / balance.vacationAllowance) * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-brand-gray whitespace-nowrap">
                  {balance.vacationUsed} / {balance.vacationAllowance} used
                </span>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-[0_4px_34px_rgba(0,0,0,0.05)] border border-platinum/50">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold font-heading text-brand-black">Sick Days</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColors.sick}`}>
                  {balance.sickRemaining} remaining
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-platinum rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500 rounded-full transition-all"
                    style={{ width: `${Math.max(0, (balance.sickRemaining / balance.sickAllowance) * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-brand-gray whitespace-nowrap">
                  {balance.sickUsed} / {balance.sickAllowance} used
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2 mb-6">
          {["all", "pending", "approved", "rejected"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 text-sm rounded capitalize ${
                filter === f
                  ? "bg-midnight-blue text-white"
                  : "bg-white text-brand-gray border border-platinum hover:bg-white-smoke"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyState title="No PTO requests" description="Submit a request to get started." />
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
            {filtered.map((req) => (
              <div
                key={req.id}
                className="bg-white rounded-lg p-5 shadow-[0_4px_34px_rgba(0,0,0,0.05)] border border-platinum/50"
              >
                <div className="flex items-center gap-3 mb-3">
                  {req.person.photo ? (
                    <img src={req.person.photo} alt="" className="w-9 h-9 rounded-full object-cover" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-lavender text-midnight-blue flex items-center justify-center text-sm font-semibold">
                      {req.person.name.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold font-heading text-brand-black text-sm truncate">{req.person.name}</p>
                    <p className="text-xs text-brand-gray truncate">{req.person.title}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusColors[req.status] || ""}`}>
                    {req.status}
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs px-2 py-0.5 rounded font-medium capitalize ${typeColors[req.type] || ""}`}>
                    {req.type}
                  </span>
                  <span className="text-xs text-brand-gray">
                    {req.days} day{req.days !== 1 ? "s" : ""}
                  </span>
                </div>

                <p className="text-sm text-brand-black mb-1">
                  {formatDate(req.startDate)} — {formatDate(req.endDate)}
                </p>

                {req.note && (
                  <p className="text-xs text-brand-gray mb-2 line-clamp-2">{req.note}</p>
                )}

                {req.reviewer && (
                  <p className="text-xs text-brand-gray mb-2">
                    Reviewed by {req.reviewer.name}
                  </p>
                )}

                {isAdmin && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-platinum">
                    {req.status === "pending" && (
                      <>
                        <button
                          onClick={() => updateStatus(req.id, "approved")}
                          className="flex-1 px-3 py-1.5 text-xs font-medium rounded bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => updateStatus(req.id, "rejected")}
                          className="flex-1 px-3 py-1.5 text-xs font-medium rounded bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => deleteRequest(req.id)}
                      className="px-3 py-1.5 text-xs font-medium rounded bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New PTO Request">
        <div className="space-y-3">
          {isAdmin ? (
            <div>
              <label className="block text-xs font-medium text-brand-gray mb-1">Employee</label>
              <select
                value={form.personId}
                onChange={(e) => setForm({ ...form, personId: e.target.value })}
                className="w-full px-3 py-2 border border-platinum rounded text-sm focus:outline-none focus:border-royal-purple bg-white"
              >
                <option value="">Select employee...</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-brand-gray mb-1">Employee</label>
              <input
                type="text"
                value={myPerson?.name ?? ""}
                disabled
                className="w-full px-3 py-2 border border-platinum rounded text-sm bg-white-smoke text-brand-gray"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-brand-gray mb-1">Type</label>
            <div className="flex gap-2">
              {["vacation", "sick"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm({ ...form, type: t })}
                  className={`flex-1 px-3 py-2 text-sm rounded capitalize ${
                    form.type === t
                      ? "bg-midnight-blue text-white"
                      : "bg-white border border-platinum text-brand-gray hover:bg-white-smoke"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-brand-gray mb-1">Start Date</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-platinum rounded text-sm focus:outline-none focus:border-royal-purple"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-brand-gray mb-1">End Date</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-platinum rounded text-sm focus:outline-none focus:border-royal-purple"
              />
            </div>
          </div>

          {days > 0 && (
            <p className="text-sm text-brand-gray">
              {days} business day{days !== 1 ? "s" : ""}
            </p>
          )}

          <div>
            <label className="block text-xs font-medium text-brand-gray mb-1">Note (optional)</label>
            <textarea
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="Reason or details..."
              rows={2}
              className="w-full px-3 py-2 border border-platinum rounded text-sm focus:outline-none focus:border-royal-purple resize-y"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={() => setModalOpen(false)}
            className="px-4 py-2 text-sm rounded bg-platinum hover:bg-lavender"
          >
            Cancel
          </button>
          <button
            onClick={createRequest}
            disabled={!form.personId || !form.startDate || !form.endDate || days <= 0}
            className="px-4 py-2 text-sm rounded bg-royal-purple text-white hover:bg-midnight-blue disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit Request
          </button>
        </div>
      </Modal>
    </>
  );
}
