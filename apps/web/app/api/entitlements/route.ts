import { prisma } from "@stepdone/database";
import { jsonOk, jsonErr } from "@/lib/api";
import { requireUser } from "@/lib/session";

export async function GET() {
  try {
    const user = await requireUser();
    const entitlements = await prisma.entitlement.findMany({
      where: { userId: user.id, remaining: { gt: 0 } },
      orderBy: { createdAt: "desc" },
    });
    return jsonOk({
      entitlements: entitlements.map((e) => ({
        publicId: e.publicId,
        type: e.type,
        remaining: e.remaining,
        projectId: e.projectId?.toString() ?? null,
      })),
    });
  } catch (error) {
    const err = error as { code?: string; status?: number };
    return jsonErr(err.code ?? "AUTH_REQUIRED", "未登录", err.status ?? 401);
  }
}
