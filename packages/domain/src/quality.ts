export type QualityIssue = {
  id: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  message: string;
  status: "OPEN" | "RESOLVED";
};

export type QualityCheckState = { issues: QualityIssue[] };

export function listBlockingIssues(state: QualityCheckState): QualityIssue[] {
  return state.issues.filter(
    (i) =>
      i.status === "OPEN" && (i.severity === "HIGH" || i.severity === "MEDIUM"),
  );
}

export function markIssueResolved(
  state: QualityCheckState,
  id: string,
): QualityCheckState {
  return {
    issues: state.issues.map((i) =>
      i.id === id ? { ...i, status: "RESOLVED" as const } : i,
    ),
  };
}
