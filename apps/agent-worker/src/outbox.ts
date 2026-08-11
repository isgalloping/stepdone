import { prisma, newPublicId } from "@stepdone/database";
import { buildIdempotencyKey } from "@stepdone/agent-core";
import type { NodeCode } from "@stepdone/domain";
import type { Queue } from "bullmq";
import type { AgentJob, ExportJob } from "./queues";

export async function dispatchOutbox(queues: {
  defaultQueue: Queue;
  heavyQueue: Queue;
  exportQueue: Queue;
}) {
  const events = await prisma.outboxEvent.findMany({
    where: {
      status: "PENDING",
      availableAt: { lte: new Date() },
    },
    orderBy: { id: "asc" },
    take: 20,
  });

  for (const row of events) {
    const claimed = await prisma.outboxEvent.updateMany({
      where: { id: row.id, status: "PENDING" },
      data: { status: "PUBLISHING" },
    });
    if (claimed.count === 0) continue;

    try {
      const payload = row.payload as Record<string, unknown>;
      let job: AgentJob | null = null;

      if (payload.type === "EXPORT_ARTIFACT") {
        const exportJob: ExportJob = {
          kind: "export",
          exportPublicId: String(payload.exportPublicId),
          projectId: String(payload.projectPublicId),
          format: String(payload.format),
        };
        await queues.exportQueue.add(`export:${exportJob.format}`, exportJob, {
          attempts: 4,
          backoff: { type: "exponential", delay: 2000 },
          removeOnComplete: { age: 86400 },
          removeOnFail: false,
        });
        await prisma.outboxEvent.update({
          where: { id: row.id },
          data: { status: "PUBLISHED", publishedAt: new Date() },
        });
        continue;
      }

      if (payload.type === "START_NODE") {
        const projectPublicId = String(payload.projectPublicId);
        const nodeCode = String(payload.nodeCode) as NodeCode;
        const project = await prisma.project.findUniqueOrThrow({
          where: { publicId: projectPublicId },
        });

        const existing = await prisma.agentRun.findFirst({
          where: {
            projectId: project.id,
            nodeCode,
            status: { in: ["QUEUED", "RUNNING", "SUCCEEDED"] },
          },
          orderBy: { createdAt: "desc" },
        });

        if (existing?.status === "SUCCEEDED") {
          await prisma.outboxEvent.update({
            where: { id: row.id },
            data: { status: "PUBLISHED", publishedAt: new Date() },
          });
          continue;
        }

        if (existing && (existing.status === "QUEUED" || existing.status === "RUNNING")) {
          const step = existing.stepRunId
            ? await prisma.projectStepRun.findUnique({
                where: { id: existing.stepRunId },
              })
            : null;
          job = {
            agentRunId: existing.publicId,
            projectId: project.publicId,
            stepRunId: step?.publicId ?? newPublicId(),
            nodeCode,
            schemaVersion: 1,
          };
        } else {
          const stepRun = await prisma.projectStepRun.create({
            data: {
              publicId: newPublicId(),
              projectId: project.id,
              nodeCode,
              status: "QUEUED",
            },
          });

          const agentRun = await prisma.agentRun.create({
            data: {
              publicId: newPublicId(),
              projectId: project.id,
              stepRunId: stepRun.id,
              nodeCode,
              idempotencyKey: buildIdempotencyKey(
                project.publicId,
                stepRun.publicId,
                nodeCode,
                1,
              ),
              status: "QUEUED",
            },
          });

          job = {
            agentRunId: agentRun.publicId,
            projectId: project.publicId,
            stepRunId: stepRun.publicId,
            nodeCode,
            schemaVersion: 1,
          };
        }
      } else if (payload.agentRunId) {
        job = {
          agentRunId: String(payload.agentRunId),
          projectId: String(payload.projectId),
          stepRunId: String(payload.stepRunId),
          nodeCode: String(payload.nodeCode) as NodeCode,
          schemaVersion: 1,
        };
      }

      if (job) {
        const queue =
          row.topic === "export"
            ? queues.exportQueue
            : row.topic === "agent-heavy"
              ? queues.heavyQueue
              : queues.defaultQueue;
        await queue.add(job.nodeCode, job, {
          attempts: 4,
          backoff: { type: "exponential", delay: 2000 },
          removeOnComplete: { age: 86400 },
          removeOnFail: false,
        });
      }

      await prisma.outboxEvent.update({
        where: { id: row.id },
        data: { status: "PUBLISHED", publishedAt: new Date() },
      });
    } catch (error) {
      console.error("outbox publish failed", row.id, error);
      await prisma.outboxEvent.update({
        where: { id: row.id },
        data: {
          status: "PENDING",
          attempts: { increment: 1 },
          availableAt: new Date(Date.now() + 5000),
        },
      });
    }
  }
}
