import { prisma, newPublicId } from "@stepdone/database";
import { ErrorCodes, canTransitionProject } from "@stepdone/domain";

const STANDARD_TYPES = ["STANDARD_PROJECT_CREDIT", "REPORT_EXPORT"] as const;
const PRO_TYPES = [
  "PRO_PROJECT_CREDIT",
  "REPORT_EXPORT",
  "PPT_EXPORT",
  "RESEARCH_RETRY",
  "REPORT_REGENERATE",
] as const;

export async function mockConfirmPayment(input: {
  orderPublicId: string;
  allowMock: boolean;
}): Promise<{ orderStatus: "PAID" }> {
  if (!input.allowMock) {
    throw new Error(`${ErrorCodes.PAYMENT_NOT_ALLOWED}: mock payments disabled`);
  }

  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { publicId: input.orderPublicId },
      include: { product: true, project: true },
    });
    if (!order) {
      throw new Error(`${ErrorCodes.PROJECT_NOT_FOUND}: order missing`);
    }
    if (order.status === "PAID") {
      return { orderStatus: "PAID" as const };
    }

    await tx.paymentTransaction.create({
      data: {
        publicId: newPublicId(),
        orderId: order.id,
        provider: "MOCK",
        providerTradeNo: `mock_${order.publicId}`,
        amountFen: order.amountFen,
        status: "SUCCESS",
        rawPayload: { mock: true },
      },
    });

    await tx.order.update({
      where: { id: order.id },
      data: { status: "PAID", paidAt: new Date() },
    });

    const types =
      order.product.code === "PRO_PROJECT" ? PRO_TYPES : STANDARD_TYPES;

    for (const type of types) {
      const entitlement = await tx.entitlement.create({
        data: {
          publicId: newPublicId(),
          userId: order.userId,
          projectId: order.projectId,
          type,
          remaining: type.endsWith("_RETRY") || type.endsWith("_REGENERATE") ? 1 : 1,
          metadata: { productCode: order.product.code },
        },
      });
      await tx.entitlementTransaction.create({
        data: {
          entitlementId: entitlement.id,
          delta: 1,
          reason: "MOCK_PAYMENT",
          orderId: order.id,
        },
      });
    }

    if (
      order.project.status === "PAYMENT_REQUIRED" &&
      canTransitionProject("PAYMENT_REQUIRED", "ACTIVE")
    ) {
      await tx.project.update({
        where: { id: order.projectId },
        data: { status: "ACTIVE", currentStepCode: "GENERATE_REPORT" },
      });
    }

    await tx.projectEvent.create({
      data: {
        publicId: newPublicId(),
        projectId: order.projectId,
        type: "STATUS_CHANGED",
        stage: "PAYMENT",
        message: "支付成功，已解锁完整报告",
        percent: 100,
      },
    });

    await tx.outboxEvent.create({
      data: {
        status: "PENDING",
        topic: "agent-default",
        payload: {
          type: "START_NODE",
          projectPublicId: order.project.publicId,
          nodeCode: "GENERATE_REPORT",
        },
      },
    });

    return { orderStatus: "PAID" as const };
  });
}
