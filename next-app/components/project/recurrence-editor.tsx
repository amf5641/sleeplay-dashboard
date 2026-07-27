"use client";
import { useState, useEffect } from "react";
import { RecurrenceRule, parseRule, summarizeRule } from "@/lib/recurrence";

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];
const WEEK_OPTIONS = [
  { value: 1, label: "1st" },
  { value: 2, label: "2nd" },
  { value: 3, label: "3rd" },
  { value: 4, label: "4th" },
  { value: 5, label: "last" },
];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type Preset = "none" | "daily" | "weekly" | "biweekly" | "monthly" | "custom";

function presetFromRule(rule: RecurrenceRule | null): Preset {
  if (!rule) return "none";
  if (rule.frequency === "daily" && rule.interval === 1) return "daily";
  if (rule.frequency === "weekly" && rule.interval === 1) return "weekly";
  if (rule.frequency === "weekly" && rule.interval === 2) return "biweekly";
  if (rule.frequency === "monthly" && rule.interval === 1) return "monthly";
  return "custom";
}

export default function RecurrenceEditor({
  value,
  onSave,
}: {
  value: string | null;
  onSave: (ruleJson: string | null) => void;
}) {
  const saved = parseRule(value);
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<Preset>(presetFromRule(saved));
  const [interval, setIntervalN] = useState(saved?.interval ?? 1);
  const [customUnit, setCustomUnit] = useState<"daily" | "weekly" | "monthly">(saved?.frequency ?? "weekly");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(saved?.daysOfWeek ?? []);
  const [monthlyMode, setMonthlyMode] = useState<"date" | "relative">(saved?.monthlyMode ?? "date");
  const [dayOfMonth, setDayOfMonth] = useState(saved?.dayOfMonth ?? 1);
  const [weekOfMonth, setWeekOfMonth] = useState(saved?.weekOfMonth ?? 1);
  const [weekday, setWeekday] = useState(saved?.weekday ?? 1);
  const [endsType, setEndsType] = useState<"never" | "on" | "after">(saved?.ends?.type ?? "never");
  const [endsDate, setEndsDate] = useState(saved?.ends?.type === "on" ? saved.ends.date : "");
  const [endsCount, setEndsCount] = useState(saved?.ends?.type === "after" ? saved.ends.count : 10);

  useEffect(() => {
    const r = parseRule(value);
    setPreset(presetFromRule(r));
    if (r) {
      setIntervalN(r.interval);
      setCustomUnit(r.frequency);
      setDaysOfWeek(r.daysOfWeek ?? []);
      setMonthlyMode(r.monthlyMode ?? "date");
      setDayOfMonth(r.dayOfMonth ?? 1);
      setWeekOfMonth(r.weekOfMonth ?? 1);
      setWeekday(r.weekday ?? 1);
      setEndsType(r.ends?.type ?? "never");
      if (r.ends?.type === "on") setEndsDate(r.ends.date);
      if (r.ends?.type === "after") setEndsCount(r.ends.count);
    }
  }, [value]);

  const toggleDay = (d: number) =>
    setDaysOfWeek((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));

  const buildRule = (): RecurrenceRule | null => {
    if (preset === "none") return null;
    const frequency = preset === "custom" ? customUnit : preset === "biweekly" ? "weekly" : (preset as "daily" | "weekly" | "monthly");
    const iv = preset === "custom" ? Math.max(1, interval) : preset === "biweekly" ? 2 : 1;
    const rule: RecurrenceRule = { frequency, interval: iv };
    if (frequency === "weekly") rule.daysOfWeek = daysOfWeek;
    if (frequency === "monthly") {
      rule.monthlyMode = monthlyMode;
      if (monthlyMode === "date") rule.dayOfMonth = Math.min(31, Math.max(1, dayOfMonth));
      else {
        rule.weekOfMonth = weekOfMonth;
        rule.weekday = weekday;
      }
    }
    if (endsType === "on" && endsDate) rule.ends = { type: "on", date: endsDate };
    else if (endsType === "after") rule.ends = { type: "after", count: Math.max(1, endsCount) };
    else rule.ends = { type: "never" };
    return rule;
  };

  const save = () => {
    const rule = buildRule();
    onSave(rule ? JSON.stringify(rule) : null);
    setOpen(false);
  };

  const showWeekdays = preset === "weekly" || preset === "biweekly" || (preset === "custom" && customUnit === "weekly");
  const showMonthly = preset === "monthly" || (preset === "custom" && customUnit === "monthly");

  if (!open) {
    return (
      <div className="flex items-center gap-2">
        <button onClick={() => setOpen(true)} className="text-sm text-left hover:text-royal-purple transition-colors">
          {saved ? summarizeRule(saved) : <span className="text-brand-gray">Does not repeat</span>}
        </button>
        {saved && (
          <button onClick={() => onSave(null)} aria-label="Remove repeat" className="text-brand-gray hover:text-red-500 text-xs">
            &times;
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="border border-platinum rounded-lg p-3 bg-white space-y-3 w-full max-w-sm">
      <select
        value={preset}
        onChange={(e) => setPreset(e.target.value as Preset)}
        className="w-full text-sm border border-platinum rounded px-2 py-1.5 bg-white focus:outline-none focus:border-royal-purple"
      >
        <option value="none">Does not repeat</option>
        <option value="daily">Daily</option>
        <option value="weekly">Weekly</option>
        <option value="biweekly">Biweekly (every 2 weeks)</option>
        <option value="monthly">Monthly</option>
        <option value="custom">Custom…</option>
      </select>

      {preset === "custom" && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-brand-gray">Every</span>
          <input
            type="number"
            min={1}
            value={interval}
            onChange={(e) => setIntervalN(parseInt(e.target.value) || 1)}
            className="w-16 border border-platinum rounded px-2 py-1 text-center focus:outline-none focus:border-royal-purple"
          />
          <select
            value={customUnit}
            onChange={(e) => setCustomUnit(e.target.value as "daily" | "weekly" | "monthly")}
            className="border border-platinum rounded px-2 py-1 bg-white focus:outline-none focus:border-royal-purple"
          >
            <option value="daily">days</option>
            <option value="weekly">weeks</option>
            <option value="monthly">months</option>
          </select>
        </div>
      )}

      {showWeekdays && (
        <div>
          <p className="text-[11px] text-brand-gray mb-1.5">On these days</p>
          <div className="flex gap-1">
            {DAY_LETTERS.map((l, i) => (
              <button
                key={i}
                onClick={() => toggleDay(i)}
                aria-label={DAY_NAMES[i]}
                className={`w-7 h-7 rounded-full text-xs font-medium transition-colors ${
                  daysOfWeek.includes(i) ? "bg-royal-purple text-white" : "bg-platinum text-brand-gray hover:bg-lavender"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      )}

      {showMonthly && (
        <div className="space-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" checked={monthlyMode === "date"} onChange={() => setMonthlyMode("date")} />
            <span>On day</span>
            <input
              type="number"
              min={1}
              max={31}
              value={dayOfMonth}
              onChange={(e) => setDayOfMonth(parseInt(e.target.value) || 1)}
              disabled={monthlyMode !== "date"}
              className="w-16 border border-platinum rounded px-2 py-1 text-center focus:outline-none focus:border-royal-purple disabled:opacity-40"
            />
          </label>
          <label className="flex items-center gap-2 flex-wrap">
            <input type="radio" checked={monthlyMode === "relative"} onChange={() => setMonthlyMode("relative")} />
            <span>On the</span>
            <select
              value={weekOfMonth}
              onChange={(e) => setWeekOfMonth(parseInt(e.target.value))}
              disabled={monthlyMode !== "relative"}
              className="border border-platinum rounded px-2 py-1 bg-white focus:outline-none focus:border-royal-purple disabled:opacity-40"
            >
              {WEEK_OPTIONS.map((w) => (
                <option key={w.value} value={w.value}>{w.label}</option>
              ))}
            </select>
            <select
              value={weekday}
              onChange={(e) => setWeekday(parseInt(e.target.value))}
              disabled={monthlyMode !== "relative"}
              className="border border-platinum rounded px-2 py-1 bg-white focus:outline-none focus:border-royal-purple disabled:opacity-40"
            >
              {DAY_NAMES.map((d, i) => (
                <option key={i} value={i}>{d}</option>
              ))}
            </select>
          </label>
        </div>
      )}

      {preset !== "none" && (
        <div className="flex items-center gap-2 text-sm flex-wrap">
          <span className="text-brand-gray">Ends</span>
          <select
            value={endsType}
            onChange={(e) => setEndsType(e.target.value as "never" | "on" | "after")}
            className="border border-platinum rounded px-2 py-1 bg-white focus:outline-none focus:border-royal-purple"
          >
            <option value="never">Never</option>
            <option value="on">On date</option>
            <option value="after">After</option>
          </select>
          {endsType === "on" && (
            <input
              type="date"
              value={endsDate}
              onChange={(e) => setEndsDate(e.target.value)}
              className="border border-platinum rounded px-2 py-1 focus:outline-none focus:border-royal-purple"
            />
          )}
          {endsType === "after" && (
            <span className="flex items-center gap-1">
              <input
                type="number"
                min={1}
                value={endsCount}
                onChange={(e) => setEndsCount(parseInt(e.target.value) || 1)}
                className="w-16 border border-platinum rounded px-2 py-1 text-center focus:outline-none focus:border-royal-purple"
              />
              <span className="text-brand-gray">times</span>
            </span>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button onClick={() => setOpen(false)} className="px-3 py-1.5 text-xs rounded bg-platinum hover:bg-lavender">Cancel</button>
        <button onClick={save} className="px-3 py-1.5 text-xs rounded bg-royal-purple text-white hover:bg-midnight-blue">Save</button>
      </div>
    </div>
  );
}

/** Small repeat badge for task rows/cards; tooltip shows the rule summary. */
export function RepeatBadge({ rule, legacyFreq }: { rule: string | null; legacyFreq?: string | null }) {
  const parsed = parseRule(rule);
  if (!parsed && !legacyFreq) return null;
  const summary = parsed ? summarizeRule(parsed) : `Repeats ${legacyFreq}`;
  return (
    <span title={summary} aria-label={summary} className="inline-flex items-center text-brand-gray/70 flex-shrink-0">
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M5.07 9A8 8 0 0119.4 6.6M18.93 15A8 8 0 014.6 17.4" />
      </svg>
    </span>
  );
}
