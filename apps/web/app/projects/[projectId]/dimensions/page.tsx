"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { useProjectSteps } from "@/hooks/use-project";
import { api } from "@/lib/api-client";

export default function DimensionsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const steps = useProjectSteps(projectId);
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [important, setImportant] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const run = steps.data?.success
    ? steps.data.data.runs.find((r) => r.nodeCode === "SELECT_DIMENSIONS")
    : undefined;
  const dims =
    ((run?.output as { dimensions?: Array<{ name: string; reason: string }> })?.dimensions ??
      []);

  useEffect(() => {
    if (!selected.length && dims.length) {
      setSelected(dims.slice(0, 4).map((d) => d.name));
      setImportant(dims.slice(0, 2).map((d) => d.name));
    }
  }, [dims, selected.length]);

  async function confirm() {
    setLoading(true);
    const res = await api(`/api/projects/${projectId}/steps/SELECT_DIMENSIONS/decision`, {
      method: "POST",
      body: JSON.stringify({
        action: "CONFIRM_DIMENSIONS",
        payload: { selected, important },
      }),
    });
    setLoading(false);
    if (res.success) router.push(`/projects/${projectId}/matrix`);
  }

  return (
    <WorkspaceShell
      projectId={projectId}
      mentor={<p>若报告面向老板，建议保留「商业模式」和「市场机会」。</p>}
    >
      <div className="sd-card">
        <h1 style={{ marginTop: 0 }}>你最关心哪些差异？</h1>
        {run?.status !== "WAITING_USER" && !dims.length ? (
          <p className="sd-muted">正在准备比较维度…</p>
        ) : (
          <>
            <div style={{ display: "grid", gap: 10 }}>
              {dims.map((d) => {
                const checked = selected.includes(d.name);
                const isImportant = important.includes(d.name);
                return (
                  <div key={d.name} className="sd-card">
                    <label>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setSelected((prev) =>
                            checked ? prev.filter((x) => x !== d.name) : [...prev, d.name],
                          )
                        }
                      />{" "}
                      <strong>{d.name}</strong>
                    </label>
                    <div className="sd-muted">{d.reason}</div>
                    <button
                      type="button"
                      className="sd-chip"
                      style={{
                        marginTop: 8,
                        border: "none",
                        background: isImportant ? "var(--sd-primary)" : "var(--sd-soft)",
                        color: isImportant ? "white" : "var(--sd-primary)",
                      }}
                      onClick={() => {
                        setImportant((prev) => {
                          if (prev.includes(d.name)) return prev.filter((x) => x !== d.name);
                          if (prev.length >= 2) return [...prev.slice(1), d.name];
                          return [...prev, d.name];
                        });
                      }}
                    >
                      {isImportant ? "最重要" : "标为最重要"}
                    </button>
                  </div>
                );
              })}
            </div>
            <button
              className="sd-btn"
              style={{ width: "100%", marginTop: 16 }}
              disabled={loading || selected.length < 4 || important.length < 2}
              onClick={confirm}
              data-testid="confirm-dimensions"
            >
              确认比较维度
            </button>
          </>
        )}
      </div>
    </WorkspaceShell>
  );
}
