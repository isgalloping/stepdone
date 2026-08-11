"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export function RetryBanner({
  projectId,
  stepCode,
}: {
  projectId: string;
  stepCode: string;
}) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function retry() {
    setLoading(true);
    setError("");
    const res = await api(
      `/api/projects/${projectId}/steps/${stepCode}/retry`,
      { method: "POST" },
    );
    setLoading(false);
    if (!res.success) {
      setError(res.error.message);
      return;
    }
    void queryClient.invalidateQueries({ queryKey: ["project-steps", projectId] });
    void queryClient.invalidateQueries({ queryKey: ["project-status", projectId] });
    void queryClient.invalidateQueries({ queryKey: ["project", projectId] });
  }

  return (
    <div
      className="sd-card"
      style={{
        margin: "0.75rem 1rem",
        background: "#fff7ed",
        borderColor: "#fdba74",
      }}
      data-testid="retry-banner"
    >
      <strong>当前步骤失败，可重新尝试</strong>
      <p className="sd-muted" style={{ margin: "0.35rem 0 0.75rem" }}>
        AI 任务未完成。已保存的进度不会丢失，点击后将用新版本重跑本步。
      </p>
      {error ? <p style={{ color: "var(--sd-danger)" }}>{error}</p> : null}
      <button
        className="sd-btn"
        onClick={() => void retry()}
        disabled={loading}
        data-testid="retry-step"
      >
        {loading ? "重试中…" : "重新尝试"}
      </button>
    </div>
  );
}
