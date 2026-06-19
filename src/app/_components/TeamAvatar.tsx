"use client";

import { useState, useEffect } from "react";
import { Avatar } from "@sarunyu/system-one";

type AvatarSize = "xxs" | "xs" | "s" | "m" | "l" | "xl" | "xxl";

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
}: {
  name: string;
  size?: AvatarSize;
}) {
  const [photoSrc, setPhotoSrc] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    resolvePhoto(name).then((src) => {
      if (!cancelled) setPhotoSrc(src);
    });
    return () => { cancelled = true; };
  }, [name]);

  // undefined = still probing → show initials as placeholder
  const avatar = photoSrc ? (
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
