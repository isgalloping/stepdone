"use client";

export function ConflictDialog({
  open,
  onKeepLocal,
  onUseRemote,
}: {
  open: boolean;
  onKeepLocal: () => void;
  onUseRemote: () => void;
}) {
  if (!open) return null;
  return (
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
      data-testid="conflict-dialog"
    >
      <div className="sd-card" style={{ maxWidth: 420, width: "100%" }}>
        <h3 style={{ marginTop: 0 }}>检测到其他设备修改</h3>
        <p className="sd-muted">
          请选择保留当前版本，或使用云端版本。长文本暂不自动合并。
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="sd-btn" onClick={onKeepLocal} data-testid="conflict-keep-local">
            保留我的
          </button>
          <button
            className="sd-btn sd-btn-secondary"
            onClick={onUseRemote}
            data-testid="conflict-use-remote"
          >
            用云端版本
          </button>
        </div>
      </div>
    </div>
  );
}
