export const PROJECT_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "WAITING_USER",
  "AI_PROCESSING",
  "PAYMENT_REQUIRED",
  "QUALITY_REVIEW",
  "COMPLETED",
  "ARCHIVED",
  "FAILED",
  "CANCELLED",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const STEP_STATUSES = [
  "PENDING",
  "QUEUED",
  "RUNNING",
  "WAITING_USER",
  "VALIDATING",
  "SUCCEEDED",
  "FAILED_RETRYABLE",
  "FAILED_FINAL",
  "CANCELLED",
] as const;
export type StepStatus = (typeof STEP_STATUSES)[number];

export const NODE_CODES = [
  "DEFINE_OBJECTIVE",
  "CREATE_PLAN",
  "SELECT_COMPETITORS",
  "RESEARCH_SOURCES",
  "SELECT_DIMENSIONS",
  "BUILD_MATRIX",
  "USER_JUDGMENT",
  "GENERATE_PREVIEW",
  "PAYMENT_GATE",
  "GENERATE_REPORT",
  "QUALITY_REVIEW",
  "FINAL_CONFIRMATION",
  "EXPORT",
  "ABILITY_REPORT",
] as const;
export type NodeCode = (typeof NODE_CODES)[number];

const ALLOWED: Record<ProjectStatus, ProjectStatus[]> = {
  DRAFT: ["ACTIVE", "CANCELLED"],
  ACTIVE: [
    "WAITING_USER",
    "AI_PROCESSING",
    "PAYMENT_REQUIRED",
    "QUALITY_REVIEW",
    "COMPLETED",
    "FAILED",
    "CANCELLED",
    "ARCHIVED",
  ],
  WAITING_USER: ["ACTIVE", "AI_PROCESSING", "FAILED", "CANCELLED"],
  AI_PROCESSING: [
    "ACTIVE",
    "WAITING_USER",
    "PAYMENT_REQUIRED",
    "FAILED",
    "CANCELLED",
  ],
  PAYMENT_REQUIRED: ["ACTIVE", "CANCELLED", "ARCHIVED"],
  QUALITY_REVIEW: ["COMPLETED", "ACTIVE", "FAILED"],
  COMPLETED: ["ARCHIVED"],
  ARCHIVED: [],
  FAILED: ["ACTIVE", "CANCELLED", "ARCHIVED"],
  CANCELLED: ["ARCHIVED"],
};

export function canTransitionProject(
  from: ProjectStatus,
  to: ProjectStatus,
): boolean {
  return ALLOWED[from].includes(to);
}
