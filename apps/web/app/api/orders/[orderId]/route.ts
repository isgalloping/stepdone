import { prisma } from "@stepdone/database";
import { ErrorCodes } from "@stepdone/domain";
import { jsonOk, jsonErr } from "@/lib/api";
import { requireUser } from "@/lib/session";

type Ctx = { params: Promise<{ orderId: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { orderId } = await ctx.params;
    const order = await prisma.order.findFirst({
      where: { publicId: orderId, userId: user.id },
      include: { product: true },
    });
    if (!order) {
      return jsonErr(ErrorCodes.PROJECT_NOT_FOUND, "订单不存在", 404);
    }
    return jsonOk({
      orderPublicId: order.publicId,
      status: order.status,
      amountFen: order.amountFen,
      productCode: order.product.code,
      paidAt: order.paidAt?.toISOString() ?? null,
    });
  } catch (error) {
    const err = error as { code?: string; status?: number };
    return jsonErr(err.code ?? "AUTH_REQUIRED", "未登录", err.status ?? 401);
  }
}
