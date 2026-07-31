"use client";

import { usePathname, useRouter } from "next/navigation";
import { NavHeader } from "@sarunyu/system-one";

const APPS = [
  { label: "Office Scheduler", href: "/" },
  { label: "Scrum Master Scheduler", href: "/scrum-master" },
  { label: "Team Member", href: "/team" },
];

export function NavBar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <NavHeader
      className="wfh-navbar"
      logo={<p className="type-h5 text-foreground">UXUI Scheduler</p>}
      rightSlot={
        <div className="flex items-center gap-1">
          {APPS.map((app) => {
            const active =
              app.href === "/"
                ? pathname === "/" || pathname === "/history"
                : pathname.startsWith(app.href);
            return (
              <button
                key={app.href}
                type="button"
                onClick={() => router.push(app.href)}
                className={`flex h-8 cursor-pointer items-center gap-1 whitespace-nowrap rounded-md px-3 text-sm leading-5 transition-colors ${
                  active
                    ? "bg-primary-action-light text-primary-action"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                {app.label}
              </button>
            );
          })}
        </div>
      }
    />
  );
}
