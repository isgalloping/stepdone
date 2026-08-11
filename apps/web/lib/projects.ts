import { prisma, newPublicId } from "@stepdone/database";
import type { ObjectiveInput } from "@stepdone/schemas";
import { buildIdempotencyKey } from "@stepdone/agent-core";

export async function createProjectFromObjective(
  userId: bigint,
  objective: ObjectiveInput,
) {
  const templateVersion = await prisma.projectTemplateVersion.findFirstOrThrow({
    where: { version: 1, template: { code: "competitor-analysis" } },
  });

  return prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        publicId: newPublicId(),
        userId,
        templateVersionId: templateVersion.id,
        title: objective.title,
        objective: objective.analysisTarget,
        status: "ACTIVE",
        currentStepCode: "CREATE_PLAN",
        progress: 5,
        metadata: objective,
        startedAt: new Date(),
      },
    });

    const defineRun = await tx.projectStepRun.create({
      data: {
        publicId: newPublicId(),
        projectId: project.id,
        nodeCode: "DEFINE_OBJECTIVE",
        status: "SUCCEEDED",
        input: objective,
        output: { accepted: true },
        startedAt: new Date(),
        completedAt: new Date(),
      },
    });

    const planStep = await tx.projectStepRun.create({
      data: {
        publicId: newPublicId(),
        projectId: project.id,
        nodeCode: "CREATE_PLAN",
        status: "QUEUED",
        input: objective,
      },
    });

    const agentRun = await tx.agentRun.create({
      data: {
        publicId: newPublicId(),
        projectId: project.id,
        stepRunId: planStep.id,
        nodeCode: "CREATE_PLAN",
        idempotencyKey: buildIdempotencyKey(
          project.publicId,
          planStep.publicId,
          "CREATE_PLAN",
          1,
        ),
        status: "QUEUED",
        inputVersion: 1,
      },
    });

    await tx.outboxEvent.create({
      data: {
        topic: "agent-default",
        status: "PENDING",
        payload: {
          agentRunId: agentRun.publicId,
          projectId: project.publicId,
          stepRunId: planStep.publicId,
          nodeCode: "CREATE_PLAN",
          schemaVersion: 1,
        },
      },
    });

    await tx.projectEvent.create({
      data: {
        publicId: newPublicId(),
        projectId: project.id,
        type: "STATUS_CHANGED",
        stage: "CREATE_PLAN",
        message: "项目已创建，正在生成计划",
        percent: 5,
      },
    });

    void defineRun;
    return project;
  });
}

export async function getOwnedProject(userId: bigint, projectPublicId: string) {
  return prisma.project.findFirst({
    where: { publicId: projectPublicId, userId },
  });
}

export async function userHasPaidEntitlement(
  userId: bigint,
  projectId: bigint,
): Promise<boolean> {
  const count = await prisma.entitlement.count({
    where: {
      userId,
      projectId,
      type: { in: ["STANDARD_PROJECT_CREDIT", "PRO_PROJECT_CREDIT"] },
      remaining: { gt: 0 },
    },
  });
  return count > 0;
}

/**
 * Capability check for a specific entitlement type on a project (e.g.
 * REPORT_EXPORT / PPT_EXPORT). Presence — not decrement — gates re-usable
 * capabilities within a paid project.
 */
export async function userHasEntitlement(
  userId: bigint,
  projectId: bigint,
  type: string,
): Promise<boolean> {
  const count = await prisma.entitlement.count({
    where: { userId, projectId, type, remaining: { gt: 0 } },
  });
  return count > 0;
}
