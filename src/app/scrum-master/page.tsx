"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { TeamAvatar, displayName } from "../_components/TeamAvatar";
import {
  Button,
  Checkbox,
  Toaster,
  Modal,
  BottomSheet,
  useIsMobile,
} from "@sarunyu/system-one";
import type { ToastProps } from "@sarunyu/system-one";
import { Wheel, type WheelHandle } from "./_components/Wheel";
import { TEAM_NAMES } from "@/lib/schedule";

export default function ScrumMasterPage() {
  const isMobile = useIsMobile();
  const [teamNames, setTeamNames] = useState<string[]>(TEAM_NAMES);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(TEAM_NAMES));
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [toasts, setToasts] = useState<Array<ToastProps & { id: string }>>([]);
  const wheelRef = useRef<WheelHandle>(null);

  const removeToast = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  useEffect(() => {
    fetch("/api/team")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: { names: string[] }) => {
        setTeamNames(data.names);
        setSelected(new Set(data.names));
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const toggle = useCallback((name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const participants = teamNames.filter((n) => selected.has(n));
  const slices = participants.map((name) => ({ key: name, label: displayName(name) }));

  const spin = useCallback(() => {
    if (participants.length < 2 || spinning) return;
    setResultOpen(false);
    setWinner(null);
    setConfirmed(false);
    setSpinning(true);
    const idx = Math.floor(Math.random() * participants.length);
    wheelRef.current?.spinTo(idx);
  }, [participants.length, spinning]);

  const handleSpinEnd = useCallback(
    (index: number) => {
      setSpinning(false);
      setWinner(participants[index] ?? null);
      setResultOpen(true);
    },
    [participants],
  );

  const confirmWinner = useCallback(() => {
    if (!winner) return;
    setConfirmed(true);
    setResultOpen(false);
    setToasts([
      {
        id: "scrum-master-confirmed",
        message: `ยืนยัน ${displayName(winner)} เป็น Scrum Master ประจำสัปดาห์นี้แล้ว`,
        status: "success",
        onClose: () => removeToast("scrum-master-confirmed"),
      },
    ]);
  }, [winner, removeToast]);

  const spinAgain = useCallback(() => {
    setResultOpen(false);
    spin();
  }, [spin]);

  const resultBody = winner && (
    <div className="flex flex-col gap-4 items-center">
      <TeamAvatar name={winner} size="xl" />
      <div className="text-center">
        <p className="type-caption text-muted-foreground">
          Scrum Master ประจำสัปดาห์นี้
        </p>
        <p className="type-h4 text-foreground">{displayName(winner)}</p>
      </div>
      <div className="flex flex-col gap-2 w-full">
        <Button variant="primary" size="xl" onClick={confirmWinner}>
          ยืนยัน
        </Button>
        <Button variant="outline" size="xl" onClick={spinAgain}>
          สุ่มใหม่
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1024px] mx-auto px-6 pt-8 pb-16">
        <h1 className="type-h4 text-foreground mb-1">Scrum Master Scheduler</h1>
        <p className="type-body-2 text-muted-foreground mb-8">
          เลือกคนที่จะเข้าสุ่ม แล้วหมุนวงล้อหา Scrum Master ประจำสัปดาห์
        </p>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Roster picker */}
          <div className="lg:w-80 shrink-0">
            <div className="bg-primary-action-light rounded-2xl p-4 flex flex-col gap-3">
              {!loaded ? (
                <div className="bg-muted rounded-xl h-64 animate-pulse" />
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="type-subtitle-1 text-foreground">เลือกคนที่จะเข้าสุ่ม</p>
                    <div className="flex items-center gap-2">
                      <span className="type-caption text-muted-foreground">
                        {selected.size}/{teamNames.length} คน
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setSelected(
                            selected.size === teamNames.length
                              ? new Set()
                              : new Set(teamNames),
                          )
                        }
                        className="type-caption text-primary-action cursor-pointer hover:underline"
                      >
                        {selected.size === teamNames.length
                          ? "เลือกออกทั้งหมด"
                          : "เลือกทั้งหมด"}
                      </button>
                    </div>
                  </div>

                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="roster-scroll flex flex-col divide-y divide-divider max-h-[400px] overflow-y-auto">
                    {teamNames.map((name) => (
                      <div
                        key={name}
                        onClick={() => toggle(name)}
                        className="w-full px-3 py-2.5 hover:bg-muted transition-colors flex items-center justify-between gap-2 cursor-pointer"
                      >
                        <span className="flex items-center gap-2 type-body-2 text-foreground">
                          <TeamAvatar name={name} size="s" />
                          {displayName(name)}
                        </span>
                        <div onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selected.has(name)}
                            onChange={() => toggle(name)}
                            ariaLabel={displayName(name)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                </>
              )}
            </div>
          </div>

          {/* Wheel */}
          <div className="flex-1 flex flex-col items-center gap-6 pt-2">
            {!loaded ? (
              <div className="w-full max-w-[340px] aspect-square rounded-full bg-muted animate-pulse" />
            ) : participants.length < 2 ? (
              <div className="bg-muted rounded-2xl px-6 flex items-center justify-center text-center w-full max-w-sm aspect-square">
                <p className="type-body-2 text-muted-foreground">
                  เลือกคนอย่างน้อย 2 คน
                  <br />
                  เพื่อเริ่มหมุนวงล้อ
                </p>
              </div>
            ) : (
              <Wheel ref={wheelRef} slices={slices} onSpinEnd={handleSpinEnd} size={340} />
            )}

            <Button
              variant="primary"
              size="xl"
              onClick={spin}
              disabled={!loaded || spinning || participants.length < 2}
            >
              {!loaded
                ? "กำลังโหลด..."
                : spinning
                  ? "กำลังหมุน..."
                  : confirmed
                    ? "หมุนใหม่"
                    : "หมุนวงล้อ"}
            </Button>
          </div>
        </div>
      </div>

      <Toaster items={toasts} onRemove={removeToast} duration={5000} />

      {isMobile ? (
        <BottomSheet
          open={resultOpen}
          onOpenChange={(v) => !v && setResultOpen(false)}
          title="ผลการสุ่ม"
          rightSide="icon"
        >
          {resultBody}
        </BottomSheet>
      ) : resultOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setResultOpen(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <Modal
              variant="content"
              responsive="desktop"
              actionLayout="none"
              title="ผลการสุ่ม"
              onClose={() => setResultOpen(false)}
              className="min-w-[380px]"
            >
              {resultBody}
            </Modal>
          </div>
        </div>
      ) : null}
    </div>
  );
}
