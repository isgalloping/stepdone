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

export type ExportJob = {
  kind: "export";
  exportPublicId: string;
  projectId: string;
  format: string;
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

export function createWorkers(handlers: {
  agent: (job: Job<AgentJob>) => Promise<void>;
  export: (job: Job<ExportJob>) => Promise<void>;
}) {
  const conn = connection();
  const opts = { connection: conn, concurrency: 2 };
  return [
    new Worker<AgentJob>("agent-default", handlers.agent, opts),
    new Worker<AgentJob>("agent-heavy", handlers.agent, { ...opts, concurrency: 1 }),
    new Worker<ExportJob>("export", handlers.export, { ...opts, concurrency: 1 }),
  ];
}
