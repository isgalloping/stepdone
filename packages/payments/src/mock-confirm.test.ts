import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma, newPublicId } from "@stepdone/database";
import { createOrder } from "./create-order";
import { mockConfirmPayment } from "./mock-confirm";

describe("mockConfirmPayment", () => {
  let userId: bigint;
  let projectId: bigint;
  let orderPublicId: string;

  beforeAll(async () => {
    const templateVersion = await prisma.projectTemplateVersion.findFirstOrThrow({
      where: { version: 1, template: { code: "competitor-analysis" } },
    });
    const user = await prisma.user.create({
      data: {
        publicId: newPublicId(),
        displayName: "pay-test",
        identities: {
          create: { provider: "MOCK", providerUserId: `mock_${newPublicId()}` },
        },
      },
    });
    userId = user.id;
    const project = await prisma.project.create({
      data: {
        publicId: newPublicId(),
        userId: user.id,
        templateVersionId: templateVersion.id,
        title: "支付测试项目",
        status: "PAYMENT_REQUIRED",
        currentStepCode: "PAYMENT_GATE",
      },
    });
    projectId = project.id;
    const order = await createOrder({
      userId,
      projectId,
      productCode: "STANDARD_PROJECT",
    });
    orderPublicId = order.orderPublicId;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("rejects when allowMock is false", async () => {
    await expect(
      mockConfirmPayment({ orderPublicId, allowMock: false }),
    ).rejects.toThrow(/PAYMENT_NOT_ALLOWED/);
  });

  it("is idempotent on duplicate confirm", async () => {
    await mockConfirmPayment({ orderPublicId, allowMock: true });
    await mockConfirmPayment({ orderPublicId, allowMock: true });
    const entitlements = await prisma.entitlement.count({ where: { userId } });
    expect(entitlements).toBe(2);
  });
});
