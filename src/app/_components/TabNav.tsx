"use client";

import { Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { TabGroup, useIsMobile } from "@sarunyu/system-one";
import { currentPeriodLabel, monthLabelForOffset } from "@/lib/schedule";

export function TabNav() {
  return (
    <Suspense fallback={null}>
      <TabNavInner />
    </Suspense>
  );
}

function TabNavInner() {
  const path = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const isNextMonth = path === "/" && searchParams.get("month") === "next";

  // This tab strip is specific to the WFH scheduler — hide it elsewhere
  if (path !== "/" && path !== "/history") return null;

  const TABS = [
    {
      id: "/",
      title: isMobile ? "เดือนนี้" : `เดือนนี้  ${currentPeriodLabel()}`,
    },
    {
      id: "/?month=next",
      title: isMobile ? "เดือนหน้า" : `เดือนหน้า  ${monthLabelForOffset(1)}`,
    },
    { id: "/history", title: "ประวัติรายเดือน" },
  ];

  const activeId = path === "/" ? (isNextMonth ? "/?month=next" : "/") : path;

  return (
    <div className="max-w-[1024px] mx-auto px-6 pt-6">
      <TabGroup
        items={TABS}
        activeId={activeId}
        onChange={(id) => router.push(id)}
        size="md"
      />
    </div>
  );
}
