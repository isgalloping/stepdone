import { prisma } from "@stepdone/database";
import { ErrorCodes } from "@stepdone/domain";

export type ConsumeInput = {
  userId: bigint;
  projectId: bigint;
  type: "RESEARCH_RETRY" | "REPORT_REGENERATE" | "PPT_EXPORT" | "REPORT_EXPORT";
  reason: string;
};

export function assertHasRemaining(remaining: number) {
  if (remaining <= 0) {
    throw new Error(`${ErrorCodes.ENTITLEMENT_REQUIRED}: entitlement exhausted`);
  }
}

export function applyConsumeDelta(remaining: number) {
  assertHasRemaining(remaining);
  return remaining - 1;
}

export async function consumeEntitlement(input: ConsumeInput): Promise<{
  remaining: number;
  entitlementPublicId: string;
}> {
  return prisma.$transaction(async (tx) => {
    const row = await tx.entitlement.findFirst({
      where: {
        userId: input.userId,
        projectId: input.projectId,
        type: input.type,
        remaining: { gt: 0 },
      },
      orderBy: { createdAt: "asc" },
    });
    if (!row) {
      throw new Error(`${ErrorCodes.ENTITLEMENT_REQUIRED}: missing ${input.type}`);
    }
    const remaining = applyConsumeDelta(row.remaining);
    const updated = await tx.entitlement.update({
      where: { id: row.id },
      data: { remaining },
    });
    await tx.entitlementTransaction.create({
      data: {
        entitlementId: row.id,
        delta: -1,
        reason: input.reason,
      },
    });
    return {
      remaining: updated.remaining,
      entitlementPublicId: updated.publicId,
    };
  });
}
