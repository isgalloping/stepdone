import type { Job } from "bullmq";
import { prisma, newPublicId } from "@stepdone/database";
import { acquireLease, heartbeatLease } from "@stepdone/agent-core";
import type { NodeCode } from "@stepdone/domain";
import IORedis from "ioredis";
import { runFixture } from "./fixtures/index";
import type { AgentJob } from "./queues";
import { buildIdempotencyKey } from "@stepdone/agent-core";

const workerId = `worker_${process.pid}`;
const redis = new IORedis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", {
  maxRetriesPerRequest: null,
});

async function publish(projectPublicId: string, event: object) {
  await redis.publish(`project:${projectPublicId}`, JSON.stringify(event));
}

async function enqueueFollowUp(
  projectId: bigint,
  projectPublicId: string,
  nodeCode: NodeCode,
) {
  const stepRun = await prisma.projectStepRun.create({
    data: {
      publicId: newPublicId(),
      projectId,
      nodeCode,
      status: "QUEUED",
    },
  });
  const agentRun = await prisma.agentRun.create({
    data: {
      publicId: newPublicId(),
      projectId,
      stepRunId: stepRun.id,
      nodeCode,
      idempotencyKey: buildIdempotencyKey(
        projectPublicId,
        stepRun.publicId,
        nodeCode,
        1,
      ),
      status: "QUEUED",
    },
  });
  await prisma.outboxEvent.create({
    data: {
      topic: "agent-default",
      status: "PENDING",
      payload: {
        agentRunId: agentRun.publicId,
        projectId: projectPublicId,
        stepRunId: stepRun.publicId,
        nodeCode,
        schemaVersion: 1,
      },
    },
  });
}

export async function handleAgentJob(job: Job<AgentJob>) {
  const data = job.data;
  const agentRun = await prisma.agentRun.findUnique({
    where: { publicId: data.agentRunId },
    include: { project: true, stepRun: true },
  });
  if (!agentRun) return;
  if (agentRun.status === "SUCCEEDED" || agentRun.status === "CANCELLED") return;

  const ok = await acquireLease(prisma, agentRun.id, workerId);
  if (!ok) {
    throw new Error("lease not acquired");
  }

  const hb = setInterval(() => {
    void heartbeatLease(prisma, agentRun.id, workerId);
  }, 20_000);

  try {
    const metadata = (agentRun.project.metadata ?? {}) as Record<string, unknown>;
    const result = await runFixture(data.nodeCode, {
      projectTitle: agentRun.project.title,
      analysisTarget: String(
        metadata.analysisTarget ?? agentRun.project.objective ?? "目标产品",
      ),
      metadata,
    });

    await publish(agentRun.project.publicId, {
      id: newPublicId(),
      type: "PROGRESS",
      stage: data.nodeCode,
      message: `正在执行 ${data.nodeCode}`,
      percent: 50,
    });

    if (result.type === "waiting_user") {
      await prisma.$transaction(async (tx) => {
        await tx.agentRun.update({
          where: { id: agentRun.id },
          data: {
            status: "WAITING_USER",
            completedAt: new Date(),
            lockedBy: null,
            lockExpiresAt: null,
          },
        });
        if (agentRun.stepRunId) {
          await tx.projectStepRun.update({
            where: { id: agentRun.stepRunId },
            data: {
              status: "WAITING_USER",
              output: {
                prompt: result.prompt,
                ...(result.partialOutput ?? {}),
              },
            },
          });
        }
        await tx.project.update({
          where: { id: agentRun.projectId },
          data: {
            status: "WAITING_USER",
            currentStepCode: data.nodeCode,
          },
        });
        const event = await tx.projectEvent.create({
          data: {
            publicId: newPublicId(),
            projectId: agentRun.projectId,
            agentRunId: agentRun.id,
            type: "WAITING_USER",
            stage: data.nodeCode,
            message: result.prompt.question,
            percent: 60,
          },
        });
        await publish(agentRun.project.publicId, {
          id: event.publicId,
          type: event.type,
          stage: event.stage,
          message: event.message,
          percent: event.percent,
        });
      });
      return;
    }

    if (result.type !== "completed") {
      await prisma.agentRun.update({
        where: { id: agentRun.id },
        data: {
          status: "FAILED_RETRYABLE",
          errorMessage: result.type === "failed" ? result.message : result.reason,
          lockedBy: null,
        },
      });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.agentRun.update({
        where: { id: agentRun.id },
        data: {
          status: "SUCCEEDED",
          completedAt: new Date(),
          lockedBy: null,
          lockExpiresAt: null,
        },
      });
      if (agentRun.stepRunId) {
        await tx.projectStepRun.update({
          where: { id: agentRun.stepRunId },
          data: {
            status: "SUCCEEDED",
            output: result.output as object,
            completedAt: new Date(),
          },
        });
      }

      await tx.modelUsage.create({
        data: {
          agentRunId: agentRun.id,
          provider: "mock",
          model: "fixture-v1",
          taskType: data.nodeCode,
          promptVersion: "v1",
          inputTokens: 100,
          outputTokens: 200,
          latencyMs: 800,
          estimatedCost: 1,
          status: "SUCCEEDED",
        },
      });

      if (data.nodeCode === "RESEARCH_SOURCES") {
        const output = result.output as {
          sources: Array<{
            title: string;
            publisher?: string;
            url?: string;
            credibility: string;
            summary?: string;
          }>;
        };
        for (const s of output.sources) {
          await tx.source.create({
            data: {
              publicId: newPublicId(),
              projectId: agentRun.projectId,
              title: s.title,
              publisher: s.publisher,
              url: s.url,
              credibility: s.credibility,
              summary: s.summary,
              status: "VERIFIED",
            },
          });
        }
        await tx.project.update({
          where: { id: agentRun.projectId },
          data: {
            status: "WAITING_USER",
            currentStepCode: "RESEARCH_SOURCES",
            progress: 50,
          },
        });
      } else if (data.nodeCode === "GENERATE_PREVIEW") {
        const output = result.output as object;
        const artifact = await tx.artifact.create({
          data: {
            publicId: newPublicId(),
            projectId: agentRun.projectId,
            type: "PREVIEW_REPORT",
            title: `${agentRun.project.title} 预览`,
            status: "READY",
          },
        });
        await tx.artifactVersion.create({
          data: {
            publicId: newPublicId(),
            artifactId: artifact.id,
            version: 1,
            content: output,
            createdBy: "AI",
          },
        });
        await tx.project.update({
          where: { id: agentRun.projectId },
          data: {
            status: "PAYMENT_REQUIRED",
            currentStepCode: "PAYMENT_GATE",
            progress: 75,
          },
        });
      } else if (data.nodeCode === "GENERATE_REPORT") {
        const output = result.output as object;
        const artifact = await tx.artifact.create({
          data: {
            publicId: newPublicId(),
            projectId: agentRun.projectId,
            type: "ONLINE_REPORT",
            title: agentRun.project.title,
            status: "READY",
          },
        });
        await tx.artifactVersion.create({
          data: {
            publicId: newPublicId(),
            artifactId: artifact.id,
            version: 1,
            content: output,
            createdBy: "AI",
          },
        });
        await tx.project.update({
          where: { id: agentRun.projectId },
          data: {
            status: "ACTIVE",
            currentStepCode: "QUALITY_REVIEW",
            progress: 90,
          },
        });
      } else if (data.nodeCode === "BUILD_MATRIX") {
        await tx.project.update({
          where: { id: agentRun.projectId },
          data: {
            status: "AI_PROCESSING",
            currentStepCode: "USER_JUDGMENT",
            progress: 65,
          },
        });
      } else {
        await tx.project.update({
          where: { id: agentRun.projectId },
          data: {
            status: "ACTIVE",
            currentStepCode: data.nodeCode,
          },
        });
      }

      const event = await tx.projectEvent.create({
        data: {
          publicId: newPublicId(),
          projectId: agentRun.projectId,
          agentRunId: agentRun.id,
          type: "COMPLETED",
          stage: data.nodeCode,
          message: `${data.nodeCode} 已完成`,
          percent: 100,
        },
      });
      await publish(agentRun.project.publicId, {
        id: event.publicId,
        type: event.type,
        stage: event.stage,
        message: event.message,
        percent: event.percent,
      });
    });

    if (data.nodeCode === "BUILD_MATRIX") {
      await enqueueFollowUp(
        agentRun.projectId,
        agentRun.project.publicId,
        "USER_JUDGMENT",
      );
    }
    if (data.nodeCode === "GENERATE_REPORT") {
      await enqueueFollowUp(
        agentRun.projectId,
        agentRun.project.publicId,
        "QUALITY_REVIEW",
      );
    }
    if (data.nodeCode === "QUALITY_REVIEW") {
      await enqueueFollowUp(
        agentRun.projectId,
        agentRun.project.publicId,
        "ABILITY_REPORT",
      );
    }
  } finally {
    clearInterval(hb);
  }
}
