import type { Job } from "bullmq";
import { prisma, newPublicId } from "@stepdone/database";
import IORedis from "ioredis";
import type { ExportJob } from "./queues";

const redis = new IORedis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", {
  maxRetriesPerRequest: null,
});

export async function handleExportJob(job: Job<ExportJob>) {
  const data = job.data;
  const exp = await prisma.export.findUnique({
    where: { publicId: data.exportPublicId },
  });
  if (!exp) return;
  if (exp.status === "COMPLETED") return;

  await prisma.export.update({
    where: { id: exp.id },
    data: { status: "GENERATING" },
  });

  await new Promise((r) => setTimeout(r, 1200));

  const storageKey =
    data.format === "PPTX"
      ? "/samples/sample-deck.pptx"
      : "/samples/sample-report.pdf";

  await prisma.export.update({
    where: { id: exp.id },
    data: {
      status: "COMPLETED",
      storageKey,
      completedAt: new Date(),
    },
  });

  const project = await prisma.project.findUnique({
    where: { publicId: data.projectPublicId },
  });
  if (project) {
    const event = await prisma.projectEvent.create({
      data: {
        publicId: newPublicId(),
        projectId: project.id,
        type: "COMPLETED",
        stage: "EXPORT",
        message: `${data.format} 导出已完成`,
        percent: 100,
      },
    });
    await redis.publish(
      `project:${data.projectPublicId}`,
      JSON.stringify({
        id: event.publicId,
        type: event.type,
        stage: event.stage,
        message: event.message,
        percent: event.percent,
      }),
    );
  }
}
