"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "任务" },
  { href: "/projects", label: "项目" },
  { href: "/projects?filter=completed", label: "成果" },
  { href: "/settings", label: "我的" },
];

export function MobileTabBar() {
  const pathname = usePathname();
  if (pathname.startsWith("/projects/") && pathname !== "/projects") return null;

  return (
    <nav className="mobile-tab-bar">
      {tabs.map((tab) => {
        const active =
          pathname === tab.href ||
          (tab.href.startsWith("/projects") && pathname.startsWith("/projects"));
        return (
          <Link
            key={tab.href + tab.label}
            href={tab.href}
            style={{
              display: "grid",
              placeItems: "center",
              fontSize: "0.85rem",
              fontWeight: active && tab.label !== "成果" ? 700 : 500,
              color:
                active && tab.label !== "成果"
                  ? "var(--sd-primary)"
                  : "var(--sd-muted)",
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
