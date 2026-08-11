import { prisma, newPublicId } from "@stepdone/database";
import type { NodeCode, StepStatus } from "@stepdone/domain";
import { getTemplateV1, assertCanStartNode } from "@stepdone/project-engine";
import { buildIdempotencyKey } from "@stepdone/agent-core";
import { userHasPaidEntitlement } from "./projects";

export async function enqueueNode(args: {
  projectId: bigint;
  projectPublicId: string;
  userId: bigint;
  nodeCode: NodeCode;
  input?: unknown;
  inputVersion?: number;
}) {
  const template = getTemplateV1();
  const node = template.steps.find((s) => s.code === args.nodeCode);
  if (!node) throw new Error(`Unknown node ${args.nodeCode}`);

  const prevDef = template.steps.find((s) => s.sequence === node.sequence - 1);
  const previous = prevDef
    ? await prisma.projectStepRun.findFirst({
        where: { projectId: args.projectId, nodeCode: prevDef.code },
        orderBy: { createdAt: "desc" },
      })
    : null;

  const project = await prisma.project.findUniqueOrThrow({
    where: { id: args.projectId },
  });

  assertCanStartNode({
    projectStatus: project.status as never,
    previousStepStatus: (previous?.status as StepStatus | undefined) ?? null,
    node,
    hasPaidEntitlement: await userHasPaidEntitlement(
      args.userId,
      args.projectId,
    ),
  });

  const inputVersion = args.inputVersion ?? 1;

  return prisma.$transaction(async (tx) => {
    const existing = await tx.agentRun.findFirst({
      where: {
        projectId: args.projectId,
        nodeCode: args.nodeCode,
        inputVersion,
        status: { in: ["QUEUED", "RUNNING", "WAITING_USER"] },
      },
    });
    if (existing) {
      return { stepRun: null, agentRun: existing, deduped: true as const };
    }

    const stepRun = await tx.projectStepRun.create({
      data: {
        publicId: newPublicId(),
        projectId: args.projectId,
        nodeCode: args.nodeCode,
        status: "QUEUED",
        inputVersion,
        input: args.input as object | undefined,
      },
    });

    const agentRun = await tx.agentRun.create({
      data: {
        publicId: newPublicId(),
        projectId: args.projectId,
        stepRunId: stepRun.id,
        nodeCode: args.nodeCode,
        idempotencyKey: buildIdempotencyKey(
          args.projectPublicId,
          stepRun.publicId,
          args.nodeCode,
          inputVersion,
        ),
        status: "QUEUED",
        inputVersion,
      },
    });

    await tx.outboxEvent.create({
      data: {
        topic:
          args.nodeCode === "RESEARCH_SOURCES" || args.nodeCode === "EXPORT"
            ? "agent-heavy"
            : "agent-default",
        status: "PENDING",
        payload: {
          agentRunId: agentRun.publicId,
          projectId: args.projectPublicId,
          stepRunId: stepRun.publicId,
          nodeCode: args.nodeCode,
          schemaVersion: 1,
        },
      },
    });

    await tx.project.update({
      where: { id: args.projectId },
      data: {
        status: "AI_PROCESSING",
        currentStepCode: args.nodeCode,
      },
    });

    return { stepRun, agentRun, deduped: false as const };
  });
}

const NEXT_AFTER_DECISION: Partial<Record<NodeCode, NodeCode | "DONE">> = {
  CREATE_PLAN: "SELECT_COMPETITORS",
  SELECT_COMPETITORS: "RESEARCH_SOURCES",
  RESEARCH_SOURCES: "SELECT_DIMENSIONS",
  SELECT_DIMENSIONS: "BUILD_MATRIX",
  USER_JUDGMENT: "GENERATE_PREVIEW",
};

export async function recordDecision(args: {
  projectId: bigint;
  projectPublicId: string;
  userId: bigint;
  nodeCode: NodeCode;
  action: string;
  payload?: unknown;
}) {
  const template = getTemplateV1();
  const node = template.steps.find((s) => s.code === args.nodeCode);
  if (!node) throw new Error(`Unknown node ${args.nodeCode}`);

  const allowContinue =
    node.requiresUserDecision ||
    (args.nodeCode === "RESEARCH_SOURCES" && args.action === "CONTINUE");

  if (!allowContinue) {
    throw new Error("STEP_INVALID_TRANSITION: node does not accept decision");
  }

  await prisma.$transaction(async (tx) => {
    await tx.projectDecision.create({
      data: {
        publicId: newPublicId(),
        projectId: args.projectId,
        nodeCode: args.nodeCode,
        action: args.action,
        payload: args.payload as object | undefined,
      },
    });

    await tx.projectStepRun.updateMany({
      where: {
        projectId: args.projectId,
        nodeCode: args.nodeCode,
        status: { in: ["WAITING_USER", "RUNNING", "QUEUED", "SUCCEEDED"] },
      },
      data: {
        status: "SUCCEEDED",
        completedAt: new Date(),
        output: {
          action: args.action,
          payload: args.payload ?? null,
        } as object,
      },
    });

    await tx.projectEvent.create({
      data: {
        publicId: newPublicId(),
        projectId: args.projectId,
        type: "STATUS_CHANGED",
        stage: args.nodeCode,
        message: `已记录决策：${args.action}`,
      },
    });
  });

  const next = NEXT_AFTER_DECISION[args.nodeCode];
  if (next && next !== "DONE") {
    await enqueueNode({
      projectId: args.projectId,
      projectPublicId: args.projectPublicId,
      userId: args.userId,
      nodeCode: next,
      input: args.payload,
    });
  }
}
