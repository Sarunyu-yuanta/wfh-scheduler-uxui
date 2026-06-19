"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckCircleIcon } from "@phosphor-icons/react";
import { TeamAvatar } from "./_components/TeamAvatar";
import {
  Button,
  Avatar,
  AvatarStack,
  Tag,
  Alert,
  Modal,
  BottomSheet,
  LinearProgress,
  Toaster,
  useIsMobile,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
} from "@sarunyu/system-one";
import type { ToastProps, TagVariant } from "@sarunyu/system-one";

// Map each WFH combo to a distinct color — same combo = same color across all rows
const COMBO_COLORS: Record<string, TagVariant> = {
  "mon-tue": "blue",
  "mon-thu": "green",
  "tue-thu": "yellow",
  "fri-tue": "lime",
  "fri-thu": "red",
};
function comboVariant(days: string[]): TagVariant {
  return COMBO_COLORS[[...days].sort().join("-")] ?? "gray";
}
import {
  type DayId,
  type Schedule,
  TEAM_NAMES,
  LOCKED_WFH,
  WEEKDAYS,
  generateSchedule,
  weekDayLabels,
  currentWeekStart,
  currentPeriodLabel,
  SEED_SCHEDULE,
} from "@/lib/schedule";

export default function Page() {
  const isMobile = useIsMobile();
  const weekStart = currentWeekStart();
  const days = weekDayLabels(weekStart);

  const [schedule, setSchedule] = useState<Schedule>(SEED_SCHEDULE);
  const [modalOpen, setModalOpen] = useState(false);
  const [preview, setPreview] = useState<Schedule | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [toasts, setToasts] = useState<Array<ToastProps & { id: string }>>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  useEffect(() => {
    fetch("/api/schedules")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((all: Record<string, Schedule>) =>
        setSchedule(all[weekStart] ?? SEED_SCHEDULE),
      )
      .catch(() => setSchedule(SEED_SCHEDULE));
  }, [weekStart]);

  // Animate progress bar while loading
  useEffect(() => {
    if (!isLoading) return;
    setLoadProgress(0);
    const id = setInterval(() => {
      setLoadProgress((p) => (p < 80 ? p + 14 : p));
    }, 80);
    return () => clearInterval(id);
  }, [isLoading]);

  const openModal = useCallback(() => {
    setPreview(null);
    setIsLoading(false);
    setLoadProgress(0);
    setModalOpen(true);
  }, []);

  const roll = useCallback(() => {
    setIsLoading(true);
    setPreview(null);
    setTimeout(() => {
      setPreview(generateSchedule());
      setLoadProgress(100);
      setIsLoading(false);
    }, 700);
  }, []);

  const undo = useCallback(async () => {
    const r = await fetch("/api/schedules/undo", { method: "POST" });
    if (r.ok) {
      const { schedule: prev } = await r.json();
      setSchedule(prev);
    }
    removeToast("undo-toast");
  }, [removeToast]);

  const confirm = useCallback(async () => {
    if (!preview) return;
    await fetch("/api/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekStart, schedule: preview }),
    });
    setSchedule(preview);
    setModalOpen(false);
    setToasts([
      {
        id: "undo-toast",
        message: "บันทึกตารางใหม่แล้ว",
        actionLabel: "Undo",
        status: "success",
        onActionClick: undo,
        onClose: () => removeToast("undo-toast"),
      },
    ]);
  }, [weekStart, preview, undo, removeToast]);

  const inOfficeCount = (dayId: DayId) =>
    TEAM_NAMES.filter((n) => !schedule[n]?.includes(dayId)).length;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1024px] mx-auto px-6 pt-6 pb-28 sm:pb-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="type-h4 text-foreground">เดือนนี้</h1>
            <p className="type-body-2 text-muted-foreground mt-1">
              {currentPeriodLabel()}
            </p>
          </div>
          {/* Desktop only — mobile uses sticky bar below */}
          <Button
            variant="primary"
            size="xl"
            onClick={openModal}
            className="hidden sm:flex"
          >
            สุ่มตาราง WFH
          </Button>
        </div>

        {/* Day summary cards */}
        <div className="flex gap-3 overflow-x-auto pb-1 -mx-6 px-6 md:mx-0 md:px-0 md:grid md:grid-cols-5 md:overflow-visible mb-6">
          {days.map((day) => {
            const wfhMembers = day.allowWfh
              ? TEAM_NAMES.filter((n) => schedule[n]?.includes(day.id))
              : [];
            const officeMembers = TEAM_NAMES.filter(
              (n) => !wfhMembers.includes(n),
            );
            const toItems = (names: string[]) =>
              names.map((name) => ({
                src: `/avatars/${name.toLowerCase()}.jpeg`,
                alt: name,
                initials: name[0],
              }));
            return (
              <div
                key={day.id}
                className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-3 shrink-0 min-w-[180px] md:min-w-0 md:shrink"
              >
                <p className="type-subtitle-1 text-foreground">{day.label}</p>

                {/* Office + WFH groups — flex-row on mobile, flex-col on desktop */}
                <div className="flex flex-row md:flex-col gap-3">
                  {/* Office group */}
                  <div className="flex flex-col gap-1 flex-1">
                    <p className="type-caption text-muted-foreground">
                      ออฟฟิศ {officeMembers.length} คน
                    </p>
                    <AvatarStack
                      items={toItems(officeMembers)}
                      size="large"
                      max={8}
                    />
                  </div>

                  {/* WFH group */}
                  {day.allowWfh ? (
                    <div className="flex flex-col gap-1 flex-1 pl-3 border-l md:pl-0 md:border-l-0 md:pt-2 md:border-t border-divider">
                      <p className="type-caption text-muted-foreground">
                        WFH {wfhMembers.length} คน
                      </p>
                      {wfhMembers.length > 0 ? (
                        <AvatarStack
                          items={toItems(wfhMembers)}
                          size="large"
                          max={8}
                        />
                      ) : (
                        <p className="type-caption text-muted-foreground">—</p>
                      )}
                    </div>
                  ) : (
                    <Tag text="ห้าม WFH" variant="gray" size="small" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Schedule table */}
        <div className="border-t border-border mt-10 mb-6" />
        <p className="type-h5 text-foreground mb-4">ตาราง WFH</p>
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="table-fixed w-full">
              <TableHead>
                <TableRow>
                  <TableHeaderCell sortable={false} className="w-34" fixed="left" fixedShadow="right">
                    พนักงาน
                  </TableHeaderCell>
                  {days.map((day) => (
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
                    <TableCell fixed="left" fixedShadow="right">
                      <div className="flex items-center gap-3">
                        <TeamAvatar name={name} size="m" />
                        <span className="type-body-2 text-foreground">
                          {name}
                        </span>
                        {LOCKED_WFH[name] && (
                          <Tag text="ล็อควัน" variant="yellow" size="small" />
                        )}
                      </div>
                    </TableCell>
                    {days.map((day) => {
                      const isWfh = schedule[name]?.includes(day.id) ?? false;
                      return (
                        <TableCell key={day.id}>
                          <div className="flex justify-center items-center">
                            {isWfh ? (
                              <CheckCircleIcon
                                size={28}
                                weight="fill"
                                className="text-primary-action"
                              />
                            ) : (
                              <CheckCircleIcon
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
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-6 mt-6">
          <div className="flex items-center gap-2">
            <CheckCircleIcon size={20} weight="fill" className="text-primary-action" />
            <span className="type-caption text-muted-foreground">Work From Home</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircleIcon size={20} weight="fill" className="text-border opacity-20" />
            <span className="type-caption text-muted-foreground">เข้าออฟฟิศ</span>
          </div>
        </div>

        {/* Co-presence section */}
        <div className="border-t border-border mt-10 mb-6" />
        <p className="type-h5 text-foreground mb-4">แต่ละคนจะเจอใครกี่วัน</p>
        {(() => {
          const allDays: DayId[] = ["mon", "tue", "wed", "thu", "fri"];
          const officeDays = (name: string) =>
            allDays.filter((d) => !schedule[name]?.includes(d));
          const overlap = (a: string, b: string) => {
            const setA = new Set(officeDays(a));
            return officeDays(b).filter((d) => setA.has(d)).length;
          };
          const tagVariant = (n: number) =>
            n >= 3
              ? ("green" as const)
              : n === 2
                ? ("blue" as const)
                : ("gray" as const);

          return (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="flex flex-col divide-y divide-divider">
                {TEAM_NAMES.map((name) => {
                  const others = TEAM_NAMES.filter((n) => n !== name)
                    .map((other) => ({ other, days: overlap(name, other) }));

                  // Group by day count descending
                  const grouped = [3, 2, 1, 0]
                    .map((d) => ({
                      days: d,
                      members: others.filter((o) => o.days === d).map((o) => o.other),
                    }))
                    .filter((g) => g.members.length > 0);

                  const toItems = (names: string[]) =>
                    names.map((n) => ({
                      src: `/avatars/${n.toLowerCase()}.jpeg`,
                      alt: n,
                      initials: n[0],
                    }));

                  return (
                    <div key={name} className="flex flex-col gap-4 px-6 py-5">
                      <div className="flex items-center gap-2">
                        <TeamAvatar name={name} size="m" />
                        <span className="type-body-2 text-foreground">{name}</span>
                      </div>
                      <div className="flex flex-col gap-3">
                        {grouped.map(({ days, members }) => (
                          <div key={days} className="flex items-center gap-3">
                            <Tag
                              text={`${days} วัน`}
                              variant={tagVariant(days)}
                              size="large"
                            />
                            <AvatarStack items={toItems(members)} size="large" max={8} />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Rules */}
        <div className="border-t border-border mt-10 mb-6" />
        <div className="bg-muted rounded-2xl p-6">
          <p className="type-subtitle-1 text-foreground mb-3">กฎการสุ่ม</p>
          <ul className="space-y-1">
            {[
              "WFH ได้วันจันทร์ อังคาร พฤหัส หรือศุกร์ (ห้าม WFH วันพุธ)",
              "ห้าม WFH วันจันทร์คู่กับศุกร์ในสัปดาห์เดียวกัน",
              "แต่ละคนได้ WFH สูงสุด 2 วันต่อสัปดาห์",
              "ทุกวันที่ WFH ได้จะมีคนเข้าออฟฟิศ 4 คนพอดี",
              "แต่ละ combo วัน WFH ถูกใช้ไม่เกิน 2 คน เพื่อให้กระจาย",
              "Yim ล็อควัน WFH อังคารและศุกร์ทุกสัปดาห์",
            ].map((rule) => (
              <li key={rule} className="flex items-start gap-2">
                <span className="type-body-2 text-muted-foreground">•</span>
                <span className="type-body-2 text-muted-foreground">
                  {rule}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Sticky bottom bar — mobile only */}
      <div className="fixed bottom-0 left-0 right-0 z-40 sm:hidden bg-card border-t border-border px-6 py-4">
        <Button
          variant="primary"
          size="xl"
          onClick={openModal}
          className="w-full"
        >
          สุ่มตาราง WFH
        </Button>
      </div>

      <Toaster items={toasts} onRemove={removeToast} duration={8000} />

      {/* Shared modal body — used in both Modal (desktop) and BottomSheet (mobile) */}
      {(() => {
        const body = (
          <div className="flex flex-col gap-4">
            {/* ── State 1: Empty ── */}
            {!isLoading && !preview && (
              <div className="bg-muted rounded-2xl px-4 py-8 flex flex-col items-center gap-2">
                <p className="type-h5 text-foreground text-center">
                  พร้อมสุ่มตาราง?
                </p>
                <p className="type-body-2 text-muted-foreground text-center">
                  ระบบจะจัด WFH ให้ทีม 8 คน
                  <br />
                  แบบ balanced ตามกฎที่ตั้งไว้
                </p>
              </div>
            )}

            {/* ── State 2: Loading ── */}
            {isLoading && (
              <div className="bg-muted rounded-2xl px-4 py-8 flex flex-col items-center gap-4">
                <p className="type-h5 text-foreground text-center">
                  กำลังสุ่มตาราง...
                </p>
                <div className="w-full">
                  <LinearProgress value={loadProgress} />
                </div>
              </div>
            )}

            {/* ── State 3: Preview ── */}
            {!isLoading && preview && (
              <>
                {/* Day balance — compact chips */}
                <div className="flex gap-2">
                  {WEEKDAYS.filter((d) => d.allowWfh).map((day) => {
                    const wfh = TEAM_NAMES.filter((n) =>
                      preview[n]?.includes(day.id),
                    ).length;
                    const office = TEAM_NAMES.length - wfh;
                    return (
                      <div
                        key={day.id}
                        className="flex-1 bg-muted rounded-xl py-2 flex flex-col items-center gap-0.5"
                      >
                        <p className="type-caption text-muted-foreground">
                          {day.label}
                        </p>
                        <p className="type-subtitle-1 text-foreground">
                          {office}
                        </p>
                        <p className="type-caption text-muted-foreground">คน</p>
                      </div>
                    );
                  })}
                </div>

                {/* Person list */}
                <div className="rounded-2xl overflow-hidden border border-border">
                  {TEAM_NAMES.map((name, idx) => {
                    const wfhDays = preview[name] ?? [];
                    return (
                      <div
                        key={name}
                        className={`flex items-center justify-between px-4 py-3 bg-card ${
                          idx > 0 ? "border-t border-divider" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <TeamAvatar name={name} size="m" />
                          <div>
                            <p className="type-body-2 text-foreground">
                              {name}
                            </p>
                            {LOCKED_WFH[name] && (
                              <p className="type-caption text-muted-foreground">
                                ล็อควัน
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {wfhDays.length > 0 ? (
                            wfhDays.map((d) => (
                              <Tag
                                key={d}
                                text={
                                  WEEKDAYS.find((w) => w.id === d)?.label ?? d
                                }
                                variant={comboVariant(wfhDays)}
                                size="large"
                              />
                            ))
                          ) : (
                            <Tag text="ออฟฟิศ" variant="gray" size="large" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Alert
                  status="warning"
                  message="ควรกดยืนยันเฉพาะเมื่อต้องการเปลี่ยนตารางรอบเดือนเท่านั้น"
                />
              </>
            )}

            {/* ── Action buttons ── */}
            <div className="flex flex-col gap-2">
              {!preview ? (
                <Button
                  variant="primary"
                  size="xl"
                  onClick={roll}
                  disabled={isLoading}
                >
                  สุ่มตาราง WFH
                </Button>
              ) : (
                <>
                  <Button variant="primary" size="xl" onClick={confirm}>
                    ยืนยันใช้ตารางนี้
                  </Button>
                  <Button variant="outline" size="xl" onClick={roll}>
                    สุ่มตาราง WFH อีกครั้ง
                  </Button>
                </>
              )}
              <Button
                variant="plain"
                size="xl"
                onClick={() => setModalOpen(false)}
              >
                ยกเลิก
              </Button>
            </div>
          </div>
        );

        if (isMobile) {
          return (
            <BottomSheet
              open={modalOpen}
              onOpenChange={(v) => !v && setModalOpen(false)}
              title="สุ่มตาราง WFH ใหม่"
              rightSide="icon"
            >
              {body}
            </BottomSheet>
          );
        }

        return modalOpen ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setModalOpen(false)}
          >
            <div onClick={(e) => e.stopPropagation()}>
              <Modal
                variant="content"
                responsive="desktop"
                actionLayout="none"
                title="สุ่มตาราง WFH ใหม่"
                onClose={() => setModalOpen(false)}
              >
                {body}
              </Modal>
            </div>
          </div>
        ) : null;
      })()}
    </div>
  );
}
