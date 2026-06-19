"use client";

import { useState, useEffect } from "react";
import { CheckCircle } from "@phosphor-icons/react";
import { TeamAvatar } from "../_components/TeamAvatar";
import {
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
} from "@/lib/schedule";

export default function HistoryPage() {
  const [allWeeks, setAllWeeks] = useState<Record<string, Schedule>>({});
  const thisWeek = currentWeekStart();

  useEffect(() => {
    fetch("/api/schedules")
      .then((r) => r.json())
      .then((data: Record<string, Schedule>) => setAllWeeks(data));
  }, []);

  const months = groupWeeksByMonth(Object.keys(allWeeks));

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1024px] mx-auto px-6 pt-6 pb-8">
        <h1 className="type-h4 text-foreground mb-8">ประวัติรายเดือน</h1>

        {months.length === 0 && (
          <p className="type-body-2 text-muted-foreground">ยังไม่มีข้อมูล</p>
        )}

        {months.map(({ label, weeks }) => {
          const isCurrentMonth = weeks.includes(thisWeek);
          const representativeWeek = isCurrentMonth
            ? thisWeek
            : weeks[weeks.length - 1];
          const schedule = allWeeks[representativeWeek] ?? {};

          return (
            <div key={label} className="mb-10">
              <div className="bg-card border border-border rounded-2xl overflow-hidden">

                {/* Month header */}
                <div className="px-6 pt-6 pb-4 flex items-center gap-3">
                  <p className="type-h5 text-foreground">{label}</p>
                  {isCurrentMonth && (
                    <Tag text="เดือนปัจจุบัน" variant="blue" size="small" />
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
                      {TEAM_NAMES.map((name) => (
                        <TableRow key={name}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <TeamAvatar name={name} size="m" />
                              <span className="type-body-2 text-foreground">{name}</span>
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
                                    <CheckCircle
                                      size={28}
                                      weight="fill"
                                      className="text-primary-action"
                                    />
                                  ) : (
                                    <CheckCircle
                                      size={28}
                                      weight="fill"
                                      className="text-border opacity-5"
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
                    const wfh = TEAM_NAMES.filter((n) =>
                      schedule[n]?.includes(day.id)
                    ).length;
                    return (
                      <div key={day.id} className="flex items-center gap-1">
                        <span className="type-caption text-muted-foreground">
                          {day.label}
                        </span>
                        <span className="type-caption text-muted-foreground">ออฟฟิศ</span>
                        <span className="type-caption-bold text-foreground">
                          {TEAM_NAMES.length - wfh}
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
