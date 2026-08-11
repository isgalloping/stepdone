"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { useProjectSteps } from "@/hooks/use-project";

export default function MatrixPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const steps = useProjectSteps(projectId);
  const matrix = steps.data?.success
    ? steps.data.data.runs.find((r) => r.nodeCode === "BUILD_MATRIX")
    : undefined;
  const judgment = steps.data?.success
    ? steps.data.data.runs.find((r) => r.nodeCode === "USER_JUDGMENT")
    : undefined;
  const rows =
    ((matrix?.output as {
      rows?: Array<{
        dimension: string;
        cells: Array<{
          competitor: string;
          fact: string;
          conclusion: string;
          confidence: string;
        }>;
      }>;
    })?.rows ?? []);

  const color = (c: string) => {
    if (c === "HIGH") return "#dcfce7";
    if (c === "MEDIUM") return "#fef9c3";
    if (c === "LOW") return "#fee2e2";
    return "#f1f5f9";
  };

  return (
    <WorkspaceShell projectId={projectId} mentor={<p>我发现若干值得关注的差异，请到判断页确认最重要的结论。</p>}>
      <div className="sd-card">
        <h1 style={{ marginTop: 0 }}>竞品对比矩阵</h1>
        {!rows.length ? (
          <p className="sd-muted">矩阵生成中…</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: 8 }}>维度</th>
                  {(rows[0]?.cells ?? []).map((c) => (
                    <th key={c.competitor} style={{ textAlign: "left", padding: 8 }}>
                      {c.competitor}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.dimension}>
                    <td style={{ padding: 8, fontWeight: 600 }}>{row.dimension}</td>
                    {row.cells.map((cell) => (
                      <td
                        key={cell.competitor}
                        style={{
                          padding: 8,
                          background: color(cell.confidence),
                          borderTop: "1px solid var(--sd-border)",
                        }}
                      >
                        <div>{cell.fact}</div>
                        <div className="sd-muted" style={{ fontSize: 13 }}>
                          {cell.conclusion}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Link
          href={`/projects/${projectId}/decisions`}
          className="sd-btn"
          style={{ display: "inline-flex", marginTop: 16 }}
        >
          {judgment?.status === "WAITING_USER" ? "去形成判断" : "查看判断页"}
        </Link>
      </div>
    </WorkspaceShell>
  );
}
