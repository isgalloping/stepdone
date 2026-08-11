import { createQueues, createWorkers } from "./queues";
import { dispatchOutbox } from "./outbox";
import { handleAgentJob } from "./runner";
import { startHealthServer } from "./health";

async function main() {
  startHealthServer(4101);
  const queues = createQueues();
  const workers = createWorkers(handleAgentJob);

  for (const w of workers) {
    w.on("failed", (job, err) => {
      console.error("job failed", job?.id, err.message);
    });
    w.on("completed", (job) => {
      console.log("job completed", job.id, job.data.nodeCode);
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
