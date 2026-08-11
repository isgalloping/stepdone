"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useQuery } from "@tanstack/react-query";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { api } from "@/lib/api-client";

export default function ReportPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const [suggest, setSuggest] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState("");

  const artifacts = useQuery({
    queryKey: ["artifacts", projectId],
    queryFn: async () =>
      api<{
        paid: boolean;
        canExportPdf: boolean;
        canExportPptx: boolean;
        artifacts: Array<{
          publicId: string;
          type: string;
          content: { blocks?: Array<{ type: string; text?: string; level?: number }> } | null;
          previewOnly?: boolean;
        }>;
      }>(`/api/projects/${projectId}/artifacts`),
    refetchInterval: 3000,
  });

  const report = artifacts.data?.success
    ? artifacts.data.data.artifacts.find((a) => a.type === "ONLINE_REPORT")
    : undefined;
  const paid = artifacts.data?.success ? artifacts.data.data.paid : false;
  const canExportPptx = artifacts.data?.success
    ? artifacts.data.data.canExportPptx
    : false;

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
      editor.commands.setContent(`<p>${initialText.replace(/\n\n/g, "</p><p>")}</p>`);
    }
  }, [editor, initialText, report?.content?.blocks?.length]);

  function applySuggest() {
    if (!editor || !suggest) return;
    editor.chain().focus().insertContent(`<p>${suggest}</p>`).run();
    setSuggest("");
  }

  async function runExport(format: "PDF" | "PPTX") {
    setExporting(true);
    setExportMsg(`正在生成 ${format}…`);
    try {
      const created = await api<{ publicId: string }>(
        `/api/projects/${projectId}/exports`,
        { method: "POST", body: JSON.stringify({ format }) },
      );
      if (!created.success) {
        setExporting(false);
        setExportMsg(created.error.message);
        return;
      }
      const exportId = created.data.publicId;
      // Poll the export status until COMPLETED (real async export pipeline).
      for (let attempt = 0; attempt < 30; attempt++) {
        await new Promise((r) => setTimeout(r, 1000));
        const status = await api<{ status: string; downloadUrl: string | null }>(
          `/api/exports/${exportId}`,
        );
        if (status.success && status.data.status === "COMPLETED") {
          setExporting(false);
          setExportMsg("导出完成（演示样例）");
          if (status.data.downloadUrl) {
            window.open(status.data.downloadUrl, "_blank");
          }
          void exportsQuery.refetch();
          return;
        }
        if (status.success && status.data.status === "FAILED") {
          setExporting(false);
          setExportMsg("导出失败，请重试");
          return;
        }
      }
      setExporting(false);
      setExportMsg("导出仍在后台进行，可稍后在导出记录中查看");
    } catch {
      setExporting(false);
      setExportMsg("导出失败，请重试");
    }
  }

  const exportsQuery = useQuery({
    queryKey: ["exports", projectId],
    enabled: paid,
    queryFn: async () =>
      api<{
        exports: Array<{
          publicId: string;
          format: string;
          status: string;
          downloadUrl: string | null;
          createdAt: string;
        }>;
      }>(`/api/projects/${projectId}/exports`),
  });

  return (
    <WorkspaceShell
      projectId={projectId}
      mentor={
        <div>
          <p>选中内容后可让 AI 给出建议，采用后才写入正文。</p>
          <button
            className="sd-btn sd-btn-secondary"
            style={{ width: "100%", marginBottom: 8 }}
            onClick={() => setSuggest("建议改写：将结论表述得更克制，并补充来源限定语。")}
          >
            改写选中内容
          </button>
          <button
            className="sd-btn sd-btn-secondary"
            style={{ width: "100%", marginBottom: 8 }}
            onClick={() => setSuggest("建议缩短：保留核心差异与一条行动建议。")}
          >
            缩短
          </button>
          {suggest ? (
            <div className="sd-card" style={{ marginTop: 8 }}>
              <div className="sd-muted">AI 建议</div>
              <p>{suggest}</p>
              <button className="sd-btn" onClick={applySuggest}>
                采用
              </button>
            </div>
          ) : null}
        </div>
      }
    >
      <div className="sd-card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <h1 style={{ marginTop: 0 }}>成果编辑</h1>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              className="sd-btn"
              onClick={() => runExport("PDF")}
              disabled={exporting}
              data-testid="export-pdf"
            >
              {exporting ? "导出中…" : "导出 PDF"}
            </button>
            {canExportPptx ? (
              <button
                className="sd-btn sd-btn-secondary"
                onClick={() => runExport("PPTX")}
                disabled={exporting}
                data-testid="export-pptx"
              >
                导出 PPT
              </button>
            ) : (
              <span className="sd-chip" title="PPT 导出需专业项目权益">
                PPT · 专业
              </span>
            )}
          </div>
        </div>
        {exportMsg ? <p className="sd-muted">{exportMsg}</p> : null}
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
      </div>

      {exportsQuery.data?.success && exportsQuery.data.data.exports.length ? (
        <div className="sd-card" style={{ marginTop: 12 }}>
          <h3 style={{ marginTop: 0 }}>导出记录</h3>
          <div style={{ display: "grid", gap: 8 }}>
            {exportsQuery.data.data.exports.map((e) => (
              <div
                key={e.publicId}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                <span>
                  <span className="sd-chip">{e.format}</span>{" "}
                  <span className="sd-muted">{e.status}</span>
                </span>
                {e.downloadUrl ? (
                  <a
                    className="sd-btn sd-btn-secondary"
                    href={e.downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    下载
                  </a>
                ) : (
                  <span className="sd-muted">处理中…</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </WorkspaceShell>
  );
}
