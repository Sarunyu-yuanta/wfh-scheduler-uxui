"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircleIcon, HouseIcon } from "@phosphor-icons/react";
import { TeamAvatar, displayName, avatarStackItem } from "./_components/TeamAvatar";
import {
  Button,
  Avatar,
  AvatarStack,
  Tag,
  Chip,
  Alert,
  Modal,
  BottomSheet,
  LinearProgress,
  Toaster,
  Toggle,
  Checkbox,
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
  "thu-tue": "yellow",
  "fri-tue": "lime",
  "fri-thu": "red",
  "fri-mon": "gray",
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
  VALID_COMBOS,
  generateSchedule,
  weekDayLabels,
  currentWeekStart,
  currentPeriodLabel,
  SEED_SCHEDULE,
  monthWeekStarts,
  monthKeyForOffset,
  monthLabelForOffset,
} from "@/lib/schedule";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PageContent />
    </Suspense>
  );
}

function PageContent() {
  const isMobile = useIsMobile();
  const searchParams = useSearchParams();
  const monthOffset: 0 | 1 = searchParams.get("month") === "next" ? 1 : 0;
  const weekStarts = monthWeekStarts(monthOffset);
  const activeWeekStart = monthOffset === 0 ? currentWeekStart() : weekStarts[0];
  const days = weekDayLabels(activeWeekStart);
  const viewMonthKey = monthKeyForOffset(monthOffset);

  const [scheduleMap, setScheduleMap] = useState<Record<string, Schedule>>({});
  const [schedulesLoaded, setSchedulesLoaded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [rollTarget, setRollTarget] = useState<0 | 1>(0);
  const [hoveredTarget, setHoveredTarget] = useState<0 | 1 | null>(null);
  const [preview, setPreview] = useState<Schedule | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [toasts, setToasts] = useState<Array<ToastProps & { id: string }>>([]);
  const [yimLocked, setYimLocked] = useState(false);
  const [yimCombo, setYimCombo] = useState<DayId[]>(VALID_COMBOS[0]);
  const [yimBoxHovered, setYimBoxHovered] = useState(false);
  const [teamNames, setTeamNames] = useState<string[]>(TEAM_NAMES);
  const [photoKeys, setPhotoKeys] = useState<Record<string, string>>({});
  const [selectedForRoll, setSelectedForRoll] = useState<Set<string>>(
    new Set(TEAM_NAMES),
  );

  const yimIncludedInRoll = selectedForRoll.has("Yim");

  const nextMonthNotGenerated =
    schedulesLoaded && monthOffset === 1 && !scheduleMap[activeWeekStart];
  const schedule: Schedule =
    scheduleMap[activeWeekStart] ?? (monthOffset === 0 ? SEED_SCHEDULE : {});
  const rollTargetWeekStart =
    rollTarget === 0 ? currentWeekStart() : monthWeekStarts(1)[0];
  const existingForRollTarget: Schedule =
    scheduleMap[rollTargetWeekStart] ?? (rollTarget === 0 ? SEED_SCHEDULE : {});
  const rollMonthKey = monthKeyForOffset(rollTarget);

  const removeToast = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const refreshSchedules = useCallback(() => {
    return fetch("/api/schedules")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((all: Record<string, Schedule>) => setScheduleMap(all))
      .catch(() => {})
      .finally(() => setSchedulesLoaded(true));
  }, []);

  useEffect(() => {
    refreshSchedules();
  }, [refreshSchedules]);

  useEffect(() => {
    fetch("/api/team")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: { names: string[]; photoKeys: Record<string, string> }) => {
        setTeamNames(data.names);
        setPhotoKeys(data.photoKeys);
        setSelectedForRoll(new Set(data.names));
      })
      .catch(() => {});
  }, []);

  const toggleRollMember = useCallback((name: string) => {
    setSelectedForRoll((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  // If Yim gets excluded from this roll, locking her combo no longer applies
  useEffect(() => {
    if (!yimIncludedInRoll && yimLocked) {
      setYimLocked(false);
    }
  }, [yimIncludedInRoll, yimLocked]);

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
    setIsConfirming(false);
    setLoadProgress(0);
    setRollTarget(monthOffset);
    setYimLocked(false);
    setYimCombo(VALID_COMBOS[0]);
    setSelectedForRoll(new Set(teamNames));
    setModalOpen(true);
  }, [monthOffset, teamNames]);

  const roll = useCallback(() => {
    setIsLoading(true);
    setPreview(null);
    const names = Array.from(selectedForRoll);
    const locked: Record<string, DayId[]> =
      yimLocked && selectedForRoll.has("Yim") ? { Yim: yimCombo } : {};
    // People left out of this roll keep their existing days — feed those in
    // so the balance target accounts for the whole team, not just this subset.
    const otherFixed: Record<string, DayId[]> = Object.fromEntries(
      teamNames
        .filter((n) => !selectedForRoll.has(n))
        .map((n) => [n, existingForRollTarget[n] ?? []])
        .filter(([, days]) => (days as DayId[]).length > 0),
    );
    setTimeout(() => {
      setPreview(generateSchedule(names, locked, otherFixed));
      setLoadProgress(100);
      setIsLoading(false);
    }, 700);
  }, [selectedForRoll, yimLocked, yimCombo, teamNames, existingForRollTarget]);

  const undo = useCallback(async (offset: 0 | 1) => {
    setIsUndoing(true);
    setToasts((t) =>
      t.map((toast) =>
        toast.id === "undo-toast"
          ? {
              ...toast,
              message: "กำลังยกเลิก...",
              actionLabel: undefined,
              onActionClick: undefined,
            }
          : toast,
      ),
    );
    try {
      const monthKey = monthKeyForOffset(offset);
      const r = await fetch("/api/schedules/undo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthKey }),
      });
      if (r.ok) {
        await refreshSchedules();
      }
      removeToast("undo-toast");
    } finally {
      setIsUndoing(false);
    }
  }, [removeToast, refreshSchedules]);

  const confirm = useCallback(async () => {
    if (!preview) return;
    const offset = rollTarget;
    setIsConfirming(true);
    try {
      // People left out of this roll keep whatever they already had; only
      // still-active team members carry forward into the saved schedule.
      const merged: Schedule = { ...existingForRollTarget, ...preview };
      const finalSchedule: Schedule = Object.fromEntries(
        Object.entries(merged).filter(([name]) => teamNames.includes(name)),
      );
      await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStarts: monthWeekStarts(offset), schedule: finalSchedule }),
      });
      await refreshSchedules();
      setModalOpen(false);
      setToasts([
        {
          id: "undo-toast",
          message:
            offset === 0
              ? "บันทึกตารางใหม่แล้ว"
              : `บันทึกตารางเดือน ${monthLabelForOffset(1)} แล้ว`,
          actionLabel: "Undo",
          status: "success",
          onActionClick: () => undo(offset),
          onClose: () => removeToast("undo-toast"),
        },
      ]);
    } finally {
      setIsConfirming(false);
    }
  }, [rollTarget, preview, existingForRollTarget, teamNames, undo, removeToast, refreshSchedules]);

  const inOfficeCount = (dayId: DayId) =>
    teamNames.filter((n) => !schedule[n]?.includes(dayId)).length;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1024px] mx-auto px-6 pt-6 pb-28 sm:pb-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="type-h4 text-foreground">
              {monthOffset === 0 ? "เดือนนี้" : "เดือนหน้า"}
            </h1>
            <p className="type-body-2 text-muted-foreground mt-1">
              {monthOffset === 0 ? currentPeriodLabel() : monthLabelForOffset(1)}
            </p>
          </div>
          {/* Desktop only — mobile uses sticky bar below */}
          <Button
            variant="primary"
            size="xl"
            onClick={openModal}
            className="hidden sm:flex"
          >
            สุ่มตาราง
          </Button>
        </div>

        {!schedulesLoaded ? (
          <div className="animate-pulse">
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-6 px-6 md:mx-0 md:px-0 md:grid md:grid-cols-5 md:overflow-visible mb-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-muted rounded-2xl p-4 h-40 shrink-0 min-w-[180px] md:min-w-0 md:shrink"
                />
              ))}
            </div>
            <div className="bg-muted rounded-2xl h-64" />
          </div>
        ) : nextMonthNotGenerated ? (
          <div className="bg-muted rounded-2xl px-4 py-10 flex flex-col items-center gap-3 mb-6">
            <p className="type-h5 text-foreground text-center">
              ยังไม่มีตารางสำหรับ{monthLabelForOffset(1)}
            </p>
            <p className="type-body-2 text-muted-foreground text-center">
              กดสุ่มตาราง WFH เพื่อเตรียมตารางล่วงหน้าไว้ก่อนได้เลย
            </p>
            <Button variant="primary" size="lg" onClick={openModal} className="mt-2">
              สุ่มตาราง
            </Button>
          </div>
        ) : (
          <>
        {/* Day summary cards */}
        <div className="flex gap-3 overflow-x-auto pb-1 -mx-6 px-6 md:mx-0 md:px-0 md:grid md:grid-cols-5 md:overflow-visible mb-6">
          {days.map((day) => {
            const wfhMembers = day.allowWfh
              ? teamNames.filter((n) => schedule[n]?.includes(day.id))
              : [];
            const officeMembers = teamNames.filter(
              (n) => !wfhMembers.includes(n),
            );
            const toItems = (names: string[]) => names.map((name) => avatarStackItem(name, photoKeys[name] ?? name, viewMonthKey));
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
                      max={teamNames.length}
                    />
                  </div>

                  {/* WFH group */}
                  {day.allowWfh ? (
                    <div className="flex flex-col gap-1 flex-1 pl-3 md:pl-0 md:pt-2">
                      <p className="type-caption text-muted-foreground">
                        WFH {wfhMembers.length} คน
                      </p>
                      {wfhMembers.length > 0 ? (
                        <AvatarStack
                          items={toItems(wfhMembers)}
                          size="large"
                          max={teamNames.length}
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
        <p className="type-h5 text-foreground mb-4">ตารางเข้าออฟฟิศ</p>
        <div className="relative bg-card border border-border rounded-2xl overflow-hidden">
          {isUndoing && (
            <div
              className="absolute inset-0 z-10 flex items-center justify-center gap-2"
              style={{ backgroundColor: "rgba(255,255,255,0.75)" }}
            >
              <div
                className="h-4 w-4 rounded-full animate-spin"
                style={{
                  border: "2px solid rgba(127,127,127,0.3)",
                  borderTopColor: "rgba(80,80,80,0.9)",
                }}
              />
              <p className="type-body-2 text-foreground">กำลังยกเลิก...</p>
            </div>
          )}
          <div className="overflow-x-auto">
            <Table className="table-fixed w-full">
              <TableHead>
                <TableRow>
                  <TableHeaderCell
                    sortable={false}
                    className="w-34"
                    fixed="left"
                    fixedShadow="right"
                  >
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
                {teamNames.map((name) => (
                  <TableRow key={name}>
                    <TableCell fixed="left" fixedShadow="right">
                      <div className="flex items-center gap-3">
                        <TeamAvatar name={name} photoKey={photoKeys[name] ?? name} size="m" monthKey={viewMonthKey} />
                        <span className="type-body-2 text-foreground">
                          {displayName(name, viewMonthKey)}
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
                              <HouseIcon
                                size={28}
                                weight="fill"
                                className="text-gray-300"
                              />
                            ) : (
                              <CheckCircleIcon
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
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-6 mt-6">
          <div className="flex items-center gap-2">
            <CheckCircleIcon
              size={20}
              weight="fill"
              className="text-primary-action"
            />
            <span className="type-caption text-muted-foreground">
              เข้าออฟฟิศ
            </span>
          </div>
          <div className="flex items-center gap-2">
            <HouseIcon
              size={20}
              weight="fill"
              className="text-gray-300"
            />
            <span className="type-caption text-muted-foreground">
              Work From Home
            </span>
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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {teamNames.map((name) => {
                const others = teamNames.filter((n) => n !== name).map(
                  (other) => ({ other, days: overlap(name, other) }),
                );

                // Group by day count descending
                const grouped = [3, 2, 1, 0]
                  .map((d) => ({
                    days: d,
                    members: others
                      .filter((o) => o.days === d)
                      .map((o) => o.other),
                  }))
                  .filter((g) => g.members.length > 0);

                const toItems = (names: string[]) => names.map((n) => avatarStackItem(n, photoKeys[n] ?? n, viewMonthKey));

                return (
                  <div
                    key={name}
                    className="bg-card border border-border rounded-xl p-3 flex flex-col gap-3"
                  >
                    <div className="flex items-center gap-2">
                      <TeamAvatar name={name} photoKey={photoKeys[name] ?? name} size="s" monthKey={viewMonthKey} />
                      <span className="type-body-2 text-foreground truncate">
                        {displayName(name, viewMonthKey)}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {grouped.map(({ days, members }) => (
                        <div key={days} className="flex items-center gap-1.5 flex-wrap">
                          <Tag
                            text={`${days} วัน`}
                            variant={tagVariant(days)}
                            size="small"
                          />
                          <AvatarStack
                            items={toItems(members)}
                            size="small"
                            max={teamNames.length}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
          </>
        )}

        {/* Rules */}
        <div className="border-t border-border mt-10 mb-6" />
        <div className="bg-muted rounded-2xl p-6">
          <p className="type-subtitle-1 text-foreground mb-3">กฎการสุ่ม</p>
          <ul className="space-y-1">
            {[
              "WFH ได้วันจันทร์ อังคาร พฤหัส หรือศุกร์ (ห้าม WFH วันพุธ)",
              "แต่ละคนได้ WFH สูงสุด 2 วันต่อสัปดาห์",
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
          สุ่มตาราง
        </Button>
      </div>

      <Toaster items={toasts} onRemove={removeToast} duration={8000} />

      {/* Shared modal body — used in both Modal (desktop) and BottomSheet (mobile) */}
      {(() => {
        const modalTitle = preview
          ? rollTarget === 0
            ? "สุ่มตาราง WFH ใหม่ (เดือนนี้)"
            : `สุ่มตาราง WFH ใหม่ (${monthLabelForOffset(1)})`
          : "สุ่มตาราง WFH ใหม่";
        const body = (
          <div className="flex flex-col gap-4">
            {/* ── Target month picker (segmented control) — only before rolling ── */}
            {!preview && (
              <div className="inline-flex bg-muted rounded-full p-1 gap-1 self-center">
                <button
                  type="button"
                  onClick={() => setRollTarget(0)}
                  onMouseEnter={() => setHoveredTarget(0)}
                  onMouseLeave={() => setHoveredTarget(null)}
                  style={
                    rollTarget !== 0 && hoveredTarget === 0
                      ? { backgroundColor: "rgba(127,127,127,0.12)" }
                      : undefined
                  }
                  className={`px-4 py-1.5 rounded-full type-body-2 transition-colors cursor-pointer ${
                    rollTarget === 0
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground"
                  }`}
                >
                  เดือนนี้
                </button>
                <button
                  type="button"
                  onClick={() => setRollTarget(1)}
                  onMouseEnter={() => setHoveredTarget(1)}
                  onMouseLeave={() => setHoveredTarget(null)}
                  style={
                    rollTarget !== 1 && hoveredTarget === 1
                      ? { backgroundColor: "rgba(127,127,127,0.12)" }
                      : undefined
                  }
                  className={`px-4 py-1.5 rounded-full type-body-2 transition-colors cursor-pointer ${
                    rollTarget === 1
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground"
                  }`}
                >
                  เดือนหน้า ({monthLabelForOffset(1)})
                </button>
              </div>
            )}

            {/* ── Roster picker: choose who's in this roll, add members ── */}
            {!isLoading && !preview && (
              <div className="bg-primary-action-light rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="type-subtitle-1 text-foreground">
                    เลือกคนที่จะสุ่มตาราง
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="type-caption text-muted-foreground">
                      {selectedForRoll.size}/{teamNames.length} คน
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedForRoll(
                          selectedForRoll.size === teamNames.length
                            ? new Set()
                            : new Set(teamNames),
                        )
                      }
                      className="type-caption text-primary-action cursor-pointer hover:underline"
                    >
                      {selectedForRoll.size === teamNames.length
                        ? "เลือกออกทั้งหมด"
                        : "เลือกทั้งหมด"}
                    </button>
                  </div>
                </div>
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="roster-scroll flex flex-col divide-y divide-divider max-h-[212px] overflow-y-auto">
                    {[...teamNames]
                      .sort(
                        (a, b) =>
                          Number(displayName(a, rollMonthKey) === "Anonymous") -
                          Number(displayName(b, rollMonthKey) === "Anonymous"),
                      )
                      .map((name) => (
                      <div
                        key={name}
                        onClick={() => toggleRollMember(name)}
                        className="w-full px-3 py-2.5 hover:bg-muted transition-colors flex items-center justify-between gap-2 cursor-pointer"
                      >
                        <span className="flex items-center gap-2 type-body-2 text-foreground">
                          <TeamAvatar name={name} photoKey={photoKeys[name] ?? name} size="s" monthKey={rollMonthKey} />
                          {displayName(name, rollMonthKey)}
                        </span>
                        <div onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedForRoll.has(name)}
                            onChange={() => toggleRollMember(name)}
                            ariaLabel={displayName(name, rollMonthKey)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Lock a combo for Yim before rolling ── */}
            {!preview && (
              <div
                onMouseEnter={() => setYimBoxHovered(true)}
                onMouseLeave={() => setYimBoxHovered(false)}
                style={
                  !yimLocked && yimBoxHovered && yimIncludedInRoll
                    ? { borderColor: "rgba(0,0,0,0.35)" }
                    : undefined
                }
                className={`border border-dashed rounded-2xl p-4 flex flex-col gap-3 transition-colors ${
                  yimLocked ? "border-primary-action" : "border-border"
                } ${!yimIncludedInRoll ? "opacity-50" : ""}`}
              >
                <Toggle
                  checked={yimLocked}
                  onChange={setYimLocked}
                  disabled={!yimIncludedInRoll}
                  label={
                    <span className="flex items-center gap-2">
                      <span className="type-subtitle-1 text-foreground">
                        ล็อควันให้ Yim
                      </span>
                      <Tag text="Optional" variant="gray" size="small" />
                    </span>
                  }
                />
                {yimLocked && (
                  <div className="flex flex-wrap gap-2">
                    {VALID_COMBOS.map((combo) => {
                      const isSelected =
                        combo.join(",") === yimCombo.join(",");
                      return (
                        <Chip
                          key={combo.join("-")}
                          label={combo
                            .map(
                              (d) =>
                                WEEKDAYS.find((w) => w.id === d)?.short ?? d,
                            )
                            .join(" + ")}
                          size="small"
                          selected={isSelected}
                          onClick={() => setYimCombo(combo)}
                        />
                      );
                    })}
                  </div>
                )}
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
                    const wfh = teamNames.filter((n) =>
                      (preview[n] ?? existingForRollTarget[n])?.includes(day.id),
                    ).length;
                    const office = teamNames.length - wfh;
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

                {/* Person list — only people included in this roll */}
                <div className="rounded-2xl overflow-hidden border border-border">
                  {teamNames.filter((name) => name in preview).map((name, idx) => {
                    const wfhDays = preview[name] ?? [];
                    return (
                      <div
                        key={name}
                        className={`flex items-center justify-between px-4 py-3 bg-card ${
                          idx > 0 ? "border-t border-divider" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <TeamAvatar name={name} photoKey={photoKeys[name] ?? name} size="m" monthKey={rollMonthKey} />
                          <div>
                            <p className="type-body-2 text-foreground">
                              {displayName(name, rollMonthKey)}
                            </p>
                            {(LOCKED_WFH[name] || (name === "Yim" && yimLocked)) && (
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
                  disabled={isLoading || selectedForRoll.size === 0}
                >
                  สุ่มตาราง
                </Button>
              ) : (
                <>
                  <Button
                    variant="primary"
                    size="xl"
                    onClick={confirm}
                    disabled={isConfirming}
                  >
                    {isConfirming ? "กำลังบันทึก..." : "ยืนยันใช้ตารางนี้"}
                  </Button>
                  <Button
                    variant="outline"
                    size="xl"
                    onClick={roll}
                    disabled={isConfirming}
                  >
                    สุ่มตารางอีกครั้ง
                  </Button>
                </>
              )}
              <Button
                variant="plain"
                size="xl"
                onClick={() => setModalOpen(false)}
                disabled={isConfirming}
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
              title={modalTitle}
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
                title={modalTitle}
                onClose={() => setModalOpen(false)}
                className="min-w-[440px]"
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
