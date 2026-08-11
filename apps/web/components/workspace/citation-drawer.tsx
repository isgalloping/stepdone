"use client";
export function CitationDrawer({
  open,
  onClose,
  citations,
}: {
  open: boolean;
  onClose: () => void;
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
}) {
  if (!open) return null;
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.35)", zIndex: 60 }}
      onClick={onClose}
      data-testid="citation-drawer"
    >
      <div
        className="sd-card"
        style={{ position: "absolute", right: 0, top: 0, height: "100%", width: "min(420px,100%)", overflow: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginTop: 0 }}>来源引用</h3>
        {!citations.length ? <p className="sd-muted">暂无引用</p> : null}
        {citations.map((c) => (
          <div key={c.publicId} style={{ marginBottom: 12 }}>
            <strong>{c.source.title}</strong>
            <div className="sd-muted">
              {c.source.publisher ?? "未知"} · {c.source.credibility}
            </div>
            <p>{c.source.summary ?? c.quote}</p>
            {c.source.url ? (
              <a href={c.source.url} target="_blank" rel="noreferrer">
                打开链接
              </a>
            ) : null}
          </div>
        ))}
        <button className="sd-btn sd-btn-secondary" onClick={onClose}>
          关闭
        </button>
      </div>
    </div>
  );
}
