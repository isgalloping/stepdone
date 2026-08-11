import { Queue, Worker, type Job } from "bullmq";
import type { NodeCode } from "@stepdone/domain";
import IORedis from "ioredis";

export type AgentJob = {
  kind?: "agent";
  agentRunId: string;
  projectId: string;
  stepRunId: string;
  nodeCode: NodeCode;
  schemaVersion: 1;
};

export type ExportJob = {
  kind: "export";
  exportPublicId: string;
  artifactPublicId: string;
  projectPublicId: string;
  format: "PDF" | "PPTX";
  schemaVersion: 1;
};

export type WorkerJob = AgentJob | ExportJob;

const connection = () =>
  new IORedis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", {
    maxRetriesPerRequest: null,
  });

export function createQueues() {
  const conn = connection();
  return {
    connection: conn,
    defaultQueue: new Queue("agent-default", { connection: conn }),
    heavyQueue: new Queue("agent-heavy", { connection: conn }),
    exportQueue: new Queue("export", { connection: conn }),
  };
}

export function createWorkers(
  handler: (job: Job<WorkerJob>) => Promise<void>,
) {
  const conn = connection();
  const opts = { connection: conn, concurrency: 2 };
  return [
    new Worker<WorkerJob>("agent-default", handler, opts),
    new Worker<WorkerJob>("agent-heavy", handler, { ...opts, concurrency: 1 }),
    new Worker<WorkerJob>("export", handler, { ...opts, concurrency: 1 }),
  ];
}
