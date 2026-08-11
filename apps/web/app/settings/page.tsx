"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export default function SettingsPage() {
  const me = useQuery({
    queryKey: ["me"],
    queryFn: async () =>
      api<{ publicId: string; displayName: string | null }>("/api/auth/me"),
  });
  const entitlements = useQuery({
    queryKey: ["entitlements"],
    enabled: Boolean(me.data?.success),
    queryFn: async () =>
      api<{ entitlements: Array<{ type: string; remaining: number }> }>("/api/entitlements"),
  });

  if (!me.data?.success) {
    return (
      <div style={{ padding: "1.25rem" }}>
        <div className="sd-card">
          请先 <Link href="/login">登录</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "1.25rem" }}>
      <h1>我的</h1>
      <div className="sd-card" style={{ marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>账户</h3>
        <p>{me.data.data.displayName ?? "演示用户"}</p>
        <p className="sd-muted">{me.data.data.publicId}</p>
      </div>
      <div className="sd-card">
        <h3 style={{ marginTop: 0 }}>项目权益</h3>
        {entitlements.data?.success && entitlements.data.data.entitlements.length ? (
          <ul>
            {entitlements.data.data.entitlements.map((e, idx) => (
              <li key={`${e.type}-${idx}`}>
                {e.type} × {e.remaining}
              </li>
            ))}
          </ul>
        ) : (
          <p className="sd-muted">暂无权益。完成项目付费后将显示在这里。</p>
        )}
      </div>
    </div>
  );
}
