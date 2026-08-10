export default function PricingPage() {
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "1.25rem" }}>
      <h1>价格</h1>
      <p className="sd-muted">单项目付费，不自动续费。</p>
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
        <div className="sd-card">
          <h3>标准项目 · ¥29</h3>
          <p>完整报告、质量检查、PDF、能力报告</p>
        </div>
        <div className="sd-card">
          <h3>专业项目 · ¥59</h3>
          <p>标准全部 + PPTX + 重试/重生成</p>
        </div>
      </div>
    </div>
  );
}
