"use client";

import { useCallback, useEffect, useState } from "react";
import { DotsThreeVerticalIcon, PlusIcon } from "@phosphor-icons/react";
import { TeamAvatar, displayName } from "../_components/TeamAvatar";
import {
  Button,
  Input,
  Popover,
  Modal,
  BottomSheet,
  Toaster,
  useIsMobile,
} from "@sarunyu/system-one";
import type { ToastProps } from "@sarunyu/system-one";
import { TEAM_NAMES } from "@/lib/schedule";

function MemberMenuItems({
  onRename,
  onDelete,
}: {
  onRename: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={onRename}
        className="w-full text-left px-2.5 py-2 rounded-md type-body-2 text-foreground hover:bg-muted active:bg-muted transition-colors cursor-pointer"
      >
        เปลี่ยนชื่อ
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="w-full text-left px-2.5 py-2 rounded-md type-body-2 text-destructive hover:bg-muted active:bg-muted transition-colors cursor-pointer"
      >
        ลบสมาชิก
      </button>
    </div>
  );
}

export default function TeamPage() {
  const isMobile = useIsMobile();
  const [teamNames, setTeamNames] = useState<string[]>(TEAM_NAMES);
  const [loaded, setLoaded] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toasts, setToasts] = useState<Array<ToastProps & { id: string }>>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const notify = useCallback((message: string, status: ToastProps["status"] = "success") => {
    const id = `team-${message}-${Math.random().toString(36).slice(2)}`;
    setToasts((t) => [...t, { id, message, status, onClose: () => removeToast(id) }]);
  }, [removeToast]);

  useEffect(() => {
    fetch("/api/team")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: { names: string[] }) => setTeamNames(data.names))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const visibleNames = teamNames;

  const addMember = useCallback(async () => {
    const name = newMemberName.trim();
    if (!name) return;
    setIsAddingMember(true);
    try {
      const r = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (r.ok) {
        const data: { names: string[] } = await r.json();
        setTeamNames(data.names);
        setNewMemberName("");
        setAddMemberOpen(false);
        notify(`เพิ่ม ${name} แล้ว`);
      }
    } finally {
      setIsAddingMember(false);
    }
  }, [newMemberName, notify]);

  const closeAddMember = useCallback(() => {
    if (isAddingMember) return;
    setAddMemberOpen(false);
  }, [isAddingMember]);

  const startRename = useCallback((name: string) => {
    setRenameTarget(name);
    setRenameValue(name);
    setRenameError(null);
    setOpenMenuFor(null);
  }, []);

  const closeRename = useCallback(() => {
    if (isRenaming) return;
    setRenameTarget(null);
  }, [isRenaming]);

  const confirmRename = useCallback(async () => {
    if (!renameTarget) return;
    const trimmed = renameValue.trim();
    if (!trimmed) return;
    setIsRenaming(true);
    try {
      const r = await fetch("/api/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldName: renameTarget, newName: trimmed }),
      });
      const data = await r.json();
      if (r.ok) {
        setTeamNames(data.names);
        setRenameTarget(null);
        notify(`เปลี่ยนชื่อเป็น ${trimmed} แล้ว`);
      } else {
        setRenameError(data.error ?? "เปลี่ยนชื่อไม่สำเร็จ");
      }
    } catch {
      setRenameError("เปลี่ยนชื่อไม่สำเร็จ");
    } finally {
      setIsRenaming(false);
    }
  }, [renameTarget, renameValue, notify]);

  const startDelete = useCallback((name: string) => {
    setDeleteTarget(name);
    setOpenMenuFor(null);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const r = await fetch("/api/team", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: deleteTarget }),
      });
      if (r.ok) {
        const data: { names: string[] } = await r.json();
        setTeamNames(data.names);
        notify(`ลบ ${displayName(deleteTarget)} แล้ว`);
      }
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  }, [deleteTarget, notify]);

  const addMemberBody = (
    <div className="flex flex-col gap-4">
      <Input
        label="ชื่อสมาชิก"
        value={newMemberName}
        onChange={setNewMemberName}
        placeholder="ใส่ชื่อคนที่ต้องการเพิ่ม"
      />
      <Button
        variant="primary"
        size="xl"
        onClick={addMember}
        disabled={!newMemberName.trim() || isAddingMember}
      >
        {isAddingMember ? "กำลังเพิ่ม..." : "เพิ่ม"}
      </Button>
    </div>
  );

  const renameBody = (
    <div className="flex flex-col gap-4">
      <Input
        label="ชื่อสมาชิก"
        value={renameValue}
        onChange={(v) => {
          setRenameValue(v);
          setRenameError(null);
        }}
        placeholder="ชื่อใหม่"
        forceState={renameError ? "error" : "default"}
        errorMessage={renameError ?? undefined}
      />
      <Button
        variant="primary"
        size="xl"
        onClick={confirmRename}
        disabled={!renameValue.trim() || isRenaming}
      >
        {isRenaming ? "กำลังบันทึก..." : "บันทึก"}
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1024px] mx-auto px-6 pt-8 pb-16">
        <div className="flex items-start justify-between gap-3 mb-8">
          <div>
            <h1 className="type-h4 text-foreground mb-1">Team Member</h1>
            <p className="type-body-2 text-muted-foreground">
              {loaded ? `สมาชิกทีมทั้งหมด ${visibleNames.length} คน` : "กำลังโหลด..."}
            </p>
          </div>
          <Button
            variant="primary"
            size="lg"
            leftIcon={<PlusIcon size={18} weight="bold" />}
            onClick={() => setAddMemberOpen(true)}
          >
            เพิ่มสมาชิก
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {!loaded
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="bg-muted rounded-2xl h-32 animate-pulse" />
              ))
            : visibleNames.map((name) => {
                const menuButton = (
                  <Button
                    size="icon-xs"
                    variant="plain-black"
                    aria-label="ตัวเลือกเพิ่มเติม"
                    onClick={isMobile ? () => setOpenMenuFor(name) : undefined}
                  >
                    <DotsThreeVerticalIcon size={18} weight="bold" />
                  </Button>
                );
                return (
                  <div
                    key={name}
                    className="relative bg-card border border-border rounded-2xl p-4 flex flex-col items-center gap-2"
                  >
                    <div className="absolute top-2 right-2">
                      {isMobile ? (
                        menuButton
                      ) : (
                        <Popover
                          open={openMenuFor === name}
                          onOpenChange={(open) => setOpenMenuFor(open ? name : null)}
                          side="bottom"
                          align="end"
                          className="w-36"
                          content={
                            <div className="-m-3 p-1">
                              <MemberMenuItems
                                onRename={() => startRename(name)}
                                onDelete={() => startDelete(name)}
                              />
                            </div>
                          }
                        >
                          {menuButton}
                        </Popover>
                      )}
                    </div>
                    <TeamAvatar name={name} size="xl" />
                    <span className="type-body-2 text-foreground text-center truncate w-full">
                      {displayName(name)}
                    </span>
                  </div>
                );
              })}
        </div>
      </div>

      <Toaster items={toasts} onRemove={removeToast} duration={5000} />

      {/* Add member */}
      {isMobile ? (
        <BottomSheet
          open={addMemberOpen}
          onOpenChange={(v) => !v && closeAddMember()}
          title="เพิ่มสมาชิก"
          rightSide="icon"
        >
          {addMemberBody}
        </BottomSheet>
      ) : addMemberOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={closeAddMember}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <Modal
              variant="content"
              responsive="desktop"
              actionLayout="none"
              title="เพิ่มสมาชิก"
              onClose={closeAddMember}
              className="min-w-[360px]"
            >
              {addMemberBody}
            </Modal>
          </div>
        </div>
      ) : null}

      {/* Mobile action sheet (shared across cards) */}
      {isMobile && (
        <BottomSheet
          open={openMenuFor !== null}
          onOpenChange={(v) => !v && setOpenMenuFor(null)}
          title={openMenuFor ? displayName(openMenuFor) : ""}
          rightSide="icon"
        >
          {openMenuFor && (
            <MemberMenuItems
              onRename={() => startRename(openMenuFor)}
              onDelete={() => startDelete(openMenuFor)}
            />
          )}
        </BottomSheet>
      )}

      {/* Rename */}
      {isMobile ? (
        <BottomSheet
          open={renameTarget !== null}
          onOpenChange={(v) => !v && closeRename()}
          title="เปลี่ยนชื่อ"
          rightSide="icon"
        >
          {renameBody}
        </BottomSheet>
      ) : renameTarget !== null ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={closeRename}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <Modal
              variant="content"
              responsive="desktop"
              actionLayout="none"
              title="เปลี่ยนชื่อ"
              onClose={closeRename}
              className="min-w-[360px]"
            >
              {renameBody}
            </Modal>
          </div>
        </div>
      ) : null}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !isDeleting && setDeleteTarget(null)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <Modal
              variant="dialog"
              actionLayout="double"
              title="ลบสมาชิก"
              description={`ต้องการลบ ${displayName(deleteTarget)} ออกจากทีมใช่ไหม`}
              primaryLabel={isDeleting ? "กำลังลบ..." : "ลบ"}
              secondaryLabel="ยกเลิก"
              onPrimaryClick={confirmDelete}
              onSecondaryClick={() => setDeleteTarget(null)}
              onClose={() => setDeleteTarget(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
