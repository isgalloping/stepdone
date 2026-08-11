"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export function DesktopNav() {
  const me = useQuery({
    queryKey: ["me"],
    queryFn: async () => api<{ publicId: string; displayName: string | null }>("/api/auth/me"),
  });

  const loggedIn = me.data?.success;

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "1rem 1.5rem",
        borderBottom: "1px solid var(--sd-border)",
        background: "white",
      }}
    >
      <Link href="/" style={{ fontWeight: 800, fontSize: "1.15rem" }}>
        StepDone AI <span className="sd-muted" style={{ fontWeight: 500 }}>逐成 AI</span>
      </Link>
      <nav style={{ display: "flex", gap: "1.25rem", alignItems: "center" }}>
        <Link href="/projects">项目</Link>
        <Link href="/pricing">价格</Link>
        <Link href="/help">帮助</Link>
        {loggedIn && me.data?.success ? (
          <Link href="/settings" className="sd-chip">
            {me.data.data.displayName ?? "我的"}
          </Link>
        ) : (
          <Link href="/login" className="sd-btn" style={{ minHeight: 36, padding: "0.4rem 0.9rem" }}>
            登录
          </Link>
        )}
      </nav>
    </header>
  );
}
