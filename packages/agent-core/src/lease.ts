import type { PrismaClient } from "@stepdone/database";

export async function acquireLease(
  prisma: PrismaClient,
  agentRunId: bigint,
  workerId: string,
  ttlMs = 60_000,
): Promise<boolean> {
  const now = new Date();
  const expires = new Date(now.getTime() + ttlMs);

  const current = await prisma.agentRun.findUnique({ where: { id: agentRunId } });
  if (!current) return false;
  if (
    current.lockedBy &&
    current.lockExpiresAt &&
    current.lockExpiresAt > now &&
    current.lockedBy !== workerId
  ) {
    return false;
  }

  const updated = await prisma.agentRun.updateMany({
    where: {
      id: agentRunId,
      OR: [
        { lockedBy: null },
        { lockExpiresAt: { lt: now } },
        { lockedBy: workerId },
      ],
    },
    data: {
      lockedBy: workerId,
      lockExpiresAt: expires,
      heartbeatAt: now,
      status: current.status === "QUEUED" ? "RUNNING" : current.status,
      startedAt: current.startedAt ?? now,
    },
  });

  return updated.count === 1;
}

export async function heartbeatLease(
  prisma: PrismaClient,
  agentRunId: bigint,
  workerId: string,
  ttlMs = 60_000,
): Promise<void> {
  const now = new Date();
  await prisma.agentRun.updateMany({
    where: { id: agentRunId, lockedBy: workerId },
    data: {
      heartbeatAt: now,
      lockExpiresAt: new Date(now.getTime() + ttlMs),
    },
  });
}
