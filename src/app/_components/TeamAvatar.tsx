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

const CANDIDATES = (photoKey: string) => [
  `/avatars/${photoKey}.jpg`,
  `/avatars/${photoKey}.jpeg`,
  `/avatars/${photoKey.toLowerCase()}.jpg`,
  `/avatars/${photoKey.toLowerCase()}.jpeg`,
];

// AvatarStack items are built synchronously (no <img> onload/onerror probe
// like TeamAvatar does), so anyone without a confirmed photo file falls back
// to a text/initials item instead of a src that will 404.
const KNOWN_PHOTOS = new Set(["Yim", "Art", "Kes", "Khim", "Nook", "Few", "Max", "Yok"]);

// photoKey is a stable identity for the avatar image — independent of the
// (renameable) display name — so renaming someone doesn't lose their photo.
// Defaults to name for callers that haven't fetched a photoKey mapping yet.
export function avatarStackItem(
  name: string,
  photoKey: string = name,
  monthKey: string = monthKeyForOffset(0),
): AvatarStackItem {
  if (isReplaced(name, monthKey)) {
    return { type: "placeholder" };
  }
  if (!KNOWN_PHOTOS.has(photoKey)) {
    return { type: "text", initials: name[0] };
  }
  return { src: `/avatars/${photoKey.toLowerCase()}.jpeg`, alt: name, initials: name[0] };
}

async function resolvePhoto(photoKey: string): Promise<string | null> {
  for (const path of CANDIDATES(photoKey)) {
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
  photoKey = name,
  size = "s",
  monthKey = monthKeyForOffset(0),
}: {
  name: string;
  photoKey?: string;
  size?: AvatarSize;
  monthKey?: string;
}) {
  const [photoSrc, setPhotoSrc] = useState<string | null | undefined>(undefined);
  const isAnonymous = isReplaced(name, monthKey);

  useEffect(() => {
    if (isAnonymous) return;
    let cancelled = false;
    resolvePhoto(photoKey).then((src) => {
      if (!cancelled) setPhotoSrc(src);
    });
    return () => { cancelled = true; };
  }, [photoKey, isAnonymous]);

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
