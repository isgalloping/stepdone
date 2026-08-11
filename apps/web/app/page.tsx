"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

type ProjectItem = {
  publicId: string;
  title: string;
  status: string;
  currentStepCode: string | null;
  progress: number;
  updatedAt: string;
};

export default function HomePage() {
  const me = useQuery({
    queryKey: ["me"],
    queryFn: async () =>
      api<{ publicId: string; displayName: string | null }>("/api/auth/me"),
  });
  const projects = useQuery({
    queryKey: ["projects"],
    enabled: Boolean(me.data?.success),
    queryFn: async () => api<{ projects: ProjectItem[] }>("/api/projects"),
  });

  const recent =
    projects.data?.success ? projects.data.data.projects.slice(0, 3) : [];

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "1.25rem" }}>
      <section
        style={{
          background:
            "linear-gradient(160deg, #e8f1ff 0%, #ffffff 55%, #f5f7fb 100%)",
          border: "1px solid var(--sd-border)",
          borderRadius: 20,
          padding: "2rem 1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        <p className="sd-chip">真实任务交付平台</p>
        <h1 style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)", margin: "0.8rem 0 0.4rem" }}>
          StepDone AI
        </h1>
        <p className="sd-muted" style={{ marginTop: 0 }}>
          一步一步，把事情做成。
        </p>
        <h2 style={{ fontSize: "1.45rem", margin: "1.4rem 0 0.5rem" }}>
          今天想做成什么？
        </h2>
        <p className="sd-muted" style={{ marginTop: 0, maxWidth: 520 }}>
          选择一个真实任务，跟随 AI 项目导师一步步完成可汇报的成果。
        </p>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "1.25rem" }}>
          <Link href="/projects/new" className="sd-btn" data-testid="start-task">
            + 开始一个真实任务
          </Link>
          <Link href="/examples" className="sd-btn sd-btn-secondary">
            查看成果示例
          </Link>
        </div>
      </section>

      <section style={{ marginBottom: "1.5rem" }}>
        <h3 style={{ marginBottom: "0.75rem" }}>热门任务</h3>
        <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          <article className="sd-card">
            <h4 style={{ margin: "0 0 0.4rem" }}>竞品分析</h4>
            <p className="sd-muted" style={{ marginTop: 0 }}>
              从目标定义、资料搜集到完整报告，完成一份有来源、能汇报的竞品分析。
            </p>
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "1rem" }}>
              <span className="sd-chip">约 30～60 分钟</span>
              <span className="sd-chip">PDF/PPT</span>
            </div>
            <Link href="/projects/new" className="sd-btn">
              开始竞品分析
            </Link>
          </article>
          <article className="sd-card" style={{ opacity: 0.75 }}>
            <h4 style={{ margin: "0 0 0.4rem" }}>行业研究</h4>
            <p className="sd-muted">即将开放</p>
          </article>
          <article className="sd-card" style={{ opacity: 0.75 }}>
            <h4 style={{ margin: "0 0 0.4rem" }}>营销方案</h4>
            <p className="sd-muted">即将开放</p>
          </article>
        </div>
      </section>

      <section>
        <h3 style={{ marginBottom: "0.75rem" }}>最近项目</h3>
        {!me.data?.success ? (
          <div className="sd-card sd-muted">登录后可继续最近项目。</div>
        ) : recent.length === 0 ? (
          <div className="sd-card sd-muted">
            你还没有开始项目。选择一个真实任务，逐步完成第一个成果。
          </div>
        ) : (
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {recent.map((p) => (
              <Link key={p.publicId} href={`/projects/${p.publicId}/plan`} className="sd-card">
                <strong>{p.title}</strong>
                <div className="sd-muted" style={{ marginTop: 4 }}>
                  {p.currentStepCode ?? p.status} · 进度 {p.progress}%
                </div>
                <div style={{ marginTop: 8, color: "var(--sd-primary)", fontWeight: 600 }}>
                  继续项目 →
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
