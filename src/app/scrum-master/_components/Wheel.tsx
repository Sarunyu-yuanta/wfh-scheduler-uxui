"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { TeamAvatar, type AvatarSize } from "../../_components/TeamAvatar";

export interface WheelSlice {
  /** Raw team member name — used both as the React key and to resolve the avatar. */
  key: string;
  label: string;
  /** Stable photo identity — falls back to key if not provided. */
  photoKey?: string;
}

export interface WheelHandle {
  spinTo: (index: number) => void;
}

interface WheelProps {
  slices: WheelSlice[];
  onSpinEnd?: (index: number) => void;
  size?: number;
}

function pointOnCircle(cx: number, cy: number, angleDeg: number, radius: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + radius * Math.sin(rad), y: cy - radius * Math.cos(rad) };
}

const AVATAR_SIZE_PX: Record<AvatarSize, number> = {
  xxs: 16,
  xs: 20,
  s: 24,
  m: 32,
  l: 40,
  xl: 48,
  xxl: 52,
};

function nearestAvatarSize(px: number): AvatarSize {
  let best: AvatarSize = "m";
  let bestDiff = Infinity;
  for (const token of Object.keys(AVATAR_SIZE_PX) as AvatarSize[]) {
    const diff = Math.abs(AVATAR_SIZE_PX[token] - px);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = token;
    }
  }
  return best;
}

export const Wheel = forwardRef<WheelHandle, WheelProps>(function Wheel(
  { slices, onSpinEnd, size = 340 },
  ref,
) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const pendingIndexRef = useRef<number | null>(null);
  const rotationRef = useRef(0);

  useImperativeHandle(ref, () => ({
    spinTo(index: number) {
      const n = slices.length;
      if (n === 0) return;
      const segAngle = 360 / n;
      const center = index * segAngle + segAngle / 2;
      const jitterRange = segAngle * 0.35;
      const jitter = (Math.random() - 0.5) * 2 * jitterRange;
      const targetMod = (((360 - center - jitter) % 360) + 360) % 360;
      const currentMod = ((rotationRef.current % 360) + 360) % 360;
      const delta = ((targetMod - currentMod) % 360 + 360) % 360;
      const extraTurns = 5;
      const next = rotationRef.current + delta + 360 * extraTurns;
      pendingIndexRef.current = index;
      rotationRef.current = next;
      setSpinning(true);
      setRotation(next);
    },
  }));

  const n = slices.length;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 4;
  const segAngle = n > 0 ? 360 / n : 0;
  const colors = Array.from(
    { length: n },
    (_, i) => `hsl(${Math.round((360 / n) * i)}, 68%, 58%)`,
  );

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      {/* Pointer */}
      <div
        style={{
          position: "absolute",
          top: -4,
          left: "50%",
          transform: "translateX(-50%)",
          width: 0,
          height: 0,
          borderLeft: "13px solid transparent",
          borderRight: "13px solid transparent",
          borderTop: "22px solid #1d4ed8",
          filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.25))",
          zIndex: 2,
        }}
      />
      <svg
        width={size}
        height={size}
        style={{
          display: "block",
          transform: `rotate(${rotation}deg)`,
          transition: spinning
            ? "transform 4s cubic-bezier(0.12, 0.67, 0.1, 1)"
            : "none",
          filter: "drop-shadow(0 6px 16px rgba(0,0,0,0.18))",
        }}
        onTransitionEnd={() => {
          setSpinning(false);
          if (pendingIndexRef.current !== null) {
            onSpinEnd?.(pendingIndexRef.current);
            pendingIndexRef.current = null;
          }
        }}
      >
        {n <= 1 ? (
          <circle cx={cx} cy={cy} r={r} fill={colors[0] ?? "#e5e7eb"} stroke="#fff" strokeWidth={3} />
        ) : (
          (() => {
            const labelR = r * 0.62;
            const arcLen = (2 * Math.PI * labelR) / n;
            const avatarPx = Math.max(16, Math.min(48, Math.round(arcLen * 0.75)));
            const avatarSize = nearestAvatarSize(avatarPx);
            return slices.map((slice, i) => {
              const startAngle = i * segAngle;
              const endAngle = (i + 1) * segAngle;
              const p1 = pointOnCircle(cx, cy, startAngle, r);
              const p2 = pointOnCircle(cx, cy, endAngle, r);
              const largeArc = segAngle > 180 ? 1 : 0;
              const path = `M ${cx},${cy} L ${p1.x},${p1.y} A ${r},${r} 0 ${largeArc} 1 ${p2.x},${p2.y} Z`;
              const centerAngle = startAngle + segAngle / 2;
              const avatarPoint = pointOnCircle(cx, cy, centerAngle, labelR);
              return (
                <g key={slice.key}>
                  <path d={path} fill={colors[i]} stroke="#fff" strokeWidth={2} />
                  <title>{slice.label}</title>
                  <foreignObject
                    x={avatarPoint.x - avatarPx / 2}
                    y={avatarPoint.y - avatarPx / 2}
                    width={avatarPx}
                    height={avatarPx}
                    style={{ overflow: "visible" }}
                  >
                    <div className="flex items-center justify-center w-full h-full">
                      <TeamAvatar name={slice.key} photoKey={slice.photoKey ?? slice.key} size={avatarSize} />
                    </div>
                  </foreignObject>
                </g>
              );
            });
          })()
        )}
        <circle cx={cx} cy={cy} r={size * 0.07} fill="#ffffff" stroke="#e5e7eb" strokeWidth={2} />
      </svg>
    </div>
  );
});
