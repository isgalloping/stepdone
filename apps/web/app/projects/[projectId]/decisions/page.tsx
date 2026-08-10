"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { useProjectSteps } from "@/hooks/use-project";
import { api } from "@/lib/api-client";

type Judgment = {
  id: string;
  observation: string;
  evidence: string[];
  risk: string;
};

type LocalJudgment = {
  stance: "AGREE" | "PARTIAL" | "DISAGREE" | "EDIT";
  note: string;
  finalText: string;
};

export default function DecisionsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const steps = useProjectSteps(projectId);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [local, setLocal] = useState<Record<string, LocalJudgment>>({});

  const run = steps.data?.success
    ? steps.data.data.runs.find((r) => r.nodeCode === "USER_JUDGMENT")
    : undefined;
  const judgments =
    ((run?.output as { judgments?: Judgment[] })?.judgments ?? []);

  useEffect(() => {
    if (!Object.keys(local).length && judgments.length) {
      const init: Record<string, LocalJudgment> = {};
      for (const j of judgments) {
        init[j.id] = {
          stance: "AGREE",
          note: "",
          finalText: j.observation,
        };
      }
      setLocal(init);
    }
  }, [judgments, local]);

  async function submit() {
    const payload = judgments.map((j) => ({
      id: j.id,
      stance: local[j.id]?.stance ?? "AGREE",
      note: local[j.id]?.note,
      finalText: local[j.id]?.finalText || j.observation,
    }));
    const invalid = payload.some(
      (p) =>
        (p.stance === "PARTIAL" || p.stance === "EDIT") &&
        (p.note?.length ?? 0) < 10 &&
        p.finalText.length < 10,
    );
    if (invalid) return;
    setLoading(true);
    const res = await api(`/api/projects/${projectId}/steps/USER_JUDGMENT/decision`, {
      method: "POST",
      body: JSON.stringify({ action: "SUBMIT_JUDGMENTS", payload: { judgments: payload } }),
    });
    setLoading(false);
    if (res.success) router.push(`/projects/${projectId}/preview`);
  }

  return (
    <WorkspaceShell projectId={projectId} mentor={<p>AI 给出候选判断，但不直接写入最终结论。请你确认。</p>}>
      <div className="sd-card">
        <h1 style={{ marginTop: 0 }}>形成你的核心判断</h1>
        {run?.status !== "WAITING_USER" && !judgments.length ? (
          <p className="sd-muted">判断卡片准备中…</p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {judgments.map((j) => (
              <article key={j.id} className="sd-card">
                <h3 style={{ marginTop: 0 }}>AI 观察</h3>
                <p>{j.observation}</p>
                <div className="sd-muted">证据：{j.evidence.join("、")}</div>
                <div className="sd-chip" style={{ marginTop: 8 }}>
                  {j.risk}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                  {(["AGREE", "PARTIAL", "DISAGREE", "EDIT"] as const).map((stance) => (
                    <button
                      key={stance}
                      type="button"
                      className="sd-btn sd-btn-secondary"
                      style={{
                        minHeight: 36,
                        background:
                          local[j.id]?.stance === stance ? "var(--sd-primary)" : "white",
                        color: local[j.id]?.stance === stance ? "white" : "inherit",
                      }}
                      onClick={() =>
                        setLocal((prev) => ({
                          ...prev,
                          [j.id]: { ...prev[j.id], stance },
                        }))
                      }
                    >
                      {{
                        AGREE: "同意",
                        PARTIAL: "部分同意",
                        DISAGREE: "不同意",
                        EDIT: "修改结论",
                      }[stance]}
                    </button>
                  ))}
                </div>
                <textarea
                  className="sd-textarea"
                  style={{ marginTop: 10 }}
                  placeholder="最终结论 / 部分同意说明（至少 10 字）"
                  value={local[j.id]?.finalText ?? ""}
                  onChange={(e) =>
                    setLocal((prev) => ({
                      ...prev,
                      [j.id]: {
                        ...prev[j.id],
                        finalText: e.target.value,
                        note: e.target.value,
                      },
                    }))
                  }
                />
              </article>
            ))}
            <button
              className="sd-btn"
              disabled={loading || judgments.length < 3}
              onClick={submit}
              data-testid="submit-judgments"
            >
              提交判断并生成预览
            </button>
          </div>
        )}
      </div>
    </WorkspaceShell>
  );
}
