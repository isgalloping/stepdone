import { createOrder } from "@stepdone/payments";
import { prisma } from "@stepdone/database";
import { ErrorCodes } from "@stepdone/domain";
import { jsonOk, jsonErr } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { getOwnedProject } from "@/lib/projects";

export async function GET() {
  try {
    const user = await requireUser();
    const orders = await prisma.order.findMany({
      where: { userId: user.id },
      include: { product: true, project: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return jsonOk({
      orders: orders.map((o) => ({
        orderPublicId: o.publicId,
        status: o.status,
        amountFen: o.amountFen,
        productCode: o.product.code,
        productName: o.product.name,
        projectPublicId: o.project.publicId,
        projectTitle: o.project.title,
        createdAt: o.createdAt.toISOString(),
        paidAt: o.paidAt?.toISOString() ?? null,
      })),
    });
  } catch (error) {
    const err = error as { code?: string; status?: number };
    return jsonErr(err.code ?? "AUTH_REQUIRED", "未登录", err.status ?? 401);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = (await request.json()) as {
      projectId?: string;
      productCode?: "STANDARD_PROJECT" | "PRO_PROJECT";
    };
    if (!body.projectId || !body.productCode) {
      return jsonErr("VALIDATION_ERROR", "projectId and productCode required", 400);
    }
    const project = await getOwnedProject(user.id, body.projectId);
    if (!project) {
      return jsonErr(ErrorCodes.PROJECT_NOT_FOUND, "项目不存在或无权访问", 404);
    }
    const order = await createOrder({
      userId: user.id,
      projectId: project.id,
      productCode: body.productCode,
    });
    return jsonOk(order);
  } catch (error) {
    const err = error as { code?: string; status?: number; message?: string };
    if (err.code === "AUTH_REQUIRED") {
      return jsonErr("AUTH_REQUIRED", "未登录", 401);
    }
    console.error(error);
    return jsonErr("PAYMENT_ERROR", err.message ?? "order failed", 400);
  }
}
