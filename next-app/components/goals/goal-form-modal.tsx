"use client";
import { useState } from "react";
import useSWR from "swr";
import Modal from "@/components/modal";
import { useToast } from "@/components/toast";
import { fetcher, apiFetch } from "@/lib/utils";
import { GOAL_METRIC_UNITS } from "@/components/goals/types";

interface Department {
  id: string;
  name: string;
}
interface AppUser {
  id: string;
  email: string;
  role: string;
}

interface GoalFormModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  currentUserId?: string;
  parentId?: string;
}

const emptyForm = {
  name: "",
  description: "",
  isCompanyLevel: true,
  departmentId: "",
  ownerId: "",
  timePeriod: "",
  startOn: "",
  dueOn: "",
  metricUnit: "none",
  targetValue: "",
  currentValue: "",
};

export default function GoalFormModal({ open, onClose, onCreated, currentUserId, parentId }: GoalFormModalProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data: departments = [] } = useSWR<Department[]>(open ? "/api/departments" : null, fetcher);
  const { data: users = [] } = useSWR<AppUser[]>(open ? "/api/users" : null, fetcher);
  const eligibleOwners = users.filter((u) => u.role === "admin" || u.role === "manager");

  const reset = () => setForm(emptyForm);

  const create = async () => {
    if (!form.name.trim()) { toast("Goal name is required", "error"); return; }
    setSaving(true);
    const body: Record<string, unknown> = {
      name: form.name,
      description: form.description,
      isCompanyLevel: form.isCompanyLevel,
      departmentId: form.isCompanyLevel ? null : form.departmentId || null,
      ownerId: form.ownerId || currentUserId,
      timePeriod: form.timePeriod,
      startOn: form.startOn || null,
      dueOn: form.dueOn || null,
      metricUnit: form.metricUnit,
      progressSource: "manual",
    };
    if (form.metricUnit !== "none") {
      body.initialValue = 0;
      body.targetValue = form.targetValue ? parseFloat(form.targetValue) : null;
      body.currentValue = form.currentValue ? parseFloat(form.currentValue) : 0;
    }
    const url = parentId ? `/api/goals/${parentId}/subgoals` : "/api/goals";
    const { error } = await apiFetch(url, { method: "POST", body: JSON.stringify(body) });
    setSaving(false);
    if (error) { toast(error, "error"); return; }
    reset();
    onCreated();
    toast(parentId ? "Sub-goal created" : "Goal created", "success");
  };

  return (
    <Modal open={open} onClose={() => { onClose(); reset(); }} title={parentId ? "New Sub-goal" : "New Goal"}>
      <div className="space-y-3">
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Goal name"
          className="w-full px-3 py-2 border border-platinum rounded text-sm focus:outline-none focus:border-royal-purple"
          autoFocus
        />
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Description (optional)"
          rows={2}
          className="w-full px-3 py-2 border border-platinum rounded text-sm focus:outline-none focus:border-royal-purple resize-y"
        />

        {!parentId && (
          <>
            <div className="flex gap-2">
              <button
                onClick={() => setForm({ ...form, isCompanyLevel: true })}
                className={`flex-1 px-3 py-2 text-sm rounded border ${form.isCompanyLevel ? "border-royal-purple bg-lavender/20 text-royal-purple" : "border-platinum text-brand-gray"}`}
              >
                Company Goal
              </button>
              <button
                onClick={() => setForm({ ...form, isCompanyLevel: false })}
                className={`flex-1 px-3 py-2 text-sm rounded border ${!form.isCompanyLevel ? "border-royal-purple bg-lavender/20 text-royal-purple" : "border-platinum text-brand-gray"}`}
              >
                Team Goal
              </button>
            </div>

            {!form.isCompanyLevel && (
              <select
                value={form.departmentId}
                onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                className="w-full px-3 py-2 border border-platinum rounded text-sm focus:outline-none focus:border-royal-purple bg-white"
              >
                <option value="">No department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            )}
          </>
        )}

        <div>
          <p className="text-xs text-brand-gray mb-1.5">Owner (admin or manager)</p>
          <select
            value={form.ownerId}
            onChange={(e) => setForm({ ...form, ownerId: e.target.value })}
            className="w-full px-3 py-2 border border-platinum rounded text-sm focus:outline-none focus:border-royal-purple bg-white"
          >
            <option value="">Me</option>
            {eligibleOwners.map((u) => (
              <option key={u.id} value={u.id}>{u.email}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-brand-gray mb-1.5">Start date</p>
            <input
              type="date"
              value={form.startOn}
              onChange={(e) => setForm({ ...form, startOn: e.target.value })}
              className="w-full px-3 py-2 border border-platinum rounded text-sm focus:outline-none focus:border-royal-purple"
            />
          </div>
          <div>
            <p className="text-xs text-brand-gray mb-1.5">Due date</p>
            <input
              type="date"
              value={form.dueOn}
              onChange={(e) => setForm({ ...form, dueOn: e.target.value })}
              className="w-full px-3 py-2 border border-platinum rounded text-sm focus:outline-none focus:border-royal-purple"
            />
          </div>
        </div>

        <input
          value={form.timePeriod}
          onChange={(e) => setForm({ ...form, timePeriod: e.target.value })}
          placeholder='Time period (e.g. "Q3-2026", "H1-2026", "FY2026" — optional)'
          className="w-full px-3 py-2 border border-platinum rounded text-sm focus:outline-none focus:border-royal-purple"
        />

        <div>
          <p className="text-xs text-brand-gray mb-1.5">Progress metric</p>
          <select
            value={form.metricUnit}
            onChange={(e) => setForm({ ...form, metricUnit: e.target.value })}
            className="w-full px-3 py-2 border border-platinum rounded text-sm focus:outline-none focus:border-royal-purple bg-white"
          >
            {GOAL_METRIC_UNITS.map((u) => (
              <option key={u} value={u}>{u === "none" ? "No metric (track by status only)" : u}</option>
            ))}
          </select>
        </div>

        {form.metricUnit !== "none" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-brand-gray mb-1.5">Current value</p>
              <input
                type="number"
                value={form.currentValue}
                onChange={(e) => setForm({ ...form, currentValue: e.target.value })}
                className="w-full px-3 py-2 border border-platinum rounded text-sm focus:outline-none focus:border-royal-purple"
              />
            </div>
            <div>
              <p className="text-xs text-brand-gray mb-1.5">Target value</p>
              <input
                type="number"
                value={form.targetValue}
                onChange={(e) => setForm({ ...form, targetValue: e.target.value })}
                className="w-full px-3 py-2 border border-platinum rounded text-sm focus:outline-none focus:border-royal-purple"
              />
            </div>
          </div>
        )}
      </div>
      <div className="flex justify-end gap-3 mt-4">
        <button onClick={() => { onClose(); reset(); }} className="px-4 py-2 text-sm rounded bg-platinum hover:bg-lavender">Cancel</button>
        <button onClick={create} disabled={saving} className="px-4 py-2 text-sm rounded bg-royal-purple text-white hover:bg-midnight-blue disabled:opacity-50 disabled:cursor-not-allowed">
          {saving ? "Creating..." : "Create"}
        </button>
      </div>
    </Modal>
  );
}
