"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { useProject, useProjectSteps, useProjectStatus } from "@/hooks/use-project";
import { api } from "@/lib/api-client";

export default function PreviewPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const project = useProject(projectId);
  const status = useProjectStatus(projectId);
  const steps = useProjectSteps(projectId);
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const preview = steps.data?.success
    ? steps.data.data.runs.find((r) => r.nodeCode === "GENERATE_PREVIEW")
    : undefined;
  const output = (preview?.output ?? {}) as {
    coverTitle?: string;
    toc?: string[];
    summary?: string;
    qualityScore?: number;
    lockedSections?: string[];
  };
  const ready =
    status.data?.success &&
    (status.data.data.status === "PAYMENT_REQUIRED" ||
      status.data.data.status === "ACTIVE");

  async function pay(productCode: "STANDARD_PROJECT" | "PRO_PROJECT") {
    setLoading(productCode);
    setError("");
    const order = await api<{ orderPublicId: string }>("/api/orders", {
      method: "POST",
      body: JSON.stringify({ projectId, productCode }),
    });
    if (!order.success) {
      setLoading(null);
      setError(order.error.message);
      return;
    }
    const confirmed = await api("/api/payments/mock/confirm", {
      method: "POST",
      body: JSON.stringify({ orderPublicId: order.data.orderPublicId }),
    });
    setLoading(null);
    if (!confirmed.success) {
      setError(confirmed.error.message + "。你的项目和成果预览已经保存。");
      return;
    }
    router.push(`/projects/${projectId}/report`);
  }

  return (
    <WorkspaceShell projectId={projectId} mentor={<p>先看到真实价值，再决定是否支付。单次购买，不自动续费。</p>}>
      <div className="sd-card">
        <h1 style={{ marginTop: 0 }}>成果预览与付费</h1>
        {!ready && !output.coverTitle ? (
          <p className="sd-muted">正在生成预览…</p>
        ) : (
          <>
            <h2>
              {output.coverTitle ??
                (project.data?.success ? project.data.data.title : "竞品分析初稿")}
            </h2>
            <p>{output.summary}</p>
            <p className="sd-muted">初步质量评分：{output.qualityScore ?? "-"}</p>
            <h3>目录</h3>
            <ul>
              {(output.toc ?? []).map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
            <div
              style={{
                marginTop: 16,
                padding: "1rem",
                borderRadius: 12,
                background: "linear-gradient(180deg, rgba(255,255,255,0.2), #e2e8f0)",
                border: "1px dashed var(--sd-border)",
              }}
            >
              <strong>以下内容已遮挡</strong>
              <ul>
                {(output.lockedSections ?? ["完整报告", "PDF/PPT 导出"]).map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>

            <h3 style={{ marginTop: 24 }}>解锁完整分析</h3>
            <p className="sd-muted">单次购买，不自动续费。</p>
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
              <div className="sd-card">
                <h4>标准项目 · ¥29</h4>
                <ul className="sd-muted">
                  <li>完整分析报告</li>
                  <li>质量检查</li>
                  <li>PDF 导出</li>
                  <li>能力报告</li>
                </ul>
                <button
                  className="sd-btn"
                  style={{ width: "100%" }}
                  disabled={Boolean(loading)}
                  onClick={() => pay("STANDARD_PROJECT")}
                  data-testid="pay-standard"
                >
                  {loading === "STANDARD_PROJECT" ? "支付中…" : "¥29 完成本次项目"}
                </button>
              </div>
              <div className="sd-card">
                <h4>专业项目 · ¥59</h4>
                <ul className="sd-muted">
                  <li>标准全部内容</li>
                  <li>PPTX 导出</li>
                  <li>一次重新研究</li>
                  <li>一次成果重生成</li>
                </ul>
                <button
                  className="sd-btn sd-btn-secondary"
                  style={{ width: "100%" }}
                  disabled={Boolean(loading)}
                  onClick={() => pay("PRO_PROJECT")}
                  data-testid="pay-pro"
                >
                  {loading === "PRO_PROJECT" ? "支付中…" : "¥59 升级专业交付"}
                </button>
              </div>
            </div>
            {error ? <p style={{ color: "var(--sd-danger)" }}>{error}</p> : null}
          </>
        )}
      </div>
    </WorkspaceShell>
  );
}
