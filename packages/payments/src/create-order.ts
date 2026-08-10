import { prisma, newPublicId } from "@stepdone/database";
import { ErrorCodes } from "@stepdone/domain";

export async function createOrder(input: {
  userId: bigint;
  projectId: bigint;
  productCode: "STANDARD_PROJECT" | "PRO_PROJECT";
}): Promise<{ orderPublicId: string; amountFen: number }> {
  const product = await prisma.product.findUnique({
    where: { code: input.productCode },
  });
  if (!product || !product.active) {
    throw new Error(`${ErrorCodes.PAYMENT_NOT_ALLOWED}: unknown product`);
  }

  const project = await prisma.project.findFirst({
    where: { id: input.projectId, userId: input.userId },
  });
  if (!project) {
    throw new Error(`${ErrorCodes.PROJECT_NOT_FOUND}: project missing`);
  }

  const order = await prisma.order.create({
    data: {
      publicId: newPublicId(),
      userId: input.userId,
      projectId: input.projectId,
      productId: product.id,
      amountFen: product.priceFen,
      status: "PENDING",
    },
  });

  return { orderPublicId: order.publicId, amountFen: order.amountFen };
}
