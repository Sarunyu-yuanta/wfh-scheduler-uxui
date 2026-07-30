"use client";

import { useState, useEffect } from "react";
import { CheckCircle, House } from "@phosphor-icons/react";
import { TeamAvatar, displayName } from "../_components/TeamAvatar";
import {
  Button,
  Tag,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
} from "@sarunyu/system-one";
import {
  type Schedule,
  TEAM_NAMES,
  LOCKED_WFH,
  WEEKDAYS,
  groupWeeksByMonth,
  currentWeekStart,
  monthWeekStarts,
} from "@/lib/schedule";

export default function HistoryPage() {
  const [allWeeks, setAllWeeks] = useState<Record<string, Schedule>>({});
  const [teamNames, setTeamNames] = useState<string[]>(TEAM_NAMES);
  const [loaded, setLoaded] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [restoredMonth, setRestoredMonth] = useState<string | null>(null);
  const thisWeek = currentWeekStart();

  useEffect(() => {
    fetch("/api/schedules")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: Record<string, Schedule>) => setAllWeeks(data))
      .catch(console.error)
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    fetch("/api/team")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: { names: string[] }) => setTeamNames(data.names))
      .catch(() => {});
  }, []);

  const currentMonthKey = thisWeek.slice(0, 7);
  const months = [...groupWeeksByMonth(Object.keys(allWeeks))]
    .filter((m) => m.weeks[0].slice(0, 7) <= currentMonthKey)
    .sort((a, b) => {
      const aCurrent = a.weeks.includes(thisWeek);
      const bCurrent = b.weeks.includes(thisWeek);
      if (aCurrent !== bCurrent) return aCurrent ? -1 : 1;
      return b.weeks[0].localeCompare(a.weeks[0]);
    });

  const restore = async (label: string, schedule: Schedule) => {
    setRestoring(label);
    const weekStarts = monthWeekStarts(0);
    await fetch("/api/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekStarts, schedule }),
    });
    setAllWeeks((prev) => {
      const next = { ...prev };
      for (const ws of weekStarts) next[ws] = schedule;
      return next;
    });
    setRestoring(null);
    setRestoredMonth(label);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1024px] mx-auto px-6 pt-6 pb-8">
        <h1 className="type-h4 text-foreground mb-8">ประวัติรายเดือน</h1>

        {!loaded && (
          <div className="animate-pulse flex flex-col gap-6">
            <div className="bg-muted rounded-2xl h-72" />
            <div className="bg-muted rounded-2xl h-72" />
          </div>
        )}

        {loaded && months.length === 0 && (
          <p className="type-body-2 text-muted-foreground">ยังไม่มีข้อมูล</p>
        )}

        {loaded && months.map(({ label, weeks }) => {
          const isCurrentMonth = weeks.includes(thisWeek);
          const representativeWeek = isCurrentMonth
            ? thisWeek
            : weeks[weeks.length - 1];
          const schedule = allWeeks[representativeWeek] ?? {};
          const justRestored = restoredMonth === label;
          // Union so people removed from the team since this month still show
          // for the months they actually had a schedule in.
          const rowNames = Array.from(
            new Set([...teamNames, ...Object.keys(schedule)]),
          );

          return (
            <div key={label} className="mb-10">
              <div className="bg-card border border-border rounded-2xl overflow-hidden">

                {/* Month header */}
                <div className="px-6 pt-6 pb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <p className="type-h5 text-foreground">{label}</p>
                    {isCurrentMonth && (
                      <Tag text="เดือนปัจจุบัน" variant="blue" size="small" />
                    )}
                    {justRestored && (
                      <Tag text="นำกลับมาใช้แล้ว" variant="green" size="small" />
                    )}
                  </div>
                  {!isCurrentMonth && (
                    <Button
                      variant="outline"
                      size="md"
                      onClick={() => restore(label, schedule)}
                      disabled={restoring === label}
                    >
                      {restoring === label ? "กำลังนำกลับ..." : "นำกลับมาใช้เดือนนี้"}
                    </Button>
                  )}
                </div>

                {/* Schedule table */}
                <div className="overflow-x-auto">
                  <Table className="table-fixed w-full">
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell sortable={false} className="w-48">
                          พนักงาน
                        </TableHeaderCell>
                        {WEEKDAYS.map((day) => (
                          <TableHeaderCell
                            key={day.id}
                            sortable={false}
                            className="w-32 th-day-center"
                          >
                            {day.label}
                          </TableHeaderCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rowNames.map((name) => (
                        <TableRow key={name}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <TeamAvatar name={name} size="m" isCurrent={isCurrentMonth} />
                              <span className="type-body-2 text-foreground">{displayName(name, isCurrentMonth)}</span>
                              {LOCKED_WFH[name] && (
                                <Tag text="ล็อควัน" variant="yellow" size="small" />
                              )}
                            </div>
                          </TableCell>
                          {WEEKDAYS.map((day) => {
                            const isWfh = schedule[name]?.includes(day.id) ?? false;
                            return (
                              <TableCell key={day.id}>
                                <div className="flex justify-center items-center">
                                  {isWfh ? (
                                    <House
                                      size={28}
                                      weight="fill"
                                      className="text-gray-300"
                                    />
                                  ) : (
                                    <CheckCircle
                                      size={28}
                                      weight="fill"
                                      className="text-primary-action"
                                    />
                                  )}
                                </div>
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Day balance */}
                <div className="px-6 py-4 border-t border-divider flex gap-6 flex-wrap">
                  {WEEKDAYS.filter((d) => d.allowWfh).map((day) => {
                    const wfh = rowNames.filter((n) =>
                      schedule[n]?.includes(day.id)
                    ).length;
                    return (
                      <div key={day.id} className="flex items-center gap-1">
                        <span className="type-caption text-muted-foreground">
                          {day.label}
                        </span>
                        <span className="type-caption text-muted-foreground">ออฟฟิศ</span>
                        <span className="type-caption-bold text-foreground">
                          {rowNames.length - wfh}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
