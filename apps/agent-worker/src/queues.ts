import { Queue, Worker, type Job } from "bullmq";
import type { NodeCode } from "@stepdone/domain";
import IORedis from "ioredis";

export type AgentJob = {
  agentRunId: string;
  projectId: string;
  stepRunId: string;
  nodeCode: NodeCode;
  schemaVersion: 1;
};

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
  handler: (job: Job<AgentJob>) => Promise<void>,
) {
  const conn = connection();
  const opts = { connection: conn, concurrency: 2 };
  return [
    new Worker<AgentJob>("agent-default", handler, opts),
    new Worker<AgentJob>("agent-heavy", handler, { ...opts, concurrency: 1 }),
    new Worker<AgentJob>("export", handler, { ...opts, concurrency: 1 }),
  ];
}
