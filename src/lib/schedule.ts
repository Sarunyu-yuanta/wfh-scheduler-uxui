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

  // WFH counts from locked assignments
  const lockedCnt: Record<DayId, number> = { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0 };
  for (const days of Object.values(LOCKED_WFH)) {
    for (const d of days) lockedCnt[d as DayId]++;
  }

  // Target: spread total WFH evenly (8 people × 2 days / 4 eligible days = 4 per day)
  const targetPerDay = Math.round((TEAM_NAMES.length * 2) / eligible.length);
  const remaining: Record<DayId, number> = { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0 };
  for (const d of eligible) remaining[d] = targetPerDay - lockedCnt[d];

  const nonLocked = TEAM_NAMES.filter((n) => !LOCKED_WFH[n]);

  // Find all combo count distributions that hit remaining targets exactly
  // VALID_COMBOS order: [mon,tue]=x0, [mon,thu]=x1, [tue,thu]=x2, [tue,fri]=x3, [thu,fri]=x4
  const distributions: number[][] = [];
  const n = nonLocked.length;
  for (let x0 = 0; x0 <= n; x0++) {
    for (let x1 = 0; x1 <= n - x0; x1++) {
      for (let x2 = 0; x2 <= n - x0 - x1; x2++) {
        for (let x3 = 0; x3 <= n - x0 - x1 - x2; x3++) {
          const x4 = n - x0 - x1 - x2 - x3;
          if (
            x0 + x1 === remaining.mon &&
            x0 + x2 + x3 === remaining.tue &&
            x1 + x2 + x4 === remaining.thu &&
            x3 + x4 === remaining.fri
          ) {
            distributions.push([x0, x1, x2, x3, x4]);
          }
        }
      }
    }
  }

  let comboPool: DayId[][];

  if (distributions.length > 0) {
    // Pick a random perfectly balanced distribution
    const counts = distributions[Math.floor(Math.random() * distributions.length)];
    comboPool = [];
    VALID_COMBOS.forEach((combo, i) => {
      for (let j = 0; j < counts[i]; j++) comboPool.push(combo);
    });
  } else {
    // Fallback: greedy variance minimization (original algorithm)
    const cnt = { ...lockedCnt };
    comboPool = [];
    for (let i = 0; i < n; i++) {
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
      comboPool.push(chosen);
      for (const d of chosen) cnt[d]++;
    }
  }

  // Shuffle both independently so combo variety is retained across people
  const people = shuffle(nonLocked);
  const combos = shuffle(comboPool);
  for (let i = 0; i < people.length; i++) {
    result[people[i]] = [...combos[i]];
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

