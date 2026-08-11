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
  const [customCompetitors, setCustomCompetitors] = useState<string[]>([]);
  const [customName, setCustomName] = useState("");
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

  const totalSelected = selected.length + customCompetitors.length;

  function addCustomCompetitor() {
    const name = customName.trim();
    if (!name) return;
    if (selected.includes(name) || customCompetitors.includes(name)) return;
    setCustomCompetitors((prev) => [...prev, name]);
    setCustomName("");
  }

  async function confirm() {
    setLoading(true);
    const res = await api(`/api/projects/${projectId}/steps/SELECT_COMPETITORS/decision`, {
      method: "POST",
      body: JSON.stringify({
        action: "CONFIRM_COMPETITORS",
        payload: {
          selectedCompetitorIds: selected,
          customCompetitors,
        },
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
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <input
                className="sd-input"
                data-testid="custom-competitor"
                placeholder="自定义竞品名称"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomCompetitor();
                  }
                }}
              />
              <button
                type="button"
                className="sd-btn sd-btn-secondary"
                data-testid="add-competitor"
                disabled={!customName.trim()}
                onClick={addCustomCompetitor}
              >
                添加竞品
              </button>
            </div>
            {customCompetitors.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                {customCompetitors.map((name) => (
                  <span key={name} className="sd-chip">
                    {name}
                    <button
                      type="button"
                      style={{ marginLeft: 6, border: "none", background: "none", cursor: "pointer" }}
                      onClick={() =>
                        setCustomCompetitors((prev) => prev.filter((n) => n !== name))
                      }
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
            <button
              className="sd-btn"
              style={{ marginTop: 16, width: "100%" }}
              disabled={loading || totalSelected < 3 || totalSelected > 8}
              onClick={confirm}
              data-testid="confirm-competitors"
            >
              确认这组竞品（{totalSelected}）
            </button>
          </>
        )}
      </div>
    </WorkspaceShell>
  );
}
