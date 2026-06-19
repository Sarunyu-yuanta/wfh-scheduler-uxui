export type DayId = "mon" | "tue" | "wed" | "thu" | "fri";
export type Schedule = Record<string, DayId[]>;

export const TEAM_NAMES = ["Yim", "Art", "Kes", "Khim", "Nook", "Few", "Max", "Yok"];
export const LOCKED_WFH: Record<string, DayId[]> = { Yim: ["tue", "fri"] };

export const WEEKDAYS: { id: DayId; label: string; short: string; allowWfh: boolean }[] = [
  { id: "mon", label: "จันทร์", short: "จัน", allowWfh: true },
  { id: "tue", label: "อังคาร", short: "อัง", allowWfh: true },
  { id: "wed", label: "พุธ",   short: "พุธ", allowWfh: false },
  { id: "thu", label: "พฤหัส", short: "พฤ",  allowWfh: true },
  { id: "fri", label: "ศุกร์",  short: "ศ",   allowWfh: true },
];

const VALID_COMBOS: DayId[][] = [
  ["mon", "tue"],
  ["mon", "thu"],
  ["tue", "thu"],
  ["tue", "fri"],
  ["thu", "fri"],
];

// Pre-set schedule for June–July 2026 (provided by the team)
export const SEED_SCHEDULE: Schedule = {
  Yim:  ["tue", "fri"],
  Art:  ["mon", "thu"],
  Kes:  ["thu", "fri"],
  Khim: ["tue", "fri"],
  Nook: ["mon", "tue"],
  Few:  ["mon", "tue"],
  Max:  ["thu", "fri"],
  Yok:  ["mon", "thu"],
};

export const SEED_WEEK_STARTS = [
  "2026-06-15", "2026-06-22", "2026-06-29",
  "2026-07-06", "2026-07-13", "2026-07-20", "2026-07-27",
];

// ─── algorithm ───────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function generateSchedule(): Schedule {
  const result: Schedule = {};
  for (const [name, days] of Object.entries(LOCKED_WFH)) {
    result[name] = [...days];
  }

  const eligible: DayId[] = ["mon", "tue", "thu", "fri"];
  const cnt: Record<DayId, number> = { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0 };
  for (const days of Object.values(LOCKED_WFH)) {
    for (const d of days) cnt[d as DayId]++;
  }

  for (const name of shuffle(TEAM_NAMES.filter((n) => !LOCKED_WFH[n]))) {
    const scored = VALID_COMBOS.map((combo) => {
      const c = { ...cnt };
      for (const d of combo) c[d]++;
      const vals = eligible.map((d) => c[d]);
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const v = vals.reduce((a, b) => a + (b - mean) ** 2, 0);
      return { combo, v };
    }).sort((a, b) => a.v - b.v);

    const min = scored[0].v;
    const best = scored.filter((s) => s.v === min);
    const chosen = best[Math.floor(Math.random() * best.length)].combo;
    result[name] = [...chosen];
    for (const d of chosen) cnt[d]++;
  }
  return result;
}

// ─── rounds ───────────────────────────────────────────────────────────────────

export interface Round {
  label: string;
  startDate: string; // first Monday of this round (ISO)
  endDate: string;   // inclusive end of round (ISO)
}

// Add new rounds here as they are defined.
export const ROUNDS: Round[] = [
  { label: "มิถุนายน – กรกฎาคม 2569", startDate: "2026-06-15", endDate: "2026-07-31" },
  // { label: "สิงหาคม 2569", startDate: "2026-08-03", endDate: "2026-08-31" },
];

export function groupWeeksByRound(weekStarts: string[]): { label: string; weeks: string[] }[] {
  const sorted = [...weekStarts].sort();
  return ROUNDS
    .map((round) => ({
      label: round.label,
      weeks: sorted.filter((ws) => ws >= round.startDate && ws <= round.endDate),
    }))
    .filter((g) => g.weeks.length > 0);
}

// ─── date helpers ─────────────────────────────────────────────────────────────

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const dow = d.getDay();
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

export function currentWeekStart(): string {
  return toISO(getMondayOf(new Date()));
}

export function weekDayLabels(mondayISO: string) {
  const monday = new Date(mondayISO + "T00:00:00");
  return WEEKDAYS.map((day, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      ...day,
      dateLabel: d.toLocaleDateString("th-TH", { day: "numeric", month: "short" }),
    };
  });
}

export function weekRangeLabel(mondayISO: string): string {
  const monday = new Date(mondayISO + "T00:00:00");
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  const s = monday.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
  const e = friday.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
  return `${s} – ${e}`;
}

// "วันนี้ ถึง สิ้นเดือนหน้า" e.g. "18 มิ.ย. – 31 ก.ค. 2569"
export function currentPeriodLabel(): string {
  const today = new Date();
  const endOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0);
  const s = today.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
  const e = endOfNextMonth.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${s} – ${e}`;
}

export function monthLabel(mondayISO: string): string {
  return new Date(mondayISO + "T00:00:00").toLocaleDateString("th-TH", {
    month: "long",
    year: "numeric",
  });
}

export function groupWeeksByMonth(weekStarts: string[]): { label: string; weeks: string[] }[] {
  const map = new Map<string, string[]>();
  for (const ws of [...weekStarts].sort()) {
    const label = monthLabel(ws);
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(ws);
  }
  return Array.from(map.entries()).map(([label, weeks]) => ({ label, weeks }));
}

// ─── localStorage ─────────────────────────────────────────────────────────────

const STORAGE_KEY = "wfh-weeks-v2";

function seedInitial(): Record<string, Schedule> {
  const data: Record<string, Schedule> = {};
  for (const ws of SEED_WEEK_STARTS) data[ws] = { ...SEED_SCHEDULE };
  return data;
}

export function loadAllWeeks(): Record<string, Schedule> {
  if (typeof window === "undefined") return seedInitial();
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) return JSON.parse(s);
  } catch {}
  const data = seedInitial();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  return data;
}

export function saveWeek(weekStart: string, schedule: Schedule): void {
  if (typeof window === "undefined") return;
  const all = loadAllWeeks();
  all[weekStart] = schedule;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}
