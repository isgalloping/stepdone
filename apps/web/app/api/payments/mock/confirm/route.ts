import { mockConfirmPayment } from "@stepdone/payments";
import { mockPaymentsAllowed, loadEnv } from "@stepdone/config";
import { jsonOk, jsonErr } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { prisma } from "@stepdone/database";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = (await request.json()) as { orderPublicId?: string };
    if (!body.orderPublicId) {
      return jsonErr("VALIDATION_ERROR", "orderPublicId required", 400);
    }

    const order = await prisma.order.findFirst({
      where: { publicId: body.orderPublicId, userId: user.id },
    });
    if (!order) {
      return jsonErr("PROJECT_NOT_FOUND", "订单不存在", 404);
    }

    const env = loadEnv();
    const result = await mockConfirmPayment({
      orderPublicId: body.orderPublicId,
      allowMock: mockPaymentsAllowed(env),
    });
    return jsonOk(result);
  } catch (error) {
    const err = error as { code?: string; status?: number; message?: string };
    if (err.code === "AUTH_REQUIRED") {
      return jsonErr("AUTH_REQUIRED", "未登录", 401);
    }
    console.error(error);
    return jsonErr("PAYMENT_ERROR", err.message ?? "confirm failed", 400);
  }
}
