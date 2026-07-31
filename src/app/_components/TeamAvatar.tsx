"use client";

import { useState, useEffect } from "react";
import { Avatar, type AvatarStackItem } from "@sarunyu/system-one";
import { monthKeyForOffset } from "@/lib/schedule";

export type AvatarSize = "xxs" | "xs" | "s" | "m" | "l" | "xl" | "xxl";

// This seat changed hands — the new person shows as anonymous starting the
// given month ("YYYY-MM"), while that month and everything before it still
// shows the previous occupant.
const REPLACED_FROM_MONTH: Record<string, string> = { Art: "2026-08" };

function isReplaced(name: string, monthKey: string): boolean {
  const from = REPLACED_FROM_MONTH[name];
  return from !== undefined && monthKey >= from;
}

export function displayName(name: string, monthKey: string = monthKeyForOffset(0)): string {
  return isReplaced(name, monthKey) ? "Anonymous" : name;
}

export function avatarStackItem(
  name: string,
  monthKey: string = monthKeyForOffset(0),
): AvatarStackItem {
  if (isReplaced(name, monthKey)) {
    return { type: "placeholder" };
  }
  return { src: `/avatars/${name.toLowerCase()}.jpeg`, alt: name, initials: name[0] };
}

const CANDIDATES = (name: string) => [
  `/avatars/${name}.jpg`,
  `/avatars/${name}.jpeg`,
  `/avatars/${name.toLowerCase()}.jpg`,
  `/avatars/${name.toLowerCase()}.jpeg`,
];

async function resolvePhoto(name: string): Promise<string | null> {
  for (const path of CANDIDATES(name)) {
    const ok = await new Promise<boolean>((res) => {
      const img = new Image();
      img.onload = () => res(true);
      img.onerror = () => res(false);
      img.src = path;
    });
    if (ok) return path;
  }
  return null;
}

export function TeamAvatar({
  name,
  size = "s",
  monthKey = monthKeyForOffset(0),
}: {
  name: string;
  size?: AvatarSize;
  monthKey?: string;
}) {
  const [photoSrc, setPhotoSrc] = useState<string | null | undefined>(undefined);
  const isAnonymous = isReplaced(name, monthKey);

  useEffect(() => {
    if (isAnonymous) return;
    let cancelled = false;
    resolvePhoto(name).then((src) => {
      if (!cancelled) setPhotoSrc(src);
    });
    return () => { cancelled = true; };
  }, [name, isAnonymous]);

  // undefined = still probing → show initials as placeholder
  const avatar = isAnonymous ? (
    <Avatar type="placeholder" size={size} />
  ) : photoSrc ? (
    <Avatar type="photo" src={photoSrc} alt={name} size={size} />
  ) : (
    <Avatar type="text" initials={name[0]} size={size} />
  );

  return (
    <div className="rounded-full border border-border inline-flex flex-shrink-0">
      {avatar}
    </div>
  );
}
