import { createQueues, createWorkers } from "./queues";
import { dispatchOutbox } from "./outbox";
import { handleAgentJob } from "./runner";
import { handleExportJob } from "./export-runner";
import { startHealthServer } from "./health";

async function main() {
  startHealthServer(4101);
  const queues = createQueues();
  const workers = createWorkers({
    agent: handleAgentJob,
    export: handleExportJob,
  });

  for (const w of workers) {
    w.on("failed", (job, err) => {
      console.error("job failed", job?.id, err.message);
    });
    w.on("completed", (job) => {
      const data = job.data as { nodeCode?: string; kind?: string };
      console.log("job completed", job.id, data.nodeCode ?? data.kind ?? "");
    });
  }

  setInterval(() => {
    void dispatchOutbox(queues).catch((error) => {
      console.error("outbox tick failed", error);
    });
  }, 1000);

  console.log("agent-worker started");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
