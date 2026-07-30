"use client";

import { useState, useEffect } from "react";
import { Avatar, type AvatarStackItem } from "@sarunyu/system-one";

type AvatarSize = "xxs" | "xs" | "s" | "m" | "l" | "xl" | "xxl";

// This seat changed hands this month — the new person shows as anonymous
// going forward, while past months still show the previous occupant.
const REPLACED_THIS_MONTH = new Set(["Art"]);

export function displayName(name: string, isCurrent = true): string {
  return isCurrent && REPLACED_THIS_MONTH.has(name) ? "Anonymous" : name;
}

export function avatarStackItem(name: string, isCurrent = true): AvatarStackItem {
  if (isCurrent && REPLACED_THIS_MONTH.has(name)) {
    return { type: "placeholder" };
  }
  return { src: `/avatars/${name.toLowerCase()}.jpeg`, alt: name, initials: name[0] };
}

const SIZE_PX: Record<AvatarSize, number> = {
  xxs: 16,
  xs: 20,
  s: 24,
  m: 32,
  l: 40,
  xl: 48,
  xxl: 52,
};
const FONT_PX: Record<AvatarSize, number> = {
  xxs: 8,
  xs: 9,
  s: 10,
  m: 13,
  l: 16,
  xl: 18,
  xxl: 20,
};

// People without a photo on file (e.g. freshly added team members) get a
// 2-letter avatar instead of the design system's single-character fallback.
function TwoLetterAvatar({ name, size }: { name: string; size: AvatarSize }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full text-white font-bold shrink-0"
      style={{
        width: SIZE_PX[size],
        height: SIZE_PX[size],
        fontSize: FONT_PX[size],
        background: "linear-gradient(135deg, #60a5fa, #a78bfa)",
      }}
    >
      {name.slice(0, 2).toUpperCase()}
    </span>
  );
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
  isCurrent = true,
}: {
  name: string;
  size?: AvatarSize;
  isCurrent?: boolean;
}) {
  const [photoSrc, setPhotoSrc] = useState<string | null | undefined>(undefined);
  const isAnonymous = isCurrent && REPLACED_THIS_MONTH.has(name);

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
    <TwoLetterAvatar name={name} size={size} />
  );

  return (
    <div className="rounded-full border border-border inline-flex flex-shrink-0">
      {avatar}
    </div>
  );
}
