// Asana-style task recurrence.
// The rule is stored as JSON in Task.recurrenceRule; instances of the same
// series share Task.recurrenceId. Next due dates are computed from the DUE
// date (not the completion date) so the schedule never drifts.

export type RecurrenceEnds =
  | { type: "never" }
  | { type: "on"; date: string } // YYYY-MM-DD (last allowed due date)
  | { type: "after"; count: number }; // total occurrences including the first

export interface RecurrenceRule {
  frequency: "daily" | "weekly" | "monthly";
  interval: number; // every N days/weeks/months (biweekly = weekly interval 2)
  daysOfWeek?: number[]; // weekly: 0 (Sun) – 6 (Sat)
  monthlyMode?: "date" | "relative";
  dayOfMonth?: number; // monthly "date" mode: 1–31 (clamped to month length)
  weekOfMonth?: number; // monthly "relative" mode: 1–4, 5 = last
  weekday?: number; // monthly "relative" mode: 0–6
  ends?: RecurrenceEnds;
}

export function parseRule(json: string | null | undefined): RecurrenceRule | null {
  if (!json) return null;
  try {
    const r = JSON.parse(json);
    if (!r || !r.frequency || !r.interval) return null;
    return r as RecurrenceRule;
  } catch {
    return null;
  }
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fromISODate(s: string): Date {
  return new Date(s + "T00:00:00");
}

function startOfWeek(d: Date): Date {
  const r = new Date(d);
  r.setDate(r.getDate() - r.getDay());
  r.setHours(0, 0, 0, 0);
  return r;
}

function nthWeekdayOfMonth(year: number, month: number, weekday: number, week: number): Date {
  if (week === 5) {
    // last <weekday> of the month
    const last = new Date(year, month + 1, 0);
    const diff = (last.getDay() - weekday + 7) % 7;
    return new Date(year, month, last.getDate() - diff);
  }
  const first = new Date(year, month, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  return new Date(year, month, 1 + offset + (week - 1) * 7);
}

/**
 * Compute the next due date after `baseDue` (the current instance's due date).
 * Falls back to today when the task has no due date.
 */
export function nextDueDate(rule: RecurrenceRule, baseDue: string | null): string {
  const base = baseDue ? fromISODate(baseDue) : new Date();
  base.setHours(0, 0, 0, 0);
  const interval = Math.max(1, rule.interval || 1);

  if (rule.frequency === "daily") {
    const next = new Date(base);
    next.setDate(next.getDate() + interval);
    return toISODate(next);
  }

  if (rule.frequency === "weekly") {
    const days = (rule.daysOfWeek ?? []).filter((d) => d >= 0 && d <= 6).sort();
    if (days.length === 0) {
      const next = new Date(base);
      next.setDate(next.getDate() + 7 * interval);
      return toISODate(next);
    }
    // Walk forward day by day; a date qualifies when its weekday is selected
    // and its week is aligned to the interval (anchored on the base week).
    const anchor = startOfWeek(base);
    const probe = new Date(base);
    for (let i = 0; i < interval * 7 * 2 + 7; i++) {
      probe.setDate(probe.getDate() + 1);
      const weeks = Math.round((startOfWeek(probe).getTime() - anchor.getTime()) / (7 * 86400000));
      if (weeks % interval === 0 && days.includes(probe.getDay())) return toISODate(probe);
    }
    return toISODate(probe); // unreachable in practice
  }

  // monthly
  const year = base.getFullYear();
  const month = base.getMonth() + interval;
  if (rule.monthlyMode === "relative" && rule.weekday !== undefined && rule.weekOfMonth) {
    return toISODate(nthWeekdayOfMonth(year, month, rule.weekday, rule.weekOfMonth));
  }
  const dom = rule.dayOfMonth ?? base.getDate();
  const lastDay = new Date(year, month + 1, 0).getDate();
  return toISODate(new Date(year, month, Math.min(dom, lastDay)));
}

/**
 * True when the series should NOT continue past this completion.
 * `completedCount` = number of instances already completed in the series
 * (including the one just completed). `nextDate` = proposed next due date.
 */
export function seriesEnded(rule: RecurrenceRule, nextDate: string, completedCount: number): boolean {
  const ends = rule.ends;
  if (!ends || ends.type === "never") return false;
  if (ends.type === "on") return nextDate > ends.date;
  if (ends.type === "after") return completedCount >= ends.count;
  return false;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEK_LABELS: Record<number, string> = { 1: "1st", 2: "2nd", 3: "3rd", 4: "4th", 5: "last" };

/** Human summary, e.g. "Repeats weekly on Mon, Wed · until Jun 30" */
export function summarizeRule(rule: RecurrenceRule): string {
  const interval = Math.max(1, rule.interval || 1);
  let core = "";

  if (rule.frequency === "daily") {
    core = interval === 1 ? "Repeats daily" : `Repeats every ${interval} days`;
  } else if (rule.frequency === "weekly") {
    const days = (rule.daysOfWeek ?? []).map((d) => DAY_NAMES[d]).join(", ");
    if (interval === 1) core = days ? `Repeats weekly on ${days}` : "Repeats weekly";
    else if (interval === 2) core = days ? `Repeats biweekly on ${days}` : "Repeats biweekly";
    else core = days ? `Repeats every ${interval} weeks on ${days}` : `Repeats every ${interval} weeks`;
  } else {
    const every = interval === 1 ? "monthly" : `every ${interval} months`;
    if (rule.monthlyMode === "relative" && rule.weekday !== undefined && rule.weekOfMonth) {
      core = `Repeats ${every} on the ${WEEK_LABELS[rule.weekOfMonth] ?? rule.weekOfMonth} ${DAY_NAMES[rule.weekday]}`;
    } else if (rule.dayOfMonth) {
      core = `Repeats ${every} on day ${rule.dayOfMonth}`;
    } else {
      core = `Repeats ${every}`;
    }
  }

  const ends = rule.ends;
  if (ends?.type === "on") {
    const d = fromISODate(ends.date);
    core += ` · until ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  } else if (ends?.type === "after") {
    core += ` · ${ends.count} times`;
  }
  return core;
}
