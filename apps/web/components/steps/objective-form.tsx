"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ObjectiveInputSchema, type ObjectiveInput } from "@stepdone/schemas";
import { api } from "@/lib/api-client";
import { clearDraft, loadDraft, saveDraft } from "@/lib/draft";

const defaults: ObjectiveInput = {
  title: "",
  analysisTarget: "",
  useCase: "向老板汇报",
  audience: "直属领导",
  markets: ["中国大陆"],
  deadline: "一周内",
  outputFormats: ["PDF", "在线报告"],
  knownCompetitors: [],
  notes: "",
};

export function ObjectiveForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [competitorInput, setCompetitorInput] = useState("");

  const form = useForm<ObjectiveInput>({
    resolver: zodResolver(ObjectiveInputSchema),
    defaultValues: defaults,
  });

  useEffect(() => {
    if (search.get("resume") === "1") {
      const draft = loadDraft<ObjectiveInput>();
      if (draft) form.reset(draft);
    }
  }, [search, form]);

  async function onSubmit(values: ObjectiveInput) {
    setLoading(true);
    setError("");
    const me = await api("/api/auth/me");
    if (!me.success) {
      saveDraft(values);
      router.push("/login");
      return;
    }
    const res = await api<{ projectId: string }>("/api/projects", {
      method: "POST",
      body: JSON.stringify(values),
    });
    setLoading(false);
    if (!res.success) {
      setError(res.error.message);
      return;
    }
    clearDraft();
    router.push(`/projects/${res.data.projectId}/plan`);
  }

  const known = form.watch("knownCompetitors") ?? [];
  const formats = form.watch("outputFormats") ?? [];

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="sd-card" style={{ maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ marginTop: 0 }}>定义交付目标</h1>
      <p className="sd-muted">先明确成果给谁使用，AI 才能给出合适的项目计划。</p>

      <div style={{ display: "grid", gap: "1rem" }}>
        <div>
          <label className="sd-label">项目名称</label>
          <input className="sd-input" placeholder="例如：智能记账App竞品分析" {...form.register("title")} />
        </div>
        <div>
          <label className="sd-label">分析对象</label>
          <input className="sd-input" placeholder="输入你要研究的产品、公司或行业" {...form.register("analysisTarget")} />
        </div>
        <div>
          <label className="sd-label">使用场景</label>
          <select className="sd-select" {...form.register("useCase")}>
            {["向老板汇报", "产品立项", "营销策划", "求职面试", "创业研究", "其他"].map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="sd-label">交付对象</label>
          <select className="sd-select" {...form.register("audience")}>
            {["自己使用", "直属领导", "客户", "面试官", "投资人", "团队成员", "其他"].map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="sd-label">截止时间</label>
          <select className="sd-select" {...form.register("deadline")}>
            {["今天", "3天内", "一周内", "自定义日期"].map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="sd-label">输出格式</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(["在线报告", "PDF", "PPT", "竞品对比表"] as const).map((f) => {
              const checked = formats.includes(f);
              return (
                <button
                  type="button"
                  key={f}
                  className="sd-chip"
                  style={{
                    border: "none",
                    cursor: "pointer",
                    background: checked ? "var(--sd-primary)" : "var(--sd-soft)",
                    color: checked ? "white" : "var(--sd-primary)",
                  }}
                  onClick={() => {
                    const next = checked
                      ? formats.filter((x) => x !== f)
                      : [...formats, f];
                    form.setValue("outputFormats", next, { shouldValidate: true });
                  }}
                >
                  {f}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label className="sd-label">已知竞品（回车添加）</label>
          <input
            className="sd-input"
            value={competitorInput}
            onChange={(e) => setCompetitorInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const name = competitorInput.trim();
                if (!name || known.length >= 10) return;
                form.setValue("knownCompetitors", [...known, name]);
                setCompetitorInput("");
              }
            }}
          />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
            {known.map((c) => (
              <span key={c} className="sd-chip">{c}</span>
            ))}
          </div>
        </div>
        <div>
          <label className="sd-label">补充说明</label>
          <textarea className="sd-textarea" {...form.register("notes")} />
        </div>
      </div>

      {error ? <p style={{ color: "var(--sd-danger)" }}>{error}</p> : null}
      {Object.keys(form.formState.errors).length > 0 ? (
        <p style={{ color: "var(--sd-danger)" }}>请完善必填字段后再提交。</p>
      ) : null}

      <div style={{ position: "sticky", bottom: 12, marginTop: "1.25rem" }}>
        <button className="sd-btn" style={{ width: "100%" }} disabled={loading} data-testid="submit-objective">
          {loading ? "提交中…" : "生成项目计划"}
        </button>
      </div>
    </form>
  );
}
