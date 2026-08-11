"use client";

import Link from "next/link";
import { useState } from "react";
import { useProject, useProjectStatus } from "@/hooks/use-project";

const UI_STEPS = [
  { key: "plan", label: "1 计划", path: "plan" },
  { key: "competitors", label: "2 竞品", path: "competitors" },
  { key: "sources", label: "3 资料", path: "sources" },
  { key: "dimensions", label: "4 维度", path: "dimensions" },
  { key: "matrix", label: "5 矩阵", path: "matrix" },
  { key: "decisions", label: "6 判断", path: "decisions" },
  { key: "preview", label: "预览", path: "preview" },
  { key: "report", label: "报告", path: "report" },
  { key: "quality", label: "质量", path: "quality" },
  { key: "ability", label: "能力", path: "ability" },
];

export function WorkspaceShell({
  projectId,
  mentor,
  children,
}: {
  projectId: string;
  mentor?: React.ReactNode;
  children: React.ReactNode;
}) {
  const project = useProject(projectId);
  const status = useProjectStatus(projectId);
  const [openMentor, setOpenMentor] = useState(false);
  const title = project.data?.success ? project.data.data.title : "项目工作台";
  const eventMsg = status.data?.success ? status.data.data.latestEvent?.message : "";

  return (
    <div style={{ minHeight: "100%" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          padding: "0.85rem 1rem",
          borderBottom: "1px solid var(--sd-border)",
          background: "white",
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <div>
          <Link href="/projects" className="sd-muted" style={{ fontSize: 13 }}>
            ← 项目列表
          </Link>
          <div style={{ fontWeight: 700 }}>{title}</div>
          <div className="sd-muted" style={{ fontSize: 13 }}>
            {status.data?.success
              ? `${status.data.data.status} · ${status.data.data.currentStepCode ?? ""}`
              : "加载中…"}
            {eventMsg ? ` · ${eventMsg}` : ""}
          </div>
        </div>
        <button className="sd-btn sd-btn-secondary" onClick={() => setOpenMentor(true)}>
          AI 导师
        </button>
      </div>

      <div
        className="workspace-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "240px 1fr 320px",
          gap: 0,
          minHeight: "calc(100vh - 74px)",
        }}
      >
        <aside
          style={{
            borderRight: "1px solid var(--sd-border)",
            padding: "1rem",
            background: "white",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 12 }}>项目步骤</div>
          <div style={{ display: "grid", gap: 8 }}>
            {UI_STEPS.map((s) => (
              <Link
                key={s.path}
                href={`/projects/${projectId}/${s.path}`}
                style={{
                  padding: "0.55rem 0.7rem",
                  borderRadius: 8,
                  background: "var(--sd-bg)",
                }}
              >
                {s.label}
              </Link>
            ))}
          </div>
        </aside>

        <section style={{ padding: "1rem 1.25rem" }}>{children}</section>

        <aside
          className="mentor-panel"
          style={{
            borderLeft: "1px solid var(--sd-border)",
            padding: "1rem",
            background: "white",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8 }}>AI 项目导师</div>
          {mentor ?? (
            <p className="sd-muted">一次只提出一个关键问题，帮你做成可交付成果。</p>
          )}
        </aside>
      </div>

      {openMentor ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.35)",
            zIndex: 50,
            display: "flex",
            alignItems: "flex-end",
          }}
          onClick={() => setOpenMentor(false)}
        >
          <div
            className="sd-card"
            style={{ width: "100%", borderRadius: "16px 16px 0 0" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontWeight: 700, marginBottom: 8 }}>AI 项目导师</div>
            {mentor ?? <p className="sd-muted">继续当前步骤中的判断即可。</p>}
            <button className="sd-btn sd-btn-secondary" style={{ width: "100%" }} onClick={() => setOpenMentor(false)}>
              关闭
            </button>
          </div>
        </div>
      ) : null}

      <style>{`
        @media (max-width: 1199px) {
          .workspace-grid { grid-template-columns: 1fr !important; }
          .workspace-grid > aside:first-child {
            display: flex;
            gap: 8px;
            overflow-x: auto;
            border-right: none;
            border-bottom: 1px solid var(--sd-border);
          }
          .workspace-grid > aside:first-child > div:first-child { display: none; }
          .workspace-grid > aside:first-child > div:last-child {
            display: flex;
            gap: 8px;
          }
          .mentor-panel { display: none !important; }
        }
      `}</style>
    </div>
  );
}
