import type { Job } from "bullmq";
import { prisma, newPublicId } from "@stepdone/database";
import IORedis from "ioredis";
import type { ExportJob } from "./queues";

const redis = new IORedis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", {
  maxRetriesPerRequest: null,
});

async function publish(projectPublicId: string, event: object) {
  await redis.publish(`project:${projectPublicId}`, JSON.stringify(event));
}

const SAMPLE_BY_FORMAT: Record<string, string> = {
  PDF: "/samples/sample-report.pdf",
  PPTX: "/samples/sample-deck.pptx",
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Fixture export worker: renders a sample file for the requested format and
 * marks the exports row COMPLETED. Mirrors the real Export Worker contract
 * (tech §29) — status transitions + storageKey + completion event — without a
 * real rendering engine. Idempotent: a COMPLETED export is a no-op.
 */
export async function handleExportJob(job: Job<ExportJob>) {
  const { exportPublicId, projectId: projectPublicId, format } = job.data;

  const exportRow = await prisma.export.findUnique({
    where: { publicId: exportPublicId },
    include: { artifact: { include: { project: true } } },
  });
  if (!exportRow) return;
  if (exportRow.status === "COMPLETED") return;

  await prisma.export.update({
    where: { id: exportRow.id },
    data: { status: "GENERATING" },
  });
  await publish(projectPublicId, {
    id: newPublicId(),
    type: "PROGRESS",
    stage: "EXPORT",
    message: `正在生成 ${format} 文件`,
    percent: 40,
  });

  // Simulate rendering + upload latency.
  await sleep(1200);

  const storageKey = SAMPLE_BY_FORMAT[format] ?? SAMPLE_BY_FORMAT.PDF;

  await prisma.$transaction(async (tx) => {
    await tx.export.update({
      where: { id: exportRow.id },
      data: {
        status: "COMPLETED",
        storageKey,
        completedAt: new Date(),
      },
    });
    const event = await tx.projectEvent.create({
      data: {
        publicId: newPublicId(),
        projectId: exportRow.artifact.projectId,
        type: "COMPLETED",
        stage: "EXPORT",
        message: `${format} 导出完成`,
        percent: 100,
      },
    });
    await publish(projectPublicId, {
      id: event.publicId,
      type: event.type,
      stage: event.stage,
      message: event.message,
      percent: event.percent,
    });
  });
}
