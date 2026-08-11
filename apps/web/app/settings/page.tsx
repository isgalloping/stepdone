"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

const ENTITLEMENT_LABEL: Record<string, string> = {
  STANDARD_PROJECT_CREDIT: "标准项目次数",
  PRO_PROJECT_CREDIT: "专业项目次数",
  REPORT_EXPORT: "PDF 导出",
  PPT_EXPORT: "PPT 导出",
  RESEARCH_RETRY: "重新研究",
  REPORT_REGENERATE: "成果重生成",
};

const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING: "待支付",
  PAID: "已支付",
  CLOSED: "已关闭",
  FAILED: "失败",
};

type Order = {
  orderPublicId: string;
  status: string;
  amountFen: number;
  productName: string;
  projectTitle: string;
  createdAt: string;
};

export default function SettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const me = useQuery({
    queryKey: ["me"],
    queryFn: async () =>
      api<{ publicId: string; displayName: string | null }>("/api/auth/me"),
  });
  const authed = Boolean(me.data?.success);

  const entitlements = useQuery({
    queryKey: ["entitlements"],
    enabled: authed,
    queryFn: async () =>
      api<{ entitlements: Array<{ type: string; remaining: number }> }>(
        "/api/entitlements",
      ),
  });
  const orders = useQuery({
    queryKey: ["orders"],
    enabled: authed,
    queryFn: async () => api<{ orders: Order[] }>("/api/orders"),
  });

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    queryClient.clear();
    router.push("/login");
  }

  if (!authed) {
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <h3 style={{ margin: 0 }}>账户</h3>
          <button className="sd-btn sd-btn-secondary" onClick={logout} data-testid="logout">
            退出登录
          </button>
        </div>
        <p style={{ marginBottom: 0 }}>{me.data?.success ? me.data.data.displayName ?? "演示用户" : ""}</p>
        <p className="sd-muted" style={{ marginTop: 4 }}>
          {me.data?.success ? me.data.data.publicId : ""}
        </p>
      </div>

      <div className="sd-card" style={{ marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>项目权益</h3>
        {entitlements.data?.success && entitlements.data.data.entitlements.length ? (
          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
            {entitlements.data.data.entitlements.map((e, idx) => (
              <div key={`${e.type}-${idx}`} className="sd-card" style={{ textAlign: "center" }}>
                <div style={{ fontWeight: 600 }}>{ENTITLEMENT_LABEL[e.type] ?? e.type}</div>
                <div className="sd-muted">× {e.remaining}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="sd-muted">暂无权益。完成项目付费后将显示在这里。</p>
        )}
      </div>

      <div className="sd-card" style={{ marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>订单记录</h3>
        {orders.data?.success && orders.data.data.orders.length ? (
          <div style={{ display: "grid", gap: 8 }}>
            {orders.data.data.orders.map((o) => (
              <Link
                key={o.orderPublicId}
                href={`/orders/${o.orderPublicId}`}
                className="sd-card"
                style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}
              >
                <span>
                  <strong>{o.productName}</strong>
                  <span className="sd-muted"> · {o.projectTitle}</span>
                  <div className="sd-muted" style={{ fontSize: 13 }}>
                    {new Date(o.createdAt).toLocaleString()}
                  </div>
                </span>
                <span style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 600 }}>¥{(o.amountFen / 100).toFixed(2)}</div>
                  <span className="sd-chip">{ORDER_STATUS_LABEL[o.status] ?? o.status}</span>
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="sd-muted">暂无订单。</p>
        )}
      </div>

      <div className="sd-card">
        <h3 style={{ marginTop: 0 }}>数据与隐私</h3>
        <ul className="sd-muted" style={{ marginTop: 0 }}>
          <li>数据保存期限：删除的项目在回收站保留 30 天。</li>
          <li>手机号加密存储；导出文件使用短时签名链接。</li>
          <li>默认使用境内模型，不自动切换境外模型。</li>
        </ul>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/privacy" className="sd-btn sd-btn-secondary">隐私政策</Link>
          <Link href="/terms" className="sd-btn sd-btn-secondary">用户协议</Link>
          <Link href="/help" className="sd-btn sd-btn-secondary">帮助与反馈</Link>
        </div>
      </div>
    </div>
  );
}
