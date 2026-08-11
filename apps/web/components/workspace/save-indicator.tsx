"use client";

import type { AutosaveStatus } from "@/hooks/use-autosave";

const copy: Record<AutosaveStatus, string> = {
  idle: "",
  saving: "正在保存…",
  saved: "已自动保存",
  conflict: "检测到冲突",
  error: "保存失败，正在重试",
};

export function SaveIndicator({ status }: { status: AutosaveStatus }) {
  const label = copy[status];
  if (!label) {
    return <span data-testid="save-indicator" />;
  }
  const color =
    status === "error" || status === "conflict"
      ? "var(--sd-danger)"
      : status === "saving"
        ? "var(--sd-warning)"
        : "var(--sd-muted)";
  return (
    <span style={{ fontSize: 13, color }} data-testid="save-indicator">
      {label}
    </span>
  );
}
