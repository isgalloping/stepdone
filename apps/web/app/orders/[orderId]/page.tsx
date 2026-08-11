"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

type Order = {
  orderPublicId: string;
  status: string;
  amountFen: number;
  productCode: string;
  productName: string;
  projectPublicId: string;
  projectTitle: string;
  createdAt: string;
  paidAt: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "待支付",
  PAYING: "支付中",
  PAID: "已支付",
  CLOSED: "已关闭",
  FAILED: "支付失败",
};

export default function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [paying, setPaying] = useState(false);
  const [msg, setMsg] = useState("");

  const order = useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => api<Order>(`/api/orders/${orderId}`),
    refetchInterval: (q) =>
      q.state.data?.success && q.state.data.data.status === "PAID" ? false : 3000,
  });

  async function payAgain() {
    setPaying(true);
    setMsg("");
    const res = await api(`/api/payments/mock/confirm`, {
      method: "POST",
      body: JSON.stringify({ orderPublicId: orderId }),
    });
    setPaying(false);
    if (!res.success) {
      setMsg(res.error.message + "。你的项目和成果预览已经保存。");
      return;
    }
    void order.refetch();
  }

  if (!order.data) {
    return <div style={{ padding: "1.25rem" }}><div className="sd-card">加载中…</div></div>;
  }
  if (!order.data.success) {
    return (
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "1.25rem" }}>
        <div className="sd-card">
          {order.data.error.message} · <Link href="/settings">返回我的</Link>
        </div>
      </div>
    );
  }

  const o = order.data.data;
  const paid = o.status === "PAID";

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "1.25rem" }}>
      <Link href="/settings" className="sd-muted" style={{ fontSize: 13 }}>
        ← 订单记录
      </Link>
      <div className="sd-card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <h1 style={{ margin: 0 }}>{o.productName}</h1>
          <span
            className="sd-chip"
            style={{
              background: paid ? "#dcfce7" : "var(--sd-soft)",
              color: paid ? "#166534" : "var(--sd-primary)",
            }}
            data-testid="order-status"
          >
            {STATUS_LABEL[o.status] ?? o.status}
          </span>
        </div>
        <p style={{ fontSize: 28, fontWeight: 700, margin: "12px 0" }}>
          ¥{(o.amountFen / 100).toFixed(2)}
        </p>
        <div className="sd-muted" style={{ display: "grid", gap: 4 }}>
          <div>订单号：{o.orderPublicId}</div>
          <div>项目：{o.projectTitle}</div>
          <div>创建时间：{new Date(o.createdAt).toLocaleString()}</div>
          {o.paidAt ? <div>支付时间：{new Date(o.paidAt).toLocaleString()}</div> : null}
        </div>

        <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {paid ? (
            <Link href={`/projects/${o.projectPublicId}/report`} className="sd-btn">
              查看完整成果
            </Link>
          ) : (
            <>
              <button
                className="sd-btn"
                onClick={payAgain}
                disabled={paying}
                data-testid="order-pay-again"
              >
                {paying ? "支付中…" : "重新支付（演示）"}
              </button>
              <Link
                href={`/projects/${o.projectPublicId}/preview`}
                className="sd-btn sd-btn-secondary"
              >
                返回项目
              </Link>
            </>
          )}
        </div>
        {msg ? <p style={{ color: "var(--sd-danger)" }}>{msg}</p> : null}
        <p className="sd-muted" style={{ marginTop: 12, fontSize: 13 }}>
          单次购买，不自动续费。
        </p>
      </div>
    </div>
  );
}
