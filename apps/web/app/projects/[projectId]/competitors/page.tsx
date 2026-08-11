"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { useProjectSteps } from "@/hooks/use-project";
import { api } from "@/lib/api-client";

type Competitor = {
  name: string;
  positioning: string;
  recommendationReason: string;
  matchScore: number;
  confidence: string;
};

export default function CompetitorsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const steps = useProjectSteps(projectId);
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const run = steps.data?.success
    ? steps.data.data.runs.find((r) => r.nodeCode === "SELECT_COMPETITORS")
    : undefined;
  const output = (run?.output ?? {}) as { competitors?: Competitor[] };
  const list = output.competitors ?? [];

  useEffect(() => {
    if (selected.length === 0 && list.length) {
      setSelected(list.slice(0, 3).map((c) => c.name));
    }
  }, [list, selected.length]);

  async function confirm() {
    setLoading(true);
    const res = await api(`/api/projects/${projectId}/steps/SELECT_COMPETITORS/decision`, {
      method: "POST",
      body: JSON.stringify({
        action: "CONFIRM_COMPETITORS",
        payload: { names: selected },
      }),
    });
    setLoading(false);
    if (res.success) router.push(`/projects/${projectId}/sources`);
  }

  return (
    <WorkspaceShell
      projectId={projectId}
      mentor={<p>建议选择 3～5 个竞品。数量过多会降低分析深度。</p>}
    >
      <div className="sd-card">
        <h1 style={{ marginTop: 0 }}>选择本次重点分析的竞品</h1>
        {run?.status !== "WAITING_USER" && list.length === 0 ? (
          <p className="sd-muted">正在推荐候选竞品…</p>
        ) : (
          <>
            <div style={{ display: "grid", gap: 12 }}>
              {list.map((c) => {
                const checked = selected.includes(c.name);
                return (
                  <label key={c.name} className="sd-card" style={{ display: "block", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setSelected((prev) =>
                          checked ? prev.filter((n) => n !== c.name) : [...prev, c.name],
                        );
                      }}
                    />{" "}
                    <strong>{c.name}</strong>
                    <div className="sd-muted">{c.positioning}</div>
                    <div style={{ fontSize: 13 }}>{c.recommendationReason}</div>
                    <span className="sd-chip">匹配度 {c.matchScore}</span>
                  </label>
                );
              })}
            </div>
            <button
              className="sd-btn"
              style={{ marginTop: 16, width: "100%" }}
              disabled={loading || selected.length < 3 || selected.length > 8}
              onClick={confirm}
              data-testid="confirm-competitors"
            >
              确认这组竞品（{selected.length}）
            </button>
          </>
        )}
      </div>
    </WorkspaceShell>
  );
}
