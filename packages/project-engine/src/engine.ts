import {
  ErrorCodes,
  type ProjectStatus,
  type StepStatus,
} from "@stepdone/domain";
import {
  getCompetitorAnalysisV1,
  type TemplateStepDef,
} from "./templates/competitor-analysis/v1";

export function getTemplateV1() {
  return getCompetitorAnalysisV1();
}

export class EngineError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = "EngineError";
  }
}

export function assertCanStartNode(args: {
  projectStatus: ProjectStatus;
  previousStepStatus: StepStatus | null;
  node: TemplateStepDef;
  hasPaidEntitlement: boolean;
}): void {
  const { projectStatus, previousStepStatus, node, hasPaidEntitlement } = args;

  if (projectStatus === "CANCELLED" || projectStatus === "ARCHIVED") {
    throw new EngineError(
      ErrorCodes.STEP_INVALID_TRANSITION,
      `${ErrorCodes.STEP_INVALID_TRANSITION}: project status ${projectStatus} cannot start nodes`,
    );
  }

  if (node.sequence > 1) {
    if (previousStepStatus !== "SUCCEEDED") {
      throw new EngineError(
        ErrorCodes.STEP_INVALID_TRANSITION,
        `${ErrorCodes.STEP_INVALID_TRANSITION}: previous step must succeed before starting next node`,
      );
    }
  }

  if (node.requiresPayment && !hasPaidEntitlement) {
    throw new EngineError(
      ErrorCodes.ENTITLEMENT_REQUIRED,
      `${ErrorCodes.ENTITLEMENT_REQUIRED}: paid entitlement required for this node`,
    );
  }
}

export type { TemplateStepDef };
