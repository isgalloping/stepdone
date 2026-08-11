"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useQuery } from "@tanstack/react-query";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { CitationDrawer } from "@/components/workspace/citation-drawer";
import { api } from "@/lib/api-client";
import { useProject } from "@/hooks/use-project";
import type { QualityIssue } from "@/lib/quality";

export default function ReportPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const project = useProject(projectId);
  const [suggest, setSuggest] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [exporting, setExporting] = useState<"PDF" | "PPTX" | null>(null);
  const [exportMsg, setExportMsg] = useState("");
  const [saveMsg, setSaveMsg] = useState("");
  const [citationsOpen, setCitationsOpen] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [forceConfirm, setForceConfirm] = useState<{
    format: "PDF" | "PPTX";
    issues: QualityIssue[];
  } | null>(null);

  useEffect(() => {
    if (project.data?.success) setDraftTitle(project.data.data.title);
  }, [project.data]);

  const artifacts = useQuery({
    queryKey: ["artifacts", projectId],
    queryFn: async () =>
      api<{
        paid: boolean;
        artifacts: Array<{
          publicId: string;
          type: string;
          content: {
            blocks?: Array<{ type: string; text?: string; level?: number }>;
          } | null;
        }>;
      }>(`/api/projects/${projectId}/artifacts`),
    refetchInterval: 3000,
  });

  const entitlements = useQuery({
    queryKey: ["entitlements"],
    queryFn: async () =>
      api<{ entitlements: Array<{ type: string; remaining: number }> }>(
        "/api/entitlements",
      ),
  });

  const citations = useQuery({
    queryKey: ["citations", projectId],
    queryFn: async () =>
      api<{
        citations: Array<{
          publicId: string;
          quote: string | null;
          source: {
            title: string;
            publisher: string | null;
            url: string | null;
            credibility: string;
            summary: string | null;
          };
        }>;
      }>(`/api/projects/${projectId}/citations`),
  });

  const report = artifacts.data?.success
    ? artifacts.data.data.artifacts.find((a) => a.type === "ONLINE_REPORT")
    : undefined;
  const paid = artifacts.data?.success ? artifacts.data.data.paid : false;

  const artifactDetail = useQuery({
    queryKey: ["artifact", report?.publicId],
    queryFn: async () =>
      api<{
        version: number;
        versionsCount: number;
        content: {
          blocks?: Array<{ type: string; text?: string; level?: number }>;
        } | null;
      }>(`/api/artifacts/${report!.publicId}`),
    enabled: Boolean(report?.publicId && paid),
  });
  const version =
    artifactDetail.data?.success ? artifactDetail.data.data.version : 0;
  const citationList =
    citations.data?.success ? citations.data.data.citations : [];
  const canPpt =
    entitlements.data?.success &&
    entitlements.data.data.entitlements.some(
      (e) => e.type === "PPT_EXPORT" && e.remaining > 0,
    );
  const canReportRegenerate =
    entitlements.data?.success &&
    entitlements.data.data.entitlements.some(
      (e) => e.type === "REPORT_REGENERATE" && e.remaining > 0,
    );

  useEffect(() => {
    if (artifacts.data?.success && !paid) {
      router.replace(`/projects/${projectId}/preview`);
    }
  }, [artifacts.data, paid, projectId, router]);

  const initialText =
    report?.content?.blocks
      ?.map((b) => b.text)
      .filter(Boolean)
      .join("\n\n") ?? "完整报告生成中…";

  const editor = useEditor({
    extensions: [StarterKit],
    content: `<p>${initialText.replace(/\n\n/g, "</p><p>")}</p>`,
    immediatelyRender: false,
  });

  useEffect(() => {
    if (editor && report?.content?.blocks?.length) {
      editor.commands.setContent(
        `<p>${initialText.replace(/\n\n/g, "</p><p>")}</p>`,
      );
    }
  }, [editor, initialText, report?.content?.blocks?.length]);

  async function persistContent() {
    if (!report || !editor) return;
    const text = editor.getText();
    setSaveMsg("正在保存正文…");
    const res = await api<{ version: number }>(
      `/api/artifacts/${report.publicId}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          content: {
            type: "document",
            blocks: text
              .split(/\n+/)
              .filter(Boolean)
              .map((t, i) => ({
                id: `b_${i + 1}`,
                type: "paragraph",
                text: t,
              })),
          },
        }),
      },
    );
    if (res.success) {
      setSaveMsg("正文已保存");
      await Promise.all([artifacts.refetch(), artifactDetail.refetch()]);
    } else {
      setSaveMsg(res.error.message);
    }
  }

  async function adoptSuggest() {
    if (!editor || !suggest) return;
    editor.chain().focus().insertContent(`<p>${suggest}</p>`).run();
    setSuggest("");
    await persistContent();
  }

  async function reportRegenerate() {
    setRegenerating(true);
    setExportMsg("");
    const res = await api<{ remaining: number; agentRunId?: string }>(
      "/api/entitlements/consume",
      {
        method: "POST",
        body: JSON.stringify({ projectId, type: "REPORT_REGENERATE" }),
      },
    );
    setRegenerating(false);
    if (!res.success) {
      setExportMsg(res.error.message);
      return;
    }
    setExportMsg("已重新触发生成完整报告");
    await Promise.all([artifacts.refetch(), entitlements.refetch()]);
  }

  async function pollExport(exportId: string) {
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 800));
      const st = await api<{
        status: string;
        downloadUrl: string | null;
      }>(`/api/exports/${exportId}`);
      if (!st.success) continue;
      if (st.data.status === "COMPLETED" && st.data.downloadUrl) {
        setExporting(null);
        setExportMsg("导出完成");
        window.open(st.data.downloadUrl, "_blank");
        return;
      }
      if (st.data.status === "FAILED") {
        setExporting(null);
        setExportMsg("导出失败，请重试");
        return;
      }
    }
    setExporting(null);
    setExportMsg("导出超时，请稍后重试");
  }

  async function exportFile(format: "PDF" | "PPTX", force = false) {
    if (!report) return;
    setExporting(format);
    setExportMsg(`正在生成 ${format}…`);
    setForceConfirm(null);
    const created = await api<{ exportPublicId: string }>(
      `/api/artifacts/${report.publicId}/exports`,
      {
        method: "POST",
        body: JSON.stringify({ format, force }),
      },
    );
    if (!created.success) {
      setExporting(null);
      if (created.error.code === "QUALITY_WARNING") {
        const details = created.error.details as
          | { issues?: QualityIssue[] }
          | undefined;
        setForceConfirm({
          format,
          issues: details?.issues ?? [],
        });
        setExportMsg(created.error.message);
        return;
      }
      setExportMsg(created.error.message);
      return;
    }

    await pollExport(created.data.exportPublicId);
  }

  return (
    <WorkspaceShell
      projectId={projectId}
      draftTitle={draftTitle}
      onRemoteTitle={(title) => setDraftTitle(title)}
      mentor={<p>选中内容后可让 AI 给出建议，采用后才写入正文。</p>}
      onMentorSuggestion={setSuggest}
    >
      <div className="sd-card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <h1 style={{ marginTop: 0 }}>成果编辑</h1>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              className="sd-btn sd-btn-secondary"
              data-testid="open-citations"
              onClick={() => setCitationsOpen(true)}
            >
              来源
            </button>
            {canReportRegenerate ? (
              <button
                className="sd-btn sd-btn-secondary"
                data-testid="report-regenerate"
                disabled={regenerating || Boolean(exporting)}
                onClick={reportRegenerate}
              >
                {regenerating ? "重跑中…" : "重新生成报告"}
              </button>
            ) : (
              <button
                className="sd-btn sd-btn-secondary"
                data-testid="report-regenerate"
                disabled
                title="需专业版重试"
              >
                需专业版重试
              </button>
            )}
            <button className="sd-btn sd-btn-secondary" onClick={persistContent}>
              保存正文
            </button>
            <button
              className="sd-btn"
              onClick={() => exportFile("PDF")}
              disabled={Boolean(exporting) || !report}
              data-testid="export-pdf"
            >
              {exporting === "PDF" ? "导出中…" : "导出 PDF"}
            </button>
            {canPpt ? (
              <button
                className="sd-btn sd-btn-secondary"
                onClick={() => exportFile("PPTX")}
                disabled={Boolean(exporting) || !report}
                data-testid="export-ppt"
              >
                {exporting === "PPTX" ? "导出中…" : "导出 PPT"}
              </button>
            ) : (
              <button
                className="sd-btn sd-btn-secondary"
                disabled
                title="专业项目权益可导出 PPT"
                data-testid="export-ppt-locked"
              >
                导出 PPT（需专业版）
              </button>
            )}
          </div>
        </div>

        <label className="sd-label">项目名称</label>
        <input
          className="sd-input"
          value={draftTitle}
          onChange={(e) => setDraftTitle(e.target.value)}
          style={{ marginBottom: 12 }}
        />

        {exportMsg ? <p className="sd-muted">{exportMsg}</p> : null}
        {saveMsg ? <p className="sd-muted">{saveMsg}</p> : null}
        {report ? (
          <p className="sd-muted" data-testid="report-version">
            版本 v{version}
          </p>
        ) : null}

        <div
          style={{
            border: "1px solid var(--sd-border)",
            borderRadius: 12,
            padding: "1rem",
            minHeight: 320,
            background: "white",
          }}
        >
          <EditorContent editor={editor} />
        </div>

        {suggest ? (
          <div className="sd-card" style={{ marginTop: 12 }}>
            <div className="sd-muted">AI 建议</div>
            <p>{suggest}</p>
            <button className="sd-btn" onClick={() => void adoptSuggest()}>
              采用
            </button>
          </div>
        ) : null}
      </div>
      <CitationDrawer
        open={citationsOpen}
        onClose={() => setCitationsOpen(false)}
        citations={citationList}
      />
      {forceConfirm ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.4)",
            zIndex: 60,
            display: "grid",
            placeItems: "center",
            padding: 16,
          }}
        >
          <div className="sd-card" style={{ maxWidth: 440, width: "100%" }}>
            <h3 style={{ marginTop: 0 }}>存在未处理的质量问题</h3>
            <p className="sd-muted">确认后可强制导出，系统会记录强制导出决策。</p>
            <ul style={{ paddingLeft: 18, margin: "12px 0" }}>
              {forceConfirm.issues.map((issue) => (
                <li key={issue.id}>
                  [{issue.severity}] {issue.message}
                </li>
              ))}
            </ul>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                className="sd-btn"
                data-testid="export-force-confirm"
                onClick={() => void exportFile(forceConfirm.format, true)}
              >
                仍要强制导出
              </button>
              <button
                className="sd-btn sd-btn-secondary"
                onClick={() => {
                  setForceConfirm(null);
                  setExportMsg("");
                }}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </WorkspaceShell>
  );
}
