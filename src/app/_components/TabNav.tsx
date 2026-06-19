"use client";

import { usePathname, useRouter } from "next/navigation";
import { TabGroup, useIsMobile } from "@sarunyu/system-one";
import { currentPeriodLabel } from "@/lib/schedule";

export function TabNav() {
  const path = usePathname();
  const router = useRouter();
  const isMobile = useIsMobile();

  const TABS = [
    {
      id: "/",
      title: isMobile ? "เดือนนี้" : `เดือนนี้  ${currentPeriodLabel()}`,
    },
    { id: "/history", title: "ประวัติรายเดือน" },
  ];

  return (
    <div className="max-w-[1024px] mx-auto px-6 pt-6">
      <TabGroup
        items={TABS}
        activeId={path}
        onChange={(id) => router.push(id)}
        size="md"
      />
    </div>
  );
}
